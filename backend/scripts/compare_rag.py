"""DeepSeek vs MiMo — RAG增强对比（修复RAG连接）"""
import sys, time
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parent.parent))

from openai import OpenAI
import anthropic
from app.core.config import settings
from app.services.rag_service import rag_service

DS = OpenAI(api_key=settings.llm_api_key, base_url=settings.llm_base_url)
MIMO = anthropic.Anthropic(api_key=settings.tts_api_key, base_url="https://api.xiaomimimo.com/anthropic")

# 确保 RAG 索引存在
print("[INIT] 检查 RAG 索引...")
try:
    rag_service.rebuild_vector_store()
    print("  RAG 索引已重建")
except Exception as e:
    print(f"  警告: 索引重建失败 ({e})，使用关键词回退")

QUESTIONS = [
    "灵山大佛有多高？",
    "灵山大佛和九龙灌浴各有什么特色？",
    "推荐一条3小时的亲子游览路线",
    "灵山梵宫有什么文化内涵？",
]

print("=" * 70)
print("DeepSeek (deepseek-chat) vs MiMo (mimo-v2.5) — RAG 增强对比")
print("=" * 70)

ds_times, mimo_times = [], []

for cat_q in QUESTIONS:
    print(f"\n[Q] {cat_q}")

    # RAG 检索
    rag_result = rag_service.search_knowledge(cat_q, top_k=3)
    if rag_result:
        knowledge = "\n".join(
            f"[来源:{r.get('title','?')}] {r.get('content','')[:500]}"
            for r in rag_result[:3]
        )
        print(f"  RAG: 检索到 {len(rag_result)} 条结果")
    else:
        knowledge = "(RAG 未检索到数据，请基于常识回答但注明来源不足)"
        print(f"  RAG: 无结果")

    prompt = f"""你是灵山胜境景区AI导游。基于以下检索知识回答。
检索知识：
{knowledge}

用户：{cat_q}

要求：基于检索知识回答，知识不足时诚实说明。热情导游语气，100-200字。"""

    # ===== DeepSeek =====
    try:
        t0 = time.time()
        r = DS.chat.completions.create(
            model="deepseek-chat",
            messages=[{"role":"user","content":prompt}],
            max_tokens=250, temperature=0.3, timeout=30,
        )
        t_ds = time.time() - t0
        ans_ds = r.choices[0].message.content[:200]
        ds_times.append(t_ds)
        print(f"  DS  {t_ds:.1f}s | {ans_ds[:100]}...")
    except Exception as e:
        print(f"  DS  ERROR: {str(e)[:60]}")
        ds_times.append(999)

    # ===== MiMo =====
    try:
        t0 = time.time()
        r = MIMO.messages.create(
            model="mimo-v2.5",
            messages=[{"role":"user","content":prompt}],
            max_tokens=250, temperature=0.3, timeout=30,
        )
        t_mimo = time.time() - t0
        ans_mimo = ""
        for block in r.content:
            if hasattr(block, 'text') and block.text:
                ans_mimo = block.text[:200]
                break
        mimo_times.append(t_mimo)
        print(f"  MIMO {t_mimo:.1f}s | {ans_mimo[:100]}...")
    except Exception as e:
        print(f"  MIMO ERROR: {str(e)[:60]}")
        mimo_times.append(999)

ds_avg = sum(ds_times)/len(ds_times) if ds_times else 0
mimo_avg = sum(mimo_times)/len(mimo_times) if mimo_times else 0
gap = abs(ds_avg - mimo_avg) / max(ds_avg, mimo_avg) * 100
faster = "DeepSeek" if ds_avg < mimo_avg else "MiMo"

print(f"\n{'='*70}")
print(f"DeepSeek: {ds_avg:.1f}s | MiMo: {mimo_avg:.1f}s | {faster} 快 {gap:.0f}%")
print(f"DS: {[f'{t:.1f}s' for t in ds_times]}")
print(f"MO: {[f'{t:.1f}s' for t in mimo_times]}")
