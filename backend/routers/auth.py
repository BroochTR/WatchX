from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

import auth_service
import crud
import database
import models
import schemas

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)


@router.post("/login", response_model=schemas.Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db)
):
    user = crud.get_user_by_username(
        db,
        username=form_data.username
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    if not auth_service.verify_password(
        form_data.password,
        user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    access_token_expires = timedelta(
        minutes=auth_service.ACCESS_TOKEN_EXPIRE_MINUTES
    )

    access_token = auth_service.create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=schemas.User)
async def me(
    current_user: models.User = Depends(
        auth_service.get_current_user
    )
):
    return current_user


@router.post("/setup", response_model=schemas.User)
def setup_admin(
    user: schemas.UserCreate,
    db: Session = Depends(database.get_db)
):
    existing_user = db.query(models.User).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Setup already completed"
        )

    user.role = "admin"

    return crud.create_user(
        db=db,
        user=user
    )