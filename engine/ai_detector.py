import os
import logging
from typing import List, Dict, Any

import cv2
import numpy as np

try:
    import tflite_runtime.interpreter as tflite
    HAS_TFLITE = True
except ImportError:
    HAS_TFLITE = False

logger = logging.getLogger(__name__)


class AIDetector:
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}

        self.enabled = self.config.get("ai_enabled", False)

        self.interpreter = None
        self.input_details = None
        self.output_details = None

        self.labels = {}

        if not HAS_TFLITE:
            logger.warning("AI: tflite-runtime not installed")
            return

        if self.enabled:
            self.load_model()

    def load_model(self):
        model_dir = "models"

        model_path = os.path.join(
            model_dir,
            "mobilenet_ssd_v2_coco_quant_postprocess.tflite"
        )

        labels_path = os.path.join(
            model_dir,
            "coco_labels.txt"
        )

        if not os.path.exists(model_path):
            logger.error(f"AI: model not found: {model_path}")
            return

        try:
            logger.info(f"AI: loading model {model_path}")

            self.interpreter = tflite.Interpreter(
                model_path=model_path
            )

            self.interpreter.allocate_tensors()

            self.input_details = self.interpreter.get_input_details()
            self.output_details = self.interpreter.get_output_details()

            self.load_labels(labels_path)

            logger.info("AI: model loaded successfully")

        except Exception as e:
            logger.error(f"AI: failed to load model: {e}")
            self.interpreter = None

    def load_labels(self, labels_path: str):
        self.labels = {}

        if not os.path.exists(labels_path):
            logger.warning("AI: labels file missing")
            return

        try:
            with open(labels_path, "r") as f:
                for line in f:
                    line = line.strip()

                    if not line:
                        continue

                    parts = line.split(maxsplit=1)

                    if len(parts) == 2:
                        class_id = int(parts[0])
                        label = parts[1]
                        self.labels[class_id] = label

        except Exception as e:
            logger.warning(f"AI: failed to load labels: {e}")

    def preprocess(self, frame):
        input_shape = self.input_details[0]["shape"]

        height = input_shape[1]
        width = input_shape[2]

        resized = cv2.resize(frame, (width, height))

        input_data = np.expand_dims(resized, axis=0)

        dtype = self.input_details[0]["dtype"]

        if dtype == np.float32:
            input_data = np.float32(input_data) / 255.0

        return input_data

    def detect(
        self,
        frame,
        camera_id: int = 0,
        config: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:

        if not self.enabled:
            return []

        if self.interpreter is None:
            return []

        current_config = config or self.config

        threshold = current_config.get("ai_threshold", 0.5)

        allowed_objects = current_config.get(
            "ai_object_types",
            ["person"]
        )

        try:
            input_data = self.preprocess(frame)

            self.interpreter.set_tensor(
                self.input_details[0]["index"],
                input_data
            )

            self.interpreter.invoke()

            boxes = self.interpreter.get_tensor(
                self.output_details[0]["index"]
            )[0]

            classes = self.interpreter.get_tensor(
                self.output_details[1]["index"]
            )[0]

            scores = self.interpreter.get_tensor(
                self.output_details[2]["index"]
            )[0]

            detections = []

            for i in range(len(scores)):
                score = float(scores[i])

                if score < threshold:
                    continue

                class_id = int(classes[i])

                label = self.labels.get(class_id, "unknown")

                if label not in allowed_objects:
                    continue

                detections.append({
                    "label": label,
                    "score": score,
                    "confidence": score,
                    "box": [
                        float(boxes[i][0]),
                        float(boxes[i][1]),
                        float(boxes[i][2]),
                        float(boxes[i][3]),
                    ]
                })

            if detections:
                logger.debug(
                    f"Camera {camera_id}: detected "
                    f"{len(detections)} objects"
                )

            return detections

        except Exception as e:
            logger.error(
                f"Camera {camera_id}: AI detection failed: {e}"
            )

            return []