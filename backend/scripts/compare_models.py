"""DeepSeek vs MiMo 公平对比（均不开深度思考）"""
import sys, time
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parent.parent))
from openai import OpenAI
import anthropic

from app.core.config import settings

# 配置（从 .env 读取）
DS_KEY = settings.llm_api_key
MIMO_KEY = settings.tts_api_key

ds = OpenAI(api_key=DS_KEY, base_url=settings.llm_base_url)
mimo = anthropic.Anthropic(api_key=MIMO_KEY, base_url="https://api.xiaomimimo.com/anthropic")

QUESTIONS = [
    ("事实", "灵山大佛有多高？"),
    ("文化", "灵山胜境的历史背景是什么？"),
    ("比较", "灵山大佛和九龙灌浴各有什么特色？"),
    ("路线", "推荐一条3小时的亲子游览路线"),
]

print("=" * 70)
print("DeepSeek (deepseek-chat) vs MiMo (mimo-v2.5) — 公平对比")
print("=" * 70)

ds_times, mimo_times = [], []

for cat, q in QUESTIONS:
    print(f"\n[{cat}] {q}")

    # DeepSeek
    try:
        t0 = time.time()
        r = ds.chat.completions.create(
            model="deepseek-chat",
            messages=[{"role":"user","content":q}],
            max_tokens=200, temperature=0.3, timeout=30,
        )
        t_ds = time.time() - t0
        ans_ds = r.choices[0].message.content[:80]
        ds_times.append(t_ds)
        print(f"  DeepSeek: {t_ds:.1f}s | {ans_ds}...")
    except Exception as e:
        print(f"  DeepSeek: ERROR - {str(e)[:80]}")
        ds_times.append(999)

    # MiMo
    try:
        t0 = time.time()
        r = mimo.messages.create(
            model="mimo-v2.5",
            messages=[{"role":"user","content":q}],
            max_tokens=200, temperature=0.3, timeout=30,
        )
        t_mimo = time.time() - t0
        ans_mimo = ""
        for block in r.content:
            if hasattr(block, 'text') and block.text:
                ans_mimo = block.text[:80]
                break
        mimo_times.append(t_mimo)
        print(f"  MiMo:     {t_mimo:.1f}s | {ans_mimo}...")
    except Exception as e:
        print(f"  MiMo:     ERROR - {str(e)[:80]}")
        mimo_times.append(999)

# 汇总
ds_avg = sum(ds_times) / len(ds_times) if ds_times else 0
mimo_avg = sum(mimo_times) / len(mimo_times) if mimo_times else 0

print(f"\n{'='*70}")
print(f"DeepSeek 平均: {ds_avg:.1f}s  |  MiMo 平均: {mimo_avg:.1f}s")
print(f"MiMo 快: {((ds_avg-mimo_avg)/ds_avg*100):.0f}%" if mimo_avg < ds_avg else f"DeepSeek 快: {((mimo_avg-ds_avg)/mimo_avg*100):.0f}%")
print(f"DeepSeek 单次: {ds_times}")
print(f"MiMo 单次:      {mimo_times}")
print(f"{'='*70}")
