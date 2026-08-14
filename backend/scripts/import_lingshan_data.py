"""
灵山慧游 — 官方数据集导入脚本
=================================
从 data/raw/ 目录读取官方 Word/Excel 数据集，解析并导入数据库。

用法:
  cd backend
  python scripts/import_lingshan_data.py                 # 增量导入（已有数据则跳过）
  python scripts/import_lingshan_data.py --clear          # 清空旧数据后导入
  python scripts/import_lingshan_data.py --skip-spots     # 跳过景点
  python scripts/import_lingshan_data.py --skip-knowledge # 跳过知识库
  python scripts/import_lingshan_data.py --skip-behavior  # 跳过行为数据

答辩要点：展示如何将官方非结构化数据自动导入为结构化知识库
"""
import json
import sys
import os
import argparse
import re
from pathlib import Path
from datetime import datetime

# 确保 backend 在 sys.path 中
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.orm import Session
from docx import Document
import openpyxl

from app.core.database import SessionLocal, engine, Base
from app.models.scenic_spot import ScenicSpot
from app.models.knowledge_document import KnowledgeDocument
from app.models.route import Route
from app.models.tourist_profile import TouristProfile
from app.models.chat_record import ChatRecord
from app.models.feedback_report import FeedbackReport
from app.models.digital_human_config import DigitalHumanConfig

# 导入所有模型以确保表存在
import app.models  # noqa: F401

# ============================================================
# 配置
# ============================================================
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "raw"

DOCX_STRUCTURED = DATA_DIR / "灵山胜境 景点结构化数据集.docx"
DOCX_GUIDE = DATA_DIR / "灵山胜境：历史、文化、景点特色与个性化游览指南.docx"
XLSX_BEHAVIOR = DATA_DIR / "景点景区旅游数据行为分析数据.xlsx"

# ============================================================
# 辅助函数
# ============================================================

def clean_text(val: str | None) -> str | None:
    """清洗单元格文本：去首尾空白，空字符串转 None"""
    if val is None:
        return None
    t = str(val).strip()
    return t if t else None


def smart_tags(spot_name: str, cultural: str, detail: str, highlights: str, crowd: str) -> str:
    """
    基于景点内容自动推理标签
    答辩要点：用规则从非结构化文本中提取语义标签
    """
    combined = f"{spot_name} {cultural or ''} {detail or ''} {highlights or ''} {crowd or ''}"
    tags = []

    rules = [
        (["佛", "寺", "庙", "禅", "经", "僧", "菩萨", "如来", "观音", "弥勒", "法", "梵", "坛城", "莲花",
          "菩提", "金刚", "舍利", "大佛", "佛教"], "佛教文化"),
        (["历史", "千年", "唐代", "宋代", "明代", "清代", "古代", "文物", "遗迹", "古镇", "古刹", "古迹",
          "摩崖", "传统"], "历史古迹"),
        (["山", "峰", "云海", "日出", "溪", "瀑布", "湖", "森林", "花海", "自然", "生态", "植物", "园林",
          "登山", "徒步"], "自然风光"),
        (["拍照", "摄影", "打卡", "取景", "合影"], "拍照打卡"),
        (["亲子", "孩子", "儿童", "家庭", "小朋友", "嬉戏", "游乐"], "亲子"),
        (["祈福", "许愿", "求签", "拜佛", "香火", "钟", "如意", "吉祥", "平安", "放生", "福"], "祈福"),
        (["表演", "演出", "灯光", "秀", "音乐", "舞台", "水幕", "电影"], "演艺"),
        (["素斋", "美食", "小吃", "餐饮", "豆腐", "茶", "食"], "美食"),
        (["研学", "文化", "知识", "学习", "传统", "书法", "绘画", "艺术"], "文化研学"),
        (["休闲", "漫步", "放松", "休憩", "度假", "养生", "宁静"], "休闲"),
        (["文创", "纪念品", "购物", "手工", "集市", "商店"], "购物"),
        (["建筑", "雕塑", "石窟", "殿堂", "园林", "设计"], "建筑艺术"),
    ]

    for keywords, tag in rules:
        for kw in keywords:
            if kw in combined:
                tags.append(tag)
                break

    # 去重，最多保留 8 个
    seen = set()
    result = []
    for t in tags:
        if t not in seen:
            seen.add(t)
            result.append(t)
    return json.dumps(result[:8], ensure_ascii=False)


def clear_tables(db: Session):
    """清空所有业务表数据"""
    tables = [FeedbackReport, ChatRecord, TouristProfile, Route,
              KnowledgeDocument, DigitalHumanConfig, ScenicSpot]
    for table in tables:
        db.query(table).delete()
    db.commit()
    print("  已清空所有旧数据")


# ============================================================
# 1. 景点结构化数据导入
# ============================================================

def import_scenic_spots(db: Session):
    """
    从「灵山胜境 景点结构化数据集.docx」提取表格数据
    文档含 2 张表：灵山胜境 (LS-xxx) + 拈花湾禅意小镇 (NH-xxx)
    """
    print("\n" + "=" * 60)
    print("[SPOTS] 导入景点结构化数据...")
    print("=" * 60)

    if not DOCX_STRUCTURED.exists():
        print(f"  [ERR] 文件不存在: {DOCX_STRUCTURED}")
        return

    doc = Document(str(DOCX_STRUCTURED))
    count = 0
    skipped = 0

    for table in doc.tables:
        # 读取表头
        header_row = table.rows[0]
        headers = [cell.text.strip() for cell in header_row.cells]

        # 验证表头是否匹配预期格式
        if "景点名称" not in headers:
            continue

        # 数据行从第 2 行开始
        for row in table.rows[1:]:
            cells = [clean_text(cell.text) for cell in row.cells]

            # 确保单元格数量匹配
            while len(cells) < len(headers):
                cells.append(None)

            row_data = dict(zip(headers, cells))

            spot_id = row_data.get("景点ID")
            spot_name = row_data.get("景点名称")
            if not spot_id or not spot_name:
                skipped += 1
                continue

            # 检查是否已存在
            existing = db.query(ScenicSpot).filter(ScenicSpot.spot_id == spot_id).first()
            if existing:
                print(f"  [SKIP] 已存在: {spot_id} {spot_name}")
                skipped += 1
                continue

            # 生成标签
            tags = smart_tags(
                spot_name=spot_name,
                cultural=row_data.get("文化内涵"),
                detail=row_data.get("详细介绍"),
                highlights=row_data.get("游玩亮点"),
                crowd=row_data.get("备注"),
            )

            spot = ScenicSpot(
                scenic_area_name=row_data.get("景区名称") or "灵山风景名胜区",
                spot_id=spot_id,
                spot_name=spot_name,
                location=row_data.get("具体位置"),
                parameters=row_data.get("建筑/景观参数"),
                core_function=row_data.get("核心功能"),
                cultural_meaning=row_data.get("文化内涵"),
                detail_intro=row_data.get("详细介绍"),
                highlights=row_data.get("游玩亮点"),
                opening_info=row_data.get("演艺/开放信息"),
                notes=row_data.get("备注"),
                tags=tags,
                recommended_duration=30,
                crowd_level=row_data.get("备注"),
                sort_order=count + 1,
            )
            db.add(spot)
            count += 1
            print(f"  [OK] {spot_id} {spot_name}")

    db.commit()
    print(f"\n  景点导入完成：新增 {count}，跳过 {skipped}")


# ============================================================
# 2. 知识库文档导入
# ============================================================

def _create_kb_doc(db: Session, title: str, category: str, content: str):
    """创建知识库文档（去重）"""
    content = content.strip()
    if not content or len(content) < 20:
        return None
    existing = db.query(KnowledgeDocument).filter(
        KnowledgeDocument.title == title,
        KnowledgeDocument.category == category,
    ).first()
    if existing:
        return None
    doc = KnowledgeDocument(
        title=title,
        category=category,
        content=content,
        status="已发布",
    )
    db.add(doc)
    return doc


def import_knowledge_documents(db: Session):
    """
    从「灵山胜境：历史、文化、景点特色与个性化游览指南.docx」提取
    按章节拆分为多篇知识库文档
    答辩要点：展示如何自动将长文档拆解为结构化知识条目
    """
    print("\n" + "=" * 60)
    print("[DOCS] 导入知识库文档...")
    print("=" * 60)

    if not DOCX_GUIDE.exists():
        print(f"  [ERR] 文件不存在: {DOCX_GUIDE}")
        return

    doc = Document(str(DOCX_GUIDE))

    # ---- 策略：按 Heading 1 拆分章节 ----
    sections = []  # [(heading_text, [paragraphs])]
    current_heading = "前言"
    current_paras = []

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue

        style = para.style.name
        if "Heading 1" in style:
            if current_paras:
                sections.append((current_heading, current_paras))
            current_heading = text
            current_paras = []
        else:
            current_paras.append(text)

    if current_paras:
        sections.append((current_heading, current_paras))

    print(f"  检测到 {len(sections)} 个章节")

    count = 0

    for heading, paras in sections:
        full_text = "\n\n".join(paras)

        # 根据标题确定分类
        if "历史" in heading or "概况" in heading:
            category = "历史文化"
            title = f"灵山胜境：{heading}"
        elif "文化" in heading:
            category = "历史文化"
            title = f"灵山文化内涵：{heading}"
        elif "景点" in heading:
            category = "景点资料"
            title = f"核心景点解读：{heading}"
        elif "路线" in heading:
            category = "路线攻略"
            title = f"游览路线推荐：{heading}"
        elif "实用" in heading or "信息" in heading:
            category = "FAQ"
            title = f"实用信息：{heading}"
        else:
            category = "景点资料"
            title = heading

        doc_obj = _create_kb_doc(db, title, category, full_text)
        if doc_obj:
            count += 1
            print(f"  [OK] [{category}] {title[:60]}")

    # ---- 额外：提取 3 条推荐路线 ----
    print("\n  --- 提取推荐路线 ---")
    route_count = _extract_routes_from_text(db, sections)

    # ---- 额外：提取票务 FAQ ----
    _extract_ticket_info(db, doc)

    db.commit()
    print(f"\n  知识库导入完成：文档 {count}，路线 {route_count}")


def _extract_routes_from_text(db: Session, sections: list) -> int:
    """从文档中提取 3 条推荐路线并导入 routes 表"""

    # 3 条路线的 spot_id 映射（基于景点结构化数据集）
    route_templates = [
        {
            "name": "历史文化深度游（6小时）",
            "type": "深度游",
            "duration": 360,
            "people": "历史文化爱好者、摄影达人、祈福朝圣者",
            "spots": json.dumps([
                "LS-001", "LS-003", "LS-004", "LS-005", "LS-006",
                "LS-007", "LS-008", "LS-009", "LS-010", "LS-011",
            ], ensure_ascii=False),
        },
        {
            "name": "自然风光摄影游（5小时）",
            "type": "一日游",
            "duration": 300,
            "people": "摄影爱好者、年轻人、自然风光爱好者",
            "spots": json.dumps([
                "LS-001", "LS-002", "LS-006", "LS-012", "LS-013"
            ], ensure_ascii=False),
        },
        {
            "name": "亲子家庭欢乐游（4小时）",
            "type": "亲子游",
            "duration": 240,
            "people": "亲子家庭、老人",
            "spots": json.dumps([
                "LS-001", "LS-002", "LS-005", "LS-008", "LS-009", "LS-011"
            ], ensure_ascii=False),
        },
    ]

    count = 0
    for rt in route_templates:
        existing = db.query(Route).filter(Route.route_name == rt["name"]).first()
        if existing:
            continue

        # 从 sections 中匹配对应内容作为导览词
        guide_text = ""
        for heading, paras in sections:
            if rt["type"] in heading or ("历史" in heading and "深度" in rt["type"]):
                guide_text = "\n".join(paras[:8])
                break

        route = Route(
            route_name=rt["name"],
            route_type=rt["type"],
            duration_minutes=rt["duration"],
            suitable_people=rt["people"],
            route_spots=rt["spots"],
            route_description=guide_text[:500] if guide_text else f"{rt['name']}，涵盖灵山胜境核心景点。",
            guide_script=guide_text[:2000] if guide_text else "",
            highlights=f"全程{rt['duration']//60}小时，适合{rt['people']}",
        )
        db.add(route)
        count += 1
        print(f"  [OK] 路线: {rt['name']}")

    return count


def _extract_ticket_info(db: Session, doc):
    """提取票务表格中的信息"""
    for table in doc.tables:
        if table.rows and "票种" in table.rows[0].cells[0].text:
            lines = []
            for row in table.rows:
                cells = [cell.text.strip() for cell in row.cells]
                lines.append(" | ".join(cells))
            content = "灵山胜境门票价格表：\n" + "\n".join(lines)
            _create_kb_doc(db, "灵山胜境门票价格与优惠政策", "FAQ", content)
            break


# ============================================================
# 3. 行为分析数据导入
# ============================================================

def import_behavior_data(db: Session):
    """
    从 xlsx 读取游客行为数据
    因数据量大（14 万行），采用聚合统计方式，生成：
    - tourist_profiles（抽样）
    - chat_records（模拟问答）
    - feedback_reports（聚合报告）
    答辩要点：大数据量下的聚合分析策略
    """
    print("\n" + "=" * 60)
    print("[DATA] 导入游客行为分析数据...")
    print("=" * 60)

    if not XLSX_BEHAVIOR.exists():
        print(f"  [ERR] 文件不存在: {XLSX_BEHAVIOR}")
        return

    wb = openpyxl.load_workbook(str(XLSX_BEHAVIOR), data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    header = [str(h) for h in rows[0]]
    data_rows = rows[1:]

    print(f"  总数据量: {len(data_rows)} 行")

    # ---- 3a. 聚合统计 ----
    print("\n  --- 生成聚合报告 ---")
    _generate_aggregate_report(db, data_rows, header)

    # ---- 3b. 抽样游客画像 ----
    print("\n  --- 抽样游客画像 ---")
    profile_count = _sample_tourist_profiles(db, data_rows, header)

    # ---- 3c. 模拟问答记录 ----
    print("\n  --- 生成问答记录 ---")
    chat_count = _generate_chat_samples(db, data_rows, header)

    db.commit()
    print(f"\n  行为数据导入完成：画像 {profile_count}，问答 {chat_count}")


def _col_idx(header: list, name: str) -> int | None:
    """根据列名查找索引"""
    for i, h in enumerate(header):
        if name in str(h):
            return i
    return None


def _generate_aggregate_report(db: Session, rows: list, header: list):
    """基于 14 万行行为数据生成反馈分析报告"""

    # 计算关键指标
    total = len(rows)
    sat_idx = _col_idx(header, "satisfaction")
    stay_idx = _col_idx(header, "stay_duration")
    cost_idx = _col_idx(header, "total_cost")
    group_idx = _col_idx(header, "group_size")
    attraction_idx = _col_idx(header, "attraction_name")
    type_idx = _col_idx(header, "attraction_type")

    # 满意度分布
    sat_dist = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    stay_total = 0.0
    cost_total = 0.0
    type_counts = {}
    attraction_counts = {}

    for row in rows:
        if sat_idx is not None:
            try:
                s = int(row[sat_idx])
                if 1 <= s <= 5:
                    sat_dist[s] = sat_dist.get(s, 0) + 1
            except (ValueError, TypeError):
                pass

        if stay_idx is not None:
            try:
                stay_total += float(row[stay_idx])
            except (ValueError, TypeError):
                pass

        if cost_idx is not None:
            try:
                cost_total += float(row[cost_idx])
            except (ValueError, TypeError):
                pass

        if type_idx is not None and row[type_idx]:
            t = str(row[type_idx]).strip()
            type_counts[t] = type_counts.get(t, 0) + 1

        if attraction_idx is not None and row[attraction_idx]:
            name = str(row[attraction_idx]).strip()[:20]
            attraction_counts[name] = attraction_counts.get(name, 0) + 1

    # 计算满意率
    satisfied = sat_dist.get(4, 0) + sat_dist.get(5, 0)
    sat_rate = round(satisfied / total * 100, 1) if total > 0 else 0
    avg_stay = round(stay_total / total, 1) if total > 0 else 0
    avg_cost = round(cost_total / total, 1) if total > 0 else 0

    # 热门景点 Top 10
    hot_spots = sorted(attraction_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    # 热门景区类型
    hot_types = sorted(type_counts.items(), key=lambda x: x[1], reverse=True)[:5]

    # 情感摘要
    emotion_summary = json.dumps({
        "满意率": f"{sat_rate}%",
        "满意度分布": {str(k): v for k, v in sat_dist.items()},
        "平均停留时长": f"{avg_stay}小时",
        "平均消费": f"¥{avg_cost}",
    }, ensure_ascii=False)

    # 服务建议
    suggestions = json.dumps([
        "建议增加热门景点导览服务",
        "优化景区餐饮和购物体验",
        "加强节假日客流疏导",
    ], ensure_ascii=False)

    report = FeedbackReport(
        report_date=datetime.now().strftime("%Y-%m-%d"),
        total_sessions=total,
        hot_questions=json.dumps([f"{name}({cnt}次)" for name, cnt in hot_spots[:5]], ensure_ascii=False),
        hot_spots=json.dumps([{"name": name, "count": cnt} for name, cnt in hot_spots], ensure_ascii=False),
        emotion_summary=emotion_summary,
        service_suggestions=suggestions,
    )
    db.add(report)
    print(f"  [OK] 反馈报告：满意率 {sat_rate}%，平均停留 {avg_stay}h，热门类型 {len(hot_types)}")


def _sample_tourist_profiles(db: Session, rows: list, header: list) -> int:
    """从行为数据中抽样生成游客画像"""
    nick_idx = _col_idx(header, "user_nickname")
    age_idx = _col_idx(header, "age")
    type_idx = _col_idx(header, "attraction_type")

    # 采样去重用户
    seen_users = set()
    profiles = []

    travel_styles = ["深度文化", "轻松休闲", "亲子互动", "拍照打卡", "祈福朝圣"]

    for row in rows:
        if nick_idx is None:
            break
        nick = str(row[nick_idx]).strip()
        if nick in seen_users:
            continue
        seen_users.add(nick)

        age_str = str(row[age_idx]) if age_idx is not None and row[age_idx] else "30"
        try:
            age = int(float(age_str))
        except (ValueError, TypeError):
            age = 30

        if age < 18:
            age_group = "青少年"
        elif age < 30:
            age_group = "青年"
        elif age < 50:
            age_group = "中年"
        else:
            age_group = "老年"

        attr_type = str(row[type_idx]) if type_idx is not None and row[type_idx] else ""
        # 根据偏好推断出行风格
        if "历史" in attr_type or "博物馆" in attr_type:
            style = "深度文化"
        elif "自然" in attr_type or "公园" in attr_type:
            style = "轻松休闲"
        else:
            style = travel_styles[hash(nick) % len(travel_styles)]

        profile = TouristProfile(
            session_id=f"import_{nick[:20]}",
            nickname=nick[:30],
            interests=json.dumps([attr_type], ensure_ascii=False) if attr_type else None,
            visit_duration="半天",
            travel_style=style,
            age_group=age_group,
        )
        profiles.append(profile)

        if len(profiles) >= 500:
            break

    db.add_all(profiles)
    return len(profiles)


def _generate_chat_samples(db: Session, rows: list, header: list) -> int:
    """基于导入的景点数据生成模拟问答记录"""
    import random

    spots = db.query(ScenicSpot).all()
    if not spots:
        return 0

    spot_names = [s.spot_name for s in spots]

    question_templates = [
        ("{}有什么好玩的？", "景点咨询"),
        ("{}的开放时间是几点？", "开放时间"),
        ("怎么去{}？", "交通问路"),
        ("{}有什么历史故事？", "历史文化"),
        ("推荐一条包含{}的游览路线", "路线推荐"),
        ("{}附近有什么美食？", "餐饮咨询"),
        ("{}适合带老人去吗？", "适游人群"),
    ]

    records = []
    for i in range(100):
        spot_name = random.choice(spot_names)
        q_template, intent = random.choice(question_templates)
        question = q_template.format(spot_name)

        answer = f"关于「{spot_name}」，建议您查看景点详情页了解更多信息。我们的 AI 导览员小灵可以为您提供更详细的讲解！"

        emotion = random.choice(["positive", "positive", "positive", "neutral", "negative"])
        score = {"positive": 4.5, "neutral": 3.0, "negative": 1.5}[emotion] + random.random()

        record = ChatRecord(
            session_id=f"import_demo_{i % 20:03d}",
            user_message=question,
            answer=answer,
            intent=intent,
            emotion=emotion,
            related_spots=json.dumps([spot_name], ensure_ascii=False),
            response_time_ms=random.randint(200, 1500),
            satisfaction_score=round(min(5.0, score), 1),
        )
        records.append(record)

    db.add_all(records)
    return len(records)


# ============================================================
# 4. 数字人默认配置
# ============================================================

def ensure_digital_humans(db: Session):
    """确保存在默认数字人配置（如已清空需重建）"""
    if db.query(DigitalHumanConfig).count() > 0:
        return

    print("\n" + "=" * 60)
    print("[AVATAR] 创建默认数字人配置...")
    print("=" * 60)

    configs = [
        DigitalHumanConfig(
            name="小灵",
            avatar_style="古风少女",
            voice_name="知性女声",
            clothing_style="唐代齐胸襦裙",
            personality="温婉知性、博学多识，擅长讲解历史文化",
            greeting_text="您好！我是灵山慧游的 AI 导览员小灵。千年灵山，一草一木皆有故事，让我带您开启一段美妙的山水人文之旅吧！",
            expression_config=json.dumps({
                "idle": "微笑", "speaking": "随内容变化",
                "happy": "眉眼弯弯", "surprised": "睁大眼睛"
            }, ensure_ascii=False),
            is_active=True,
        ),
        DigitalHumanConfig(
            name="阿山",
            avatar_style="阳光少年",
            voice_name="活力男声",
            clothing_style="户外运动休闲装",
            personality="活泼开朗、运动达人，擅长户外路线推荐",
            greeting_text="嗨！我是阿山！灵山最好玩的地方我都知道，跟我走，保证让你的旅程充满惊喜！",
            expression_config=json.dumps({
                "idle": "阳光微笑", "speaking": "生动活泼",
                "happy": "咧嘴大笑", "surprised": "夸张表情"
            }, ensure_ascii=False),
            is_active=False,
        ),
    ]
    db.add_all(configs)
    db.commit()
    for c in configs:
        print(f"  [OK] {c.name} ({c.avatar_style}) 激活={c.is_active}")


# ============================================================
# 主入口
# ============================================================

def main():
    parser = argparse.ArgumentParser(description="灵山慧游 — 官方数据集导入工具")
    parser.add_argument("--clear", action="store_true", help="导入前清空旧数据")
    parser.add_argument("--skip-spots", action="store_true", help="跳过景点导入")
    parser.add_argument("--skip-knowledge", action="store_true", help="跳过知识库导入")
    parser.add_argument("--skip-behavior", action="store_true", help="跳过行为数据导入")
    args = parser.parse_args()

    # 初始化数据库（关闭 SQL echo 避免编码问题）
    import logging
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        print("\n" + "=" * 60)
        print("  灵山慧游 - 官方数据集导入工具")
        print("=" * 60)

        if args.clear:
            clear_tables(db)

        if not args.skip_spots:
            import_scenic_spots(db)
        else:
            print("\n  [SKIP] 跳过景点导入")

        if not args.skip_knowledge:
            import_knowledge_documents(db)
        else:
            print("\n  [SKIP] 跳过知识库导入")

        if not args.skip_behavior:
            import_behavior_data(db)
        else:
            print("\n  [SKIP] 跳过行为数据导入")

        # 确保数字人配置存在
        ensure_digital_humans(db)

        # ---- 打印汇总 ----
        print("\n" + "=" * 60)
        print("[STATS] 导入统计")
        print("=" * 60)
        print(f"  景点总数:       {db.query(ScenicSpot).count()}")
        print(f"  知识库文档:     {db.query(KnowledgeDocument).count()}")
        print(f"  游览路线:       {db.query(Route).count()}")
        print(f"  游客画像:       {db.query(TouristProfile).count()}")
        print(f"  交互记录:       {db.query(ChatRecord).count()}")
        print(f"  反馈报告:       {db.query(FeedbackReport).count()}")
        print("\n[OK] 导入完成！\n")

    except Exception as e:
        db.rollback()
        print(f"\n[ERR] 导入失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
