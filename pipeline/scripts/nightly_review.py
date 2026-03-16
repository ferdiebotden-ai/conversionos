#!/usr/bin/env python3
"""
Nightly Review & Self-Improvement System
========================================
Best Practices (from /last30days research):
- OBSERVER/REFLECTOR PATTERN: Separate capture vs analysis
- MEMORY LAYERS: State → Daily logs → Long-term learnings → Vector memory  
- AUTO-SYNTHESIS: Generate summaries from raw facts
- MEMORY DECAY: Prune stale info
- POST-SESSION CONSOLIDATION: Extract patterns after each day
- TEST-TIME EVOLUTION: Actively evolve memory/reflection

Runs at midnight after Apple Notes sync (11pm)
"""

import os
import sys
import json
import subprocess
from datetime import datetime, timedelta
from pathlib import Path

PIPELINE_DIR = Path.home() / "pipeline" / "scripts"
sys.path.insert(0, str(PIPELINE_DIR))

from dotenv import load_dotenv
load_dotenv(PIPELINE_DIR / ".env")

from db_utils import get_db

def get_pipeline_status():
    """OBSERVER: Get current pipeline metrics (what happened)."""
    with get_db() as conn:
        c = conn.execute("SELECT status, COUNT(*) as count FROM targets GROUP BY status")
        targets = {row['status']: row['count'] for row in c.fetchall()}
        c = conn.execute("SELECT status, COUNT(*) as count FROM territories GROUP BY status")
        territories = {row['status']: row['count'] for row in c.fetchall()}
    return {"targets": targets, "territories": territories}

def search_brain(query, limit=5):
    """OBSERVER: Search organizational memory for context."""
    try:
        result = subprocess.run(
            ["python", str(PIPELINE_DIR / "memory_utils.py"), "search",
             "--query", query, "--limit", str(limit)],
            capture_output=True, text=True, timeout=30,
            cwd=str(PIPELINE_DIR)
        )
        return result.stdout if result.returncode == 0 else ""
    except:
        return ""

def get_recent_ideas():
    """OBSERVER: Get ideas captured from Apple Notes today/yesterday."""
    brain_results = search_brain("apple_notes idea actionable", 20)
    ideas = []
    for line in brain_results.split("\n"):
        if "[Apple Notes" in line or "[ACTIONABLE IDEA]" in line:
            ideas.append(line.strip())
    return ideas

def get_previous_learnings():
    """REFLECTOR: Get previous learnings to avoid repeating."""
    brain_results = search_brain("learning lesson decision", 10)
    learnings = []
    for line in brain_results.split("\n"):
        if "learning" in line.lower() or "lesson" in line.lower():
            learnings.append(line.strip())
    return learnings

def analyze_idea(idea_text, pipeline_status, previous_learnings):
    """
    REFLECTOR: Analyze an idea against business context and previous learnings.
    Returns structured proposal with impact/effort/alignment.
    
    Applies TEST-TIME EVOLUTION: evolve the idea based on what's already been tried.
    """
    text_lower = idea_text.lower()
    march_goal = "$60K by March 10"
    days_left = (datetime(2026, 3, 10) - datetime.now()).days
    
    # Check if this idea was already tried (memory: don't repeat)
    for learning in previous_learnings:
        if any(word in learning.lower() for word in ["sms", "text", "video", "territory"]):
            if any(word in text_lower for word in ["sms", "text", "video", "territory"]):
                # Already tried - mark as "already attempted"
                return None
    
    proposal = None
    
    # VIDEO/MICROSITE (enhancement)
    if any(k in text_lower for k in ["video", "remotion", "microsite"]):
        proposal = {
            "title": "Video-enhanced microsites",
            "description": "Add video to ConversionOS contractor microsites using Remotion or similar",
            "business_case": f"Higher engagement → better conversion → closer to {march_goal} ({days_left} days left)",
            "impact": "medium",
            "effort": "medium",
            "cost": "$0-50/mo (API)",
            "alignment": "pipeline_conversion",
            "evolution_note": "Test-time evolution: adds video layer to existing microsite foundation",
            "actions": [
                "Research Remotion API vs alternatives",
                "Design video template for contractor pages", 
                "Create A/B test (with/without video)",
                "Measure conversion lift"
            ]
        }
    
    # OUTREACH/SMS (multi-channel)
    elif any(k in text_lower for k in ["text", "sms", "call script", "phone", "verified cell"]):
        proposal = {
            "title": "SMS follow-up for outreach",
            "description": "Text verified cell numbers day-2 after email to increase response rates",
            "business_case": f"Multi-channel → higher reply rates → more demos → {march_goal}",
            "impact": "high",
            "effort": "low",
            "cost": "$10-20/mo (Twilio)",
            "alignment": "pipeline_efficiency",
            "evolution_note": "Test-time evolution: adds SMS layer to existing email workflow",
            "actions": [
                "Setup Twilio or SMS API (CASL compliant)",
                "Write SMS templates (max 160 chars)",
                "Add phone extraction to qualification",
                "Test with 10 targets, measure response lift"
            ]
        }
    
    # AGENT/AUTOMATION (system improvement)
    elif any(k in text_lower for k in ["agent", "automate", "dropbox", "task"]):
        proposal = {
            "title": "Inter-agent task queue",
            "description": "Shared task dropbox for agents to coordinate via cron",
            "business_case": "Better coordination → less manual work → scale faster",
            "impact": "medium",
            "effort": "medium",
            "cost": "$0",
            "alignment": "operations_efficiency", 
            "evolution_note": "Test-time evolution: formalizes implicit agent handoffs",
            "actions": [
                "Design task schema (from/to/type/payload)",
                "Create SQLite tasks table",
                "Add task pickup to agent boot sequence",
                "Test: Research Scout → Knox handoff"
            ]
        }
    
    # TERRITORY EXPANSION (pipeline growth)
    elif any(k in text_lower for k in ["territory", "expand", "city", "mississauga", "barrie"]):
        avail = pipeline_status["territories"].get("available", 0)
        proposal = {
            "title": "Expand to new territories",
            "description": f"Add 2-3 new cities (Mississauga, Barrie) — currently {avail} available",
            "business_case": f"More territories → more targets → {march_goal}",
            "impact": "high",
            "effort": "low",
            "cost": "$0",
            "alignment": "pipeline_growth",
            "evolution_note": "Test-time evolution: systematic expansion beyond current geography",
            "actions": [
                "Run expand_territories.py for new cities",
                "Review and approve suggestions",
                "Trigger discovery for new territories"
            ]
        }
    
    return proposal

def generate_proposals(ideas, pipeline_status):
    """REFLECTOR: Generate proposals from all ideas, filtering repeats."""
    # Get business context and previous learnings
    business_context = {
        "goals": search_brain("revenue goal March 60K", 3),
        "learnings": get_previous_learnings()
    }
    
    proposals = []
    seen_titles = set()  # Deduplicate
    
    for idea in ideas:
        prop = analyze_idea(idea, pipeline_status, business_context["learnings"])
        if prop and prop["title"] not in seen_titles:  # Skip duplicates
            prop["generated_at"] = datetime.now().isoformat()
            prop["status"] = "pending"
            proposals.append(prop)
            seen_titles.add(prop["title"])
    
    return proposals

def auto_synthesize(ideas, pipeline_status):
    """
    AUTO-SYNTHESIS: Generate a learning from today's ideas and pipeline state.
    This creates a distilled insight for long-term memory.
    """
    synthesis = {
        "date": datetime.now().strftime("%Y-%m-%d"),
        "insight": "",
        "pattern": ""
    }
    
    # Analyze patterns
    idea_count = len(ideas)
    target_count = sum(pipeline_status["targets"].values())
    email_sent = pipeline_status["targets"].get("email_1_sent", 0)
    
    # Generate insight based on patterns
    if email_sent > 10:
        synthesis["insight"] = f"Pipeline scaling: {email_sent} emails sent, {target_count} total targets"
        synthesis["pattern"] = "outreach_acceleration"
    elif idea_count > 5:
        synthesis["insight"] = f"High ideation: {idea_count} ideas captured today"
        synthesis["pattern"] = "ideation_surge"
    else:
        synthesis["insight"] = f"Normal day: {idea_count} ideas, {target_count} targets"
        synthesis["pattern"] = "steady_state"
    
    return synthesis

def save_proposals(proposals):
    """Save proposals for morning briefing - save to JSON file as fallback."""
    if not proposals:
        return 0
    
    # Save to JSON file for now (more reliable than Turso)
    proposals_file = Path.home() / "norbot" / "agents" / "knox" / "memory" / f"proposals-{datetime.now().strftime('%Y-%m-%d')}.json"
    proposals_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(proposals_file, "w") as f:
        json.dump(proposals, f, indent=2)
    
    return len(proposals)

def log_learning(synthesis):
    """AUTO-SYNTHESIS: Store learning in brain."""
    try:
        content = f"Daily synthesis: {synthesis['insight']} | Pattern: {synthesis['pattern']}"
        subprocess.run(
            ["python", str(PIPELINE_DIR / "memory_utils.py"), "store",
             "--type", "learning",
             "--content", content,
             "--source", "nightly_review"],
            cwd=str(PIPELINE_DIR), timeout=30
        )
    except:
        pass

def run_nightly_review():
    """Main nightly review with observer/reflector pattern."""
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 🌙 Nightly Review Starting...")
    
    # OBSERVER PHASE: Capture what's happening
    print("  [OBSERVER] Capturing pipeline state...")
    pipeline = get_pipeline_status()
    print(f"  Pipeline: {pipeline['targets']}")
    
    print("  [OBSERVER] Capturing ideas...")
    ideas = get_recent_ideas()
    print(f"  Ideas: {len(ideas)} captured")
    
    # REFLECTOR PHASE: Analyze and generate proposals
    print("  [REFLECTOR] Analyzing against context...")
    previous_learnings = get_previous_learnings()
    proposals = generate_proposals(ideas, pipeline)
    print(f"  Proposals: {len(proposals)} generated")
    
    # AUTO-SYNTHESIS: Create learning
    print("  [SYNTHESIZER] Creating daily learning...")
    synthesis = auto_synthesize(ideas, pipeline)
    print(f"  Insight: {synthesis['insight']}")
    
    # Save
    if proposals:
        saved = save_proposals(proposals)
        print(f"  Saved: {saved} proposals")
    
    log_learning(synthesis)
    
    # Summary
    summary = {
        "date": datetime.now().strftime("%Y-%m-%d"),
        "ideas_count": len(ideas),
        "proposals_count": len(proposals),
        "insight": synthesis["insight"],
        "pipeline": pipeline["targets"]
    }
    
    summary_file = Path.home() / "norbot" / "agents" / "knox" / "memory" / f"review-{datetime.now().strftime('%Y-%m-%d')}.json"
    summary_file.parent.mkdir(parents=True, exist_ok=True)
    with open(summary_file, "w") as f:
        json.dump(summary, f, indent=2)
    
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ✅ Complete!")
    return summary

if __name__ == "__main__":
    run_nightly_review()
