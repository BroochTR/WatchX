import cv2
import numpy as np
import logging
import time

logger = logging.getLogger(__name__)


class MotionDetector:
    def __init__(self, camera_id, camera_name, config):
        self.camera_id = camera_id
        self.camera_name = camera_name
        self.config = config

        self.motion_detected = False
        self.last_motion_time = 0

        self.consecutive_motion_frames = 0
        self.consecutive_still_frames = 0

        self.fgbg = cv2.createBackgroundSubtractorMOG2(
            history=200,
            varThreshold=25,
            detectShadows=False
        )

    def detect(
        self,
        frame,
        event_callback=None,
        save_snapshot_cb=None,
    ):
        if self.config.get("detect_motion_mode") == "Off":
            return False

        motion_h = 180
        scale = motion_h / frame.shape[0]
        motion_w = int(frame.shape[1] * scale)

        small_frame = cv2.resize(
            frame,
            (motion_w, motion_h),
            interpolation=cv2.INTER_LINEAR
        )

        fgmask = self.fgbg.apply(small_frame)

        _, fgmask = cv2.threshold(
            fgmask,
            200,
            255,
            cv2.THRESH_BINARY
        )

        kernel = np.ones((3, 3), np.uint8)
        fgmask = cv2.erode(fgmask, kernel, iterations=1)
        fgmask = cv2.dilate(fgmask, kernel, iterations=2)

        motion_pixels = np.count_nonzero(fgmask)

        threshold = self.config.get("threshold", 1500)

        if motion_pixels > threshold:
            self.consecutive_motion_frames += 1
            self.consecutive_still_frames = 0

            if self.consecutive_motion_frames >= 2:
                self.last_motion_time = time.time()

                if not self.motion_detected:
                    self.motion_detected = True

                    logger.info(
                        f"Camera {self.camera_name}: Motion detected"
                    )

                    snapshot_path = None

                    if save_snapshot_cb:
                        snapshot_path = save_snapshot_cb(frame)

                    if event_callback:
                        payload = {
                            "file_path": snapshot_path
                        }

                        event_callback(
                            self.camera_id,
                            "motion_start",
                            payload
                        )

        else:
            self.consecutive_still_frames += 1
            self.consecutive_motion_frames = 0

            motion_gap = self.config.get("motion_gap", 10)

            if (
                self.motion_detected and
                (time.time() - self.last_motion_time) > motion_gap
            ):
                self.motion_detected = False

                logger.info(
                    f"Camera {self.camera_name}: Motion ended"
                )

                if event_callback:
                    event_callback(
                        self.camera_id,
                        "motion_end"
                    )

        return self.motion_detected