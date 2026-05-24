import os
import sys
import time
import shutil
import logging
import threading
import numpy as np
import cv2
from typing import List, Dict, Any

try:
    import onnxruntime as ort
    HAS_ORT = True
except ImportError:
    HAS_ORT = False

logger = logging.getLogger(__name__)


def _get_nvidia_runtime_status():
    status = {
        "available": False,
        "reason": "",
        "providers": [],
    }

    if not HAS_ORT:
        status["reason"] = "onnxruntime-gpu is not installed in the engine container"
        return status

    try:
        providers = ort.get_available_providers()
        status["providers"] = providers
    except Exception as exc:
        status["reason"] = f"ONNX Runtime provider detection failed: {exc}"
        return status

    if "CUDAExecutionProvider" not in providers:
        status["reason"] = "CUDAExecutionProvider is unavailable; verify CUDA libraries inside the engine container"
        return status

    visible_devices = os.environ.get("NVIDIA_VISIBLE_DEVICES", "")
    if visible_devices and visible_devices.lower() != "void":
        status["available"] = True
        status["reason"] = f"CUDAExecutionProvider ready via NVIDIA_VISIBLE_DEVICES={visible_devices}"
        return status

    if visible_devices.lower() == "void":
        status["reason"] = "NVIDIA_VISIBLE_DEVICES=void disables GPU visibility for the engine container"
        return status

    if os.path.exists("/dev/nvidiactl") or shutil.which("nvidia-smi") is not None:
        status["available"] = True
        status["reason"] = "CUDAExecutionProvider ready and an NVIDIA device is visible inside the container"
        return status

    status["reason"] = (
        "CUDAExecutionProvider is installed but no NVIDIA device is visible; "
        "enable nvidia-container-toolkit and expose NVIDIA_VISIBLE_DEVICES"
    )
    return status

class AIDetector:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(AIDetector, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self, camera_id: int = 0, config: Dict[str, Any] = None):
        if self._initialized:
            return
            
        self.config = config or {}
        self.interpreter = None
        self.backend = None
        self.input_name = None
        self.output_names = []
        self.input_shape = None
        self.input_details = []
        self.output_details = []
        self.labels = {}
        self.hardware = "unknown"
        self.nvidia_runtime_status = _get_nvidia_runtime_status()
        self.last_load_reason = ""
        self.inference_lock = threading.Lock()
        
        if not HAS_ORT:
            logger.error("AI: ONNX Runtime is not installed. AI disabled.")
            return
            
        # Initial model type from config (camera or global)
        self.model_type = self.config.get('ai_model', 'yolo_v8')
        self._enabled = self.config.get('ai_enabled', False)
        
        if self._enabled:
            self._load_model()
        else:
            logger.info("AI: Engine initialized in DISABLED state (Global Switch is OFF)")
            
        self._initialized = True

    @property
    def enabled(self):
        return self._enabled

    def set_enabled(self, enabled: bool):
        """Enable or disable the AI detector dynamically"""
        with self.inference_lock:
            if enabled == self._enabled:
                return
            
            self._enabled = enabled
            if enabled:
                logger.info("AI: GLOBAL ACTIVATION - Loading models...")
                self._load_model()
            else:
                logger.info("AI: GLOBAL DEACTIVATION - Releasing resources...")
                self.interpreter = None
                self.labels = {}
                self.hardware = "disabled"

    def update_model(self, model_type: str):
        """Reload model if type has changed"""
        with self.inference_lock:
            if model_type == self.model_type and self.interpreter is not None:
                return
            
            logger.info(f"AI: Switching global model from {self.model_type} to {model_type}...")
            self.model_type = model_type
            # Update config so next reload uses this type
            self.config['ai_model'] = model_type
            self._load_model()

    def update_hardware(self, hardware: str):
        """Reload model if hardware preference has changed"""
        with self.inference_lock:
            current_pref = self.config.get('ai_hardware', 'auto')
            if hardware == current_pref and self.interpreter is not None:
                return
            
            logger.info(f"AI: Switching global hardware from {current_pref} to {hardware}...")
            # Update config
            self.config['ai_hardware'] = hardware
            self._load_model()

    def _refresh_nvidia_runtime_status(self):
        self.nvidia_runtime_status = _get_nvidia_runtime_status()
        return self.nvidia_runtime_status

    def _normalize_hardware_pref(self, hardware: str) -> str:
        pref_hw = (hardware or 'auto').lower()
        if pref_hw == 'tpu':
            logger.info("AI: TPU hardware selection is no longer supported. Falling back to CPU.")
            return 'cpu'
        if pref_hw not in ('auto', 'cpu', 'nvidia'):
            return 'auto'
        return pref_hw

    def _build_fallback_chain(self, target_model: str, pref_hw: str):
        fallback_chain = []

        def add(model_type: str, hardware: str):
            candidate = (model_type, hardware)
            if candidate not in fallback_chain:
                fallback_chain.append(candidate)

        if pref_hw in ('auto', 'nvidia'):
            add('yolo_v8', 'nvidia')
        add('yolo_v8', 'cpu')

        return fallback_chain

    def _get_model_assets(self, model_dir: str, model_type: str):
        return {
            'nvidia': os.path.join(model_dir, 'yolov8n.onnx'),
            'cpu': os.path.join(model_dir, 'yolov8n.onnx'),
            'labels': os.path.join(model_dir, 'yolo_labels.txt'),
        }

    def _load_onnx_session(self, model_path: str, model_type: str, hardware: str):
        if not HAS_ORT:
            raise RuntimeError("onnxruntime is not installed")

        providers = ['CPUExecutionProvider']
        if hardware == 'nvidia':
            logger.info(f"AI: Attempting CUDA session for {model_type} from {model_path}...")
            providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']
        else:
            logger.info(f"AI: Attempting CPU ONNX session for {model_type} from {model_path}...")

        session = ort.InferenceSession(model_path, providers=providers)
        session_inputs = session.get_inputs()
        if not session_inputs:
            raise RuntimeError("ONNX model does not expose any inputs")

        self.interpreter = session
        self.backend = 'onnx'
        self.input_name = session_inputs[0].name
        self.input_shape = session_inputs[0].shape
        self.output_names = [output.name for output in session.get_outputs()]

    def _postprocess_standard_yolo_output(
        self,
        output,
        threshold,
        allowed_objects,
        vehicle_classes,
        input_h,
        input_w,
        camera_id,
        quantization=None,
    ):
        if output.ndim == 3:
            output = output[0]

        if output.ndim == 2 and output.shape[0] < output.shape[1]:
            output = output.T

        if output.shape[-1] <= 4:
            logger.error(
                f"Camera {camera_id}: YOLOv8 model has unexpected output shape {tuple(output.shape)}. "
                "Expected (boxes, classes+4) or (classes+4, boxes)."
            )
            return []

        o_scale, o_zero = 1.0, 0
        if quantization:
            o_scale, o_zero = quantization

        candidate_boxes = []
        candidate_scores = []
        candidate_labels = []

        for row in output:
            if o_scale != 1.0 or o_zero != 0:
                f_row = (row.astype(np.float32) - o_zero) * o_scale
            else:
                f_row = row.astype(np.float32)

            scores = f_row[4:]
            if len(scores) == 0:
                continue

            class_id = int(np.argmax(scores))
            score = float(scores[class_id])

            if score < threshold:
                continue

            label = self.labels.get(class_id, 'unknown')
            is_allowed = label in allowed_objects or ('vehicle' in allowed_objects and label in vehicle_classes)
            if not is_allowed:
                continue

            xc, yc, w, h = f_row[0], f_row[1], f_row[2], f_row[3]
            candidate_boxes.append([float(xc - w / 2), float(yc - h / 2), float(w), float(h)])
            candidate_scores.append(score)
            candidate_labels.append(label)

        results = []
        if candidate_boxes:
            nms_indices = cv2.dnn.NMSBoxes(candidate_boxes, candidate_scores, threshold, 0.45)

            if len(nms_indices) > 0:
                if isinstance(nms_indices, np.ndarray):
                    nms_indices = nms_indices.flatten()

                for i in nms_indices:
                    label = candidate_labels[i]
                    score = candidate_scores[i]
                    x, y, w, h = candidate_boxes[i]

                    if x + w / 2 <= 1.1 and y + h / 2 <= 1.1:
                        ymin, xmin, ymax, xmax = y, x, y + h, x + w
                    else:
                        ymin = y / input_h
                        xmin = x / input_w
                        ymax = (y + h) / input_h
                        xmax = (x + w) / input_w

                    results.append({
                        'label': label,
                        'score': score,
                        'confidence': score,
                        'box': [float(ymin), float(xmin), float(ymax), float(xmax)],
                    })

        return sorted(results, key=lambda item: item['score'], reverse=True)[:10]

    def _detect_with_onnx(self, frame, camera_id: int, current_config: Dict[str, Any]):
        model_shape = self.input_shape or []
        input_h = int(model_shape[2]) if len(model_shape) > 2 and isinstance(model_shape[2], int) and model_shape[2] > 0 else 640
        input_w = int(model_shape[3]) if len(model_shape) > 3 and isinstance(model_shape[3], int) and model_shape[3] > 0 else 640

        resized = cv2.resize(frame, (input_w, input_h))
        rgb_frame = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
        input_data = rgb_frame.astype(np.float32) / 255.0
        input_data = np.transpose(input_data, (2, 0, 1))
        input_data = np.expand_dims(input_data, axis=0)

        t0 = time.time()
        try:
            raw_outputs = self.interpreter.run(self.output_names, {self.input_name: input_data})
        except Exception as e:
            logger.error(f"AI: Inference failed on {self.hardware}. Falling back to CPU permanently. Error: {e}")
            self.hardware = 'cpu'
            self.interpreter = None
            self.backend = None
            self._load_model(force_cpu=True)
            return []

        inference_time = time.time() - t0
        threshold = current_config.get('ai_threshold', 0.5)
        allowed_objects = current_config.get('ai_object_types', ['person', 'vehicle'])
        vehicle_classes = ['car', 'truck', 'bus', 'motorcycle']

        results = self._postprocess_standard_yolo_output(
            raw_outputs[0],
            threshold,
            allowed_objects,
            vehicle_classes,
            input_h,
            input_w,
            camera_id,
        )

        if results:
            logger.debug(
                f"Camera {camera_id}: AI Detected {len(results)} objects in {inference_time:.3f}s "
                f"({self.hardware} - {self.model_type})"
            )

        return results

    def _load_model(self, force_cpu=False):
        """
        Load YOLOv8 with iterative hardware fallback:
        1. Requested YOLOv8 + NVIDIA (when available)
        2. YOLOv8 + CPU ONNX
        """
        model_dir = "models"
        self.interpreter = None
        self.backend = None
        self.input_name = None
        self.output_names = []
        self.input_shape = None
        self.input_details = []
        self.output_details = []
        self.last_load_reason = ""
        
        # Initial target from config
        target_model = 'yolo_v8'
        self.config['ai_model'] = target_model
        pref_hw = self._normalize_hardware_pref(self.config.get('ai_hardware', 'auto'))
        if force_cpu:
            pref_hw = 'cpu'
        self.config['ai_hardware'] = pref_hw

        fallback_chain = self._build_fallback_chain(target_model, pref_hw)
        nvidia_status = self._refresh_nvidia_runtime_status()
        nvidia_available = nvidia_status['available']

        if target_model == 'yolo_v8' and pref_hw in ('auto', 'nvidia'):
            if nvidia_available:
                logger.info(f"AI: NVIDIA CUDA path available for YOLOv8 ({nvidia_status['reason']}).")
            elif pref_hw == 'nvidia':
                logger.warning(f"AI: NVIDIA requested for YOLOv8 but unavailable: {nvidia_status['reason']}. Falling back.")
            else:
                logger.info(f"AI: Auto hardware skipped NVIDIA for YOLOv8: {nvidia_status['reason']}")

        for model_type, hardware in fallback_chain:
            if hardware == 'nvidia' and not nvidia_available:
                logger.debug(f"AI: Skipping NVIDIA for {model_type}; {nvidia_status['reason']}.")
                continue

            assets = self._get_model_assets(model_dir, model_type)
            model_path = assets.get(hardware)
            labels_path = assets['labels']

            if not model_path or not os.path.exists(model_path):
                self.last_load_reason = f"Missing model file for {hardware}: {model_path}"
                logger.debug(f"AI: Model file {model_path} not found. Trying next fallback.")
                continue

            try:
                self._load_onnx_session(model_path, model_type, hardware)
                
                # Success!
                self.hardware = hardware
                self.model_type = model_type
                self.last_load_reason = ""
                logger.info(f"AI: SUCCESS - Loaded {hardware.upper()} model {model_type} from {model_path}")
                
                # Load labels
                self._load_labels(labels_path)
                
                return
                
            except Exception as e:
                self.last_load_reason = str(e)
                logger.warning(f"AI: Failed to load {hardware} model {model_type}: {e}")
                continue

        logger.error(f"AI: All models in fallback chain failed to load. AI disabled. Last error: {self.last_load_reason or 'unknown'}")
        self.interpreter = None
        self.hardware = "failed"

    def _load_labels(self, labels_path):
        self.labels = {}
        if os.path.exists(labels_path):
            try:
                with open(labels_path, 'r') as f:
                    for line in f:
                        line = line.strip()
                        if not line: continue
                        pair = line.split(maxsplit=1)
                        if len(pair) == 2 and pair[0].isdigit():
                            self.labels[int(pair[0])] = pair[1]
                        else:
                            self.labels[len(self.labels)] = line
            except Exception as e:
                logger.warning(f"AI: Error reading labels {labels_path}: {e}")
        
        if not self.labels:
            self.labels = {0: 'person', 1: 'bicycle', 2: 'car', 3: 'motorcycle', 5: 'bus', 7: 'truck', 16: 'dog', 15: 'cat'}

    def detect(self, frame, camera_id: int = 0, config: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        if not self._enabled or not self.interpreter:
            return []

        current_config = config or self.config
        with self.inference_lock:
            return self._detect_with_onnx(frame, camera_id, current_config)
