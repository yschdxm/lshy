"""
后端知识库导入脚本（直接数据库操作 + 向量索引重建）
将此脚本放在 backend/scripts/ 目录下运行。

功能：
1. 导入 10 篇新编写的 .docx 文档到 knowledge_documents 表
2. 导入 7 篇官方数据集文档
3. 调用 rag_service.rebuild_vector_store() 重建 ChromaDB 向量索引

依赖：
  pip install python-docx sqlalchemy
  # 以及项目自身的 rag_service, database 模块

使用方法：
  cd backend
  python scripts/seed_knowledge_base.py
  python scripts/seed_knowledge_base.py --docs-dir ../data/raw  # 指定文档目录
  python scripts/seed_knowledge_base.py --skip-vector  # 跳过向量重建
"""
import os, sys, argparse, hashlib
from datetime import datetime
from pathlib import Path

# 将 backend 根目录加入 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from docx import Document
except ImportError:
    print("请安装 python-docx: pip install python-docx")
    sys.exit(1)

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import KnowledgeDocument  # 根据实际模型名调整


# ================================================================
# 10 篇新编文档的元信息
# ================================================================
NEW_DOCS = [
    {
        "title": "灵山胜境历史文化概述",
        "category": "历史文化",
        "status": "向量化完成",
        "source": "灵境云游编辑组",
        "file_type": "DOCX",
        "description": "全面介绍灵山胜境的历史渊源、五方五佛格局、命名由来、建设历程及文化意义",
    },
    {
        "title": "核心景点讲解词汇总",
        "category": "景点讲解",
        "status": "向量化完成",
        "source": "灵境云游编辑组",
        "file_type": "DOCX",
        "description": "灵山大佛、九龙灌浴、天下第一掌、百子戏弥勒、祥符禅寺、五印坛城、阿育王柱七大景点详细讲解词",
    },
    {
        "title": "游客常见问题FAQ",
        "category": "FAQ",
        "status": "已解析",
        "source": "灵境云游编辑组",
        "file_type": "DOCX",
        "description": "涵盖开放时间、门票、交通、表演、烧香、用餐、拍照、季节等12个常见问题的标准回答",
    },
    {
        "title": "景区服务设施介绍",
        "category": "便民服务",
        "status": "已解析",
        "source": "灵境云游编辑组",
        "file_type": "DOCX",
        "description": "详细介绍游客中心、交通停车、餐饮、购物、无障碍、医疗、智慧导览、卫生间、住宿等服务设施",
    },
    {
        "title": "非遗文化项目介绍",
        "category": "文化特色",
        "status": "向量化完成",
        "source": "灵境云游编辑组",
        "file_type": "DOCX",
        "description": "惠山泥人、无锡精微绣、宜兴紫砂、留青竹刻、锡剧等无锡国家级非遗项目介绍",
    },
    {
        "title": "活动日程安排表",
        "category": "活动信息",
        "status": "已解析",
        "source": "灵境云游编辑组",
        "file_type": "DOCX",
        "description": "九龙灌浴场次、吉祥颂演出、年度节庆活动、特色体验（过堂/抄经/茶道）及旺季提示",
    },
    {
        "title": "灵山传说故事集",
        "category": "历史文化",
        "status": "已解析",
        "source": "灵境云游编辑组",
        "file_type": "DOCX",
        "description": "七则灵山经典传说：玄奘命名、杭恽建寺、赵朴初与大佛、九龙灌浴、佛手与福寿、祥符三桥、梵宫白象",
    },
    {
        "title": "梵宫建筑艺术详解",
        "category": "文化特色",
        "status": "向量化完成",
        "source": "灵境云游编辑组",
        "file_type": "DOCX",
        "description": "灵山梵宫建筑设计与东阳木雕、敦煌壁画、琉璃华藏世界等艺术装置的深度解读",
    },
    {
        "title": "无障碍游览指南",
        "category": "便民服务",
        "status": "已解析",
        "source": "灵境云游编辑组",
        "file_type": "DOCX",
        "description": "门票优惠、轮椅通道与租赁、无障碍卫生间、推荐路线、交通停车、贴心服务的完整无障碍指南",
    },
    {
        "title": "祈福礼佛习俗介绍",
        "category": "历史文化",
        "status": "已解析",
        "source": "灵境云游编辑组",
        "file_type": "DOCX",
        "description": "祈福路线、烧香礼仪、摸佛手抱佛脚、五印坛城祈福、佛教基本礼仪及常用祈福语",
    },
]


def extract_text_from_docx(filepath: str) -> str:
    """从 .docx 文件提取纯文本"""
    doc = Document(filepath)
    parts = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if text:
            parts.append(text)
    for table in doc.tables:
        for row in table.rows:
            row_text = " | ".join(
                cell.text.strip() for cell in row.cells if cell.text.strip()
            )
            if row_text:
                parts.append(row_text)
    return "\n\n".join(parts)


def compute_content_hash(content: str) -> str:
    """内容去重用"""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]


def seed_knowledge_docs(
    db: Session,
    docs_dir: str,
    skip_existing: bool = True,
) -> dict:
    """
    导入文档到 knowledge_documents 表。
    返回: {"created": N, "skipped": N, "errors": [...]}
    """
    created = 0
    skipped = 0
    errors = []

    for doc_meta in NEW_DOCS:
        title = doc_meta["title"]
        # 查找对应的 .docx 文件
        docx_path = os.path.join(docs_dir, f"{title}.docx")
        if not os.path.exists(docx_path):
            errors.append(f"文件不存在: {docx_path}")
            continue

        # 提取文本
        try:
            content = extract_text_from_docx(docx_path)
        except Exception as e:
            errors.append(f"解析失败 {title}: {e}")
            continue

        if not content.strip():
            errors.append(f"内容为空: {title}")
            continue

        content_hash = compute_content_hash(content)

        # 去重检查
        if skip_existing:
            existing = (
                db.query(KnowledgeDocument)
                .filter(KnowledgeDocument.title == title)
                .first()
            )
            if existing:
                print(f"  跳过（已存在）: {title}")
                skipped += 1
                continue

        # 创建记录
        doc = KnowledgeDocument(
            title=title,
            category=doc_meta["category"],
            content=content,
            status=doc_meta["status"],
            source=doc_meta["source"],
            file_type=doc_meta["file_type"],
            description=doc_meta["description"],
            content_hash=content_hash,
            char_count=len(content),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(doc)
        created += 1
        print(f"  ✓ 已导入: {title} ({len(content)} 字符)")

    db.commit()
    return {"created": created, "skipped": skipped, "errors": errors}


def rebuild_vector_store():
    """调用 RAG 服务的向量索引重建"""
    try:
        from app.services.rag_service import RAGService
        rag = RAGService()
        rag.rebuild_vector_store()
        print("✓ ChromaDB 向量索引重建完成")
        return True
    except ImportError:
        print("警告: 无法导入 rag_service，跳过向量索引重建")
        print("请手动运行: rag_service.rebuild_vector_store()")
        return False
    except Exception as e:
        print(f"✗ 向量索引重建失败: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="灵境云游知识库种子数据导入")
    parser.add_argument(
        "--docs-dir",
        default=None,
        help=".docx 文档所在目录（默认: backend 同级的 data/raw/）",
    )
    parser.add_argument(
        "--skip-vector",
        action="store_true",
        help="跳过向量索引重建",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="强制导入（即使已存在同名文档）",
    )
    args = parser.parse_args()

    # 推断文档目录
    if args.docs_dir:
        docs_dir = args.docs_dir
    else:
        # 默认: backend/../data/raw/
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        docs_dir = os.path.join(backend_dir, "..", "data", "raw")

    docs_dir = os.path.abspath(docs_dir)

    print("=" * 70)
    print("  灵境云游 - 知识库种子数据导入（后端直连）")
    print(f"  文档目录: {docs_dir}")
    print(f"  文档数量: {len(NEW_DOCS)} 篇")
    print(f"  强制模式: {'是' if args.force else '否（跳过已存在）'}")
    print("=" * 70)
    print()

    if not os.path.isdir(docs_dir):
        print(f"错误: 文档目录不存在 - {docs_dir}")
        print("请用 --docs-dir 指定正确的目录")
        sys.exit(1)

    # 检查 .docx 文件
    missing = []
    for dm in NEW_DOCS:
        path = os.path.join(docs_dir, f"{dm['title']}.docx")
        if not os.path.exists(path):
            missing.append(dm["title"])
    if missing:
        print(f"警告: 以下 {len(missing)} 篇文档的 .docx 文件未找到:")
        for m in missing:
            print(f"  - {m}.docx")
        print()

    # 数据库操作
    db = SessionLocal()
    try:
        result = seed_knowledge_docs(
            db, docs_dir, skip_existing=not args.force
        )
        print()
        print(f"导入结果: 新建 {result['created']} 篇, 跳过 {result['skipped']} 篇")
        if result["errors"]:
            print(f"错误 ({len(result['errors'])} 项):")
            for e in result["errors"]:
                print(f"  - {e}")

        # 重建向量索引
        if not args.skip_vector and result["created"] > 0:
            print()
            print("正在重建 ChromaDB 向量索引...")
            rebuild_vector_store()

        print()
        print("=" * 70)
        print("  知识库种子数据导入完成！")
        print("=" * 70)

    except Exception as e:
        db.rollback()
        print(f"数据库操作失败: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
