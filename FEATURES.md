# HuntDrop AI — Complete Feature Catalog

**129 total features across 15 categories**

---

## A. Core System (core.js)

| # | Feature | Description |
|---|---------|-------------|
| 1 | Logger | Structured logging with levels (debug/info/warn/error), context filtering, 500-entry buffer |
| 2 | EventBus | Priority-sorted pub/sub with wildcard patterns, parallel + sequential listener execution, one-shot `once()` |
| 3 | PluginRegistry | Full lifecycle (register→init→mount→unmount→destroy), dependency resolution, DOM mutation rollback on mount failure |
| 4 | ComponentRegistry | Isolated component system with render/mount/unmount/validate lifecycle, focus-state preservation on re-render |
| 5 | Config Manager | Namespaced config with schema validation, watchers, defaults, live config-changed events |
| 6 | DataLayer | Multi-platform adapter registry with parallel `searchAll()`, TTL cache, per-platform search/getProduct/getTrends/getSuppliers |
| 7 | UI Utilities | `$` / `$$` selectors, `create()`, safe `modal()` with focus trapping & AbortController cleanup, `toast()` with 5-toast cap, `normalizeImageUrl()` for Unsplash optimization, `getOptimizedImageAttributes()` for responsive srcset |
| 8 | State Store | Centralized key-value state with dot-notation, watchers, `store:changed` events |
| 9 | Feature Flags | Runtime feature toggles with enable/disable/isEnabled/getAll |
| 10 | Router | Simple path-based router with route-leave/route-enter lifecycle events |

---

## B. App Orchestrator (app.js)

| # | Feature | Description |
|---|---------|-------------|
| 11 | Plugin Lazy-Loader (Code Splitting) | `PLUGIN_MANIFEST` maps 21 sections to their plugin files; scripts load on-demand on navigation with race-condition-safe Map-based promise caching |
| 12 | Navigation System | Section-based SPA navigation with 20-entry history stack, back button, `navigateTo()` / `goBack()`, auto-unmount of previous section plugins |
| 13 | Search & Filters | Multi-platform search (10 platforms), price range, margin %, competition level (low/med/high), AI score slider, sorting (8 options), active filter chips, debounced filter inputs |
| 14 | 10-Platform Product Search | AliExpress, Amazon, Shopify, eBay, Temu, TikTok Shop, Etsy, CJ Dropshipping, DHgate, Wish — all searchable simultaneously |
| 15 | KPI Stats Bar | Live counters: Products Scanned, Trending Today, Avg Profit Margin, Top Platform, Saved Products, AI Analyses — with animated number counting |
| 16 | Trending Products Grid | Top 8 products sorted by AI score with Hot/Viral/New badges, refresh button, dynamic from mock product data |
| 17 | Recent Searches | Saved to localStorage (max 8), displayed as hero chips + dedicated section + search dropdown, with time-ago labels and clear button |
| 18 | Search Autocomplete Dropdown | Shows recent searches + live-filtered suggestions with remove-button on recent items |
| 19 | Voice Search | Web Speech Recognition API; auto-detects availability and shows mic button, auto-searches on transcript |
| 20 | "I'm Feeling Lucky" | Random trending query picker from 20 curated queries |
| 21 | Quick Tools Access Panel | Categorized card grid (Research/Intelligence/Financial/Sourcing/Marketing/Store/Strategy) with tab filtering and collapsible toggle |
| 22 | Navigation Dropdowns | Hover+click mega-menus for 7 categories with smooth CSS transitions |
| 23 | Welcome Onboarding | 3-step welcome card (Set up AI Keys → Search → Analyze Competitor) with progress bar, dismissible, localStorage persisted |
| 24 | Dark/Light Theme Toggle | CSS-variable-driven theme switch persisted to localStorage, with toast notification |
| 25 | Error Boundaries & Circuit Breaker | Plugin mount/init/unmount wrapped with try/catch; tracks error frequency (5 in 60s = circuit broken); shows styled error banner with dismiss/auto-dismiss |
| 26 | Plugin Loading States | Skeleton loading states per section with spinner |
| 27 | CSV & JSON Export | `exportCSV()` and `exportJSON()` helpers available to all tools |
| 28 | Product Card Quick Actions | Per-card buttons: Save, Quick Analyze, Profit Calculator, Share (Web Share API with clipboard fallback) |
| 29 | Search Results Page | Modern layout with back+search header, filter bar, summary stats bar, grid/list view toggle, skeleton loading, empty state with popular-search cards, related tools section |
| 30 | Keyboard Shortcuts | `/` to focus search, `Escape` to close modals/dropdowns, `Alt+←` or `Backspace` to go back |
| 31 | Onboarding Tooltips | 3-step guided overlay tooltips for first-time users |
| 32 | Filter Mobile Toggle | Gracefully skips if filter panel elements are absent |
| 33 | localStorage Management | 5MB quota-aware with LRU eviction, state persistence, saved products tracking |
| 34 | Accessibility Enhancements | ARIA roles on tabs, keyboard navigation (arrow/home/end for tablists), aria-labels on icon-only buttons, MutationObserver for dynamic content, aria-live region for screen readers |
| 35 | Service Worker Registration | Registers `sw.js` for offline support (skipped on `file://` protocol) |

---

## C. Service Worker / Offline (sw.js)

| # | Feature | Description |
|---|---------|-------------|
| 36 | Pre-cache Core Assets | index.html, core.js, app.js, mock-products.json, 5 CSS files |
| 37 | Network-First for APIs | API calls and external CDNs use network-first fallback-to-cache |
| 38 | Cache-First for App Assets | Same-origin requests served from cache first, then fetched and cached |
| 39 | LRU Cache Eviction | Max 100 cache entries, oldest evicted first |
| 40 | Offline Fallback Page | Styled offline page with retry button and troubleshooting tips when network unavailable |
| 41 | Cache Versioning | v3 cache with auto-cleanup of old caches on activate |

---

## D. Research Plugins

| # | Plugin | Description |
|---|--------|-------------|
| 42 | product-hunt.js | AI-powered product discovery across 10 platforms |
| 43 | niche-radar.js | Niche finder — discovers untapped niches with low competition |
| 44 | market-gap-finder.js | Market gaps analysis — finds underserved markets and opportunities |
| 45 | product-lifecycle.js | Product lifecycle tracker — charts where products are in their lifecycle |
| 46 | search-engine.js | Search engine — orchestrates multi-platform product queries |
| 47 | product-grid.js | Product grid renderer — renders search results as cards |
| 48 | product-detail.js | Product detail page — full product analysis view |
| 49 | data-adapters.js | Data adapter layer — platform-specific data normalization |

---

## E. Intelligence Plugins

| # | Plugin | Description |
|---|--------|-------------|
| 50 | ai-analyst.js | Deep AI-powered product analysis and scoring |
| 51 | spy-center.js | Store spy — spy on competitor stores and their best products |
| 52 | competitor-battlefield.js | Rival check — compare your products against competitors side-by-side |
| 53 | cb-intelligence-service.js | Companion intelligence service for battlefield analysis |
| 54 | customer-persona.js | Customer profiles — generates detailed buyer personas for any product |

---

## F. Financial Plugins

| # | Plugin | Description |
|---|--------|-------------|
| 55 | profit-calculator.js | Profit calculator — exact margin calculation with all fees included |
| 56 | profit-time-machine.js | Sales forecast — AI-powered predictive sales models |
| 57 | price-elasticity.js | Price optimizer — finds optimal price point for maximum revenue |
| 58 | ad-budget-allocator.js | Budget planner — plans ad spend and inventory investment |
| 59 | business-simulator.js | Business simulator — models different business scenarios and outcomes |

---

## G. Sourcing Plugins

| # | Plugin | Description |
|---|--------|-------------|
| 60 | supplier-hub.js | Find suppliers — searches verified suppliers across all platforms |
| 61 | supplier-intelligence.js | Supplier check — verifies supplier reliability, shipping times, and trust scores |

---

## H. Marketing Plugins

| # | Plugin | Description |
|---|--------|-------------|
| 62 | ad-studio.js | Ad creator — generates ad copy for multiple platforms |
| 63 | content-calendar.js | Content planner — seasonal content and social media calendar |
| 64 | objection-handler.js | FAQ builder — auto-generates product FAQs and objection responses |

---

## I. Store Plugins

| # | Plugin | Description |
|---|--------|-------------|
| 65 | store-generator.js | Store builder — one-click store setup with winning products |
| 66 | store-health.js | Store health audit — speed, SEO, and conversion optimization |
| 67 | bundle-intelligence.js | Bundle ideas — AI-generated product bundles to increase AOV |

---

## J. Strategy / AI Plugins

| # | Plugin | Description |
|---|--------|-------------|
| 68 | ai-business-coach.js | AI Coach — personalized dropshipping strategy advice |
| 69 | ai-chat-service.js | Chat service — conversational AI interface |
| 70 | ai-context-builder.js | Context builder — constructs AI prompt context from app data |
| 71 | ai-key-manager.js | API key manager — manages OpenAI/Anthropic/Google AI keys securely |
| 72 | ai-risk-analyzer.js | Risk analyzer — identifies business risks in products/markets |
| 73 | ai-settings.js | AI settings panel — configure API keys, preferences, provider settings |
| 74 | ai-system-health.js | System health monitor — monitors AI service availability and quotas |
| 75 | ai-web-search.js | Web search integration — augments AI with real-time web data |

---

## K. REST API / Data Infrastructure

| # | Feature | Description |
|---|---------|-------------|
| 76 | Multi-Provider AI Support | CSP allows connections to OpenAI, Anthropic, Google Gemini, and Groq APIs |
| 77 | CSP Bridge (csp-bridge.js) | Bridges Content Security Policy restrictions for API calls |
| 78 | runtime-module.js | Runtime module loader |
| 79 | css-loader.js | Dynamic CSS loader |

---

## L. CSS / Styling System

| # | File | Description |
|---|------|-------------|
| 80 | base.css | Core styles, CSS variables, typography |
| 81 | components.css | Shared component styles |
| 82 | navigation.css | Navigation bar styles |
| 83 | dashboard.css | Dashboard layout styles |
| 84 | responsive.css | Responsive breakpoints |
| 85 | search-results.css | Search results page styling |
| 86 | product-detail.css | Product detail page styling |
| 87 | plugin-coach.css | AI Coach plugin styles |
| 88 | plugin-financial.css | Financial plugins styles |
| 89 | plugin-intelligence.css | Intelligence plugins styles |
| 90 | plugin-lifecycle.css | Lifecycle plugin styles |
| 91 | plugin-market-gap.css | Market gap plugin styles |
| 92 | plugin-marketing.css | Marketing plugins styles |
| 93 | plugin-research.css | Research plugins styles |
| 94 | plugin-settings.css | Settings plugin styles |
| 95 | plugin-sourcing.css | Sourcing plugins styles |
| 96 | plugin-store.css | Store plugins styles |
| 97 | plugin-utilities.css | Utility classes |

---

## M. Planned — Ad Studio (from AD_STUDIO_FEATURES.md)

| # | Feature | Impact |
|---|---------|--------|
| 98 | AI Ad Copy Generator with PAS/AIDA/Before-After frameworks | ⭐⭐⭐⭐⭐ |
| 99 | Winning Hook Generator (pattern interrupt, curiosity, controversy hooks) | ⭐⭐⭐⭐⭐ |
| 100 | Creative Fatigue Detector & Refresh Engine | ⭐⭐⭐⭐⭐ |
| 101 | Multi-Platform Ad Adaptation (FB/IG, TikTok, Google/YT, Pinterest) | ⭐⭐⭐⭐⭐ |
| 102 | A/B Test Plan Generator with statistical significance calculator | ⭐⭐⭐⭐⭐ |
| 103 | Ad Compliance Checker (Facebook/TikTok policy scanning) | ⭐⭐⭐⭐⭐ |
| 104 | UGC-Style Script Generator (unboxing, testimonial, day-in-my-life) | ⭐⭐⭐⭐ |
| 105 | Ad Copy Variation Matrix — 20+ variations from one product | ⭐⭐⭐⭐ |
| 106 | Competitor Ad Swipe Library with pattern breakdown | ⭐⭐⭐⭐ |
| 107 | Retargeting Ad Sequence Builder (Day 1–21 sequence) | ⭐⭐⭐⭐ |
| 108 | Ad Creative Brief Generator (for designers/AI tools like Canva, Midjourney) | ⭐⭐⭐⭐ |
| 109 | Time-Sensitive Ad Templates (flash sales, seasonal, Black Friday) | ⭐⭐⭐⭐ |
| 110 | Audience-Ad Match Optimizer (persona-specific copy) | ⭐⭐⭐⭐ |
| 111 | Landing Page Copy Matcher (ad-to-page message consistency) | ⭐⭐⭐⭐ |
| 112 | ROAS Prediction & Ad Spend Simulator | ⭐⭐⭐⭐ |

---

## N. Testing Suite

| # | Test File | Description |
|---|-----------|-------------|
| 113 | accessibility.test.js | Accessibility compliance tests |
| 114 | integration.test.js | End-to-end integration tests |
| 115 | csp-bridge.test.js | CSP bridge unit tests |
| 116 | ai-services.test.js | AI services tests |
| 117 | app.test.js | App orchestrator tests |
| 118 | business-logic.test.js | Business logic validation tests |
| 119 | core.test.js | Core system unit tests |
| 120 | data-adapter-edge-cases.test.js | Data adapter edge case tests |
| 121 | features.test.js | Feature flag tests |
| 122 | integration-flows.test.js | Integration flow tests |
| 123 | search-edge-cases.test.js | Search edge case tests |

---

## O. DevOps / Tooling

| # | Feature |
|---|---------|
| 124 | Vite bundler (`vite.config.js`) |
| 125 | Vitest test runner (`vitest.config.js`) |
| 126 | PostCSS processing (`postcss.config.js`) |
| 127 | ESLint flat config (`eslint.config.js`) |
| 128 | Prettier formatting (`.prettierrc` + `.prettierignore`) |
| 129 | Environment variable template (`.env.example`) |

---

## Summary

| Category | Count |
|----------|-------|
| Core System Features | 10 |
| App Orchestrator Features | 25 |
| Service Worker / Offline | 6 |
| Research Plugins | 8 |
| Intelligence Plugins | 5 |
| Financial Plugins | 5 |
| Sourcing Plugins | 2 |
| Marketing Plugins | 3 |
| Store Plugins | 3 |
| Strategy / AI Plugins | 8 |
| REST API / Data | 4 |
| CSS / Styling | 18 |
| Planned (Ad Studio) | 15 |
| Testing | 11 |
| DevOps / Tooling | 6 |
| **TOTAL** | **129** |