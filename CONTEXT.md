# HuntDrop AI — Session Context Prompt
# Paste this at the start of each new session.

## What Is This
HuntDrop AI is a complete dropshipping intelligence platform. Single-page app (HTML/CSS/JS, no frameworks). Searches 10 platforms simultaneously, provides AI analysis, profit calculation, ad creative generation, supplier verification, and niche discovery.

## Architecture (NEVER modify core.js)
```
core.js         — Immovable foundation. 8 systems: EventBus, PluginRegistry, ComponentRegistry, Config, DataLayer, UI, FeatureFlags, Router. Exported as window.HuntDrop.
app.js          — Orchestrator. Boot sequence, navigation, search wiring, modal, non-plugin features.
plugins/        — Each feature is a self-contained .js file here. Registered via PluginRegistry.
index.html      — Shell with section elements. Scripts load: Chart.js CDN → core.js → plugins/* → app.js.
css/            — Modular CSS files. Base, components, navigation, dashboard, responsive, plus 10 plugin-specific CSS files.
```

## How Plugins Work
```js
(function(){
  const {EventBus, PluginRegistry, UI, Config} = window.HuntDrop;
  PluginRegistry.register('my-plugin', {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    dependencies: [],  // other plugin IDs this needs
    init(ctx) { /* setup config */ },
    mount(ctx) { /* attach DOM, listen to EventBus */ },
    unmount(ctx) { /* cleanup */ }
  });
})();
```

## Key Event Names
- `filter:changed` — emitted when search/filters change, payload: {filters, query}
- `search:results` — emitted by search-engine plugin after data query, payload: {query, results, total}
- `product:analyze` — emitted when user clicks a product, payload: {id}
- `plugin:registered/mounted/unmounted` — lifecycle events

## Data Layer
- Adapters registered per platform: `DataLayer.registerAdapter('platformName', {search, getProduct, ...})`
- Search all: `DataLayer.searchAll(query, filters)` returns array of products
- All products accessible: `window.HuntDrop.ALL_PRODUCTS`

## Product Object Shape
```js
{ id, title, image, images: [], platform, price, originalPrice, margin, score, badges: [],
  salesVelocity, competition, demand, rating, reviews, orders, shipFrom, category,
  keywords: [], suppliers: [{name, location, rating, orders, responseTime, verified}],
  platformPrices: {aliexpress, amazon, shopify, ebay, temu, tiktok, etsy, cjdropshipping, dhgate, wish},
  trendData: [12 numbers], seasonality: [12 numbers], audience: {age, gender, interests: [], countries: []},
  riskScore, marketSaturation, adSpendAvg, cpaAvg, aiInsight }
```

## All 33 Plugins

### Data & Search (3)
1. `data-adapters.js` — Product database + adapter registration for 10 platforms (53 lines)
2. `search-engine.js` — Fuzzy search with typo tolerance, listens to filter:changed (80 lines)
3. `product-grid.js` — Registers 'product-card' component, renders cards on search:results (87 lines)

### Research (4)
4. `product-hunt.js` — Product discovery with chat sidebar (1304 lines)
5. `niche-radar.js` — Niche discovery and analysis (671 lines)
6. `market-gap-finder.js` — Find underserved market gaps (735 lines)
7. `product-lifecycle.js` — Track where products are in their lifecycle (477 lines)

### Intelligence (4)
8. `ai-analyst.js` — AI-powered product analysis (220 lines)
9. `spy-center.js` — Full-stack store intelligence: revenue, ads, tech, traffic, pricing (492 lines)
10. `competitor-battlefield.js` — Live competitive intelligence dashboard (369 lines)
11. `customer-persona.js` — Generate detailed buyer personas (498 lines)

### Financial (5)
12. `profit-calculator.js` — Real-time profit margin calculator with charts + CSV export (295 lines)
13. `profit-time-machine.js` — Sales forecasting with AI models (300 lines)
14. `price-elasticity.js` — Find optimal price points (386 lines)
15. `ad-budget-allocator.js` — AI-powered budget allocation with ROI projections + CSV export (280 lines)
16. `business-simulator.js` — Simulate different business scenarios (468 lines)

### Sourcing (2)
17. `supplier-hub.js` — Supplier directory and search (283 lines)
18. `supplier-intelligence.js` — Deep supplier verification and risk scoring (294 lines)

### Marketing (3)
19. `ad-studio.js` — Ad copy generator for FB/TikTok/IG (124 lines)
20. `content-calendar.js` — Seasonal content and social media planner (528 lines)
21. `objection-handler.js` — Auto-generate product FAQs and objection handlers (359 lines)

### Store (3)
22. `store-generator.js` — One-click store setup with winning products (434 lines)
23. `store-health.js` — Audit store for speed, SEO and conversion (272 lines)
24. `bundle-intelligence.js` — AI-generated product bundles to increase AOV (427 lines)

### Strategy (2)
25. `ai-business-coach.js` — Personalized AI strategy mentor (604 lines)
26. `ai-settings.js` — Configure API keys, preferences and AI provider settings (291 lines)

### AI Infrastructure (8)
27. `ai-key-manager.js` — API key storage and verification (171 lines)
28. `ai-web-search.js` — Web search provider integration (187 lines)
29. `ai-context-builder.js` — Build AI context from app state (189 lines)
30. `ai-system-health.js` — System health checks (196 lines)
31. `ai-risk-analyzer.js` — Risk assessment algorithms (212 lines)
32. `ai-chat-service.js` — AI chat with multiple providers (317 lines)
33. `cb-intelligence-service.js` — Competitor intelligence data service (30 lines)

## Adding a New Plugin (3 Steps)
1. Create `plugins/feature-name.js` with IIFE, register via PluginRegistry
2. Add `<script src="plugins/feature-name.js"></script>` to index.html before app.js
3. If new HTML section needed, the plugin injects it into #sections-container via mount()

## Rules
- core.js is NEVER modified
- Each plugin is ONE file, ONE feature
- Plugins communicate via EventBus (never direct references)
- All DOM access via UI.$('id') with null checks
- Chart.js available globally (loaded via CDN) — always check `typeof Chart !== 'undefined'` before creating charts
- Error isolation: try/catch in all plugin lifecycle methods

## Navigation (Hub and Spoke Model)
- **Top nav**: Dashboard + 7 category dropdowns (Research, Intelligence, Financial, Sourcing, Marketing, Store, Strategy)
- **Dashboard**: Shows all 23 tool cards (color-coded by category)
- **Tool cards**: Click any card → navigates to that feature's section
- Adding new plugin = adding one dashboard card + one dropdown item. Nav stays clean.

## Current State
- 32 plugins built and working (25 feature plugins + 7 AI infrastructure plugins)
- 10 products across 10 platforms with full data
- Navigation redesigned: Dashboard-first "Hub and Spoke" model
- All 32 tools accessible via dashboard cards and dropdown menu
- Responsive design with mobile and tablet breakpoints
- Fuzzy search with typo tolerance
- localStorage persistence for user settings and calculator state
- CSV export for Profit Calculator and Budget Planner
- First-use onboarding tooltips
