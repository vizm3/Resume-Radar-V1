# =============================================================================
# analyzer.py — Gemini AI Analysis Engine
# =============================================================================

import re
import json
import textwrap
from google import genai

# ─── CLIENT INIT ─────────────────────────────────────────────────────────────
_client = None

def init_client(api_key: str):
    global _client
    _client = genai.Client(api_key=api_key)

def get_client():
    if _client is None:
        raise RuntimeError("Gemini client not initialized. Call init_client() first.")
    return _client

MODEL = "gemini-2.5-flash"

# ─── HELPERS ─────────────────────────────────────────────────────────────────
def extract_json(text: str) -> dict:
    """Robustly extract JSON from Gemini response text."""
    text = re.sub(r"```json|```", "", text).strip()
    match = re.search(r'\{[\s\S]*\}', text)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return {}


def _call_gemini(prompt: str) -> str:
    response = get_client().models.generate_content(model=MODEL, contents=prompt)
    return response.text


# ─── PROMPTS ─────────────────────────────────────────────────────────────────
def _analysis_prompt(resume: str, jd: str) -> str:
    return textwrap.dedent(f"""
    You are an expert ATS system and resume coach.

    Analyze the RESUME against the JOB DESCRIPTION and return ONLY a JSON object with exactly this structure:

    {{
      "score": <integer 0-100>,
      "matched_keywords": [<skills/tools in both resume AND JD, 5-15 items>],
      "missing_keywords": [<important skills in JD but NOT in resume, 5-15 items>],
      "suggestions": [<5-7 specific, actionable resume improvement suggestions>],
      "summary": "<2-3 sentence honest assessment of fit>"
    }}

    SCORING:
    - 80-100: Strong match, most required skills present
    - 60-79: Good match, minor gaps
    - 40-59: Partial match, several key gaps
    - 0-39: Weak match, significant misalignment

    Return ONLY the JSON. No markdown, no preamble, no explanation.

    RESUME:
    {resume[:4500]}

    JOB DESCRIPTION:
    {jd[:3000]}
    """).strip()


def _role_discovery_prompt(resume: str, score: int) -> str:
    return textwrap.dedent(f"""
    You are a career advisor and talent expert.

    Based on this resume, the candidate scored only {score}/100 on a specific job.
    Identify 4-5 alternative roles that would be a strong fit based on their existing skills.

    Return ONLY a JSON object with this structure:
    {{
      "roles": [
        {{
          "title": "<job title>",
          "match_percent": <integer 60-95>,
          "reason": "<1-2 sentence reason why they're a good fit>",
          "key_skills_used": [<2-4 skills from their resume that are relevant>],
          "skill_to_add": "<single most impactful skill to add for this role>"
        }}
      ]
    }}

    Return ONLY the JSON. No markdown, no preamble.

    RESUME:
    {resume[:4000]}
    """).strip()


# ─── PUBLIC API ──────────────────────────────────────────────────────────────
def analyze_resume(resume: str, jd: str) -> dict:
    """Main analysis: ATS score + keyword match + suggestions."""
    try:
        raw = _call_gemini(_analysis_prompt(resume, jd))
        result = extract_json(raw)

        if not result or "score" not in result:
            return {"error": "AI returned an unexpected response. Please try again."}

        result.setdefault("matched_keywords", [])
        result.setdefault("missing_keywords", [])
        result.setdefault("suggestions", [])
        result.setdefault("summary", "")
        result["score"] = max(0, min(100, int(result["score"])))
        return result

    except Exception as e:
        return {"error": str(e)}


def discover_roles(resume: str, score: int) -> dict:
    """Role discovery engine: suggest alternative roles based on resume skills."""
    try:
        raw = _call_gemini(_role_discovery_prompt(resume, score))
        result = extract_json(raw)

        if not result or "roles" not in result:
            return {"error": "Could not generate role suggestions."}

        return result

    except Exception as e:
        return {"error": str(e)}
