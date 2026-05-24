from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from slowapi import Limiter
from slowapi.util import get_remote_address
import database
import models
import schemas
import auth_service
import json, time, logging
import datetime, motion_service
import requests
import settings_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/settings", tags=["settings"])
limiter = Limiter(key_func=get_remote_address)
REMOVED_SETTINGS = {
    "backup_auto_enabled",
    "backup_auto_frequency_hours",
    "backup_auto_retention",
    "notify_webhook_url",
}

def get_setting(db: Session, key: str) -> Optional[str]:
    return settings_service.get_setting(db, key)


# Validation Constants
VALID_FFMPEG_PRESETS = {
    "ultrafast", "superfast", "veryfast", "faster", "fast", 
    "medium", "slow", "slower", "veryslow"
}

def validate_setting(key: str, value: str):
    settings_service.validate_setting(key, value)

def set_setting(db: Session, key: str, value: str, description: str = None):
    return settings_service.set_setting(db, key, value, description)

@router.get("")
def get_all_settings(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth_service.get_current_active_admin)):
    """Get all system settings"""
    settings = db.query(models.SystemSettings).all()
    return {
        s.key: {"value": s.value, "description": s.description}
        for s in settings
        if s.key not in REMOVED_SETTINGS
    }

@router.get("/{key}")
def get_setting_by_key(key: str, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth_service.get_current_user)):
    """Get a specific setting by key"""
    if key in REMOVED_SETTINGS:
        return {"key": key, "value": None, "description": None}

    if current_user.role != "admin":
        safe_keys = ["default_landing_page"]
        if key not in safe_keys:
            raise HTTPException(status_code=403, detail="Not authorized to access this setting")
            
    setting = db.query(models.SystemSettings).filter(models.SystemSettings.key == key).first()
    if not setting:
        # Fallback to DEFAULT_SETTINGS if available
        if key in DEFAULT_SETTINGS:
            return {"key": key, "value": DEFAULT_SETTINGS[key]["value"], "description": DEFAULT_SETTINGS[key]["description"]}
        return {"key": key, "value": None, "description": None}
    return {"key": setting.key, "value": setting.value, "description": setting.description}

@router.put("/{key}")
def update_setting(key: str, value: str, description: str = None, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth_service.get_current_active_admin)):
    """Update or create a setting"""
    if key in REMOVED_SETTINGS:
        raise HTTPException(status_code=404, detail="Setting not found")

    if key == "ai_model":
        value = "yolo_v8"
    setting = set_setting(db, key, value, description)
    if key.startswith("opt_") or key.startswith("ai_"):
        motion_service.sync_global_config(db)
    return {"key": setting.key, "value": setting.value, "description": setting.description}

@router.post("/bulk")
def update_bulk_settings(settings: dict, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth_service.get_current_active_admin)):
    """Update multiple settings at once"""
    updated_count = 0

    for key, value in settings.items():
        if key in REMOVED_SETTINGS:
            continue

        if key == "ai_model":
            value = "yolo_v8"

        # Validation for known numeric keys
        numeric_keys = [
            "max_global_storage_gb", "cleanup_interval_hours", 
            "opt_live_view_fps_throttle", "opt_motion_fps_throttle",
            "opt_live_view_height_limit", "opt_motion_analysis_height",
            "opt_live_view_quality", "opt_snapshot_quality"
        ]
        if key in numeric_keys:
            try:
                # Value might be string, int, or float from JSON
                val_num = float(value)
                if val_num < 0:
                     raise HTTPException(status_code=400, detail=f"Value for {key} must be non-negative")
            except (ValueError, TypeError):
                raise HTTPException(status_code=400, detail=f"Value for {key} must be a number")

        set_setting(db, key, str(value))
        updated_count += 1
    
    # Sync global config if any opt_ or ai_ settings were updated
    if any(
        (k.startswith("opt_") or k.startswith("ai_")) and k not in REMOVED_SETTINGS
        for k in settings.keys()
    ):
        motion_service.sync_global_config(db)
        
    return {"message": "Settings updated successfully", "count": updated_count}

@router.post("/cleanup")
def trigger_cleanup(camera_id: int = None, media_type: str = None, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth_service.get_current_active_admin)):
    """Manually trigger storage cleanup"""
    from storage_service import run_cleanup, cleanup_camera
    
    if camera_id:
        camera = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
        if not camera:
            return {"error": "Camera not found"}, 404
        cleanup_camera(db, camera, media_type=media_type)
        return {"message": f"Cleanup for camera {camera.name} triggered successfully"}
    
    run_cleanup()
    return {"message": "Global storage cleanup triggered successfully"}

@router.get("/engine/debug-status")
def get_engine_debug_status(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth_service.get_current_active_admin)):
    """Proxy to engine's debug status for diagnostics and testing (Admin only)"""
    try:
        resp = requests.get("http://engine:8000/debug/status", timeout=5)
        if resp.status_code != 200:
             raise HTTPException(status_code=resp.status_code, detail=f"Engine returned error: {resp.text}")
        return resp.json()
    except requests.exceptions.RequestException as e:
        logging.error(f"Engine Debug Proxy Error: {e}")
        raise HTTPException(status_code=503, detail=f"Engine unreachable: {str(e)}")

# Default settings with descriptions
DEFAULT_SETTINGS = {
    "max_global_storage_gb": {"value": "0", "description": "Maximum total storage for all cameras (0 = unlimited)"},
    "cleanup_enabled": {"value": "true", "description": "Enable automatic cleanup of old recordings"},
    "cleanup_interval_hours": {"value": "24", "description": "How often to run cleanup (in hours)"},
    
    # Notification Settings
    "smtp_server": {"value": "", "description": "SMTP Server Address"},
    "smtp_port": {"value": "587", "description": "SMTP Port (e.g. 587 or 465)"},
    "smtp_username": {"value": "", "description": "SMTP Username"},
    "smtp_password": {"value": "", "description": "SMTP Password"},
    "smtp_from_email": {"value": "", "description": "Email Sender Address"},
    "telegram_bot_token": {"value": "", "description": "Telegram Bot Token for global notifications"},
    "telegram_chat_id": {"value": "", "description": "Telegram Chat ID for global notifications"},
    "notify_email_recipient": {"value": "", "description": "Default recipient for email notifications"},
    "default_landing_page": {"value": "live", "description": "Default page when opening the app (dashboard, timeline, live)"},
    
    # AI Detection Settings
    "ai_enabled": {"value": "false", "description": "Enable Global AI Detection Engine"},
    "ai_model": {"value": "yolo_v8", "description": "Global AI Model architecture (yolo_v8)"},
    "ai_hardware": {"value": "auto", "description": "Global AI Hardware Accelerator (auto, nvidia, cpu)"},
    
    # Log Settings
    "log_max_size_mb": {"value": "50", "description": "Maximum size of a log file before rotation (MB)"},
    "log_backup_count": {"value": "5", "description": "Number of rotated log files to keep"},
    "log_rotation_check_minutes": {"value": "60", "description": "How often to check for log rotation (minutes)"},

    # Optimization Settings (Advanced)
    "opt_live_view_fps_throttle": {"value": "2", "description": "Process every Nth frame for Live View (higher = less CPU)"},
    "opt_motion_fps_throttle": {"value": "3", "description": "Process every Nth frame for Motion Detection (higher = less CPU)"},
    "opt_live_view_height_limit": {"value": "720", "description": "Max height for live stream (downscales if larger)"},
    "opt_motion_analysis_height": {"value": "180", "description": "Height for motion analysis resizing (smaller = faster)"},
    "opt_live_view_quality": {"value": "60", "description": "JPEG Quality for live stream (1-100)"},
    "opt_snapshot_quality": {"value": "90", "description": "JPEG Quality for snapshots (1-100)"},
    "opt_ffmpeg_preset": {"value": "ultrafast", "description": "FFmpeg preset for transcoding (ultrafast, superfast, veryfast, faster, fast, medium)"},
    "opt_verbose_engine_logs": {"value": "false", "description": "Enable verbose logs from PyAV/FFmpeg in the engine"},
    "default_live_view_mode": {"value": "auto", "description": "Default streaming mode for new cameras (auto, webcodecs, mjpeg)"},

}

@router.post("/init-defaults")
def init_default_settings(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth_service.get_current_active_admin)):
    """Initialize default settings if they don't exist"""
    created = 0
    updated = 0
    removed = 0
    logger.info("Checking system settings initialization...")
    for key, data in DEFAULT_SETTINGS.items():
        existing = db.query(models.SystemSettings).filter(models.SystemSettings.key == key).first()
        if not existing:
            logger.info(f"Initializing missing setting: {key} = {data['value']}")
            set_setting(db, key, data["value"], data["description"])
            created += 1
        elif key == "ai_model" and existing.value != "yolo_v8":
            logger.info("Normalizing legacy ai_model setting to yolo_v8")
            existing.value = "yolo_v8"
            existing.description = data["description"]
            updated += 1

    legacy_removed_settings = (
        db.query(models.SystemSettings)
        .filter(models.SystemSettings.key.in_(tuple(REMOVED_SETTINGS)))
        .all()
    )
    for legacy_setting in legacy_removed_settings:
        db.delete(legacy_setting)
        removed += 1

    if updated > 0 or removed > 0:
        db.commit()
    
    if created > 0:
        logger.info(f"Successfully initialized {created} default settings.")
    if updated > 0:
        logger.info(f"Normalized {updated} legacy AI settings.")
    if removed > 0:
        logger.info(f"Removed {removed} deprecated settings.")
    return {"message": f"Initialized {created} default settings", "normalized": updated, "removed": removed}

# Rate limiting for orphan sync (prevent abuse)
_last_orphan_sync_time = None

from fastapi import BackgroundTasks

# State for orphan sync background task
# NOTE: This uses in-memory global state. This limits the application to running with
# a single worker process (default for uvicorn). If multiple workers are used (e.g. gunicorn),
# this state will not be shared, and status polling will fail.
_sync_state = {
    "status": "idle",
    "result": None,
    "started_at": None,
    "completed_at": None
}

@router.get("/sync-orphans/status")
def get_orphan_sync_status(current_user: models.User = Depends(auth_service.get_current_active_admin)):
    """Get the status of the orphan sync background task"""
    return _sync_state

@router.post("/sync-orphans")
def sync_orphan_recordings(
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(auth_service.get_current_active_admin)
):
    """
    Manually trigger orphan recording recovery.
    Scans /data/ for recordings not in the database and imports them.
    Admin-only with 5-minute cooldown to prevent abuse.
    Runs in background.
    """
    import time
    global _last_orphan_sync_time, _sync_state
    
    # Rate limit: 5 minutes between runs
    if _last_orphan_sync_time:
        elapsed = time.time() - _last_orphan_sync_time
        if elapsed < 300:  # 5 minutes, but allow retry if error or complete
            # If currently running, definitely block
            if _sync_state["status"] == "running":
                 raise HTTPException(status_code=409, detail="Sync already in progress")
            
            # If recently completed, enforce limit? 
            # User wants to run it. Let's enforce rate limit to prevent disk thrashing.
            remaining = int(300 - elapsed)
            raise HTTPException(
                status_code=429, 
                detail=f"Please wait {remaining} seconds before running again"
            )
    
    _last_orphan_sync_time = time.time()
    
    # Reset state
    _sync_state["status"] = "running"
    _sync_state["result"] = None
    _sync_state["started_at"] = time.time()
    _sync_state["completed_at"] = None
    
    def run_sync_task():
        global _sync_state
        try:
            import sync_recordings
            print(f"[Admin] User {current_user.username} triggered orphan sync (Background Task Started)", flush=True)
            stats = sync_recordings.sync_recordings(dry_run=False)
            
            _sync_state["result"] = stats
            _sync_state["status"] = "completed"
            
            if "error" in stats: # Check if script returned error dict
                 _sync_state["status"] = "error"

            print(f"[Admin] Orphan sync background task finished.", flush=True)
        except Exception as e:
            print(f"[Admin] Orphan sync error: {e}", flush=True)
            _sync_state["status"] = "error"
            _sync_state["result"] = {"error": str(e)}
        finally:
            _sync_state["completed_at"] = time.time()
            # Also log purely for visibility if needed, though script prints it too.
            # But the script print might be inside the function.
            # Since we imported sync_recordings, its print goes to stdout.
            # We already added the print inside sync_recordings.py, so it should be fine.
            # However, if we want to be 100% sure the return value (result) is also logged in format:
            try:
                import json
                if _sync_state["result"]:
                     print(f"JSON_SUMMARY:{json.dumps(_sync_state['result'])}")
            except:
                pass

    background_tasks.add_task(run_sync_task)
    return {"message": "Orphan recording recovery started in background."}

@router.post("/test-notify")
def test_notification(config: schemas.TestNotificationConfig, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth_service.get_current_active_admin)):
    """Send a test notification synchronously using provided credentials, falling back to DB defaults"""
    try:
        channel = config.channel
        settings = config.settings
        
        # Helper to get setting from payload OR database
        def get_conf(key, default=None):
            val = settings.get(key)
            if val: return val
            return get_setting(db, key) or default

        if channel == "email":
            import smtplib
            from email.mime.text import MIMEText
            
            import socket
            
            smtp_server = get_conf("smtp_server")
            smtp_port = int(get_conf("smtp_port", "587"))
            smtp_user = get_conf("smtp_username")
            smtp_pass = get_conf("smtp_password")
            smtp_from = get_conf("smtp_from_email")
            
            # Recipient priority: Payload 'recipient' -> DB 'notify_email_recipient'
            recipient = settings.get("recipient") 
            if not recipient:
                recipient = get_setting(db, "notify_email_recipient")
            
            if not all([smtp_server, smtp_from, recipient]):
                raise ValueError("Missing required Email settings (Server, From, Recipient). Configure them in Global Settings first.")
                
            msg = MIMEText("This is a test notification from WatchX.\nIf you see this, your Email settings are correct!")
            msg['Subject'] = "WatchX Test Notification"
            msg['From'] = smtp_from
            msg['To'] = recipient
            
            try:
                # Handle implicit SSL (Port 465) vs STARTTLS (Port 587/25)
                if smtp_port == 465:
                    server = smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=10)
                else:
                    server = smtplib.SMTP(smtp_server, smtp_port, timeout=10)
                    server.starttls()
                
                with server:
                    if smtp_user and smtp_pass:
                        try:
                            server.login(smtp_user, smtp_pass)
                        except smtplib.SMTPAuthenticationError:
                            raise ValueError("Authentication failed: Incorrect Username or Password.")
                    
                    server.send_message(msg)
            except (socket.timeout, ConnectionRefusedError, OSError) as e:
                 raise ValueError(f"Connection failed: Unable to connect to {smtp_server}:{smtp_port}. ({str(e)})")
            except smtplib.SMTPException as e:
                 raise ValueError(f"SMTP Error: {str(e)}")
                 
            return {"status": "success", "message": f"Test email sent to {recipient}"}
            
        elif channel == "telegram":
            token = get_conf("telegram_bot_token")
            chat_id = settings.get("telegram_chat_id") or get_conf("telegram_chat_id")
            
            if not token or not chat_id:
                raise ValueError("Missing Telegram Token or Chat ID. Configure them in Global Settings first.")
                
            api_url = f"https://api.telegram.org/bot{token}/sendMessage"
            payload = {
                "chat_id": chat_id,
                "text": "🔔 WatchX Test Notification\n\nSuccess! Your Telegram bot is configured correctly."
            }
            
            resp = requests.post(api_url, json=payload, timeout=10)
            if not resp.ok:
                raise ValueError(f"Telegram API Error: {resp.text}")
                
            return {"status": "success", "message": "Test Telegram message sent"}
            
        else:
            raise ValueError(f"Unknown channel: {channel}")
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
