#!/usr/bin/env python3
"""Point Twilio phone number voice URL to a static TwiML file on Vercel Blob."""

import os
import sys

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

if not all([account_sid, auth_token, phone_number]):
    print("ERROR: Missing Twilio credentials in scripts/.env")
    sys.exit(1)

# Read the Blob URL from the temp file written by the Node script
try:
    twiml_url = open('/tmp/twiml_blob_url.txt').read().strip()
except FileNotFoundError:
    print("ERROR: Run configure_twilio_voice.cjs first to upload TwiML to Blob")
    sys.exit(1)

from twilio.rest import Client

client = Client(account_sid, auth_token)

numbers = client.incoming_phone_numbers.list(phone_number=phone_number)
if not numbers:
    print(f"ERROR: Phone number {phone_number} not found")
    sys.exit(1)

number = numbers[0]
print(f"Phone: {number.phone_number} (SID: {number.sid})")
print(f"Current voice URL: {number.voice_url or '(none)'}")

number = client.incoming_phone_numbers(number.sid).update(
    voice_url=twiml_url,
    voice_method="GET",
)

print(f"\nUpdated voice URL: {number.voice_url}")
print("Calls to +12264443478 will now forward to +15193788973 via static TwiML on Blob.")
print("No webhook, no server — Twilio fetches the XML directly from CDN.")
