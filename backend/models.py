from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Camera(Base):
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False)
    rtsp_url = Column(String, nullable=False)

    location = Column(String, nullable=True)

    is_active = Column(Boolean, default=True)

    resolution_width = Column(Integer, default=1280)
    resolution_height = Column(Integer, default=720)

    framerate = Column(Integer, default=15)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    events = relationship("Event", back_populates="camera")