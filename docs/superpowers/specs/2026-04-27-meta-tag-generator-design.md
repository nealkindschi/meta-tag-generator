# Meta Tag Generator — Design Spec

## Summary

An AI-powered meta tag generator tool for enterprise SEO. Users describe their page in natural language and receive 3-4 optimized title/description versions with strict validation. Delivered as both a Cloudflare Pages web app and an agent skill, sharing a common engine library. Part of a growing platform of composable SEO tools.

**Cloudflare-first:** All infrastructure uses Cloudflare products — Workers AI, Browser Rendering, KV, Pages Functions, Pages.

---

## Architecture

### Monorepo Structure

```
seo-tools-platform/
├── packages/
│   ├── meta-tag-engine/       # Shared generation + validation library
│   │   ├── src/index.ts       # generate(), validate()
│   │   ├── src/prompts.ts     # Workers AI prompt templates
│   │   ├── src/rules.ts       # Char limits, CTA, keyword variation rules
│   │   ├── src/types.ts       # Input/Output type definitions
│   │   └── src/validation.ts  # Validation & scoring functions
│   ├── keyword-engine/        # Future tool
│   └── brief-engine/          # Future tool
├── apps/
│   └── web/                   # Cloudflare Pages site
│       ├── functions/api/
│       │   └── generate.ts    # Pages Function: orchestration, Browser Rendering, Workers AI
│       └── src/               # Frontend (Vite + framework)
└── skills/
    └── meta-tag-generator/    # Agent skill (terminal UX)
        ├── SKILL.md
        └── scripts/generate.ts
```

### Principle: Shared Engine

The engine package (`packages/meta-tag-engine/`) is the single source of truth for generation logic, prompt templates, and validation rules. Both the web app Pages Function and the agent skill import from it. No duplicate logic, no drift between interfaces.

### Tool Chaining

Each engine exports typed functions and types. Tool B imports Tool A's output types and passes them directly — no HTTP, no event bus, no state layer:

```
keyword-engine → { keywords, variations }
                  ↓ (import)
meta-tag-engine → { versions: MetaTagVersion[] }
                  ↓ (import)
brief-engine    → { outline, sections }
```

For the shared shell (cross-tool navigation/discovery), each tool registers a manifest:

```ts
export const manifest = {
  id: "meta-tag-generator",
  name: "Meta Tag Generator",
  description: "Generate optimized title & meta description pairs",
  inputType: "KeywordOutput | null",
  outputType: "MetaTagOutput",
  path: "/tools/meta-tags"
}
```

---

## Web App UI

### Single-page layout, two zones

**Left/Top — Input Panel:**
- Smart textarea: freeform natural language description of the page
- Self-provided keywords field (optional)
- SERP research toggle (on/off)
- Generate button

**Right/Bottom — Results Panel:**
- Tabbed or stacked version cards (3-4 versions)
- Each card shows: title with char count, description with char count, validation badge (green/yellow/red), CTA detection, keyword variation score
- Copy button per field and per card
- "Researched SERP" or "Generated without SERP data" context badge

### User Flow

1. User writes freeform text describing their page: audience, topic, purpose, desired action
2. Optionally adds target keywords, title format, brand label
3. Optionally toggles SERP research on
4. Clicks "Generate"
5. Engine parses the freeform text (using the same AI model) to extract structured fields
6. If SERP on: Browser Rendering searches the topic, scrapes top results, passes patterns to prompt
7. Workers AI generates 3 versions
8. Engine validates each version; failures trigger up to 2 retries per version
9. Results displayed with scores and copy buttons

---

## Backend: Pages Function API

### POST `/api/generate`

**Request:**
```ts
{
  rawInput: string;          // Freeform text from smart textarea
  keywords: string[];         // Optional explicit keywords
  titleFormat: {
    position: "prefix" | "suffix" | "none";
    label: string;            // e.g., "Cloudflare", "theNET"
  };
  serpResearch: boolean;      // Toggle SERP lookup
}
```

**Flow:**
1. Parse rawInput via Workers AI → extract audience, topic, purpose, action, primary topic
2. If `serpResearch` is true:
   a. Check KV cache for primary topic (key: `serp:<slugified-primary-topic>`)
   b. Cache hit → use cached SERP data
   c. Cache miss → Browser Rendering: search topic, scrape top 10 titles/descriptions
   d. Write results to KV with 7-day TTL
   e. On Browser Rendering failure: retry once → if still fails, use Workers AI to generate approximate SERP patterns
3. Construct prompt with extracted inputs + SERP context + validation rules
4. Call Workers AI (`@cf/meta/llama-3.1-8b-instruct-fast`) to generate 4 versions
5. Validate each version against rules (title ≤60 chars, description ≤160 chars, CTA present, keywords varied)
6. Versions failing validation → retry generation up to 2 times
7. Versions still failing after retries → show "Could not generate this version" placeholder
8. Return scored versions

**Response:**
```ts
{
  versions: {
    title: string;
    titleLength: number;
    titleValid: boolean;
    description: string;
    descriptionLength: number;
    descriptionValid: boolean;
    ctaDetected: boolean;
    keywordVariation: boolean;
    badge: "green" | "red";
  }[];
  serpContext: "researched" | "simulated" | "none";
  primaryTopic: string;
}
```

---

## Validation Rules

Hard rules (enforced before returning to user):

| Rule | Limit | Failure action |
|------|-------|---------------|
| Page title length | 50-65 chars (hard floor at 50, hard cap at 65) | Retry generation |
| Meta description length | 140-155 chars (hard floor at 140, hard cap at 155) | Retry generation |
| CTA in meta description | Must contain an action phrase | Retry generation |
| Keyword variation | No duplicate exact keyword phrases | Retry generation |
| Keyword front-loading | Primary keywords appear early in page title | Warning only |

All failures trigger regeneration. After 2 retries, the slot shows a "I tried and I failed." placeholder. The user never sees invalid output.

---

## SERP Research

### Cache Strategy

- Cache key: primary topic extracted from user input (not exact query text)
- "AI lead scoring for SaaS teams in 2026" → extracted topic "AI lead scoring" → cache key `serp:ai-lead-scoring`
- Different users querying variations all hit the same cache bucket
- KV TTL: 14 days

### Failure Strategy

1. KV cache hit → use cached data (no Browser Rendering call)
2. Cache miss → Browser Rendering
3. Browser Rendering fails → retry once
4. Still fails → Workers AI generates approximate SERP patterns
5. Indicate context quality via `serpContext` field: `"researched"` | `"simulated"` | `"none"`

---

## AI Model

**Model:** `@cf/meta/llama-3.1-8b-instruct-fast` (Workers AI)

- Input: $0.027 per M tokens
- Output: $0.201 per M tokens
- Free tier: 10,000 neurons/day (~833 generations/day)
- Single generation cost: ~$0.00013

---

## Error Handling

- Workers AI failure → retry once, then show error state with retry button
- Browser Rendering failure → retry once, then fall back to simulated SERP
- Validation failure → regenerate up to 2 times
- Parsing failure (can't extract structured fields from freeform text) → ask user to add more detail
- KV unavailability → skip cache, go directly to Browser Rendering

---

## Agent Skill Design

`skills/meta-tag-generator/SKILL.md` defines the terminal workflow:

1. Agent asks conversational questions to gather: audience, topic, purpose, desired action
2. Agent optionally uses its built-in search tools to research SERP patterns
3. Agent calls `scripts/generate.ts` which imports `meta-tag-engine` and calls Workers AI
4. Agent displays results inline with scores and copy options

The skill wraps the same engine library that the web app uses. It provides the terminal UX (conversation, display) while the engine provides the core logic.

---

## Testing Strategy

- **Engine unit tests:** Validation rules, prompt construction, scoring, types
- **Engine snapshot tests:** Generated output format consistency
- **Pages Function integration:** Mock Workers AI, test full request/response flow
- **Web app component tests:** Input panel rendering, results panel rendering
- **E2E:** Full user flow in browser (future)

---

## Out of Scope (v1)

- User accounts / authentication (public access)
- History / saved generations (localStorage only for MVP)
- Multi-tool chaining in the web UI (engine support exists, UI wiring deferred)
- Additional AI models (single model)
- Team / multi-tenant features
- Analytics tracking
