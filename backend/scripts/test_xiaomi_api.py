"""测试小米 API 速度和效果"""
import sys, time
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parent.parent))
from openai import OpenAI

from app.core.config import settings

KEY = settings.tts_api_key
MODELS = ['deepseek-chat', 'deepseek-v3', 'gpt-3.5-turbo', 'qwen-turbo', 'qwen-plus']
BASES = [
    'https://api.siliconflow.cn/v1',
    'https://api.deepseek.com/v1',
    'https://api.moonshot.cn/v1',
    'https://api.x.ai/v1',
    'https://api.openai.com/v1',
    'https://dashscope.aliyuncs.com/compatible-mode/v1',
]

# Step 1: 探测服务
print("=" * 50)
print("Step 1: 探测 API 服务商")
print("=" * 50)
found = None
for base in BASES:
    for model in MODELS[:1]:
        try:
            c = OpenAI(api_key=KEY, base_url=base)
            r = c.chat.completions.create(model=model, messages=[{'role':'user','content':'1+1='}], max_tokens=5, timeout=8)
            print(f'FOUND: {base} | model={model} | reply="{r.choices[0].message.content}"')
            found = (base, model)
        except Exception as e:
            err = str(e)[:80]
            if '401' in err or '403' in err: print(f'  AUTH FAIL: {base}')
            elif '404' in err: pass  # model not found, try next
            elif 'timeout' in err.lower(): pass
            else: print(f'  ERR: {base} {model} -> {err}')

if not found:
    print('No matching API found!')
    sys.exit(1)

base_url, working_model = found
print(f'\n使用: {base_url} model={working_model}')

# Step 2: 列出可用模型
print(f"\n{'='*50}")
print("Step 2: 列出可用模型")
print('='*50)
c = OpenAI(api_key=KEY, base_url=base_url)
for model in MODELS + ['deepseek-r1','moonshot-v1-8k','yi-large']:
    try:
        r = c.chat.completions.create(model=model, messages=[{'role':'user','content':'hi'}], max_tokens=3, timeout=8)
        print(f'  OK: {model}')
    except Exception as e:
        err = str(e)[:60]
        if '404' not in err and 'not found' not in err.lower():
            print(f'  {model}: {err}')

# Step 3: 速度+质量对比
print(f"\n{'='*50}")
print("Step 3: 速度对比（3次取平均）")
print('='*50)
questions = [
    "灵山大佛有多高？请用一句话回答。",
    "推荐灵山胜境最值得去的3个景点，简要说明理由。",
]
for q in questions:
    times = []
    for i in range(3):
        t0 = time.time()
        r = c.chat.completions.create(
            model=working_model,
            messages=[{'role':'user','content':q}],
            max_tokens=200, timeout=30,
        )
        elapsed = time.time() - t0
        times.append(elapsed)
        if i == 0:
            answer = r.choices[0].message.content[:100]
    avg = sum(times)/len(times)
    print(f'\nQ: {q[:40]}...')
    print(f'  Times: {[f"{t:.1f}s" for t in times]} | Avg: {avg:.1f}s')
    print(f'  Answer: {answer}...')
