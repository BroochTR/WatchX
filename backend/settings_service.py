from sqlalchemy.orm import Session
from typing import Optional
from fastapi import HTTPException
import models
import logging

def get_setting(db: Session, key: str) -> Optional[str]:
    """Get a setting value by key"""
    setting = db.query(models.SystemSettings).filter(models.SystemSettings.key == key).first()
    return setting.value if setting else None

VALID_FFMPEG_PRESETS = {
    "ultrafast", "superfast", "veryfast", "faster", "fast", 
    "medium", "slow", "slower", "veryslow"
}

def validate_setting(key: str, value: str):
    """Validate setting values to prevent invalid configuration"""
    try:
        if key == "opt_ffmpeg_preset":
            if value not in VALID_FFMPEG_PRESETS:
                raise ValueError(f"Invalid preset. Must be one of: {', '.join(VALID_FFMPEG_PRESETS)}")
        
        elif key in ["opt_live_view_fps_throttle", "opt_motion_fps_throttle"]:
            v = int(value)
            if v < 1: raise ValueError("Throttle must be >= 1")
            
        elif key == "opt_live_view_height_limit":
            v = int(value)
            if v < 144: raise ValueError("Height limit must be >= 144")
            
        elif key == "opt_motion_analysis_height":
            v = int(value)
            if v < 64: raise ValueError("Motion analysis height must be >= 64")
            
        elif key in ["opt_live_view_quality", "opt_snapshot_quality"]:
            v = int(value)
            if v < 1 or v > 100: raise ValueError("Quality must be between 1 and 100")
            
        elif key == "default_live_view_mode":
            if value not in ["auto", "webcodecs", "mjpeg"]:
                raise ValueError("Invalid mode. Must be 'auto', 'webcodecs', or 'mjpeg'")
        
        elif key in ["opt_verbose_engine_logs", "cleanup_enabled"]:
            if value.lower() not in ["true", "false"]:
                raise ValueError("Must be 'true' or 'false'")

        elif key == "ai_model":
            if value != "yolo_v8":
                raise ValueError("Only 'yolo_v8' is supported")
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid value for {key}: {str(e)}")

def set_setting(db: Session, key: str, value: str, description: str = None):
    """Set a setting value, create if doesn't exist"""
    validate_setting(key, value)
    
    setting = db.query(models.SystemSettings).filter(models.SystemSettings.key == key).first()
    if setting:
        setting.value = value
        if description:
            setting.description = description
    else:
        new_setting = models.SystemSettings(key=key, value=value, description=description)
        db.add(new_setting)
    db.commit()
