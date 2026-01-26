"""交易图片上传API"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import List
from pathlib import Path
from uuid import uuid4
from datetime import date
from PIL import Image
import io
from sqlalchemy.orm import Session
from app.api.v1.auth import get_current_user
from app.deps import get_db
from app.models.transaction import Transaction
from app.models.transaction_image import TransactionImage

router = APIRouter(prefix="/transactions/{transaction_id}/images", tags=["transaction_images"])

# 数据目录配置
DATA_DIR = Path(__file__).resolve().parents[4] / "data"
UPLOAD_DIR = DATA_DIR / "transaction_images"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("", summary="上传交易图片")
async def upload_transaction_images(
    transaction_id: int,
    files: List[UploadFile] = File(..., description="图片文件"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """上传交易相关图片（收据、发票等）"""
    # 验证交易所有权
    transaction = db.query(Transaction).filter_by(
        id=transaction_id,
        user_id=current_user["id"]
    ).first()

    if not transaction:
        raise HTTPException(status_code=404, detail="交易不存在")

    uploaded_images = []

    for file in files:
        # 验证文件类型
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail=f"{file.filename} 不是图片文件")

        # 创建用户目录结构
        username_safe = current_user.get("username", "user")
        date_str = date.today().strftime("%Y_%m_%d")
        user_dir = UPLOAD_DIR / username_safe / date_str
        user_dir.mkdir(parents=True, exist_ok=True)

        # 生成唯一文件名
        file_ext = Path(file.filename).suffix
        unique_filename = f"{uuid4().hex}{file_ext}"
        file_path = user_dir / unique_filename

        # 保存文件
        content = await file.read()
        file_path.write_bytes(content)

        # 获取图片尺寸
        try:
            img = Image.open(io.BytesIO(content))
            width, height = img.size
        except Exception:
            width, height = None, None

        # 创建数据库记录
        rel_path = file_path.relative_to(DATA_DIR).as_posix()
        db_image = TransactionImage(
            transaction_id=transaction_id,
            file_path=rel_path,
            file_name=file.filename,
            file_size=len(content),
            mime_type=file.content_type,
            width=width,
            height=height
        )

        db.add(db_image)
        db.commit()
        db.refresh(db_image)

        uploaded_images.append({
            "id": db_image.id,
            "file_path": db_image.file_path,
            "file_name": db_image.file_name
        })

    return {
        "success": True,
        "data": uploaded_images,
        "message": f"成功上传 {len(uploaded_images)} 张图片"
    }


@router.delete("/{image_id}", summary="删除交易图片")
async def delete_transaction_image(
    transaction_id: int,
    image_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除交易图片"""
    # 验证交易所有权
    transaction = db.query(Transaction).filter_by(
        id=transaction_id,
        user_id=current_user["id"]
    ).first()

    if not transaction:
        raise HTTPException(status_code=404, detail="交易不存在")

    # 获取图片
    image = db.query(TransactionImage).filter_by(
        id=image_id,
        transaction_id=transaction_id
    ).first()

    if not image:
        raise HTTPException(status_code=404, detail="图片不存在")

    # 删除物理文件
    file_path = DATA_DIR / image.file_path
    if file_path.exists():
        file_path.unlink()

    # 删除数据库记录
    db.delete(image)
    db.commit()

    return {"success": True, "message": "图片已删除"}
