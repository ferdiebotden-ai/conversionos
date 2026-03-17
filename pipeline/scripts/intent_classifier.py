#!/usr/bin/env python3
"""Email intent classification using Gemini 3.1 Pro.

Classifies inbound email replies to determine prospect intent.
Uses Google AI Studio OAuth (free tier, 1M context window).
Falls back to regex-based classification if Gemini is unavailable.

Usage (standalone test):
    python scripts/intent_classifier.py --subject "Re: Estimate Request" --body "Sounds interesting, tell me more"
    python scripts/intent_classifier.py --subject "Re: Estimate Request" --body "STOP"
"""

import argparse
import json
import os
import re
import sys
from typing import Optional

# Gemini client (lazy import — only load if API key available)
_gemini_client = None


def _get_gemini_client():
    """Lazy-init the Gemini client using Google AI Studio OAuth or API key."""
    global _gemini_client
    if _gemini_client is not None:
        return _gemini_client

    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None

    try:
        from google import genai
        _gemini_client = genai.Client(api_key=api_key)
        return _gemini_client
    except ImportError:
        print("  WARN: google-genai package not installed. Run: pip install google-genai", file=sys.stderr)
        return None
    except Exception as e:
        print(f"  WARN: Gemini client init failed: {e}", file=sys.stderr)
        return None


# ──────────────────────────────────────────────────────────
# Regex fast-path for obvious patterns (skip LLM)
# ──────────────────────────────────────────────────────────

STOP_PATTERNS = [
    r'\bstop\b', r'\bunsubscribe\b', r'\bremove\b', r'\bopt[\s-]?out\b',
    r'\bdo not contact\b', r'\bno more\b', r'\btake me off\b',
]
STOP_RE = re.compile('|'.join(STOP_PATTERNS), re.IGNORECASE)

OOO_PATTERNS = [
    r'out of (?:the )?office', r'automatic reply', r'auto[\s-]?reply',
    r'currently away', r'on vacation', r'on leave', r'will return',
    r'limited access to email',
]
OOO_RE = re.compile('|'.join(OOO_PATTERNS), re.IGNORECASE)

BOUNCE_PATTERNS = [
    r'delivery.*(?:failed|failure)', r'undeliverable', r'mailer[\s-]?daemon',
    r'message.*not.*delivered', r'permanent.*failure', r'mailbox.*(?:full|not found)',
    r'550[\s:]', r'553[\s:]', r'554[\s:]',
]
BOUNCE_RE = re.compile('|'.join(BOUNCE_PATTERNS), re.IGNORECASE)


def _regex_fast_path(subject: str, body: str) -> Optional[dict]:
    """Fast regex classification for obvious patterns. Returns None if no match."""
    text = f"{subject} {body}".strip()

    # Very short messages that match STOP
    if len(body.split()) <= 5 and STOP_RE.search(text):
        return {
            "intent": "stop",
            "confidence": 0.95,
            "summary": "Explicit unsubscribe request (CASL compliance required)",
            "suggested_action": "unsubscribe",
            "method": "regex_fast_path",
        }

    # Out of office
    if OOO_RE.search(text):
        return {
            "intent": "ooo",
            "confidence": 0.9,
            "summary": "Out-of-office auto-reply",
            "suggested_action": "ignore",
            "method": "regex_fast_path",
        }

    # Bounce
    if BOUNCE_RE.search(text):
        return {
            "intent": "bounce",
            "confidence": 0.9,
            "summary": "Email delivery failure / bounce",
            "suggested_action": "ignore",
            "method": "regex_fast_path",
        }

    return None  # No fast-path match — use LLM


# ──────────────────────────────────────────────────────────
# Gemini classification
# ──────────────────────────────────────────────────────────

CLASSIFICATION_PROMPT = """You are an email intent classifier for a B2B SaaS company that rebuilds websites for renovation contractors.

We sent a cold outreach email to a contractor offering to rebuild their website. They replied. Classify their intent.

ORIGINAL OUTREACH SUBJECT: {original_subject}
COMPANY NAME: {company_name}

REPLY SUBJECT: {reply_subject}
REPLY BODY:
{reply_body}

Classify the reply into exactly ONE of these categories:
- "interested" — positive interest, wants to learn more, asks questions about the offer, mentions their website
- "not_interested" — polite or direct decline, "no thanks", "not at this time", "we're good"
- "stop" — explicit unsubscribe request ("stop", "remove me", "don't contact me")
- "question" — asks a question without clear positive/negative intent ("who are you?", "how did you get my email?")
- "ooo" — out-of-office auto-reply
- "bounce" — delivery failure notification
- "irrelevant" — spam, unrelated content, automated marketing reply

Respond ONLY with valid JSON (no markdown fences):
{{"intent": "...", "confidence": 0.0-1.0, "summary": "one line", "suggested_action": "reply|build_demo|unsubscribe|ignore|escalate"}}
"""


def classify_with_gemini(
    reply_subject: str,
    reply_body: str,
    original_subject: str = "",
    company_name: str = "",
) -> Optional[dict]:
    """Classify email intent using Gemini 3.1 Pro. Returns None on failure."""
    client = _get_gemini_client()
    if not client:
        return None

    prompt = CLASSIFICATION_PROMPT.format(
        original_subject=original_subject or "Estimate Request",
        company_name=company_name or "Unknown",
        reply_subject=reply_subject,
        reply_body=reply_body[:2000],  # Cap body length
    )

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",  # Fast + cheap, good enough for classification
            contents=prompt,
        )

        text = response.text.strip()
        # Strip markdown fences if present
        if text.startswith("```"):
            text = re.sub(r'^```(?:json)?\s*\n?', '', text)
            text = re.sub(r'\n?```$', '', text)

        result = json.loads(text)
        result["method"] = "gemini"

        # Validate required fields
        if result.get("intent") not in {"interested", "not_interested", "stop", "question", "ooo", "bounce", "irrelevant"}:
            return None

        return result
    except json.JSONDecodeError as e:
        print(f"  WARN: Gemini response not valid JSON: {e}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"  WARN: Gemini classification failed: {e}", file=sys.stderr)
        return None


# ──────────────────────────────────────────────────────────
# Regex fallback (when Gemini is unavailable)
# ──────────────────────────────────────────────────────────

POSITIVE_PATTERNS = [
    r'\binterested\b', r'\btell me more\b', r'\bsounds good\b',
    r'\blet.?s (chat|talk|discuss|connect)\b', r'\byes\b',
    r'\bcall me\b', r'\bset up a (call|meeting|time)\b',
    r'\bwebsite\b.*\b(redo|rebuild|update|improve)\b',
    r'\bwhat.?s (?:the|your) (?:cost|price|pricing)\b',
    r'\bhow (?:much|does it cost)\b',
]
POSITIVE_RE = re.compile('|'.join(POSITIVE_PATTERNS), re.IGNORECASE)

NEGATIVE_PATTERNS = [
    r'\bnot interested\b', r'\bno thanks?\b', r'\bno thank you\b',
    r'\bwe.?re (?:good|fine|set)\b', r'\bpass\b', r'\bdon.?t need\b',
    r'\bnot (?:at this time|right now|looking)\b', r'\balready have\b',
]
NEGATIVE_RE = re.compile('|'.join(NEGATIVE_PATTERNS), re.IGNORECASE)


def _regex_fallback(subject: str, body: str) -> dict:
    """Regex-only classification (degraded accuracy). Always returns a result."""
    text = f"{subject} {body}".strip()

    if STOP_RE.search(text):
        return {"intent": "stop", "confidence": 0.8, "summary": "STOP keyword detected", "suggested_action": "unsubscribe", "method": "regex_fallback"}
    if OOO_RE.search(text):
        return {"intent": "ooo", "confidence": 0.8, "summary": "Out-of-office detected", "suggested_action": "ignore", "method": "regex_fallback"}
    if BOUNCE_RE.search(text):
        return {"intent": "bounce", "confidence": 0.8, "summary": "Bounce detected", "suggested_action": "ignore", "method": "regex_fallback"}
    if NEGATIVE_RE.search(text):
        return {"intent": "not_interested", "confidence": 0.7, "summary": "Negative keywords detected", "suggested_action": "ignore", "method": "regex_fallback"}
    if POSITIVE_RE.search(text):
        return {"intent": "interested", "confidence": 0.6, "summary": "Positive keywords detected", "suggested_action": "build_demo", "method": "regex_fallback"}

    # Default: treat as question (safest — doesn't auto-advance or unsubscribe)
    return {"intent": "question", "confidence": 0.4, "summary": "No clear intent detected — needs human review", "suggested_action": "escalate", "method": "regex_fallback"}


# ──────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────

def classify_email_intent(
    reply_subject: str,
    reply_body: str,
    original_subject: str = "",
    company_name: str = "",
) -> dict:
    """Classify the intent of an email reply.

    Returns a dict with keys: intent, confidence, summary, suggested_action, method.

    Priority:
    1. Regex fast-path (obvious patterns — skip LLM)
    2. Gemini 3.1 Pro (if available)
    3. Regex fallback (degraded)
    """
    # 1. Regex fast-path
    fast = _regex_fast_path(reply_subject, reply_body)
    if fast:
        return fast

    # 2. Gemini classification
    gemini = classify_with_gemini(reply_subject, reply_body, original_subject, company_name)
    if gemini:
        return gemini

    # 3. Regex fallback
    return _regex_fallback(reply_subject, reply_body)


# ──────────────────────────────────────────────────────────
# CLI (standalone testing)
# ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Classify email reply intent")
    parser.add_argument("--subject", required=True, help="Reply subject line")
    parser.add_argument("--body", required=True, help="Reply body text")
    parser.add_argument("--original-subject", default="Estimate Request — London", help="Original outreach subject")
    parser.add_argument("--company", default="Test Contractor", help="Company name")
    args = parser.parse_args()

    result = classify_email_intent(args.subject, args.body, args.original_subject, args.company)
    print(json.dumps(result, indent=2))
