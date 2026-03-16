#!/usr/bin/env python3
"""Check recent Twilio SMS message logs to see inbound messages and errors."""

import os
from datetime import datetime, timedelta

env_path = os.path.join(os.path.dirname(__file__), '.env')
env_vars = {}
with open(env_path) as f:
    for line in f:
        line = line.strip().replace('\r', '')
        if line and not line.startswith('#') and '=' in line:
            key, val = line.split('=', 1)
            env_vars[key.strip()] = val.strip()

from twilio.rest import Client

client = Client(env_vars['TWILIO_ACCOUNT_SID'], env_vars['TWILIO_AUTH_TOKEN'])

print("=== Recent Inbound SMS (last 2 hours) ===\n")
messages = client.messages.list(
    to=env_vars['TWILIO_PHONE_NUMBER'],
    date_sent_after=datetime.utcnow() - timedelta(hours=2),
    limit=20,
)

if not messages:
    print("No inbound messages found in the last 2 hours.")
else:
    for msg in messages:
        print(f"  From: {msg.from_}")
        print(f"  Body: {msg.body}")
        print(f"  Status: {msg.status}")
        print(f"  Date: {msg.date_sent}")
        print(f"  SID: {msg.sid}")
        if msg.error_code:
            print(f"  ERROR: {msg.error_code} — {msg.error_message}")
        print()

print("\n=== Recent Outbound SMS Errors (last 2 hours) ===\n")
outbound = client.messages.list(
    from_=env_vars['TWILIO_PHONE_NUMBER'],
    date_sent_after=datetime.utcnow() - timedelta(hours=2),
    limit=50,
)

errors = [m for m in outbound if m.error_code]
if not errors:
    print("No outbound errors.")
else:
    for msg in errors:
        print(f"  To: {msg.to}")
        print(f"  Status: {msg.status}")
        print(f"  Error: {msg.error_code} — {msg.error_message}")
        print(f"  SID: {msg.sid}")
        print()

print(f"\n=== Phone Number Config ===\n")
numbers = client.incoming_phone_numbers.list(phone_number=env_vars['TWILIO_PHONE_NUMBER'])
if numbers:
    n = numbers[0]
    print(f"  Voice URL: {n.voice_url}")
    print(f"  SMS URL:   {n.sms_url}")
    print(f"  SMS Method: {n.sms_method}")
    print(f"  Voice Method: {n.voice_method}")
