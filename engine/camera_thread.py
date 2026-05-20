class CameraThread(threading.Thread):
    def __init__(self, camera_id, config):
        super().__init__()
        self.camera_id = camera_id
        self.config = config
        self.running = False

        self.stream_reader = StreamReader(
            self.config['rtsp_url']
        )

        self.motion_detector = MotionDetector()

        self.latest_frame = None
        self.lock = threading.Lock()

    def run(self):
        self.running = True

        self.stream_reader.start()

        while self.running:
            frame = self.stream_reader.get_latest()

            if frame is None:
                time.sleep(0.01)
                continue

            motion = self.motion_detector.detect(frame)

            ret, jpeg = cv2.imencode('.jpg', frame)

            if ret:
                with self.lock:
                    self.latest_frame = jpeg.tobytes()

    def stop(self):
        self.running = False
        self.stream_reader.stop()

    def get_frame(self):
        with self.lock:
            return self.latest_frame