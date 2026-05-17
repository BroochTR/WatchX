from fastapi import FastAPI

app = FastAPI(title="WatchX API")

@app.get("/")
def root():
    return {"message": "WatchX API running"}