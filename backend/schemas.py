from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CameraBase(BaseModel):
    name: str
    rtsp_url: str
    is_active: bool = True


class CameraCreate(CameraBase):
    pass


class Camera(CameraBase):
    id: int
    created_at: datetime


class EventBase(BaseModel):
    camera_id: int
    timestamp_start: datetime
    file_path: str


class EventCreate(EventBase):
    pass


class Event(EventBase):
    id: int