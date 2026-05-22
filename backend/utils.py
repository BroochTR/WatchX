import os
import re

WATCHX_STORAGE_ROOT = "/var/lib/watchx/recordings"
LEGACY_MOTION_STORAGE_ROOT = "/var/lib/motion"
ENGINE_STORAGE_ROOTS = (WATCHX_STORAGE_ROOT,)

def mask_url(text: str) -> str:
    """Mask credentials in RTSP/HTTP URLs for safe logging."""
    if not text: return ""
    # Redact credentials in URLs (rtsp://user:pass@host)
    # Supports both standard and those with special characters in the login/password
    return re.sub(r'([a-z0-9]+://[^:]+:)([^@]+)(@)', r'\1*****\3', text, flags=re.IGNORECASE)

def normalize_engine_storage_path(path: str | None) -> str | None:
    """Normalize engine-managed recording paths to the current WatchX root."""
    if not path:
        return path
    for prefix in ENGINE_STORAGE_ROOTS:
        if path.startswith(prefix):
            return path.replace(prefix, WATCHX_STORAGE_ROOT, 1)
    return path

def data_path_from_engine_path(path: str | None) -> str | None:
    """Map engine or legacy motion paths into the backend /data mount."""
    if not path:
        return path
    for prefix in ENGINE_STORAGE_ROOTS:
        if path.startswith(prefix):
            return path.replace(prefix, "/data", 1)
    if path.startswith(LEGACY_MOTION_STORAGE_ROOT):
        return path.replace(LEGACY_MOTION_STORAGE_ROOT, "/data", 1)
    return path

def is_allowed_storage_path(path: str | None) -> bool:
    """Allow only paths inside mounted storage roots."""
    if not path:
        return False
    abs_path = os.path.abspath(path)
    return abs_path.startswith("/data") or any(abs_path.startswith(prefix) for prefix in ENGINE_STORAGE_ROOTS)
