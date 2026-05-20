import requests
import logging

from sqlalchemy.orm import Session
from models import Camera

ENGINE_BASE_URL = "http://engine:8000"

logger = logging.getLogger(__name__)


def camera_to_config(cam: Camera) -> dict:
    return {
        "id": cam.id,
        "name": cam.name,
        "rtsp_url": cam.rtsp_url,

        "width": cam.resolution_width or 1920,
        "height": cam.resolution_height or 1080,

        "framerate": cam.framerate or 15,

        "recording_mode": cam.recording_mode,

        "threshold": cam.threshold or 1500,
        "motion_gap": cam.motion_gap or 10,

        "min_motion_frames": (
            cam.min_motion_frames or 2
        ),

        "detect_motion_mode": (
            cam.detect_motion_mode or "Always"
        ),

        "storage_path": (
            cam.storage_profile.path
            if cam.storage_profile
            else "/recordings"
        )
    }


def sync_cameras(db: Session):
    logger.info("Syncing cameras to engine")

    cameras = (
        db.query(Camera)
        .filter(Camera.is_active == True)
        .all()
    )

    for cam in cameras:
        config = camera_to_config(cam)

        try:
            response = requests.post(
                f"{ENGINE_BASE_URL}/cameras/{cam.id}/start",
                json=config,
                timeout=10
            )

            if response.status_code == 200:
                logger.info(
                    f"Started camera {cam.id}"
                )
            else:
                logger.error(
                    f"Failed to start camera {cam.id}"
                )

        except Exception as e:
            logger.error(
                f"Error starting camera {cam.id}: {e}"
            )


def stop_camera(camera_id: int):
    try:
        response = requests.post(
            f"{ENGINE_BASE_URL}/cameras/{camera_id}/stop",
            timeout=10
        )

        return response.status_code == 200

    except Exception as e:
        logger.error(
            f"Failed to stop camera {camera_id}: {e}"
        )

        return False