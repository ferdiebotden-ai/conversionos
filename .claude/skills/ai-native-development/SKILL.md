---
name: ai-native-development
description: "Patterns for building AI-native applications with Vercel AI SDK v6, OpenAI GPT-5.2, Google Gemini 3 Pro Image, ElevenLabs voice agents, and Anthropic Claude. Covers streaming, structured outputs, tool calling, voice integration, and validation."
---

# AI-Native Application Development

Comprehensive guide for building production AI-powered applications using the Vercel AI SDK v6, with patterns for multiple providers (OpenAI, Anthropic, Google) and ElevenLabs voice agents.

## When to Use This Skill

- Building chat interfaces with streaming responses
- Implementing structured data extraction from AI
- Creating tool-calling agents
- Integrating vision/multimodal capabilities
- Validating AI outputs with Zod schemas
- Integrating ElevenLabs Conversational AI voice agents
- Building human-in-the-loop AI workflows

## Core Setup

### Installation

```bash
# Core AI SDK
npm install ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google

# For validation
npm install zod

# For voice agents
npm install @11labs/react @11labs/client
```

### Provider Configuration

```typescript
// lib/ai/providers.ts
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY,
})

// Model shortcuts — ConversionOS defaults
export const gpt5 = openai('gpt-5.2')
export const claude = anthropic('claude-opus-4-6')
export const geminiImage = google('gemini-3.1-flash-image')
```

---

## Pattern 1: Streaming Text (Chat)

Use `streamText` for real-time chat interfaces.

### API Route

```typescript
// app/api/chat/route.ts
import { streamText } from 'ai'
import { openai } from '@/lib/ai/providers'
import { getSiteId } from '@/lib/db/site'

export async function POST(req: Request) {
  const { messages } = await req.json()
  const siteId = getSiteId()

  const result = streamText({
    model: openai('gpt-5.2'),
    system: `You are a helpful assistant for site ${siteId}.`,
    messages,
    maxTokens: 1000,
  })

  return result.toDataStreamResponse()
}
```

### Client Component

```typescript
'use client'
import { useChat } from '@ai-sdk/react'

export function ChatInterface() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  })

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id} className={m.role === 'user' ? 'user' : 'assistant'}>
          {m.content}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </div>
  )
}
```

---

## Pattern 2: Structured Outputs

Use `generateObject` or `streamObject` for type-safe AI responses.

```typescript
import { generateObject } from 'ai'
import { openai } from '@/lib/ai/providers'
import { z } from 'zod'

const LeadExtractionSchema = z.object({
  projectType: z.enum(['kitchen', 'bathroom', 'basement', 'other']),
  estimatedBudget: z.object({ low: z.number(), high: z.number() }),
  timeline: z.enum(['asap', '1-3 months', '3-6 months', 'flexible']),
  requirements: z.array(z.string()),
  confidence: z.number().min(0).max(1),
})

export async function POST(req: Request) {
  const { conversation } = await req.json()

  const { object } = await generateObject({
    model: openai('gpt-5.2'),
    schema: LeadExtractionSchema,
    prompt: `Extract structured data from this conversation:\n\n${conversation}`,
  })

  return Response.json(object)
}
```

---

## Pattern 3: Tool Calling

```typescript
import { tool } from 'ai'
import { z } from 'zod'

export const calculateEstimate = tool({
  description: 'Calculate a renovation cost estimate',
  parameters: z.object({
    projectType: z.enum(['kitchen', 'bathroom', 'basement']),
    squareFeet: z.number().positive(),
    finishLevel: z.enum(['economy', 'standard', 'premium']),
  }),
  execute: async ({ projectType, squareFeet, finishLevel }) => {
    const rates = {
      kitchen: { economy: 150, standard: 225, premium: 350 },
      bathroom: { economy: 200, standard: 300, premium: 450 },
      basement: { economy: 40, standard: 60, premium: 85 },
    }
    const rate = rates[projectType][finishLevel]
    return { estimate: squareFeet * rate, breakdown: { sqft: squareFeet, rate, total: squareFeet * rate } }
  },
})
```

---

## Pattern 4: ElevenLabs Voice Agents

ConversionOS uses three ElevenLabs Conversational AI personas.

### Voice Agent Architecture

- **Emma** (Receptionist): Greets visitors, answers FAQs, routes to specialists
- **Marcus** (Quote Specialist): Handles pricing questions, generates estimates
- **Mia** (Design Consultant): Discusses design options, materials, inspiration

### Signed URL Endpoint

```typescript
// app/api/voice/signed-url/route.ts
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get('agentId')

  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
    {
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY! },
    }
  )

  const data = await response.json()
  return NextResponse.json(data)
}
```

### Voice Widget Component

```typescript
'use client'
import { useConversation } from '@11labs/react'

export function ReceptionistWidget({ agentId }: { agentId: string }) {
  const conversation = useConversation({
    onConnect: () => console.log('Connected'),
    onDisconnect: () => console.log('Disconnected'),
  })

  const startConversation = async () => {
    const res = await fetch(`/api/voice/signed-url?agentId=${agentId}`)
    const { signed_url } = await res.json()
    await conversation.startSession({ signedUrl: signed_url })
  }

  return (
    <button onClick={startConversation}>
      {conversation.status === 'connected' ? 'End Call' : 'Talk to Emma'}
    </button>
  )
}
```

### Agent ID Configuration

Agent IDs are stored as environment variables per tenant:
- `ELEVENLABS_AGENT_EMMA` — Receptionist
- `ELEVENLABS_AGENT_MARCUS` — Quote specialist
- `ELEVENLABS_AGENT_MIA` — Design consultant

---

## Pattern 5: AI Output Validation

ALWAYS validate AI outputs before using them.

```typescript
import { z } from 'zod'

const RoomAnalysisSchema = z.object({
  roomType: z.enum(['kitchen', 'bathroom', 'bedroom', 'other']),
  confidence: z.number().min(0).max(1),
  features: z.array(z.string()),
})

async function analyzeRoom(imageBase64: string) {
  const { object } = await generateObject({
    model: openai('gpt-5.2'),
    schema: RoomAnalysisSchema,
    prompt: 'Analyze this room image',
  })

  if (object.confidence < 0.6) {
    return { ...object, needsHumanReview: true }
  }
  return object
}
```

---

## Pattern 6: Image Generation (Gemini 3 Pro)

```typescript
import { google } from '@/lib/ai/providers'
import { generateText } from 'ai'

const { text, files } = await generateText({
  model: google('gemini-3.1-flash-image'),
  providerOptions: { google: { responseModalities: ['TEXT', 'IMAGE'] } },
  prompt: 'Generate a photorealistic kitchen renovation concept...',
})

// files contains generated images as base64
```

---

## Best Practices

**DO:**
- Always use Zod schemas for AI outputs
- Implement retry logic with exponential backoff
- Compress images before sending to vision models
- Use streaming for chat interfaces
- Log AI interactions for debugging
- Set appropriate `maxTokens` limits
- Scope AI context to the current tenant

**DON'T:**
- Concatenate user input directly into prompts (injection risk)
- Trust AI output without validation
- Use `dangerouslySetInnerHTML` with AI content
- Hardcode API keys in source code
- Ignore rate limits and costs
- Send uncompressed images

---

## Error Handling

```typescript
import { APICallError, InvalidResponseDataError } from 'ai'

try {
  const result = await generateText({ ... })
} catch (error) {
  if (error instanceof APICallError) {
    console.error('API Error:', error.message, error.statusCode)
  } else if (error instanceof InvalidResponseDataError) {
    console.error('Invalid response:', error.message)
  } else {
    throw error
  }
}
```

---

## Related Skills

- `nextjs-patterns` — Server/Client component patterns
- `supabase-patterns` — Database integration
- `typescript-strict` — Type safety patterns
- `security-compliance` — Security best practices
- `multi-tenancy` — Tenant-scoped AI operations
