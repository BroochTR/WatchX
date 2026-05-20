import subprocess
import os
import time
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class RecordingManager:
    def __init__(self, camera_id, camera_name, config):
        self.camera_id = camera_id
        self.camera_name = camera_name
        self.config = config

        self.recording_process = None
        self.is_recording = False
        self.recording_filename = None
        self.recording_start_time = 0

    def handle_recording(
        self,
        frame,
        motion_detected,
        last_motion_time,
        stop_recording_cb
    ):
        mode = self.config.get("recording_mode", "Off")

        should_record = (
            mode in ["Always", "Continuous"] or
            (mode == "Motion Triggered" and motion_detected)
        )

        if should_record and not self.is_recording:
            self.start_recording(frame.shape[1], frame.shape[0])

        elif not should_record and self.is_recording:
            post_capture = self.config.get("post_capture", 5)

            if time.time() - last_motion_time > post_capture:
                stop_recording_cb()

        if self.is_recording and self.recording_process:
            try:
                self.recording_process.stdin.write(frame.tobytes())
            except Exception as e:
                logger.error(
                    f"Camera {self.camera_name}: "
                    f"Failed writing frame to ffmpeg: {e}"
                )
                stop_recording_cb()

    def start_recording(self, width, height):
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")

        output_dir = f"/var/lib/watchx/recordings/{self.camera_id}"
        os.makedirs(output_dir, exist_ok=True)

        output_file = os.path.join(output_dir, f"{timestamp}.mp4")

        logger.info(
            f"Camera {self.camera_name}: "
            f"Starting recording -> {output_file}"
        )

        framerate = self.config.get("framerate", 15)

        command = [
            "ffmpeg",
            "-y",

            "-f", "rawvideo",
            "-pix_fmt", "bgr24",
            "-s", f"{width}x{height}",
            "-r", str(framerate),
            "-i", "-",

            "-c:v", "libx264",
            "-preset", "ultrafast",

            "-pix_fmt", "yuv420p",

            output_file
        ]

        try:
            self.recording_process = subprocess.Popen(
                command,
                stdin=subprocess.PIPE,
                stderr=subprocess.DEVNULL
            )

            self.is_recording = True
            self.recording_filename = output_file
            self.recording_start_time = time.time()

        except Exception as e:
            logger.error(
                f"Camera {self.camera_name}: "
                f"Failed to start recording: {e}"
            )

            self.recording_process = None
            self.is_recording = False

    def stop_recording(self):
        if not self.is_recording:
            return

        logger.info(
            f"Camera {self.camera_name}: "
            f"Stopping recording"
        )

        try:
            if self.recording_process:
                if self.recording_process.stdin:
                    self.recording_process.stdin.close()

                self.recording_process.wait(timeout=5)

        except Exception as e:
            logger.error(
                f"Camera {self.camera_name}: "
                f"Failed stopping ffmpeg: {e}"
            )

        self.recording_process = None
        self.is_recording = False

        if (
            self.recording_filename and
            os.path.exists(self.recording_filename)
        ):
            try:
                size = os.path.getsize(self.recording_filename)

                if size < 1024:
                    os.remove(self.recording_filename)

            except Exception:
                pass