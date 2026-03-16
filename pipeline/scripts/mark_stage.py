#!/usr/bin/env python3
"""Advance a lead's status in the pipeline.

Usage:
    python mark_stage.py <target_id> <new_status>

    # Examples:
    python mark_stage.py 1 email_1_sent
    python mark_stage.py 1 sms_sent
    python mark_stage.py 1 phone_called
    python mark_stage.py 1 email_2_sent
    python mark_stage.py 1 email_3_sent
    python mark_stage.py 1 closed_won

Valid statuses:
    discovered -> qualified -> draft_ready -> email_1_sent ->
    sms_sent -> phone_called -> email_2_sent -> email_3_sent ->
    interested -> demo_sent -> closed_won / closed_lost
    (Also: disqualified from discovered/qualified)
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from db_utils import get_target, log_touch, release_territory, reserve_territory, update_target_status

VALID_STATUSES = [
    "discovered", "qualified", "disqualified", "draft_ready",
    "email_1_sent", "sms_sent", "phone_called",
    "email_2_sent", "email_3_sent",
    "interested", "demo_booked", "bespoke_in_progress", "bespoke_ready",
    "demo_sent", "closed_won", "closed_lost",
]

# 5-touch cadence transitions + bespoke conversion pipeline
VALID_TRANSITIONS = {
    "discovered": ["qualified", "disqualified"],
    "qualified": ["draft_ready", "disqualified"],
    "draft_ready": ["email_1_sent", "qualified"],
    "email_1_sent": ["sms_sent", "interested", "closed_won", "closed_lost"],
    "sms_sent": ["phone_called", "interested", "closed_won", "closed_lost"],
    "phone_called": ["email_2_sent", "interested", "closed_won", "closed_lost"],
    "email_2_sent": ["email_3_sent", "interested", "closed_won", "closed_lost"],
    "email_3_sent": ["interested", "demo_sent", "closed_won", "closed_lost"],
    "interested": ["demo_booked", "demo_sent", "closed_won", "closed_lost"],
    "demo_booked": ["bespoke_in_progress", "demo_sent", "closed_won", "closed_lost"],
    "bespoke_in_progress": ["bespoke_ready", "demo_sent", "closed_won", "closed_lost"],
    "bespoke_ready": ["demo_sent", "closed_won", "closed_lost"],
    "demo_sent": ["closed_won", "closed_lost"],
}


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    target_id = int(sys.argv[1])
    new_status = sys.argv[2]

    if new_status not in VALID_STATUSES:
        print(f"Invalid status: {new_status}")
        print(f"Valid statuses: {', '.join(VALID_STATUSES)}")
        sys.exit(1)

    target = get_target(target_id)
    if not target:
        print(f"Target {target_id} not found.")
        sys.exit(1)

    current = target["status"]
    allowed = VALID_TRANSITIONS.get(current, [])

    if new_status not in allowed:
        print(f"Cannot transition from '{current}' to '{new_status}'.")
        print(f"Allowed transitions from '{current}': {', '.join(allowed) if allowed else '(none -- terminal state)'}")
        sys.exit(1)

    # Perform the transition
    update_target_status(target_id, new_status)
    print(f"[{target['company_name']}] {current} -> {new_status}")

    # Side effects
    if new_status == "email_1_sent":
        reserve_territory(target["territory"], target_id)
        log_touch(target_id, "email_initial", outcome="sent")
        print(f"  -> Territory '{target['territory']}' reserved (7-day lock)")
        print(f"  -> Touch logged: email_initial / sent")

    if new_status == "sms_sent":
        log_touch(target_id, "sms", outcome="sent")
        print(f"  -> Touch logged: sms / sent")

    if new_status == "phone_called":
        log_touch(target_id, "phone_call", outcome="sent")
        print(f"  -> Touch logged: phone_call / sent")

    if new_status == "email_2_sent":
        log_touch(target_id, "email_followup", outcome="sent")
        print(f"  -> Touch logged: email_followup / sent")

    if new_status == "email_3_sent":
        log_touch(target_id, "email_breakup", outcome="sent")
        print(f"  -> Touch logged: email_breakup / sent")

    if new_status == "closed_lost":
        release_territory(target["territory"], target_id)
        print(f"  -> Territory '{target['territory']}' released")

    if new_status == "demo_booked":
        log_touch(target_id, "other", subject="Demo booked", outcome="demo_booked")
        print(f"  -> Touch logged: demo_booked")
        print(f"  -> Ready for bespoke conversion. Run: python scripts/bespoke_orchestrator.sh {target_id}")

    if new_status == "closed_won":
        print(f"  -> Congratulations! Deal closed for {target['company_name']}.")
        print(f"  -> Remember to update territory to 'sold' manually or via future automation.")


if __name__ == "__main__":
    main()
