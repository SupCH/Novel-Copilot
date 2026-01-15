"""
AI 服务 - OpenAI/Ollama 集成
支持 SSE 流式续写
"""

import os
import re
from typing import AsyncGenerator
from openai import AsyncOpenAI

# 配置：优先使用 Ollama，否则使用 OpenAI
DEFAULT_OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
DEFAULT_OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")


def get_client(api_base: str = None, api_key: str = None) -> AsyncOpenAI:
    """获取 OpenAI 客户端"""
    if api_base or api_key:
        return AsyncOpenAI(
            base_url=api_base or DEFAULT_OLLAMA_BASE_URL,
            api_key=api_key or "ollama"
        )
    
    if DEFAULT_OPENAI_API_KEY:
        return AsyncOpenAI(api_key=DEFAULT_OPENAI_API_KEY)
    else:
        return AsyncOpenAI(base_url=DEFAULT_OLLAMA_BASE_URL, api_key="ollama")


async def generate_continuation(
    context: str,
    world_view: str = "",
    style: str = "",
    relationships: list[dict] = None,
    previous_summaries: str = "",
    model: str = "gpt-4o-mini",
    temperature: float = 0.7,
    max_tokens: int = 1000,
    api_base: str = None,
    api_key: str = None,
) -> AsyncGenerator[str, None]:
    """
    AI 续写生成器（流式输出）
    专注于生成干净的小说正文
    """
    print(f"[AI_CONTINUE] model={model}, api_base={api_base}")
    client = get_client(api_base, api_key)

    # 构建系统提示 - 只要求生成纯正文，不要任何代码或标签
    print(f"[DEBUG] generate_continuation called with model: '{model}', api_base: '{api_base}'")
    system_parts = [
        "你是一位专业的小说作家。请根据上下文直接续写故事内容。",
        "",
        "【重要规则】",
        "1. 只输出小说正文，不要添加任何代码、标签、函数调用或技术语法",
        "2. 不要写任何类似 insertRow、updateRow、tableEdit 等内容",
        "3. 不要添加评论、解释或元叙述",
        "4. 保持与原文一致的叙事视角和语气",
        "5. 情节连贯，人物性格一致",
    ]
    
    # 添加前面章节摘要（用于上下文连贯性）
    if previous_summaries:
        system_parts.append(f"\n\n【前情提要】\n{previous_summaries}")
    
    if world_view:
        system_parts.append(f"\n\n【世界观设定】\n{world_view}")
    
    if style:
        system_parts.append(f"\n\n【写作风格】\n{style}")
    
    if relationships:
        rel_text = "\n".join([
            f"- {r['source_name']} 与 {r['target_name']}: {r['relation_type']}"
            + (f" ({r['description']})" if r.get('description') else "")
            for r in relationships
        ])
        system_parts.append(f"\n\n【角色关系】\n{rel_text}")
    
    system_prompt = "".join(system_parts)
    
    # 流式请求
    stream = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            # 强化指令：严禁任何前言，直接输出正文
            {"role": "user", "content": f"请续写。要求：直接输出续写内容，严禁任何前言、引导语或解释。上下文如下：\n\n{context}"},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
        stream=True,
    )
    
    chunk_index = 0
    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            raw_content = chunk.choices[0].delta.content
            # DEBUG: 观察原始 chunk，用竖线包围便于识别空格/缺失
            print(f"[CHUNK_{chunk_index:03d}]: |{raw_content}|")
            chunk_index += 1
            yield raw_content


def clean_ai_output(content: str) -> str:
    """
    温和清理 AI 输出
    只移除明确的 tableEdit 标签，避免误删正常内容
    """
    # 只移除明确的 <tableEdit>...</tableEdit> 标签及内容
    content = re.sub(r'<tableEdit>.*?</tableEdit>', '', content, flags=re.DOTALL)
    
    # 清理 tableEdit 标签移除后可能留下的多余空行
    content = re.sub(r'\n{3,}', '\n\n', content)
    content = content.strip()
    
    return content


async def generate_summary(
    content: str, 
    model: str = "gpt-4o-mini",
    api_base: str = None,
    api_key: str = None,
) -> str:
    """生成章节摘要"""
    client = get_client(api_base, api_key)
    
    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "请用简洁的语言总结以下内容，突出主要情节和人物行动，控制在100字以内。"},
            {"role": "user", "content": content},
        ],
        temperature=0.3,
        max_tokens=200,
    )
    return response.choices[0].message.content or ""


async def modify_text(
    text: str,
    action: str,
    model: str = "gpt-4o-mini",
    api_base: str = None,
    api_key: str = None,
) -> str:
    """
    AI 修改文字
    action: rewrite(重写), shorten(精简), expand(扩写), 
            formal(正式), casual(轻松), serious(严肃)
    """
    client = get_client(api_base, api_key)
    
    action_prompts = {
        "rewrite": "请重写以下文字，保持原意但使用不同的表达方式，使其更加流畅优美：",
        "shorten": "请精简以下文字，去除冗余，保留核心意思，使其更加简洁有力：",
        "expand": "请扩写以下文字，添加更多细节和描写，使其更加丰富生动：",
        "formal": "请将以下文字改写为正式、书面的语气：",
        "casual": "请将以下文字改写为轻松、口语化的语气：",
        "serious": "请将以下文字改写为严肃、庄重的语气：",
    }
    
    prompt = action_prompts.get(action, action_prompts["rewrite"])
    
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": f"{prompt}\n\n请只返回修改后的文字，不要包含任何解释或其他内容。"},
                {"role": "user", "content": text},
            ],
            temperature=0.7,
            max_tokens=2000,
        )
        result = response.choices[0].message.content or text
        return result.strip()
    except Exception as e:
        print(f"[ERROR] modify_text failed: {e}")
        raise e


async def list_models(api_base: str = None, api_key: str = None) -> list[str]:
    """获取可用模型列表"""
    try:
        client = get_client(api_base, api_key)
        models = await client.models.list()
        return [model.id for model in models.data]
    except Exception as e:
        print(f"Error listing models: {e}")
        raise e


async def extract_all_data(
    content: str,
    existing_characters: list[str] = None,
    model: str = "gpt-4o-mini",
    api_base: str = None,
    api_key: str = None,
) -> dict:
    """
    从内容中提取结构化数据（独立请求）
    返回包含所有表格数据的字典
    """
    print(f"[AI_SERVICE] extract_all_data called, model={model}, api_base={api_base}")
    client = get_client(api_base, api_key)
    
    existing_chars_hint = ""
    if existing_characters:
        existing_chars_hint = f"\n\n已知角色列表：{', '.join(existing_characters)}"
    
    prompt = f"""分析以下小说内容，提取结构化信息。{existing_chars_hint}

请以JSON格式返回，包含以下字段（如果内容中没有相关信息则返回空数组）：

{{
  "spacetime": [
    {{"date": "日期", "time": "时间", "location": "地点", "characters": "在场角色"}}
  ],
  "characters": [
    {{"name": "角色名", "traits": "身体特征", "personality": "性格", "role": "职业", "hobbies": "爱好", "likes": "喜好", "residence": "住所", "other": "其他信息"}}
  ],
  "relationships": [
    {{"name": "角色名", "relation": "与主角关系", "attitude": "态度", "affection": "好感度(高/中/低)"}}
  ],
  "tasks": [
    {{"character": "角色", "task": "任务内容", "location": "地点", "duration": "持续时间"}}
  ],
  "events": [
    {{"character": "角色", "event": "事件描述", "date": "日期", "location": "地点", "emotion": "情绪"}}
  ],
  "items": [
    {{"owner": "拥有人", "description": "描述", "name": "物品名", "importance": "重要原因"}}
  ]
}}

只返回JSON，不要其他文字。只提取内容中明确提到的信息，不要推测。"""

    print(f"[AI_SERVICE] Sending request to AI...")
    
    # 对于提取任务，使用更简单的模型名称（去掉流式前缀）
    extract_model = model
    if "/" in model:
        # 如果模型名包含/，可能是流式模型，尝试用简单名称
        extract_model = model.split("/")[-1]
        print(f"[AI_SERVICE] Using simplified model name: {extract_model}")
    
    try:
        import asyncio
        # 设置 60 秒超时
        response = await asyncio.wait_for(
            client.chat.completions.create(
                model=extract_model,
                messages=[
                    {"role": "system", "content": "你是一个专业的内容分析助手。请从小说内容中提取结构化信息。"},
                    {"role": "user", "content": f"{prompt}\n\n小说内容：\n{content}"},
                ],
                temperature=0.2,
                max_tokens=2000,
            ),
            timeout=120.0
        )
        print(f"[AI_SERVICE] Response received")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[AI_SERVICE] AI request failed: {e}")
        return {
            "spacetime": [],
            "characters": [],
            "relationships": [],
            "tasks": [],
            "events": [],
            "items": []
        }
    
    try:
        import json
        import re
        result = response.choices[0].message.content or "{}"
        print(f"[AI_SERVICE] Raw AI response: {result}")
        
        # 移除 <think>...</think> 标签 (DeepSeek Reasoner)
        result = re.sub(r'<think>.*?</think>', '', result, flags=re.DOTALL)
        
        # 移除 markdown 代码块标记
        result = re.sub(r'^```json\s*', '', result, flags=re.MULTILINE)
        result = re.sub(r'^```\s*$', '', result, flags=re.MULTILINE)
        result = result.strip()
        
        # 尝试提取 JSON
        if "{" in result:
            start = result.index("{")
            # 找到最后一个完整的 }
            end = result.rfind("}")
            if end > start:
                json_str = result[start:end+1]
                try:
                    parsed = json.loads(json_str)
                    print(f"[AI_SERVICE] Parsed JSON successfully")
                    return parsed
                except json.JSONDecodeError as e:
                    print(f"[AI_SERVICE] JSON decode error: {e}")
                    # 尝试修复不完整的 JSON
                    # 逐步尝试在不同位置截断
                    for i in range(len(json_str) - 1, 0, -1):
                        if json_str[i] in '}]':
                            try:
                                # 尝试补全 JSON
                                fixed = json_str[:i+1]
                                # 计算缺少的括号
                                open_braces = fixed.count('{') - fixed.count('}')
                                open_brackets = fixed.count('[') - fixed.count(']')
                                fixed += ']' * open_brackets + '}' * open_braces
                                parsed = json.loads(fixed)
                                print(f"[AI_SERVICE] Parsed truncated JSON successfully")
                                return parsed
                            except:
                                continue
    except Exception as e:
        print(f"[AI_SERVICE] Failed to parse extracted data: {e}")
    
    return {
        "spacetime": [],
        "characters": [],
        "relationships": [],
        "tasks": [],
        "events": [],
        "items": []
    }


