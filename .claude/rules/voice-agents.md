# Voice Agent Rules

- ElevenLabs Conversational AI powers the voice agent
- **Voice is Dominate tier only** — gated by `canAccess(tier, 'voice_web')`
- **Single persona: Emma** — one ElevenLabs agent per tenant, knowledge injected via PageContext ('general' | 'estimate' | 'visualizer')
- Agent ID stored in single env var: `ELEVENLABS_AGENT_EMMA` (no more per-persona agents)
- Dynamic prompts: server builds context-aware voice prompt via `buildVoiceSystemPrompt(context)`, client passes as session override
- Each tenant deployment may have a different agent ID (different voice configuration)
- Voice agent endpoints: /api/voice/signed-url (returns 403 for non-Dominate, accepts `?context=` param), /api/voice/check
- Emma text chat widget is available on ALL tiers; voice toggle only shown for Dominate
- Widget component: src/components/receptionist/receptionist-widget.tsx
- Voice toggle: src/components/receptionist/receptionist-chat.tsx (hidden when `!hasVoice`)
- Voice components use `context: PageContext` prop (not persona) with visual differentiation by page (MessageCircle/Calculator/Palette icons)
