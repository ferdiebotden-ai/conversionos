#!/usr/bin/env python3
"""
Poll Twilio for inbound SMS and forward to Ferdie's cell.
No webhooks — reads directly from Twilio API.

Runs every 5 minutes via LaunchAgent. Tracks processed message SIDs
to avoid duplicate notifications.

Also handles STOP replies: auto-closes target + releases territory.
"""

import json
import os
import sys
from datetime import datetime, timezone, timedelta

FERDIE_CELL = '+15193788973'
STATE_FILE = os.path.join(os.path.dirname(__file__), '.sms_monitor_state.json')

# Load env
env_path = os.path.join(os.path.dirname(__file__), '.env')
env_vars = {}
with open(env_path) as f:
    for line in f:
        line = line.strip().replace('\r', '')
        if line and not line.startswith('#') and '=' in line:
            key, val = line.split('=', 1)
            env_vars[key.strip()] = val.strip()

account_sid = env_vars.get('TWILIO_ACCOUNT_SID')
auth_token = env_vars.get('TWILIO_AUTH_TOKEN')
phone_number = env_vars.get('TWILIO_PHONE_NUMBER')
turso_url = env_vars.get('TURSO_DATABASE_URL')
turso_token = env_vars.get('TURSO_AUTH_TOKEN')

if not all([account_sid, auth_token, phone_number]):
    print("ERROR: Missing Twilio credentials in scripts/.env")
    sys.exit(1)

# Set Turso env vars for db_utils
if turso_url:
    os.environ['TURSO_DATABASE_URL'] = turso_url
if turso_token:
    os.environ['TURSO_AUTH_TOKEN'] = turso_token

from twilio.rest import Client

client = Client(account_sid, auth_token)


def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            return json.load(f)
    return {'processed_sids': [], 'last_check': None}


def save_state(state):
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f, indent=2)


def normalize_phone(phone):
    digits = ''.join(c for c in phone if c.isdigit() or c == '+')
    if digits.startswith('+'):
        return digits
    if digits.startswith('1') and len(digits) == 11:
        return '+' + digits
    if len(digits) == 10:
        return '+1' + digits
    return '+' + digits


def lookup_target(from_number):
    """Look up a target by phone number in Turso DB."""
    try:
        from db_utils import get_db
        with get_db() as conn:
            last10 = from_number[-10:]
            result = conn.execute(
                "SELECT id, company_name, status, territory FROM targets "
                "WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '') LIKE ? "
                "LIMIT 1",
                (f'%{last10}%',)
            )
            row = result.fetchone()
            if row:
                return {'id': row[0], 'company_name': row[1], 'status': row[2], 'territory': row[3]}
    except Exception as e:
        print(f"  DB lookup failed: {e}")
    return None


def handle_stop(target):
    """Handle STOP reply: close target, release territory, log touch."""
    try:
        from db_utils import get_db
        with get_db() as conn:
            conn.execute(
                "UPDATE targets SET status = 'closed_lost', updated_at = datetime('now') WHERE id = ?",
                (target['id'],)
            )
            conn.execute(
                "UPDATE territories SET status = 'available', reserved_for_target_id = NULL, "
                "reserved_at = NULL, lock_expires_at = NULL WHERE reserved_for_target_id = ?",
                (target['id'],)
            )
            conn.execute(
                "INSERT INTO touches (target_id, type, outcome, notes) VALUES (?, 'sms', 'unsubscribe', ?)",
                (target['id'], 'STOP received via SMS monitor')
            )
        print(f"  STOP processed: {target['company_name']} → closed_lost, territory released")
    except Exception as e:
        print(f"  STOP handling failed: {e}")


def log_reply(target, message_body, message_sid):
    """Log inbound SMS as a touch."""
    try:
        from db_utils import get_db
        with get_db() as conn:
            conn.execute(
                "INSERT INTO touches (target_id, type, outcome, notes) VALUES (?, 'sms', 'replied', ?)",
                (target['id'], f'Inbound SMS: {message_body[:500]}. MessageSid: {message_sid}')
            )
        print(f"  Touch logged for {target['company_name']}")
    except Exception as e:
        print(f"  Touch logging failed: {e}")


def notify_ferdie(company_name, message_body, from_number, is_stop):
    """Send SMS notification to Ferdie."""
    preview = message_body[:80] + '...' if len(message_body) > 80 else message_body

    if is_stop:
        body = f"[Pipeline] {company_name} replied STOP — auto-closed and territory released."
    else:
        body = f"[Pipeline] SMS from {company_name} ({from_number}): \"{preview}\""

    try:
        client.messages.create(to=FERDIE_CELL, from_=phone_number, body=body)
        print(f"  Notification sent to Ferdie")
    except Exception as e:
        print(f"  Notification failed: {e}")


def main():
    state = load_state()
    processed = set(state.get('processed_sids', []))

    # Check inbound messages from the last hour
    since = datetime.now(timezone.utc) - timedelta(hours=1)
    messages = client.messages.list(
        to=phone_number,
        date_sent_after=since,
        limit=50,
    )

    new_messages = [m for m in messages if m.sid not in processed]

    if not new_messages:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] No new inbound SMS.")
    else:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {len(new_messages)} new inbound SMS:")

    for msg in new_messages:
        from_number = msg.from_
        body = msg.body or ''
        is_stop = body.strip().upper() == 'STOP'

        print(f"\n  From: {from_number}")
        print(f"  Body: {body}")
        print(f"  SID:  {msg.sid}")

        # Look up target
        target = lookup_target(from_number)
        company_name = target['company_name'] if target else f'Unknown ({from_number})'

        # Handle STOP
        if is_stop and target:
            handle_stop(target)
        elif target:
            log_reply(target, body, msg.sid)

        # Notify Ferdie
        notify_ferdie(company_name, body, from_number, is_stop)

        # Mark as processed
        processed.add(msg.sid)

    # Keep only last 200 SIDs to prevent unbounded growth
    processed_list = list(processed)[-200:]
    state['processed_sids'] = processed_list
    state['last_check'] = datetime.now(timezone.utc).isoformat()
    save_state(state)


if __name__ == '__main__':
    main()
