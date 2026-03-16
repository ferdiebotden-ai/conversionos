#!/usr/bin/env python3
"""
Apple Notes Daily Sync + Auto-Review
Pulls today's notes from Apple Notes, stores them to the brain, 
reviews for business applicability, and routes actionable ideas to Research Scout.
Run as: python3 ~/pipeline/scripts/apple_notes_daily.py
Schedule: Nightly via cron (e.g., 11pm)
"""
import subprocess
import json
import os
import re
from datetime import datetime, timedelta

# Get today's date for filtering
today = datetime.now()
today_str = today.strftime("%Y-%m-%d")
yesterday_dt = today - timedelta(days=1)
yesterday_str = yesterday_dt.strftime("%Y-%m-%d")
today_display = today.strftime("%B %d, %Y")  # e.g., "February 15, 2026"
yesterday_display = yesterday_dt.strftime("%B %d, %Y")  # e.g., "February 14, 2026"

def get_recent_notes():
    """Get notes from today and yesterday from Apple Notes via AppleScript"""
    script = '''
tell application "Notes"
    set output to ""
    set targetDateStart to date "''' + yesterday_str + '''"
    repeat with n in notes
        set noteName to name of n
        set noteBody to plaintext of n
        set noteMod to modification date of n
        set noteCreate to creation date of n
        
        -- Only include notes modified in last 2 days
        if noteMod > (current date) - (2 * days) then
            set output to output & noteName & "|||MOD:" & (noteMod as string) & "|||BODY:" & noteBody & "|||ENDNOTE|||"
        end if
    end repeat
    return output
end tell
'''
    
    try:
        result = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode != 0:
            print(f"Error: {result.stderr}")
            return []
        
        output = result.stdout.strip()
        if not output:
            return []
        
        # Parse notes by splitting on |||ENDNOTE|||
        notes = []
        raw_notes = output.split("|||ENDNOTE|||")
        
        for raw in raw_notes:
            if not raw.strip():
                continue
            
            # Parse: name|||MOD:date|||BODY:content
            parts = raw.split("|||MOD:")
            if len(parts) < 2:
                continue
            
            name = parts[0].strip()
            rest = parts[1]
            
            body_parts = rest.split("|||BODY:")
            if len(body_parts) < 2:
                continue
            
            date_str = body_parts[0].strip()
            body = body_parts[1].strip()
            
            # Extract just the date portion
            date_match = re.search(r'(\w+day, \w+ \d{1,2}, \d{4})', date_str)
            date_parsed = date_match.group(1) if date_match else date_str
            
            notes.append({
                "name": name,
                "date_str": date_parsed,
                "content": body
            })
        
        return notes
        
    except Exception as e:
        print(f"Error: {e}")
        return []

def store_to_brain(content, source="apple_notes", memory_type="conversation", metadata=None):
    """Store content to the brain via memory_utils.py"""
    # Truncate if too long
    if len(content) > 2000:
        content = content[:2000] + "..."
    
    cmd = [
        "python3", 
        os.path.expanduser("~/pipeline/scripts/memory_utils.py"),
        "store",
        "--type", memory_type,
        "--content", content,
        "--source", source,
    ]
    
    if metadata:
        cmd.extend(["--metadata", json.dumps(metadata)])
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        return result.returncode == 0
    except Exception as e:
        print(f"Error storing: {e}")
        return False

def categorize_note(note_name, note_content):
    """Categorize note and determine if it needs research or is actionable"""
    name_lower = note_name.lower()
    content_lower = note_content.lower()
    
    # Skip personal/lists
    skip_keywords = ["grocery", "shopping list", "todo", "to-do", "costco", "walmart", 
                     "sobeys", "produce", "chicken", "dinner", "food list", "packing list",
                     "chemo", "medical", "appointment", "room #", "chart #"]
    if any(kw in name_lower for kw in skip_keywords):
        return "skip", None
    
    # Skip sensitive
    sensitive_keywords = ["api key", "token:", "password", "db password", "bot token", "secret"]
    if any(kw in name_lower for kw in sensitive_keywords):
        return "skip", None
    
    # Business idea / needs research
    idea_keywords = ["idea", "use", "create", "build", "implement", "setup", "automate", 
                     "improve", "pitch", "outreach", "strategy", "research"]
    research_keywords = ["research", "find out", "investigate", "how to", "learn about"]
    
    is_business_related = any(kw in name_lower for kw in idea_keywords) or \
                          any(kw in content_lower[:500] for kw in idea_keywords)
    needs_research = any(kw in content_lower for kw in research_keywords)
    
    if is_business_related:
        if needs_research:
            return "needs_research", "Research feasibility of: " + note_content[:200]
        else:
            return "actionable_idea", note_content[:300]
    
    # General business note - store for awareness
    return "business_note", None

def route_to_research_scout(idea_content):
    """Route an idea to Research Scout for investigation"""
    # Store as a research request
    store_to_brain(
        content=f"[RESEARCH REQUEST] {idea_content}",
        source="apple_notes_review",
        memory_type="research",
        metadata={"from_notes": True, "date": today_str}
    )
    print(f"  → Routed to Research Scout: {idea_content[:80]}...")

def main():
    print(f"=== Apple Notes Daily Sync + Review ===")
    print(f"Date: {today_str} | Looking for: {today_display} or {yesterday_display}")
    
    # Get notes
    notes = get_recent_notes()
    
    if not notes:
        print("No recent notes found.")
        return
    
    print(f"Found {len(notes)} recent notes")
    
    # Process each note
    stored_count = 0
    skipped_count = 0
    research_count = 0
    actionable_count = 0
    
    for note in notes:
        note_date_str = note.get("date_str", "")
        note_name = note.get("name", "")
        note_content = note.get("content", "")
        
        # Check if it's from today or yesterday
        is_today = today_display in note_date_str
        is_yesterday = yesterday_display in note_date_str
        
        if not (is_today or is_yesterday):
            skipped_count += 1
            continue
        
        # Skip empty or very short notes
        if not note_content or len(note_content.strip()) < 20:
            skipped_count += 1
            continue
        
        # Categorize the note
        category, processed_content = categorize_note(note_name, note_content)
        
        if category == "skip":
            skipped_count += 1
            continue
        
        # Store the original note
        full_content = f"[Apple Notes - {note_date_str}] {note_name}: {note_content}"
        if store_to_brain(full_content):
            stored_count += 1
            print(f"  ✓ Stored: {note_name[:50]}...")
        
        # Handle based on category
        if category == "needs_research":
            research_count += 1
            route_to_research_scout(processed_content)
        elif category == "actionable_idea":
            actionable_count += 1
            # Store as an actionable idea for morning briefing
            store_to_brain(
                content=f"[ACTIONABLE IDEA] {note_name}: {note_content[:300]}",
                source="apple_notes_review",
                memory_type="idea",
                metadata={"from_notes": True, "date": today_str}
            )
            print(f"  → Actionable: {note_name[:40]}...")
    
    print(f"=== Sync Complete ===")
    print(f"  Stored: {stored_count}")
    print(f"  Skipped: {skipped_count}")
    print(f"  Routed to Research: {research_count}")
    print(f"  Actionable Ideas: {actionable_count}")

if __name__ == "__main__":
    main()
