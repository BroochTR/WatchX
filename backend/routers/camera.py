from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import crud
import schemas
import database
import auth_service
import motion_service
import models

router = APIRouter(
    prefix="/cameras",
    tags=["cameras"]
)

@router.post("", response_model=schemas.Camera)
def create_camera(
    camera: schemas.CameraCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth_service.get_current_active_admin)
):
    db_camera = crud.create_camera(db, camera)
    motion_service.generate_motion_config(db)
    return db_camera


@router.get("", response_model=list[schemas.Camera])
def read_cameras(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth_service.get_current_active_user)
):
    return crud.get_cameras(db)


@router.get("/{camera_id}", response_model=schemas.Camera)
def read_camera(
    camera_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth_service.get_current_active_user)
):
    camera = crud.get_camera(db, camera_id)

    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    return camera


@router.put("/{camera_id}", response_model=schemas.Camera)
def update_camera(
    camera_id: int,
    camera: schemas.CameraCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth_service.get_current_active_admin)
):
    db_camera = crud.update_camera(db, camera_id, camera)

    if not db_camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    motion_service.generate_motion_config(db)

    return db_camera


@router.delete("/{camera_id}")
def delete_camera(
    camera_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth_service.get_current_active_admin)
):
    camera = crud.delete_camera(db, camera_id)

    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    motion_service.generate_motion_config(db)

    return {"success": True}