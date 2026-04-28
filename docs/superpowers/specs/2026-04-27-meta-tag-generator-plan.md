# Meta Tag Generator — Implementation Plan

## Phase 1: Scaffolding

### 1.1 Initialize monorepo
- `package.json` with npm workspaces: `["packages/*", "apps/*"]`
- `tsconfig.json` base config
- `.gitignore` (node_modules, dist, .wrangler, .superpowers)
- `README.md` stub

### 1.2 Create packages/meta-tag-engine
- `packages/meta-tag-engine/package.json` (name: `@seotools/meta-tag-engine`)
- `packages/meta-tag-engine/tsconfig.json`
- `packages/meta-tag-engine/src/index.ts`

### 1.3 Create apps/web scaffold (Cloudflare Pages)
- Use C3 or create manually: `apps/web/` with wrangler.toml, Vite config
- Verify `wrangler pages dev` runs

### 1.4 Create skills/meta-tag-generator scaffold
- `skills/meta-tag-generator/SKILL.md` stub
- `skills/meta-tag-generator/scripts/` directory

---

## Phase 2: Engine Package (packages/meta-tag-engine)

### 2.1 Types (`src/types.ts`)
Define all interfaces:
- `UserInput` — raw input, keywords, title format
- `ParsedInput` — audience, topic, purpose, action, primaryTopic
- `SerpResult` — title, description, url from Browser Rendering
- `SerpContext` — "researched" | "simulated" | "none"
- `MetaTagVersion` — title, description, lengths, validation flags, badge
- `GenerateOptions` — includeSerpResearch, retryCount
- `GenerateResult` — versions[], serpContext, primaryTopic
- `TitleFormat`

### 2.2 Rules (`src/rules.ts`)
Constants and rules:
- `TITLE_MAX = 65`
- `TITLE_MIN = 30` (soft warning)
- `TITLE_RECOMMENDED = { min: 50, max: 65 }`
- `DESCRIPTION_MAX = 155`
- `DESCRIPTION_MIN = 130` (soft warning)
- `DESCRIPTION_RECOMMENDED = { min: 145, max: 155 }`
- `MAX_RETRIES = 2`
- `SERP_CACHE_TTL_DAYS = 14`
- CTA phrases regex pattern
- Keyword front-loading check function

### 2.3 Validation (`src/validation.ts`)
- `validateTitle(title: string): ValidationResult` — length check, front-load check
- `validateDescription(desc: string, keywords: string[]): ValidationResult` — length, CTA, keyword variation
- `validateKeywords(keywords: string[]): ValidationResult` — duplicate detection, variation check
- `scoreVersion(version: MetaTagVersion): "green" | "yellow" | "red"`
- `isValid(version: MetaTagVersion): boolean` — all hard rules pass

### 2.4 Prompts (`src/prompts.ts`)
- `buildParsePrompt(rawInput: string): string` — prompt to extract audience, topic, purpose, action, primary topic
- `buildGeneratePrompt(parsed: ParsedInput, serpData: SerpResult[] | null): string` — main generation prompt
- `buildSimulatedSerpPrompt(topic: string): string` — approximate SERP patterns when Browser Rendering fails
- `buildRetryPrompt(prevVersions: MetaTagVersion[], failures: string[]): string` — targeted retry prompt

### 2.5 Core generate (`src/generate.ts`)
Function `generate` that orchestrates:
1. Accept `UserInput`
2. Build and call parse prompt → `ParsedInput`
3. (External caller provides `serpData` or `null`)
4. Build generation prompt with parsed input + serpData
5. Call Workers AI
6. Parse response into version array
7. Validate each version
8. Retry failed versions (up to `MAX_RETRIES`)
9. Return `GenerateResult`

This function expects a `callAI(prompt: string): Promise<string>` parameter to keep it provider-agnostic. The actual Workers AI call happens in the consumer (Pages Function or skill script).

### 2.6 Tests
- `src/__tests__/validation.test.ts` — unit tests for all validation rules
- `src/__tests__/prompts.test.ts` — snapshot / structure tests
- `src/__tests__/generate.test.ts` — integration with mock AI

---

## Phase 3: Pages Function (apps/web/functions/api/generate.ts)

### 3.1 Function scaffold
- POST handler with CORS headers
- Parse JSON body
- Return typed response or error

### 3.2 Workers AI integration
- Import from `@seotools/meta-tag-engine`
- Bind Workers AI via wrangler.toml: `ai = { binding = "AI" }`
- Implement `callAI` function using `env.AI.run("@cf/meta/llama-3.2-1b-instruct", {...})`

### 3.3 Parse step
- Use `callAI` with `buildParsePrompt` to extract structured fields from `rawInput`
- Handle parse failure: return error asking user for more detail

### 3.4 SERP research integration
- Bind KV: `kv = { binding = "SEO_TOOLS_KV", id = "..." }` (create namespace)
- Bind Browser Rendering: `browser = { binding = "BROWSER" }`
- Function `getSerpData(topic: string, kv: KVNamespace, browser: BrowserRendering): Promise<SerpResult[]>`
  - Check KV: `serp:<slugified-topic>`
  - Cache hit → parse and return
  - Cache miss → Browser Rendering: search `site:... OR topic`, extract titles/descriptions from results page
  - Store in KV with TTL
  - Failure → retry once → fall back to Workers AI simulated SERP

### 3.5 Generate step
- Build generation prompt
- Call Workers AI
- Parse, validate, retry
- Return `GenerateResult`

### 3.6 Error handling
- Workers AI unavailable → 502 with retry guidance
- Parse failure → 422 with guidance
- SERP failure → log, continue without (serpContext: "none")
- Unknown error → 500

### 3.7 Bindings in wrangler.toml
```toml
[[kv_namespaces]]
binding = "SEO_TOOLS_KV"
id = "<create in dashboard>"

[browser]
binding = "BROWSER"

[ai]
binding = "AI"
```

---

## Phase 4: Web App Frontend (apps/web/src/)

### 4.1 Framework choice
Use simple setup: Vite + TypeScript + vanilla CSS or Tailwind (match user's existing project patterns — gigalog uses Tailwind).

### 4.2 Components
- `InputPanel` — smart textarea, keywords input, title format controls (dropdown + label input), SERP toggle, generate button
- `ResultsPanel` — container for version cards
- `VersionCard` — title, description, char counts, badge, CTA indicator, copy buttons
- `ContextBadge` — "Researched SERP" / "Generated without SERP data" indicator
- `ErrorState` — error message with retry button
- `LoadingState` — generation spinner/progress

### 4.3 State management
Simple reactive state (no store library needed):
```ts
type AppState = 
  | { phase: "input" }
  | { phase: "loading"; input: UserInput }
  | { phase: "results"; result: GenerateResult }
  | { phase: "error"; message: string; input: UserInput }
```

### 4.4 API client
- `fetch("/api/generate", { method: "POST", body: JSON.stringify(input) })`
- Typed request/response using engine types

### 4.5 Styling
- Responsive — single column on mobile, side-by-side on desktop
- Copy feedback (toast or button label change on copy)
- Validation badge colors: green (#16a34a), yellow (#ca8a04), red (#dc2626)

### 4.6 Client-side persistence
- localStorage for last 10 generations (optional, low priority for v1)

---

## Phase 5: Agent Skill (skills/meta-tag-generator)

### 5.1 SKILL.md
Define workflow per spec:
- Ask conversational questions
- Research SERP (agent's own tools)
- Import engine and call generate
- Display results with scores

### 5.2 scripts/generate.ts
- Import `@seotools/meta-tag-engine`
- Accept parsed input + optional serpData
- Return formatted results for terminal display

### 5.3 Install as user skill
- Reference in `.agents/skills/` or central skills directory

---

## Phase 6: Testing & Polish

### 6.1 Engine unit tests
- Validation rules edge cases (boundary lengths, missing CTA, duplicate keywords)
- Prompt construction output shape
- Retry logic

### 6.2 Pages Function integration test
- Mock Workers AI binding
- Test full flow: input → parse → generate → validate → return
- Test error paths: AI failure, parse failure, Browser Rendering failure

### 6.3 Frontend smoke test
- Manual test of full user flow
- Verify copy buttons work
- Verify error states render

### 6.4 Deploy & verify
- `wrangler pages deploy` to staging
- Test on live URL
- Monitor Workers AI usage in dashboard

---

## Dependencies Between Phases

```
Phase 1 (scaffold) ──► Phase 2 (engine) ──► Phase 3 (Pages Function)
                                         ──► Phase 4 (frontend)
                                         ──► Phase 5 (skill)
                                              Phase 6 (tests, after 3+4)
```

Phases 3, 4, 5 can proceed in parallel after Phase 2 is complete.

---

## File Manifest (complete)

```
seo-tools-platform/
├── package.json                          # workspaces root
├── tsconfig.json                         # base TS config
├── .gitignore
├── packages/
│   └── meta-tag-engine/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts                  # public API barrel
│           ├── types.ts
│           ├── rules.ts
│           ├── validation.ts
│           ├── prompts.ts
│           ├── generate.ts
│           └── __tests__/
│               ├── validation.test.ts
│               ├── prompts.test.ts
│               └── generate.test.ts
├── apps/
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── wrangler.toml
│       ├── vite.config.ts
│       ├── functions/
│       │   └── api/
│       │       └── generate.ts           # Pages Function
│       └── src/
│           ├── index.html
│           ├── main.ts                   # entry point
│           ├── App.ts                    # root component, state machine
│           ├── api/
│           │   └── client.ts            # fetch wrapper
│           ├── components/
│           │   ├── InputPanel.ts
│           │   ├── ResultsPanel.ts
│           │   ├── VersionCard.ts
│           │   ├── ContextBadge.ts
│           │   ├── ErrorState.ts
│           │   └── LoadingState.ts
│           └── styles/
│               └── main.css
└── skills/
    └── meta-tag-generator/
        ├── SKILL.md
        └── scripts/
            └── generate.ts
```
