class StreamReader(threading.Thread):
    def __init__(self, url):
        super().__init__(daemon=True)
        self.url = url
        self.latest_frame = None
        self.running = False
        self.lock = threading.Lock()

    def run(self):
        self.running = True

        while self.running:
            try:
                container = av.open(self.url)

                for frame in container.decode(video=0):
                    if not self.running:
                        break

                    img = frame.to_ndarray(format='bgr24')

                    with self.lock:
                        self.latest_frame = img

            except Exception as e:
                logger.error(f"Stream error: {e}")
                time.sleep(5)

    def get_latest(self):
        with self.lock:
            return self.latest_frame

    def stop(self):
        self.running = False