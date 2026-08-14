"""
情感分析工具
===========
基于规则的情感分析，零标注、零 API 成本。
Agent 可用此工具感知用户情绪，调整回复策略。
"""
import re


# 情感词典（规则匹配，无需训练）
EMOTION_RULES = {
    "焦急": {
        "keywords": ["着急", "快", "赶紧", "马上", "等不及", "紧急", "急", "快点"],
        "patterns": [r'(多久|还要|怎么还没|等.*久)'],
    },
    "不满": {
        "keywords": ["不好", "差", "失望", "坑", "骗", "烂", "糟糕", "垃圾", "差劲", "无语"],
        "patterns": [r'(什么.*鬼|太.*了|真.*差)'],
    },
    "疑惑": {
        "keywords": ["为什么", "怎么", "不懂", "不明白", "什么意思", "搞不懂", "不理解"],
        "patterns": [r'(为什么|咋|怎么)'],
    },
    "开心": {
        "keywords": ["谢谢", "好棒", "太好了", "喜欢", "赞", "厉害", "不错", "开心", "哈哈", "好评"],
        "patterns": [r'(哈哈|嘻嘻|嘿嘿)'],
    },
    "担忧": {
        "keywords": ["担心", "害怕", "安全", "危险", "会不会", "万一", "不敢"],
        "patterns": [r'(会不会|安全.*吗|危险.*吗)'],
    },
}


def analyze_sentiment(text: str) -> dict:
    """
    分析文本情感

    Args:
        text: 待分析文本

    Returns:
        情感分析结果
    """
    text_lower = text.lower()

    scores = {}
    for emotion, rules in EMOTION_RULES.items():
        score = 0
        # 关键词匹配
        for kw in rules["keywords"]:
            if kw in text:
                score += 1
        # 正则匹配
        for pattern in rules["patterns"]:
            if re.search(pattern, text):
                score += 2

        scores[emotion] = score

    # 找到最高分情感
    max_score = max(scores.values()) if scores else 0
    if max_score == 0:
        primary = "中性"
    else:
        primary = max(scores, key=scores.get)

    # 次要情感（次高分）
    sorted_emotions = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    secondary = sorted_emotions[1][0] if len(sorted_emotions) > 1 and sorted_emotions[1][1] > 0 else None

    return {
        "primary_emotion": primary,
        "secondary_emotion": secondary,
        "confidence": round(max_score / 5, 2) if max_score > 0 else 1.0,
        "scores": {k: v for k, v in scores.items() if v > 0},
        "suggestion": _get_suggestion(primary),
    }


def _get_suggestion(emotion: str) -> str:
    """根据情感给出回复建议"""
    suggestions = {
        "焦急": "用户很着急，回复要简洁直接，先给出最关键信息，避免长篇大论",
        "不满": "用户有不满情绪，先表达理解和歉意，再提供解决方案",
        "疑惑": "用户有疑问，用通俗易懂的方式解释，避免过于专业的术语",
        "开心": "用户情绪积极，可以保持热情活泼的语气，适当延伸推荐相关内容",
        "担忧": "用户有安全顾虑，先安抚情绪，给出具体的安全保障信息",
        "中性": "正常交流，保持专业友好的导游风格",
    }
    return suggestions.get(emotion, "正常交流")
