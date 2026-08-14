import os, sys
sys.stdout.reconfigure(encoding='utf-8')
from openai import OpenAI

# 从 .env 读 key
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
key = os.getenv('LLM_API_KEY', '')
print(f'Key: ...{key[-8:]}')

bases = [
    ('SiliconFlow', 'https://api.siliconflow.cn/v1'),
    ('DeepSeek', 'https://api.deepseek.com/v1'),
    ('Moonshot', 'https://api.moonshot.cn/v1'),
    ('X.AI', 'https://api.x.ai/v1'),
    ('DashScope', 'https://dashscope.aliyuncs.com/compatible-mode/v1'),
    ('Zhipu', 'https://open.bigmodel.cn/api/paas/v4'),
]

for name, base in bases:
    for model in ['deepseek-chat', 'gpt-3.5-turbo', 'moonshot-v1-8k', 'qwen-turbo']:
        try:
            c = OpenAI(api_key=key, base_url=base)
            r = c.chat.completions.create(model=model, messages=[{'role':'user','content':'hi'}], max_tokens=3, timeout=6)
            print(f'MATCH: {name} base={base} model={model} reply={r.choices[0].message.content}')
            # 测速
            import time
            t0 = time.time()
            r = c.chat.completions.create(model=model, messages=[{'role':'user','content':'灵山大佛有多高？一句话回答'}], max_tokens=100)
            t = time.time() - t0
            print(f'SPEED: {t:.1f}s | {r.choices[0].message.content[:100]}')
            sys.exit(0)
        except Exception as e:
            err = str(e)[:100]
            if '401' in err:
                continue
            elif '404' in err or 'not_found' in err.lower():
                continue
            else:
                continue

print('No matching provider found.')
