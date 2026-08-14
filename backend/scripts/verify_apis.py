"""验证所有 API 和 Neo4j 连接"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parent.parent))

from app.core.config import settings

print("=" * 50)
print("1. SiliconFlow Embedding API")
print("=" * 50)
try:
    from openai import OpenAI
    c = OpenAI(
        api_key=settings.embedding_api_key,
        base_url=settings.embedding_base_url
    )
    r = c.embeddings.create(model='BAAI/bge-m3', input=['灵山大佛测试'], timeout=15)
    print(f'✅ 可用 | 向量维度: {len(r.data[0].embedding)}')
except Exception as e:
    print(f'❌ 失败: {e}')

print()
print("=" * 50)
print("2. DeepSeek LLM API")
print("=" * 50)
try:
    from openai import OpenAI
    ds = OpenAI(
        api_key=settings.llm_api_key,
        base_url=settings.llm_base_url
    )
    r = ds.chat.completions.create(
        model='deepseek-chat',
        messages=[{'role': 'user', 'content': '1+1=?'}],
        max_tokens=10,
        timeout=15
    )
    print(f'✅ 可用 | 回复: {r.choices[0].message.content}')
except Exception as e:
    print(f'❌ 失败: {e}')

print()
print("=" * 50)
print("3. Neo4j 连接")
print("=" * 50)
try:
    from neo4j import GraphDatabase
    driver = GraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_user, settings.neo4j_password)
    )
    with driver.session() as s:
        r = s.run('RETURN 1 as n').single()
        print(f'✅ 连接成功 | test: {r["n"]}')
    driver.close()
except Exception as e:
    print(f'❌ 失败: {str(e)[:200]}')

print()
print("=" * 50)
print("验证完成")
print("=" * 50)
