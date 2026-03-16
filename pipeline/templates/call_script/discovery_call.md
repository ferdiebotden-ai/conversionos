# Discovery Call Script — {{COMPANY_NAME}}

**Prepared:** {{DATE}}
**Target:** {{COMPANY_NAME}} ({{CITY}}, {{TERRITORY}})
**Rating:** {{GOOGLE_RATING}} stars ({{GOOGLE_REVIEW_COUNT}} reviews)
**Services:** {{SERVICES_LIST}}
**Website:** {{WEBSITE}}
**Microsite:** {{MICROSITE_URL}}
**Default Tier:** Pro ($2,500–$5,000 setup + $699–$1,199/mo)

---

## Opening (30 seconds)

> "Hi, this is Ferdie from NorBot Systems. I put together a quick page showing what AI quoting could look like for {{COMPANY_NAME}} — have you had a chance to see it?"

**If yes:** "Great — what stood out to you?"
**If no:** "No worries — I'll give you the 60-second version and send it over after."
**If voicemail:** "Hi, this is Ferdie from NorBot Systems. I built a quick page showing what AI quoting could look like for {{COMPANY_NAME}}. I'll send it over by email — take a look when you get a chance. My number is 519-378-8973."

---

## Quick Pitch (60 seconds)

> "I built a platform called ConversionOS — it goes on a contractor's website and does three things:
>
> 1. **AI-drafted quotes** — homeowners chat with an AI on your site. It drafts a ballpark estimate that you review and approve before anything goes out.
> 2. **Design visualization** — they upload a photo of their space and see what it could look like after a renovation. That's the feature that really hooks homeowners.
> 3. **Owner dashboard** — qualified leads with AI-drafted quotes. Edit, approve, send. Ten minutes instead of three hours.
>
> I already built a demo using {{COMPANY_NAME}}'s branding — I'll send you the link."

---

## Pain Discovery (2-3 minutes)

Ask these questions to understand their current process:

1. "Walk me through what happens when someone asks for a quote today."
2. "How long does a typical quote take you from request to send?"
3. "How many quote requests do you get in a week, roughly?"
4. "What percentage actually turn into signed jobs?"
5. "What's your biggest frustration with how leads come in right now?"

**Listen for pain signals:**
- "Takes me hours / days to get back to people"
- "I lose leads to whoever responds first"
- "My wife / admin handles it and it's a mess"
- "I'm too busy on job sites to deal with quotes"

---

## Demo Walkthrough (guide them to microsite)

> "Let me walk you through the page I built — can you pull it up on your phone or computer?"

1. **AI Chat:** "This is the AI assistant — it asks homeowners about their project and drafts a quote for you to review. Try it."
2. **Visualizer:** "This is the feature clients love most. Upload a photo, describe the reno, and it shows a before/after. Try uploading a photo of your kitchen."
3. **Dashboard:** "This is where leads land. AI-drafted quotes, all the details. Review, edit, approve, send. Under 10 minutes."

---

## Pricing Conversation

**Lead with value, then price.** Don't mention price until they ask or until you've established the pain.

> "The way it works: we set everything up on your site — your branding, your services, your pricing. You're live in about 2-3 weeks."

**When they ask "how much?":**

> "Our Pro package is $2,500 to $5,000 for setup, plus $699 to $1,199 a month. That includes the AI chat, the design visualizer, and a bespoke demo site built specifically for {{COMPANY_NAME}}.
>
> For context — the average reno job is $15K to $50K. If this helps you close even one extra deal a month, it pays for itself many times over."

**If they flinch at price:**

> "We also have a Starter option — $500 to $1,500 setup and $299 a month. That gives you the AI chat and dashboard without the visualizer. A lot of contractors start there and upgrade once they see results."

**If they want everything + exclusivity:**

> "Our Partner level locks the territory — no competitor in {{CITY}} can buy it. That's $10K to $15K setup and $1,500 to $2,500 a month. Includes a voice receptionist, a branded client app, and quarterly reviews with me."

---

## Objection Handling

| They Say | You Say |
|----------|---------|
| "I'm not tech-savvy" | "That's the beauty of it — we set everything up. The dashboard is simpler than email. I'll train you in 30 minutes." |
| "I need to think about it" | "Of course. I'll send you the page so you can review at your own pace. What does next week look like for a quick follow-up call?" |
| "I'm happy with my current setup" | "I get that. Quick question — how many leads do you think you lose because you can't respond fast enough? Even converting 2-3 extra leads per month would cover the whole platform." |
| "Can I try it first?" | "Absolutely — the demo is at your personalized page. Play with the AI chat, upload a photo. Then let's talk about what you think." |
| "I don't trust AI" | "You always have final say. The AI drafts the quote — you review every single one before it goes out. Nothing leaves without your approval." |
| "What if it doesn't work?" | "We guarantee delivery within 3 weeks. If we don't deliver, we work free until it's live. The risk is on us." |

---

## Close

> "Here's what I'd suggest: I'll send you the personalized page by email right after this call. Take a look, show it to your partner if you want. Then let's schedule a 20-minute deep dive where I can walk you through the dashboard. What does next week look like?"

**If they're ready now:**
> "Great — I'll send over a summary of what we discussed and we can get started. The first step is getting your brand assets — logo, colours, some photos of your work."

---

## After the Call

- [ ] Send microsite link via Email 1 (follow-up to call)
- [ ] Log the touch: `python mark_stage.py {{COMPANY_SLUG}} contacted`
- [ ] Update notes with key discussion points and pain signals
- [ ] Set Day 4 follow-up reminder (Email 2 + lead magnet)
- [ ] If demo booked: `python mark_stage.py {{COMPANY_SLUG}} demo_booked`
