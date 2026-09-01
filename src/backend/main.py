"""
Supervisor-Skills Backend
An OpenAI-compatible API gateway that loads skill prompts from the
Supervisor-Skills repository and routes them to an LLM.
"""

import os
import json
import asyncio
from pathlib import Path
from typing import AsyncGenerator, Literal

from dotenv import load_dotenv

# Load environment variables from frontend .env.local when running locally,
# so the backend can share API keys configured for the Next.js app.
_env_local = Path(__file__).resolve().parent.parent / "frontend" / ".env.local"
if _env_local.exists():
    load_dotenv(_env_local, override=False)

# Also load a local .env file if present (useful for cloud deployments).
_env_backend = Path(__file__).resolve().parent / ".env"
if _env_backend.exists():
    load_dotenv(_env_backend, override=False)

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

import httpx

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
# Support cloud deployments where the backend is deployed without the
# parent plugins directory.  An explicit SKILLS_DIR env var takes
# precedence, otherwise fall back to the repo structure first, then to a
# local plugins/ folder inside the backend package.
_default_skills = BASE_DIR.parent / "plugins" / "phd-research" / "skills"
_fallback_skills = BASE_DIR / "plugins" / "phd-research" / "skills"
SKILLS_DIR = Path(os.getenv("SKILLS_DIR", _default_skills if _default_skills.exists() else _fallback_skills))

DEFAULT_ANTHROPIC_MODEL = "claude-3-5-sonnet-20241022"

# Map skill trigger names -> directory names (longer / more specific first via sort in detect)
SKILL_MAP = {
    "scientific-feedback": "scientific-feedback",
    "scientific feedback": "scientific-feedback",
    "peer review": "scientific-feedback",
    "review outline": "scientific-feedback",
    "manuscript feedback": "scientific-feedback",
    "paper feedback": "scientific-feedback",
    "idea-evaluator": "idea-evaluator",
    "evaluate idea": "idea-evaluator",
    "novelty check": "idea-evaluator",
    "vibe-research": "vibe-research-workflow",
    "vibe research": "vibe-research-workflow",
    "vibe coding": "vibe-research-workflow",
    "intro-drafter": "intro-drafter",
    "draft introduction": "intro-drafter",
    "deep-research": "deep-research",
    "deep research": "deep-research",
    "literature-review": "literature-review",
    "literature review": "literature-review",
    "文献综述": "literature-review",
    "综述": "literature-review",
    "related work": "literature-review",
    "survey paper": "deep-research",
    "paper survey": "deep-research",
    "tech-paper": "tech-paper-template",
    "tech paper": "tech-paper-template",
    "benchmark-paper": "benchmark-paper-template",
    "benchmark paper": "benchmark-paper-template",
    "figure-designer": "figure-designer",
    "design figure": "figure-designer",
    "drawio": "drawio-reconstruction",
    "draw.io": "drawio-reconstruction",
    "paper-polish": "paper-polish",
    "paper polish": "paper-polish",
    "polish writing": "paper-polish",
    "improve tone": "paper-polish",
    "paper-writer": "paper-writer",
    "paper writer": "paper-writer",
    "write section": "paper-writer",
    "draft paper": "paper-writer",
    "pre-submission": "pre-submission-reviewer",
    "pre submission": "pre-submission-reviewer",
    "review paper": "pre-submission-reviewer",
    "brainstorm": "brainstorm",
    "brainstorming": "brainstorm",
}

# Default system prompt when no skill is explicitly matched
DEFAULT_SYSTEM_PROMPT = (
    "You are an AI research co-advisor for the full research lifecycle "
    "(ideation → survey → structure → drafting → polish → review). "
    "Infer the user's research stage from context and apply the appropriate "
    "structured procedure silently. Be concrete, evidence-aware, and constructive."
)

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Supervisor-Skills Backend",
    version="2.0.0",
    description="OpenAI-compatible API for Supervisor-Skills research advisor",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def load_skill(skill_dir_name: str) -> str:
    """Load the SKILL.md for a given skill directory."""
    if not SKILLS_DIR.exists():
        return ""
    skill_file = SKILLS_DIR / skill_dir_name / "SKILL.md"
    if skill_file.exists():
        return skill_file.read_text(encoding="utf-8")
    for subdir in SKILLS_DIR.iterdir():
        if subdir.is_dir() and subdir.name == skill_dir_name:
            sf = subdir / "SKILL.md"
            if sf.exists():
                return sf.read_text(encoding="utf-8")
    return ""


def load_skill_references(skill_dir_name: str, max_chars: int = 20000) -> str:
    """Silently load reference markdown for a skill (capped for context)."""
    refs_dir = SKILLS_DIR / skill_dir_name / "references"
    if not refs_dir.exists():
        return ""
    chunks: list[str] = []
    total = 0
    for path in sorted(refs_dir.glob("*.md")):
        try:
            text = path.read_text(encoding="utf-8")
        except OSError:
            continue
        header = f"### {path.name}\n"
        room = max_chars - total - len(header)
        if room <= 200:
            break
        if len(text) > room:
            chunks.append(header + text[:room] + "\n…")
            break
        chunks.append(header + text)
        total += len(header) + len(text)
    return "\n\n".join(chunks)


def detect_skill(messages: list[dict]) -> str:
    """Detect which skill the user wants based on system/user messages."""
    combined = ""
    for msg in messages:
        role = msg.get("role", "")
        content = msg.get("content", "") or ""
        if role in ("system", "user"):
            combined += content.lower() + " "

    # Prefer longer / more specific triggers
    for trigger, skill_dir in sorted(
        SKILL_MAP.items(), key=lambda kv: len(kv[0]), reverse=True
    ):
        if trigger in combined:
            return skill_dir
    return ""


def build_system_prompt(skill_dir: str) -> str:
    """Build the final system prompt by loading the skill + references."""
    skill_content = load_skill(skill_dir)
    if not skill_content:
        return DEFAULT_SYSTEM_PROMPT
    refs = load_skill_references(skill_dir)
    refs_block = (
        f"\n\n--- REFERENCE MATERIALS ---\n\n{refs}\n\n--- END REFERENCES ---\n"
        if refs
        else ""
    )
    return (
        "You are an AI research co-advisor for the full research lifecycle. "
        "Follow the skill procedure below precisely. Do not mention skill "
        "names, directories, or that you are following a skill file.\n\n"
        "--- RESEARCH PROCEDURE ---\n\n"
        f"{skill_content}\n\n"
        "--- END RESEARCH PROCEDURE ---"
        f"{refs_block}\n\n"
        "Execute the procedure based on the user's request. "
        "Return structured output exactly as specified when an output format is given."
    )


async def stream_skill_response(content: str) -> AsyncGenerator[str, None]:
    """Stream a plain-text response as OpenAI-compatible SSE chunks."""
    chunk_size = 8
    for i in range(0, len(content), chunk_size):
        text = content[i : i + chunk_size]
        payload = {
            "id": "supervisor-skills-001",
            "object": "chat.completion.chunk",
            "created": 1715000000,
            "model": "supervisor-skills",
            "choices": [
                {
                    "index": 0,
                    "delta": {"content": text},
                    "finish_reason": None,
                }
            ],
        }
        yield f"data: {json.dumps(payload)}\n\n"
        await asyncio.sleep(0.02)

    # Final chunk
    yield f'data: {json.dumps({"id":"supervisor-skills-001","object":"chat.completion.chunk","created":1715000000,"model":"supervisor-skills","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]})}\n\n'
    yield "data: [DONE]\n\n"


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str | None = None


class ChatCompletionRequest(BaseModel):
    model: str = "supervisor-skills"
    messages: list[ChatMessage]
    temperature: float | None = 0.7
    stream: bool = True
    max_tokens: int | None = None
    api_key: str | None = None


class ChatCompletionChoice(BaseModel):
    index: int
    message: ChatMessage
    finish_reason: str | None


class ChatCompletionResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: list[ChatCompletionChoice]


# ---------------------------------------------------------------------------
# Skill metadata (used by /v1/skills)
# ---------------------------------------------------------------------------
SKILL_METADATA = {
    "idea-evaluator": {
        "name": "Idea Evaluator",
        "description": "Evaluate a research idea across dimensions like feasibility, novelty, and impact",
        "icon": "bulb",
        "canvas_mode": "evaluator",
    },
    "intro-drafter": {
        "name": "Introduction Drafter",
        "description": "Draft a structured Introduction section with AI-guided critique",
        "icon": "writing",
        "canvas_mode": "drafting",
    },
    "literature-review": {
        "name": "Literature Review",
        "description": "Retrieve recent papers, link code, and synthesize a cited research survey",
        "icon": "book",
        "canvas_mode": "literature-review",
    },
    "deep-research": {
        "name": "Deep Research",
        "description": "Survey-grade literature investigation with evidence-first synthesis",
        "icon": "book",
        "canvas_mode": "literature-review",
    },
    "tech-paper-template": {
        "name": "Tech Paper Template",
        "description": "Structure a technical research paper end-to-end",
        "icon": "file-text",
        "canvas_mode": "drafting",
    },
    "benchmark-paper-template": {
        "name": "Benchmark Paper Template",
        "description": "Structure a benchmark/dataset paper end-to-end",
        "icon": "chart-bar",
        "canvas_mode": "drafting",
    },
    "figure-designer": {
        "name": "Figure Designer",
        "description": "Design effective scientific figures and diagrams",
        "icon": "palette",
        "canvas_mode": "brainstorm",
    },
    "pre-submission-reviewer": {
        "name": "Pre-Submission Reviewer",
        "description": "Review a draft manuscript before conference/journal submission",
        "icon": "checklist",
        "canvas_mode": "drafting",
    },
    "scientific-feedback": {
        "name": "Scientific Feedback",
        "description": "Peer-review-style manuscript feedback (Liang et al. review outline)",
        "icon": "checklist",
        "canvas_mode": "drafting",
    },
    "paper-writer": {
        "name": "Paper Writer",
        "description": "Evidence-grounded paper prose from author materials",
        "icon": "writing",
        "canvas_mode": "drafting",
    },
    "paper-polish": {
        "name": "Paper Polish",
        "description": "Polish academic prose tone and clarity",
        "icon": "writing",
        "canvas_mode": "drafting",
    },
    "drawio-reconstruction": {
        "name": "Diagram Reconstruction",
        "description": "Reconstruct and refine scientific diagrams",
        "icon": "palette",
        "canvas_mode": "brainstorm",
    },
    "vibe-research-workflow": {
        "name": "Vibe Research Workflow",
        "description": "Guide AI-assisted research workflow from ideation to execution",
        "icon": "brain",
        "canvas_mode": "brainstorm",
    },
    "brainstorm": {
        "name": "Brainstorm",
        "description": "Organize raw ideas into themes, score viability, and generate concrete research questions",
        "icon": "brain",
        "canvas_mode": "brainstorm",
    },
}


# ---------------------------------------------------------------------------
# Agent detect request model
# ---------------------------------------------------------------------------
class AgentDetectRequest(BaseModel):
    messages: list[ChatMessage]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/")
def root():
    return {"message": "Supervisor-Skills Agent is running"}


@app.get("/v1/skills")
def list_skills():
    """List all available skills with metadata."""
    skills = []
    for skill_id, meta in SKILL_METADATA.items():
        skill_file = SKILLS_DIR / skill_id / "SKILL.md"
        skills.append({
            "id": skill_id,
            "name": meta["name"],
            "description": meta["description"],
            "icon": meta["icon"],
            "canvas_mode": meta["canvas_mode"],
            "available": skill_file.exists() if SKILLS_DIR.exists() else False,
        })
    return {"skills": skills}


@app.get("/v1/skills/{skill_id}")
def get_skill(skill_id: str):
    """Get the full prompt content for a specific skill."""
    if skill_id not in SKILL_METADATA:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found")
    content = load_skill(skill_id)
    meta = SKILL_METADATA[skill_id]
    return {
        "id": skill_id,
        "name": meta["name"],
        "description": meta["description"],
        "icon": meta["icon"],
        "canvas_mode": meta["canvas_mode"],
        "content": content,
        "system_prompt": build_system_prompt(skill_id),
    }


@app.post("/v1/agent/detect")
def agent_detect(req: AgentDetectRequest):
    """Agent auto-detects the relevant skill from conversation context.
    Returns the skill metadata and the full system prompt to inject."""
    messages = [m.model_dump() for m in req.messages]
    skill_dir = detect_skill(messages)
    system_prompt = build_system_prompt(skill_dir)

    skill_meta = None
    if skill_dir and skill_dir in SKILL_METADATA:
        meta = SKILL_METADATA[skill_dir]
        skill_meta = {
            "id": skill_dir,
            "name": meta["name"],
            "description": meta["description"],
            "icon": meta["icon"],
            "canvas_mode": meta["canvas_mode"],
        }

    return {
        "detected": skill_dir != "",
        "skill": skill_meta,
        "system_prompt": system_prompt,
    }


@app.get("/v1/models")
def list_models():
    """OpenAI-compatible model list."""
    return {
        "object": "list",
        "data": [
            {
                "id": "supervisor-skills",
                "object": "model",
                "created": 1715000000,
                "owned_by": "hkust-dial",
            }
        ],
    }


@app.post("/v1/chat/completions")
async def chat_completion(
    request: ChatCompletionRequest,
    x_api_key: str | None = Header(None, alias="X-API-Key")
):
    """OpenAI-compatible chat completion endpoint."""
    messages = [m.model_dump() for m in request.messages]

    # Detect skill
    skill_dir = detect_skill(messages)
    system_prompt = build_system_prompt(skill_dir)

    # Build final message list: system prompt + user messages (drop original system)
    final_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        if msg.get("role") != "system":
            final_messages.append(msg)

    # Resolve API key with priority:
    # 1. X-API-Key header
    # 2. Request body api_key
    # 3. Environment variables (ANTHROPIC_API_KEY or OPENAI_API_KEY)
    api_key = (
        x_api_key
        or request.api_key
        or os.getenv("ANTHROPIC_API_KEY")
        or os.getenv("OPENAI_API_KEY")
    )

    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="No API key available. Provide X-API-Key, set ANTHROPIC_API_KEY or "
                   "OPENAI_API_KEY, or enter a key in MentorOS Settings."
        )

    return await _forward_to_llm(request, final_messages, api_key)


async def _forward_to_llm(
    request: ChatCompletionRequest, messages: list[dict], api_key: str
):
    """Forward the request to an external LLM (Anthropic or OpenAI)."""
    is_anthropic = (
        api_key.startswith("sk-ant-")
        or api_key == os.getenv("ANTHROPIC_API_KEY", "")
    )
    if is_anthropic:
        return await _forward_to_anthropic(request, messages, api_key)

    # OpenAI or compatible
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": os.getenv("OPENAI_MODEL", "gpt-4o"),
        "messages": messages,
        "temperature": request.temperature or 0.7,
        "stream": request.stream,
    }
    if request.max_tokens:
        payload["max_tokens"] = request.max_tokens

    async with httpx.AsyncClient(timeout=120.0, trust_env=False) as client:
        if request.stream:
            resp = await client.post(
                f"{base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=resp.text)

            async def _proxy_stream():
                async for chunk in resp.aiter_text():
                    yield chunk

            return StreamingResponse(
                _proxy_stream(), media_type="text/event-stream"
            )
        else:
            resp = await client.post(
                f"{base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
            return resp.json()


async def _forward_to_anthropic(
    request: ChatCompletionRequest, messages: list[dict], api_key: str
):
    """Forward the request to Anthropic Messages API (converting to OpenAI SSE format)."""
    # Extract system message and build Anthropic message list
    system_text = ""
    anthropic_messages = []
    for msg in messages:
        role = msg.get("role", "")
        content = msg.get("content", "") or ""
        if role == "system":
            system_text = content
        elif role in ("user", "assistant"):
            anthropic_messages.append({"role": role, "content": content})

    model = os.getenv("ANTHROPIC_MODEL", DEFAULT_ANTHROPIC_MODEL)

    payload: dict = {
        "model": model,
        "messages": anthropic_messages,
        "max_tokens": request.max_tokens or 4096,
        "stream": request.stream,
    }
    if system_text:
        payload["system"] = system_text
    if request.temperature is not None:
        payload["temperature"] = request.temperature

    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    }

    base_url = os.getenv("ANTHROPIC_BASE_URL", "https://api.anthropic.com")

    async with httpx.AsyncClient(timeout=120.0, trust_env=False) as client:
        resp = await client.post(
            f"{base_url}/v1/messages",
            headers=headers,
            json=payload,
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)

        if request.stream:
            return StreamingResponse(
                _anthropic_to_openai_stream(resp),
                media_type="text/event-stream",
            )
        else:
            data = resp.json()
            content_blocks = data.get("content", [])
            full_text = ""
            for block in content_blocks:
                if block.get("type") == "text":
                    full_text += block.get("text", "")
            return ChatCompletionResponse(
                id=data.get("id", "anthropic-001"),
                created=1715000000,
                model=model,
                choices=[
                    ChatCompletionChoice(
                        index=0,
                        message=ChatMessage(role="assistant", content=full_text),
                        finish_reason="stop",
                    )
                ],
            )


async def _anthropic_to_openai_stream(
    resp: httpx.Response,
) -> AsyncGenerator[str, None]:
    """Convert Anthropic SSE stream to OpenAI-compatible SSE chunks."""
    completion_id = "anthropic-001"
    model_name = "claude"

    buffer = ""
    async for raw_line in resp.aiter_lines():
        line = raw_line
        if not line:
            continue

        # Anthropic SSE format: event: xxx\ndata: {...}
        if line.startswith("event: "):
            buffer = line[7:].strip()
            continue

        if line.startswith("data: "):
            event_data = line[6:]
            if buffer == "content_block_delta":
                try:
                    parsed = json.loads(event_data)
                    delta = parsed.get("delta", {})
                    text = delta.get("text", "")
                    if text:
                        payload = {
                            "id": completion_id,
                            "object": "chat.completion.chunk",
                            "created": 1715000000,
                            "model": model_name,
                            "choices": [
                                {
                                    "index": 0,
                                    "delta": {"content": text},
                                    "finish_reason": None,
                                }
                            ],
                        }
                        yield f"data: {json.dumps(payload)}\n\n"
                except json.JSONDecodeError:
                    pass
            elif buffer == "message_delta":
                try:
                    parsed = json.loads(event_data)
                    stop_reason = parsed.get("delta", {}).get("stop_reason")
                    if stop_reason:
                        payload = {
                            "id": completion_id,
                            "object": "chat.completion.chunk",
                            "created": 1715000000,
                            "model": model_name,
                            "choices": [
                                {
                                    "index": 0,
                                    "delta": {},
                                    "finish_reason": "stop",
                                }
                            ],
                        }
                        yield f"data: {json.dumps(payload)}\n\n"
                except json.JSONDecodeError:
                    pass
            elif buffer == "message_stop":
                yield "data: [DONE]\n\n"
            buffer = ""


def _build_fallback_response(skill_dir: str, user_msg: str) -> str:
    """Build a demo response when no external LLM is configured."""
    skill_names = {
        "idea-evaluator": "Idea Evaluator",
        "vibe-research-workflow": "Vibe Research Workflow",
        "intro-drafter": "Introduction Drafter",
        "tech-paper-template": "Tech Paper Template",
        "benchmark-paper-template": "Benchmark Paper Template",
        "figure-designer": "Figure Designer",
        "pre-submission-reviewer": "Pre-Submission Reviewer",
    }
    skill_name = skill_names.get(skill_dir, "Supervisor-Skills")

    if not skill_dir:
        return (
            "Welcome to Supervisor-Skills! I am your AI research co-advisor.\n\n"
            "Available skills:\n"
            "1. **idea-evaluator** - Evaluate your research idea\n"
            "2. **intro-drafter** - Draft an Introduction outline\n"
            "3. **tech-paper-template** - Structure a technical paper\n"
            "4. **benchmark-paper-template** - Structure a benchmark paper\n"
            "5. **figure-designer** - Design scientific figures\n"
            "6. **pre-submission-reviewer** - Review before submission\n"
            "7. **vibe-research-workflow** - AI-assisted research workflow\n\n"
            "Please tell me which skill you'd like to use and describe your research topic."
        )

    return (
        f"**Skill activated: {skill_name}**\n\n"
        f"I have loaded the full `{skill_dir}` skill procedure into context.\n\n"
        f"Your request: \"{user_msg}\"\n\n"
        "---\n\n"
        "To get a real LLM-generated response, set an `OPENAI_API_KEY` environment variable "
        "and restart the backend. The skill prompt will then be forwarded to the LLM.\n\n"
        "In demo mode, I confirm the skill is loaded and ready. Please provide more details "
        "about your research so I can run the skill procedure."
    )


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "6000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
