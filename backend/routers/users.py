from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import crud
import database
import schemas
import models
import auth_service

router = APIRouter(
    prefix="/users",
    tags=["users"]
)


@router.get("", response_model=List[schemas.User])
def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth_service.get_current_active_admin)
):
    return crud.get_users(db, skip=skip, limit=limit)


@router.post("", response_model=schemas.User)
def create_user(
    user: schemas.UserCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth_service.get_current_active_admin)
):
    db_user = crud.get_user_by_username(db, username=user.username)

    if db_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    return crud.create_user(db=db, user=user)


@router.delete("/{user_id}", response_model=schemas.User)
def delete_user(
    user_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth_service.get_current_active_admin)
):
    db_user = crud.delete_user(db, user_id=user_id)

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    return db_user


@router.put("/{user_id}/password")
def update_password(
    user_id: int,
    passwords: schemas.UserPasswordUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth_service.get_current_user)
):
    db_user = crud.get_user(db, user_id=user_id)

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Permission denied")

    if not auth_service.verify_password(
        passwords.old_password,
        current_user.hashed_password
    ):
        raise HTTPException(status_code=400, detail="Invalid password")

    hashed_password = auth_service.get_password_hash(
        passwords.new_password
    )

    crud.update_user_password(
        db,
        user_id=user_id,
        hashed_password=hashed_password
    )

    return {"success": True}