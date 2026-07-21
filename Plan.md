# GORGONA ONE — Master Reconstruction Blueprint
**Document Type:** Technical Specification  
**Version:** 1.0  
**Date:** 2026-07-18  
**Author:** Senior Architect  
**Audience:** Developer(s) executing the rebuild  
---
## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Source &amp; Target Definitions](#source--target-definitions)
3. [Dependency Map (Full Graph)](#dependency-map)
4. [UI/UX Integrity Safety Protocol](#uiux-integrity-safety-protocol)
5. [Reconstruction Steps (A to Z)](#reconstruction-steps)
6. [Time Budget](#time-budget)
7. [Risk Registry](#risk-registry)
---
## Executive Summary
**Problem:** The current reconstruction branch has 33 commits stacked without stabilization gates, resulting in broken navigation and sluggish AI agent behavior. The last two commits ("rescue operation" and "full project sync") indicate hasty manual fixes that may have introduced hidden regressions.
**Strategy:** Reset to the stable `main` branch (commit `b8dbae7`, 2026-07-15, 183 files), then port 48 new files and 13 modified files in dependency-safe order. Each step is atomic — the site must build and render correctly before proceeding to the next.
**Source branch (reference):** `claude/gorgona-one-reconstruction-a1v5t4` at commit `5d4d45c`  
**Target base:** `main` at commit `b8dbae7`
---
## Source &amp; Target Definitions
| Term | Definition |
|------|-----------|
| **BASE** | `main` @ `b8dbae7` — the 183-file stable marketplace |
| **SOURCE** | Current branch tip @ `5d4d45c` — the 63-file diff we port FROM |
| **TARGET** | New clean branch, reset to BASE, features added one layer at a time |
| **GATE** | A verification checkpoint. Must pass BEFORE proceeding to next step |
---
## Dependency Map
### Full Import Graph (reads bottom-up: leaves have no dependencies)
```
LEAF MODULES (zero internal imports — port first):
├── lib/ai/language.js              → exports: greeting(), detectLanguage(), SUPPORTED_LANGS
├── lib/ai/voice.js                 → exports: isTtsAvailable(), synthesizeSpeech()
├── lib/aiEcosystemContext.js       → exports: SYSTEM_PROMPT, matchSuggestions()
├── lib/discoveryCategories.js      → exports: CONSTELLATIONS, discoveryCategories, EXAMPLE_PROMPTS, matchCategories()
├── app/components/useBodyScrollLock.js → exports: useBodyScrollLock()
└── app/components/ThemeProvider.jsx → exports: ThemeProvider, useAITheme()
DATA LAYER (depends on existing lib/*Data.js files already on BASE):
├── lib/ai/ecosystemIndex.js        → imports: yachtsData, vacationRentalsData, experiencesData,
│                                      restaurantsNightlifeData, eventsData, rentalsData,
│                                      dealsData, ecosystemData, discoveryCategories
├── lib/data/listings.js            → imports: yachtsData, rentalsData, vacationRentalsData,
│                                      restaurantsNightlifeData, experiencesData
└── lib/aiEcosystemDigest.js        → imports: lib/data/listings, lib/eventsData
INTENT SYSTEM (depends on data layer):
├── lib/ai/intent.js                → imports: lib/ai/ecosystemIndex
├── lib/ai/integrations/index.js    → imports: ./ovago, ./rentcars
├── lib/ai/integrations/ovago.js    → (self-contained stub)
├── lib/ai/integrations/rentcars.js → (self-contained stub)
└── lib/ai/provider.js              → imports: lib/ai/intent, lib/ai/language, lib/ai/integrations
AI BACKEND (depends on data layer):
├── lib/ai/brain.js                 → imports: lib/data/listings
├── app/api/chat/route.js           → imports: lib/aiEcosystemContext
├── app/api/search/route.js         → imports: lib/data/listings
└── app/api/tts/route.js            → imports: lib/ai/voice
AI UI - PROVIDERS (depends on ThemeProvider, leaf modules):
├── app/components/ai/AIProvider.jsx    → exports: AIProvider, useAI()
├── app/components/ai/AiDockProvider.jsx → exports: AiDockProvider, useAiDock()
└── app/components/ai/chatTransport.js  → exports: sendChat() (fetch wrapper to /api/chat)
AI UI - HOOKS:
└── app/components/ai/useVoice.js   → (self-contained, uses Web Speech API)
AI UI - COMPONENTS (depends on providers + hooks):
├── app/components/ai/AiConversation.jsx → imports: useVoice
├── app/components/ai/AiDock.jsx         → imports: AiDockProvider, AiConversation, useBodyScrollLock
├── app/components/ai/AiSphere.jsx       → imports: AiDockProvider
├── app/components/ai/DiscoveryRoom.jsx  → imports: AIProvider, ThemeProvider, LocaleProvider,
│                                           useBodyScrollLock; lazy-loads lib/ai/provider
├── app/components/ai/DiscoveryDock.jsx  → imports: (check at port time)
├── app/components/ai/GorgonaOneAI.jsx   → imports: discoveryCategories, lib/ai/language,
│                                           ThemeProvider, LocaleProvider, AIProvider, useVoice;
│                                           lazy-loads lib/ai/provider
└── app/components/CategoryOrb.jsx       → imports: discoveryCategories
PWA COMPONENTS:
├── app/components/InstallPrompt.jsx        → (self-contained)
├── app/components/ServiceWorkerRegistrar.jsx → (self-contained)
└── app/components/VenueCard.jsx            → (self-contained)
PAGES (depend on UI components):
├── app/page.js (MODIFIED)           → adds: import GorgonaOneAI
├── app/layout.js (MODIFIED)         → adds: ThemeProvider, AIProvider, AiDockProvider,
│                                      AiSphere, AiDock, DiscoveryDock, InstallPrompt
├── app/discovery/page.js (NEW)      → imports: AiConversation
├── app/concierge/page.js (MODIFIED) → becomes redirect to /discovery
├── app/ai/page.js (NEW)            → imports: AIExperience
└── app/ai/AIExperience.jsx (NEW)   → (self-contained)
```
---
## UI/UX Integrity Safety Protocol
### Rule 1: Never Modify CSS and Logic in the Same Commit
Separate visual changes from functional changes. If a step touches both `.css` and `.jsx` logic, split it into two sub-commits:
- First: the logic (imports, state, event handlers)
- Second: the styles (only if needed)
### Rule 2: The "Screenshot Diff" Method
Before each layer, take browser screenshots of:
- Homepage (full scroll)
- One category page (e.g., `/yachts`)
- Mobile viewport (375px width)
- Header navigation (expanded state)
After the layer, compare visually. Any unintended difference = regression = STOP.
### Rule 3: Protect These CSS Files
| File | Role | Rule |
|------|------|------|
| `app/globals.css` | Master styles for all existing pages | Only APPEND new rules. Never modify existing selectors. |
| `tailwind.config.js` | Brand color system (8 palettes) | Never modify existing color values. Only add new keys if needed. |
| `app/ai-overlays.css` | New file for AI surfaces only | This file is NEW — safe to add freely, no conflict possible. |
### Rule 4: Component Isolation
Every new AI component is a `"use client"` component with its own state. They are ADDITIVE to the DOM — they don't replace existing DOM nodes. The safety guarantee:
- If a new component fails to render, it won't break existing page content
- Use React Error Boundaries around new AI surfaces (wrap in a try-catch at the layout level)
### Rule 5: The Rollback Test
At every GATE, verify rollback capability: `git stash` should return the site to the previous working state. Never proceed without this escape hatch.
---
## Reconstruction Steps
### STEP 0: Establish Clean Base
**Action:** Reset the target branch to `main` @ `b8dbae7`
```
git checkout claude/gorgona-one-reconstruction-a1v5t4
git reset --hard origin/main
```
**Files affected:** None (reset only)
**Verification Checklist:**
- [ ] `git log --oneline -1` shows `b8dbae7 Merge pull request #17`
- [ ] `npm install` completes without errors
- [ ] `npm run build` completes (exit code 0)
- [ ] `npm run dev` → open `http://localhost:3000`
- [ ] Homepage loads with hero image, navigation visible
- [ ] Click "Travel" → page loads
- [ ] Click "Yachts" → page loads
- [ ] Click "Events" → page loads
- [ ] Mobile hamburger menu opens/closes
- [ ] Language switcher changes locale text
**Depends on:** Nothing (this is the foundation)
---
### STEP 1: Port Leaf Modules (Zero-Dependency Files)
**Action:** Copy these 6 files from SOURCE. They have NO internal imports and cannot break anything.
| # | File to Create | Lines | Source Commit |
|---|---------------|-------|---------------|
| 1.1 | `lib/ai/language.js` | 79 | Any commit after `97e28d4` |
| 1.2 | `lib/ai/voice.js` | 320 | Latest (has Google TTS + ElevenLabs + OpenAI) |
| 1.3 | `lib/aiEcosystemContext.js` | 41 | Any commit after `a40aa01` |
| 1.4 | `lib/discoveryCategories.js` | 91 | Latest |
| 1.5 | `app/components/useBodyScrollLock.js` | 50 | Any commit after `f38cf28` |
| 1.6 | `app/components/ThemeProvider.jsx` | 76 | Any commit after `5fd185e` |
**Directory creation required:** `mkdir -p lib/ai`
**Verification Checklist:**
- [ ] `npm run build` still passes (these files are not imported yet — dead code is OK)
- [ ] No existing file was modified
- [ ] Each file can be `cat`'d and shows valid JavaScript/JSX
- [ ] Homepage still loads unchanged
**Depends on:** STEP 0
---
### STEP 2: Port Data Access Layer
**Action:** Create the unified data/search layer that wraps existing `lib/*Data.js` files.
| # | File to Create | Lines | Imports From |
|---|---------------|-------|-------------|
| 2.1 | `lib/ai/ecosystemIndex.js` | 163 | `lib/yachtsData`, `lib/vacationRentalsData`, `lib/experiencesData`, `lib/restaurantsNightlifeData`, `lib/eventsData`, `lib/rentalsData`, `lib/dealsData`, `lib/ecosystemData`, `lib/discoveryCategories` |
| 2.2 | `lib/data/listings.js` | 303 | `lib/yachtsData`, `lib/rentalsData`, `lib/vacationRentalsData`, `lib/restaurantsNightlifeData`, `lib/experiencesData` |
| 2.3 | `lib/aiEcosystemDigest.js` | 49 | `lib/data/listings`, `lib/eventsData` |
**Directory creation required:** `mkdir -p lib/data`
**CRITICAL NOTE on `lib/data/listings.js`:** This file attempts to connect to Supabase (`process.env.NEXT_PUBLIC_SUPABASE_URL`). If Supabase env vars are NOT set, it falls back to static data from the existing `lib/*Data.js` files. This fallback ensures the site works without a database.
**Verification Checklist:**
- [ ] `npm run build` passes (files still not imported by any page)
- [ ] No modifications to existing `lib/*Data.js` files
- [ ] Create a temporary test script to verify the data layer:
  ```
  node -e "import('./lib/data/listings.js').then(m =&gt; m.searchListings('yacht')).then(r =&gt; console.log(r.length, 'results'))"
  ```
  (Should return results from static fallback)
- [ ] Homepage still loads unchanged
**Depends on:** STEP 1 (needs `lib/discoveryCategories.js`)
---
### STEP 3: Port Intent System
**Action:** Create the client-side intent matching (non-LLM ecosystem highlighting).
| # | File to Create | Lines | Imports From |
|---|---------------|-------|-------------|
| 3.1 | `lib/ai/integrations/ovago.js` | 24 | (self-contained stub) |
| 3.2 | `lib/ai/integrations/rentcars.js` | 24 | (self-contained stub) |
| 3.3 | `lib/ai/integrations/index.js` | 35 | `./ovago`, `./rentcars` |
| 3.4 | `lib/ai/intent.js` | 67 | `lib/ai/ecosystemIndex` |
| 3.5 | `lib/ai/provider.js` | 55 | `lib/ai/intent`, `lib/ai/language`, `lib/ai/integrations` |
**Directory creation required:** `mkdir -p lib/ai/integrations`
**Verification Checklist:**
- [ ] `npm run build` passes
- [ ] Test the intent system in isolation:
  ```
  node -e "import('./lib/ai/provider.js').then(m =&gt; m.searchEcosystem('yacht rental miami')).then(console.log)"
  ```
  (Should return matched ecosystem items)
- [ ] Homepage still loads unchanged
**Depends on:** STEP 2 (needs `ecosystemIndex.js`) + STEP 1 (needs `language.js`)
---
### STEP 4: Port API Routes (Server-Side AI Backend)
**Action:** Create the three API endpoints. These are server-only — they don't affect any existing page rendering.
| # | File to Create | Lines | Imports From |
|---|---------------|-------|-------------|
| 4.1 | `app/api/chat/route.js` | 112 | `lib/aiEcosystemContext` |
| 4.2 | `app/api/search/route.js` | 34 | `lib/data/listings` |
| 4.3 | `app/api/tts/route.js` | 43 | `lib/ai/voice` |
| 4.4 | `lib/ai/brain.js` | 427 | `lib/data/listings` |
**Directory creation required:** `mkdir -p app/api/chat app/api/search app/api/tts`
**Verification Checklist:**
- [ ] `npm run build` passes
- [ ] `npm run dev` → navigate to `http://localhost:3000` — homepage unchanged
- [ ] Test chat API:
  ```
  curl -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"Hello"}]}'
  ```
  - Without `GEMINI_API_KEY`: should return error JSON (not crash)
  - With `GEMINI_API_KEY`: should return AI response JSON
- [ ] Test search API:
  ```
  curl "http://localhost:3000/api/search?q=yacht"
  ```
  - Should return JSON array of listings
- [ ] Test TTS API:
  ```
  curl -X POST http://localhost:3000/api/tts \
    -H "Content-Type: application/json" \
    -d '{"text":"Hello world","lang":"en"}'
  ```
  - Without TTS env vars: should return `{"available":false}` or error
- [ ] All existing pages still render correctly
**Depends on:** STEP 2 (needs `lib/data/listings`) + STEP 1 (needs `lib/aiEcosystemContext`, `lib/ai/voice`)
---
### STEP 5: Port Environment Configuration
**Action:** Add the `.env.example` file and update `.gitignore`.
| # | File | Action |
|---|------|--------|
| 5.1 | `.env.example` | CREATE (6 lines: GEMINI_API_KEY, GEMINI_MODEL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, TTS_PROVIDER, OPENROUTER_API_KEY) |
| 5.2 | `.gitignore` | APPEND 3 lines: `.env`, `.env.local`, `.wrangler/` |
**Verification Checklist:**
- [ ] `.env.example` exists and lists all required env vars
- [ ] `.gitignore` correctly ignores `.env` and `.env.local`
- [ ] `npm run build` passes
- [ ] Homepage unchanged
**Depends on:** STEP 0 (can be done any time after base, placed here for logical flow)
---
### STEP 6: Port AI UI Provider Components
**Action:** Create the React context providers that the AI components will consume.
| # | File to Create | Lines | Imports From |
|---|---------------|-------|-------------|
| 6.1 | `app/components/ai/AIProvider.jsx` | 104 | (React context only) |
| 6.2 | `app/components/ai/AiDockProvider.jsx` | 27 | (React context only) |
| 6.3 | `app/components/ai/chatTransport.js` | 72 | (fetch wrapper, no internal imports) |
| 6.4 | `app/components/ai/useVoice.js` | 233 | (Web Speech API, no internal imports) |
**Directory creation required:** `mkdir -p app/components/ai`
**Verification Checklist:**
- [ ] `npm run build` passes (files not yet consumed)
- [ ] Each file exports the expected symbols:
  - `AIProvider.jsx`: `AIProvider`, `useAI`
  - `AiDockProvider.jsx`: `AiDockProvider`, `useAiDock`
  - `chatTransport.js`: `sendChat`
  - `useVoice.js`: `useVoice`
- [ ] Homepage still loads unchanged
**Depends on:** STEP 4 (chatTransport calls `/api/chat` which must exist)
---
### STEP 7: Port AI UI Components (Non-Layout)
**Action:** Create the visual AI components. These are NOT yet wired into any page.
| # | File to Create | Lines | Key Dependencies |
|---|---------------|-------|-----------------|
| 7.1 | `app/components/ai/AiConversation.jsx` | 230 | `useVoice` |
| 7.2 | `app/components/ai/AiDock.jsx` | 71 | `AiDockProvider`, `AiConversation`, `useBodyScrollLock` |
| 7.3 | `app/components/ai/AiSphere.jsx` | 31 | `AiDockProvider` |
| 7.4 | `app/components/ai/DiscoveryRoom.jsx` | 177 | `AIProvider`, `ThemeProvider`, `LocaleProvider`, `useBodyScrollLock`; lazy-loads `lib/ai/provider` |
| 7.5 | `app/components/ai/DiscoveryDock.jsx` | 89 | (check imports at port time) |
| 7.6 | `app/components/ai/GorgonaOneAI.jsx` | 792 | `discoveryCategories`, `lib/ai/language`, `ThemeProvider`, `LocaleProvider`, `AIProvider`, `useVoice`; lazy-loads `lib/ai/provider` |
| 7.7 | `app/components/CategoryOrb.jsx` | 739 | `discoveryCategories` |
**Verification Checklist:**
- [ ] `npm run build` passes (components exist but are not imported by any page yet)
- [ ] No existing component files were modified
- [ ] Quick smoke: temporarily add `import GorgonaOneAI from './components/ai/GorgonaOneAI'` to `app/page.js` and render `&lt;GorgonaOneAI /&gt;` at the bottom — verify it renders without crashing, then REVERT the import (do not commit this test)
- [ ] Homepage still loads unchanged (after reverting test)
**Depends on:** STEP 6 (needs providers + hooks) + STEP 1 (needs `ThemeProvider`, `useBodyScrollLock`, `discoveryCategories`, `language.js`)
---
### STEP 8: Port PWA Components
**Action:** Add Progressive Web App infrastructure.
| # | File to Create | Lines |
|---|---------------|-------|
| 8.1 | `app/components/InstallPrompt.jsx` | 124 |
| 8.2 | `app/components/ServiceWorkerRegistrar.jsx` | 26 |
| 8.3 | `app/components/VenueCard.jsx` | 32 |
| 8.4 | `public/sw.js` | 45 |
| 8.5 | `public/ai.webmanifest` | 11 |
| 8.6 | `public/apple-touch-icon.png` | binary (35 KB) |
| 8.7 | `public/favicon-32.png` | binary (1.9 KB) |
| 8.8 | `public/icons/icon-192.png` | binary (39 KB) |
| 8.9 | `public/icons/icon-512.png` | binary (272 KB) |
| 8.10 | `public/icons/icon-maskable-512.png` | binary (189 KB) |
**Directory creation required:** `mkdir -p public/icons`
**Verification Checklist:**
- [ ] All icon files are valid PNGs (open in image viewer)
- [ ] `public/ai.webmanifest` is valid JSON
- [ ] `public/sw.js` is valid JavaScript
- [ ] `npm run build` passes
- [ ] Homepage unchanged
**Depends on:** STEP 0 (no code dependencies; these are static assets)
---
### STEP 9: Port New CSS (AI Overlays)
**Action:** Add the AI-specific stylesheet. This is a NEW file — no conflict with existing styles.
| # | File | Action | Lines |
|---|------|--------|-------|
| 9.1 | `app/ai-overlays.css` | CREATE | 100 |
**UI SAFETY:** This file uses class names prefixed with `.ai-` or namespaced selectors that DO NOT collide with existing Tailwind/globals.css classes. Verify by searching the file for any selector that matches an existing class in `globals.css`.
**Verification Checklist:**
- [ ] `grep` for any selector in `ai-overlays.css` that also appears in `globals.css` → should return ZERO matches
- [ ] `npm run build` passes
- [ ] Homepage visual appearance is IDENTICAL (this CSS is not linked yet)
**Depends on:** STEP 0
---
### STEP 10: Wire AI into Layout (THE CRITICAL STEP)
**Action:** Modify `app/layout.js` to mount the AI provider tree and surfaces. This is where new code meets existing code.
**File to MODIFY:** `app/layout.js`
**Changes required (add these imports to the top):**
```javascript
import './ai-overlays.css';                              // NEW
import { ThemeProvider } from './components/ThemeProvider';    // NEW
import { AIProvider } from './components/ai/AIProvider';      // NEW
import DiscoveryDock from './components/ai/DiscoveryDock';    // NEW
import { AiDockProvider } from './components/ai/AiDockProvider'; // NEW
import { AiSphere } from './components/ai/AiSphere';         // NEW
import { AiDock } from './components/ai/AiDock';             // NEW
import { InstallPrompt } from './components/InstallPrompt';   // NEW
```
**Changes required (wrap children in provider tree):**
The existing structure is:
```jsx
&lt;LocaleProvider&gt;
  &lt;AuthProvider&gt;
    &lt;Header /&gt;
    {children}
    &lt;Footer /&gt;
  &lt;/AuthProvider&gt;
&lt;/LocaleProvider&gt;
```
Must become:
```jsx
&lt;LocaleProvider&gt;
  &lt;AuthProvider&gt;
    &lt;ThemeProvider&gt;
      &lt;AIProvider&gt;
        &lt;AiDockProvider&gt;
          &lt;Header /&gt;
          {children}
          &lt;Footer /&gt;
          &lt;DiscoveryDock /&gt;
          &lt;AiSphere /&gt;
          &lt;AiDock /&gt;
          &lt;InstallPrompt /&gt;
        &lt;/AiDockProvider&gt;
      &lt;/AIProvider&gt;
    &lt;/ThemeProvider&gt;
  &lt;/AuthProvider&gt;
&lt;/LocaleProvider&gt;
```
**UI SAFETY PROTOCOL FOR THIS STEP:**
1. The AI components (`DiscoveryDock`, `AiSphere`, `AiDock`, `InstallPrompt`) are rendered AFTER `&lt;Footer /&gt;` — they overlay via CSS `position: fixed`, they do NOT displace any existing DOM elements.
2. The providers (`ThemeProvider`, `AIProvider`, `AiDockProvider`) are pure React Context wrappers — they render `{children}` unchanged and only add context values.
3. If any component throws, the entire page breaks. MITIGATION: Wrap the new components in a try-catch error boundary.
**Verification Checklist:**
- [ ] `npm run build` passes
- [ ] `npm run dev` → Homepage loads
- [ ] ALL existing navigation works:
  - [ ] Home → loads
  - [ ] Travel → loads
  - [ ] Shopping/Stores → loads
  - [ ] Villas → loads
  - [ ] Yachts → loads
  - [ ] Car Rentals → loads
  - [ ] Sportsbooks → loads
  - [ ] Events → loads
  - [ ] AI Concierge → loads (may redirect to /discovery)
- [ ] Header scroll behavior unchanged (transparent → solid on scroll)
- [ ] Footer renders at bottom of all pages
- [ ] Mobile hamburger menu still works
- [ ] Language switcher still works
- [ ] No console errors related to undefined providers
- [ ] AI Sphere (floating orb) appears in bottom-right corner
- [ ] Clicking AI Sphere opens the AiDock panel
**Depends on:** STEP 7 + STEP 8 + STEP 9 (all components must exist)
---
### STEP 11: Wire GorgonaOneAI into Homepage
**Action:** Modify `app/page.js` to display the main AI concierge interface.
**File to MODIFY:** `app/page.js`
**Changes required:**
1. Add import: `import GorgonaOneAI from './components/ai/GorgonaOneAI';`
2. Add import: `import { ecosystem } from '../lib/ecosystemData';` (verify if already present)
3. Insert `&lt;GorgonaOneAI /&gt;` at the appropriate position in the page (after the hero section, before the deals grid — check SOURCE for exact placement)
4. May remove or modify `&lt;SearchBar /&gt;` if it's replaced by AI — CHECK SOURCE carefully
**UI SAFETY:** Compare the SOURCE `app/page.js` diff carefully. The homepage has complex visual layout. Only change what the diff shows — do not rewrite the file.
**Verification Checklist:**
- [ ] `npm run build` passes
- [ ] Homepage loads with AI concierge visible
- [ ] AI concierge accepts text input
- [ ] Typing a query and pressing Enter sends to `/api/chat` (check Network tab)
- [ ] If `GEMINI_API_KEY` is set: response appears in chat
- [ ] If `GEMINI_API_KEY` is not set: graceful error message (not a crash)
- [ ] All other homepage sections still render below the AI area
- [ ] Scroll behavior is smooth (no jumpiness)
- [ ] Mobile viewport: AI area stacks correctly
- [ ] Hero image/video still displays correctly
- [ ] Featured Deals section unchanged
- [ ] Ecosystem grid unchanged
**Depends on:** STEP 10 (layout must have providers mounted)
---
### STEP 12: Port Discovery &amp; AI Pages
**Action:** Create the dedicated AI route pages.
| # | File | Action | Lines |
|---|------|--------|-------|
| 12.1 | `app/discovery/page.js` | CREATE | 78 |
| 12.2 | `app/ai/page.js` | CREATE | 19 |
| 12.3 | `app/ai/AIExperience.jsx` | CREATE | 37 |
| 12.4 | `app/concierge/page.js` | MODIFY (becomes redirect to `/discovery`) | ~8 |
**Directory creation required:** `mkdir -p app/ai`
**Verification Checklist:**
- [ ] `npm run build` passes
- [ ] Navigate to `/discovery` → page loads with AI conversation interface
- [ ] Navigate to `/ai` → page loads
- [ ] Navigate to `/concierge` → redirects to `/discovery`
- [ ] Header "AI Concierge" nav link works (lands on /discovery or /concierge)
- [ ] Back button from /discovery returns to previous page
- [ ] All other routes still work
**Depends on:** STEP 10 (needs providers in layout) + STEP 7 (needs AiConversation component)
---
### STEP 13: Port Header Modifications
**Action:** Modify `app/components/Header.jsx` to integrate AI-awareness (search integration, new nav items if any).
**File to MODIFY:** `app/components/Header.jsx`
**Approach:** Diff the SOURCE Header.jsx against the BASE Header.jsx. Apply changes surgically — the header has 9 nav items and complex scroll/mobile behavior.
**Changes likely include:**
- Additional imports for AI-related hooks or state
- Modified search behavior to route through AI
- Visual adjustments (61 lines changed in diff)
**UI SAFETY:** This is HIGH RISK. The header is on every page. Test ALL pages after this step.
**Verification Checklist:**
- [ ] `npm run build` passes
- [ ] Header renders on every page (test at least 5 different routes)
- [ ] Desktop navigation: all 9 items clickable, correct destinations
- [ ] Mobile hamburger: opens, shows all items, closes on selection
- [ ] Scroll behavior: header transitions from transparent to solid
- [ ] Language switcher: still visible, still functional
- [ ] Login/profile button: still visible, still functional
- [ ] No text overflow or clipping on any viewport width (320px to 1920px)
- [ ] AI Concierge nav item links to correct route
**Depends on:** STEP 10 (may reference AI providers)
---
### STEP 14: Port Footer Modification
**Action:** Minor modification to `app/components/Footer.jsx` (2 lines changed in diff — likely adding a link or copyright update).
**File to MODIFY:** `app/components/Footer.jsx`
**Verification Checklist:**
- [ ] `npm run build` passes
- [ ] Footer renders on all pages
- [ ] No broken links in footer
- [ ] Footer stays at page bottom (not floating mid-page)
**Depends on:** STEP 0 (trivial change, can be done early)
---
### STEP 15: Port Globals.css Additions
**Action:** Append new CSS rules to `app/globals.css` (77 lines added in diff).
**File to MODIFY:** `app/globals.css`
**UI SAFETY:** ONLY APPEND. Never modify existing rules. The new rules should be added at the END of the file. Verify by checking that:
1. Every new rule uses a class name NOT present in the existing file
2. No existing rule is overridden by specificity
**Verification Checklist:**
- [ ] Diff the modified file — only additions at the end
- [ ] `npm run build` passes
- [ ] Homepage visual appearance unchanged (new classes not yet used)
- [ ] All section-themed pages still have correct colors (travel=violet, yacht=slate, etc.)
- [ ] No unexpected font changes
- [ ] Dark areas still dark, light areas still light
**Depends on:** STEP 0
---
### STEP 16: Port Manifest &amp; Metadata Updates
**Action:** Update `app/manifest.js` with PWA metadata.
| # | File | Action |
|---|------|--------|
| 16.1 | `app/manifest.js` | MODIFY (15 lines changed — add PWA fields) |
**Verification Checklist:**
- [ ] `npm run build` passes
- [ ] Check `/manifest.json` response in browser — valid JSON
- [ ] PWA install prompt appears on supported browsers (Chrome mobile)
- [ ] App name and icons correct in manifest
**Depends on:** STEP 8 (icons must exist in `/public/icons/`)
---
### STEP 17: Port i18n Updates
**Action:** Update `lib/i18n.js` with new/modified translation keys.
**File to MODIFY:** `lib/i18n.js`
**Changes:** 32 lines changed — likely adding AI-related translation keys for all 16 locales.
**UI SAFETY:** Only ADD new keys. Never modify existing key values (would break current UI text).
**Verification Checklist:**
- [ ] `npm run build` passes
- [ ] Switch language to each of: English, Russian, Spanish, Hebrew, Chinese
- [ ] Verify existing text unchanged in each language
- [ ] Verify new AI-related text appears (e.g., "Ask our concierge" type prompts)
- [ ] No `undefined` text appearing anywhere
**Depends on:** STEP 0
---
### STEP 18: Port Data File Updates
**Action:** Minor updates to existing data files.
| # | File | Action | Changes |
|---|------|--------|---------|
| 18.1 | `lib/dealsData.js` | MODIFY | 22 lines (likely adding Etsy/Nordstrom entries) |
| 18.2 | `lib/ecosystemData.js` | MODIFY | 8 lines (adding ecosystem categories) |
**Verification Checklist:**
- [ ] `npm run build` passes
- [ ] Deals page still renders all existing deals
- [ ] New deals appear in the grid (Etsy, Nordstrom)
- [ ] Homepage ecosystem section shows correct categories
- [ ] No broken images
**Depends on:** STEP 0
---
### STEP 19: Port Brand Images
**Action:** Add new brand images for stores.
| # | File | Size |
|---|------|------|
| 19.1 | `public/images/brands/etsy-shopping.webp` | 15 KB |
| 19.2 | `public/images/brands/nordstrom-shopping.webp` | 6.6 KB |
**Verification Checklist:**
- [ ] Images are valid (open in viewer)
- [ ] Referenced by the corresponding deal entries from STEP 18
- [ ] Images display correctly on the stores/deals pages
- [ ] No 404s in browser console for image paths
**Depends on:** STEP 18 (data references these images)
---
### STEP 20: Port Restaurants Page &amp; Video Asset
**Action:** Add the restaurants store page and events hero video.
| # | File | Action | Size |
|---|------|--------|------|
| 20.1 | `app/stores/restaurants/page.js` | CREATE | 62 lines |
| 20.2 | `app/restaurants-nightlife/page.js` | MODIFY | 24 lines changed |
| 20.3 | `public/videos/events-hero.mp4` | CREATE | 16 MB |
**Directory creation required:** `mkdir -p app/stores/restaurants`
**Verification Checklist:**
- [ ] Navigate to `/stores/restaurants` → page loads
- [ ] Navigate to `/restaurants-nightlife` → page loads with any new changes
- [ ] Events hero video plays (check `/events` page if it uses this video)
- [ ] Video doesn't autoplay with sound (should be muted autoplay or poster only)
- [ ] No layout shift when video loads
**Depends on:** STEP 0
---
### STEP 21: Port Database Seeds &amp; Documentation
**Action:** Add the seed scripts and architecture doc (non-runtime files).
| # | File | Action | Lines |
|---|------|--------|-------|
| 21.1 | `scripts/seed/generate-seed-sql.mjs` | CREATE | 66 |
| 21.2 | `scripts/seed/listings.seed.sql` | CREATE | 53 |
| 21.3 | `docs/ARCHITECTURE.md` | CREATE | 103 |
**Directory creation required:** `mkdir -p scripts/seed docs`
**Verification Checklist:**
- [ ] `node scripts/seed/generate-seed-sql.mjs` runs without error
- [ ] Output SQL is valid (check syntax)
- [ ] `docs/ARCHITECTURE.md` is readable and accurate
- [ ] `npm run build` still passes (these are non-runtime files)
**Depends on:** STEP 0 (can be done any time)
---
### STEP 22: Final Integration Test
**Action:** Full end-to-end verification of the complete rebuilt system.
**Verification Checklist — UI/Navigation:**
- [ ] Homepage loads in &lt; 3 seconds
- [ ] All 9 navigation items work (Home, Travel, Shopping, Villas, Yachts, Car Rentals, Sportsbooks, Events, AI Concierge)
- [ ] Mobile responsive: 375px, 768px, 1024px, 1440px viewports
- [ ] No horizontal scroll on any viewport
- [ ] All hero images/videos load
- [ ] Language switcher works across all pages
- [ ] Back/forward browser navigation works
**Verification Checklist — AI System:**
- [ ] Homepage AI concierge responds to typed queries
- [ ] Voice input: microphone permission prompt appears, speech recognized
- [ ] Voice output: AI response is spoken aloud (if TTS configured)
- [ ] AI Sphere (floating orb) opens the dock panel on click
- [ ] AiDock conversation works independently of homepage AI
- [ ] Discovery Room (`/discovery`) loads and accepts input
- [ ] `/api/chat` responds to curl test
- [ ] `/api/search?q=yacht` returns results
- [ ] `/api/tts` responds appropriately
**Verification Checklist — Infrastructure:**
- [ ] `npm run build` completes (&lt; 60 seconds)
- [ ] No TypeScript/ESLint errors (if configured)
- [ ] No `console.error` in browser on any page
- [ ] Service worker registers (check Application tab in DevTools)
- [ ] PWA manifest detected (check Application &gt; Manifest in DevTools)
- [ ] All images load (no 404s in Network tab)
**Verification Checklist — Regression:**
- [ ] Events page: all event cards render, pagination works
- [ ] Sportsbook page: all logos correct, profile links work
- [ ] Deals page: all deals render with correct images
- [ ] Individual yacht/rental/experience pages: detail view renders
- [ ] Login page: form renders (auth is localStorage demo)
- [ ] Partner page: form renders
---
## Recommended Commit Sequence
| Commit # | Steps Included | Message |
|----------|---------------|---------|
| 1 | STEP 0 | `reset: clean base from main for reconstruction` |
| 2 | STEP 1 + 5 | `feat: add leaf AI modules and env configuration` |
| 3 | STEP 2 + 3 | `feat: add data access layer and intent system` |
| 4 | STEP 4 | `feat: add AI API routes (chat, search, tts)` |
| 5 | STEP 6 + 7 + 8 + 9 | `feat: add AI UI components and PWA assets` |
| 6 | STEP 10 + 11 | `feat: wire AI surfaces into layout and homepage` |
| 7 | STEP 12 + 13 + 14 | `feat: add discovery page and update header/footer` |
| 8 | STEP 15 + 16 + 17 | `style: add AI CSS, update manifest and i18n` |
| 9 | STEP 18 + 19 + 20 | `content: add new brands, restaurants, video asset` |
| 10 | STEP 21 | `docs: add seed scripts and architecture doc` |
---
## Time Budget
| Steps | Estimated Duration | Skill Required |
|-------|-------------------|----------------|
| 0-1 (Base + Leaves) | 30 min | Basic git + file copy |
| 2-3 (Data + Intent) | 1 hour | Understanding of module imports |
| 4-5 (APIs + Env) | 1 hour | Backend/API knowledge |
| 6-9 (UI Components + CSS) | 2-3 hours | React/JSX + CSS knowledge |
| 10-11 (Wiring - CRITICAL) | 2-3 hours | Full-stack + testing discipline |
| 12-14 (Pages + Header) | 1-2 hours | React routing + UI testing |
| 15-21 (Polish + Assets) | 1-2 hours | File management + verification |
| 22 (Final Integration) | 1-2 hours | QA testing across viewports |
| **TOTAL** | **10-15 hours** | |
---
## Risk Registry
| # | Risk | Severity | Mitigation |
|---|------|----------|-----------|
| 1 | GorgonaOneAI.jsx (792 lines) has undocumented dependencies on CSS classes not yet ported | HIGH | Port `ai-overlays.css` and `globals.css` additions BEFORE wiring the component (Steps 9, 15 before Step 11) |
| 2 | `lib/data/listings.js` crashes if Supabase URL env var is malformed (not missing — malformed) | MEDIUM | Set `NEXT_PUBLIC_SUPABASE_URL=""` (empty string triggers fallback path) or don't set it at all |
| 3 | Header modification breaks mobile navigation | HIGH | Take screenshots before and after Step 13; test on 375px, 768px, and 1024px |
| 4 | `useVoice.js` hook causes re-renders that cascade to parent components | MEDIUM | Test in React DevTools Profiler — the hook should only update its own state |
| 5 | `events-hero.mp4` (16 MB) makes git operations slow | LOW | Consider hosting on CDN and replacing with URL reference; or accept the tradeoff for now |
| 6 | Missing `LocaleProvider` or `AuthProvider` causes useContext() to return undefined | HIGH | These already exist on BASE — never remove them. The new providers wrap around them, not replace them |
| 7 | `app/page.js` modifications break the hero section layout | HIGH | Diff SOURCE vs BASE carefully; only add the GorgonaOneAI import and component render — do not touch hero section code |
---
## Quick Reference: File Counts by Step
| Step | New Files | Modified Files | Total |
|------|-----------|---------------|-------|
| 0 | 0 | 0 | 0 (reset) |
| 1 | 6 | 0 | 6 |
| 2 | 3 | 0 | 3 |
| 3 | 5 | 0 | 5 |
| 4 | 4 | 0 | 4 |
| 5 | 1 | 1 | 2 |
| 6 | 4 | 0 | 4 |
| 7 | 7 | 0 | 7 |
| 8 | 10 | 0 | 10 |
| 9 | 1 | 0 | 1 |
| 10 | 0 | 1 | 1 |
| 11 | 0 | 1 | 1 |
| 12 | 3 | 1 | 4 |
| 13 | 0 | 1 | 1 |
| 14 | 0 | 1 | 1 |
| 15 | 0 | 1 | 1 |
| 16 | 0 | 1 | 1 |
| 17 | 0 | 1 | 1 |
| 18 | 0 | 2 | 2 |
| 19 | 2 | 0 | 2 |
| 20 | 2 | 1 | 3 |
| 21 | 3 | 0 | 3 |
| **TOTAL** | **51** | **12** | **63** |
