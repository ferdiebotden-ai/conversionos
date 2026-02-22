# Voice Agent Rules

- ElevenLabs Conversational AI powers the voice agents
- **Voice is Dominate tier only** — gated by `canAccess(tier, 'voice_web')`
- Three persona agents: Emma (receptionist), Marcus (quote specialist), Mia (design consultant)
- Agent IDs are stored in env vars: ELEVENLABS_AGENT_EMMA, ELEVENLABS_AGENT_MARCUS, ELEVENLABS_AGENT_MIA
- Each tenant deployment may have different agent IDs (different voice configurations)
- Voice agent endpoints: /api/voice/signed-url (returns 403 for non-Dominate), /api/voice/check
- Emma text chat widget is available on ALL tiers; voice toggle only shown for Dominate
- Widget component: src/components/receptionist/receptionist-widget.tsx
- Voice toggle: src/components/receptionist/receptionist-chat.tsx (hidden when `!hasVoice`)
