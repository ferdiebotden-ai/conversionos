#!/usr/bin/env python3
"""
Morning Briefing Generator  
==========================
Runs at 6am to present:
1. Pipeline status
2. Proposals from nightly review
3. Clear approve/ignore choices

Ferdie replies with numbers to approve.
"""

import os
import sys
import json
from datetime import datetime
from pathlib import Path

PIPELINE_DIR = Path.home() / "pipeline" / "scripts"
sys.path.insert(0, str(PIPELINE_DIR))

from dotenv import load_dotenv
load_dotenv(PIPELINE_DIR / ".env")

from db_utils import get_db

def get_pending_proposals():
    """Get proposals awaiting review from JSON files."""
    proposals = []
    
    # Read from today's proposals file
    proposals_file = Path.home() / "norbot" / "agents" / "knox" / "memory" / f"proposals-{datetime.now().strftime('%Y-%m-%d')}.json"
    
    if proposals_file.exists():
        with open(proposals_file, "r") as f:
            proposals = json.load(f)
    
    # Sort by impact
    impact_order = {"high": 1, "medium": 2, "low": 3, "unknown": 4}
    proposals.sort(key=lambda p: (impact_order.get(p.get("impact", "unknown"), 4), p.get("effort", "unknown")))
    
    return proposals[:8]

def get_pipeline_summary():
    """Get pipeline snapshot."""
    with get_db() as conn:
        c = conn.execute("SELECT status, COUNT(*) as count FROM targets GROUP BY status")
        targets = {row['status']: row['count'] for row in c.fetchall()}
        c = conn.execute("SELECT status, COUNT(*) as count FROM territories GROUP BY status")
        territories = {row['status']: row['count'] for row in c.fetchall()}
    return targets, territories

def format_briefing(proposals, targets, territories):
    """Format morning briefing."""
    lines = []
    
    # Header
    lines.append(f"☀️ **Morning Briefing — {datetime.now().strftime('%b %d, %Y')}**\n")
    
    # Pipeline
    lines.append("**Pipeline:**")
    for status in ["draft_ready", "email_1_sent", "email_2_sent", "qualified", "closed_won"]:
        if status in targets:
            lines.append(f"  • {status}: {targets[status]}")
    
    avail = territories.get("available", 0)
    reserved = territories.get("reserved", 0)
    lines.append(f"\n**Territories:** {avail} available, {reserved} reserved\n")
    
    # Goal reminder
    days_left = (datetime(2026, 3, 10) - datetime.now()).days
    lines.append(f"**Goal:** $60K by March 10 ({days_left} days left)\n")
    
    # Proposals
    if proposals:
        lines.append("**Proposals for Review:**\n")
        
        for i, prop in enumerate(proposals, 1):
            emoji = {"high": "🔥", "medium": "💡", "low": "📝", "unknown": "❓"}.get(prop["impact"], "💡")
            
            lines.append(f"{i}. {emoji} **{prop['title']}**")
            lines.append(f"   Impact: {prop['impact'].upper()} | Effort: {prop['effort']} | Cost: {prop['cost']}")
            lines.append(f"   _{prop['business_case']}_")
            
            # Show first 2 actions
            if prop["actions"]:
                action_preview = ", ".join(prop["actions"][:2])
                if len(prop["actions"]) > 2:
                    action_preview += "..."
                lines.append(f"   Next: {action_preview}")
            lines.append("")
    else:
        lines.append("**No new proposals** — pipeline humming along.\n")
    
    lines.append("Reply with numbers to approve (e.g., `1,3`) or ignore.")
    lines.append("")
    lines.append("---")
    lines.append("💡 Built with Observer/Reflector + Auto-Synthesis patterns")
    
    return "\n".join(lines)

def save_briefing(content):
    """Save briefing to file."""
    briefing_file = Path.home() / "norbot" / "agents" / "knox" / "memory" / f"briefing-{datetime.now().strftime('%Y-%m-%d')}.md"
    briefing_file.parent.mkdir(parents=True, exist_ok=True)
    with open(briefing_file, "w") as f:
        f.write(content)
    return briefing_file

def run_morning_briefing():
    """Generate and output morning briefing."""
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Generating morning briefing...")
    
    proposals = get_pending_proposals()
    targets, territories = get_pipeline_summary()
    
    briefing = format_briefing(proposals, targets, territories)
    
    # Save
    save_briefing(briefing)
    
    # Output
    print(briefing)
    
    return briefing

if __name__ == "__main__":
    run_morning_briefing()
