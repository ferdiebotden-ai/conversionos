# Voice Agent Rules

- ElevenLabs Conversational AI powers the voice agent
- **Voice (web) available on ALL tiers** — gated by `canAccess(tier, 'voice_web')` (elevate, accelerate, dominate)
- **Voice (phone/Twilio) is Dominate only** — gated by `canAccess(tier, 'voice_phone')`
- **Single persona: Emma** — one ElevenLabs agent per tenant, knowledge injected via PageContext ('general' | 'estimate' | 'visualizer')
- Agent ID stored in single env var: `ELEVENLABS_AGENT_EMMA` (no more per-persona agents)
- Dynamic prompts: server builds context-aware voice prompt via `buildVoiceSystemPrompt(context, { tier })`, client passes as session override
- **Elevate tier pricing deflection**: `buildElevatePricingDeflectionVoice()` appended to voice prompts on general/visualizer pages — Emma never mentions dollar amounts
- Each tenant deployment may have a different agent ID (different voice configuration)
- Voice agent endpoints: /api/voice/signed-url (returns 403 only when `voice_web` not in tier, accepts `?context=` param), /api/voice/check
- Emma text + voice widget available on ALL tiers; voice toggle visible on all tiers
- Widget component: src/components/receptionist/receptionist-widget.tsx
- Voice toggle: src/components/receptionist/receptionist-chat.tsx (visible when `hasVoice` — now true for all tiers)
- Voice components use `context: PageContext` prop (not persona) with visual differentiation by page (MessageCircle/Calculator/Palette icons)
