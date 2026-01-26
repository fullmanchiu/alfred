import os, json, asyncio
import httpx
from typing import AsyncGenerator

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_URL = "https://api.openai.com/v1/chat/completions"

async def stream_report(act_id: str) -> AsyncGenerator[str, None]:
    """
    Stream a short AI report. If OPENAI_API_KEY is missing, stream a mocked response.
    """
    if not OPENAI_API_KEY:
        # Mocked streaming for PoC
        text = [
            f"Activity #{act_id} analysis start...",
            "Distance looks consistent with aerobic base work.",
            "Consider a 10–15 min warm-up and cool-down next time.",
            "Target cadence 85–95 rpm for steady efforts.",
            "Done."
        ]
        for t in text:
            await asyncio.sleep(0.1)
            yield t
        return

    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
    messages = [
        {"role": "system", "content": "You are a cycling coach who writes concise reports."},
        {"role": "user", "content": f"Write a short analysis for activity {act_id} with 3 bullet recommendations."}
    ]
    payload = {"model": "gpt-4o-mini", "messages": messages, "stream": True}

    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream("POST", OPENAI_URL, headers=headers, json=payload) as r:
            async for line in r.aiter_lines():
                if not line:
                    continue
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    try:
                        obj = json.loads(data)
                        delta = obj["choices"][0]["delta"].get("content")
                        if delta:
                            yield delta
                    except Exception:
                        # best-effort parse
                        yield ""
