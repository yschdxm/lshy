"""
知识库文档 CRUD 接口
答辩要点：支撑 RAG 知识检索，分类管理景区资料
"""
import io
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.models.knowledge_document import KnowledgeDocument
from app.schemas.knowledge_document import KnowledgeDocCreate, KnowledgeDocUpdate, KnowledgeDocResponse
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/api/knowledge", tags=["知识库管理"])


@router.get("", response_model=PaginatedResponse[KnowledgeDocResponse])
async def list_docs(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    category: Optional[str] = Query(None, description="分类筛选"),
    keyword: Optional[str] = Query(None, description="标题/内容搜索"),
    db: Session = Depends(get_db),
):
    """获取知识库文档列表，支持分类筛选和关键词搜索"""
    query = db.query(KnowledgeDocument)

    if category:
        query = query.filter(KnowledgeDocument.category == category)
    if keyword:
        query = query.filter(
            KnowledgeDocument.title.contains(keyword) |
            KnowledgeDocument.content.contains(keyword)
        )

    total = query.count()
    items = (
        query.order_by(KnowledgeDocument.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return PaginatedResponse(
        items=[KnowledgeDocResponse.model_validate(d) for d in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{doc_id}", response_model=KnowledgeDocResponse)
async def get_doc(doc_id: int, db: Session = Depends(get_db)):
    """获取单个文档详情"""
    doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")
    return KnowledgeDocResponse.model_validate(doc)


@router.post("", response_model=KnowledgeDocResponse, status_code=201)
async def create_doc(data: KnowledgeDocCreate, db: Session = Depends(get_db)):
    """创建知识文档，若状态为'已发布'则自动向量化"""
    doc = KnowledgeDocument(**data.model_dump())
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # 已发布 → 自动加入向量库
    if doc.status == "已发布":
        try:
            from app.services.rag_service import rag_service
            rag_service.add_document(doc.title, doc.content, doc.category)
        except Exception:
            pass

    return KnowledgeDocResponse.model_validate(doc)


@router.put("/{doc_id}", response_model=KnowledgeDocResponse)
async def update_doc(doc_id: int, data: KnowledgeDocUpdate, db: Session = Depends(get_db)):
    """更新知识文档，若状态变为已发布则自动向量化"""
    doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(doc, key, value)

    db.commit()
    db.refresh(doc)

    # 已发布 → 自动加入向量库（增量更新）
    if doc.status == "已发布":
        try:
            from app.services.rag_service import rag_service
            rag_service.add_document(doc.title, doc.content, doc.category)
        except Exception:
            pass

    return KnowledgeDocResponse.model_validate(doc)


@router.delete("/{doc_id}", status_code=204)
async def delete_doc(doc_id: int, db: Session = Depends(get_db)):
    """删除知识文档"""
    doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")
    db.delete(doc)
    db.commit()


@router.post("/parse-file")
async def parse_file(file: UploadFile = File(...)):
    """上传文件并解析文本内容"""
    ext = (file.filename or '').rsplit('.', 1)[-1].lower() if file.filename else ''
    contents = await file.read()

    try:
        if ext in ('txt', 'md'):
            text = contents.decode('utf-8')
        elif ext == 'docx':
            from docx import Document as DocxDocument
            doc = DocxDocument(io.BytesIO(contents))
            text = '\n'.join(p.text for p in doc.paragraphs if p.text.strip())
        elif ext in ('xlsx', 'xls'):
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(contents))
            lines = []
            for ws in wb.worksheets:
                lines.append(f'--- {ws.title} ---')
                for row in ws.iter_rows(values_only=True):
                    lines.append('\t'.join(str(c) if c is not None else '' for c in row))
            text = '\n'.join(lines)
        elif ext == 'pdf':
            # PDF 简易提取：尝试 PyPDF2，不可用则提示
            try:
                from PyPDF2 import PdfReader
                reader = PdfReader(io.BytesIO(contents))
                text = '\n'.join(p.extract_text() or '' for p in reader.pages)
            except ImportError:
                raise HTTPException(status_code=400, detail="PDF 解析需要安装 PyPDF2 库")
        elif ext == 'pptx':
            from pptx import Presentation
            prs = Presentation(io.BytesIO(contents))
            lines = []
            for slide in prs.slides:
                for shape in slide.shapes:
                    if shape.has_text_frame:
                        for para in shape.text_frame.paragraphs:
                            if para.text.strip():
                                lines.append(para.text)
            text = '\n'.join(lines)
        else:
            raise HTTPException(status_code=400, detail=f"不支持的文件格式: .{ext}")

        if not text or not text.strip():
            raise HTTPException(status_code=400, detail="文件内容为空或无法解析")

        name = file.filename.rsplit('.', 1)[0] if file.filename else '未命名'
        return {"title": name, "content": text.strip()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件解析失败: {str(e)}")
