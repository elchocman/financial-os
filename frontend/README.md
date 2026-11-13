# Financial OS — Frontend

Next.js 14 frontend for the Personal Financial Operating System.

## Quick Start

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.local.example .env.local
# Edit NEXT_PUBLIC_API_URL if your backend isn't at localhost:8000

# 3. Start dev server
npm run dev
```

Open http://localhost:3000

## Design System

The UI uses a custom dark theme built on CSS variables — no Tailwind runtime required. Key decisions:

- **Fonts:** Syne (display/headings) + JetBrains Mono (all numbers) + Inter (body)
- **Colors:** Obsidian dark palette with amber/gold accent (`#e8a020`)
- **Platform colors:** Fintual=indigo, Racional=emerald, Binance=amber
- **Layout:** Fixed 220px sidebar + sticky 56px topbar, content scrolls

## Pages

| Route | Module | Status |
|-------|--------|--------|
| `/` | Command Center | ✅ MVP |
| `/cashflow` | Cashflow Engine | ✅ MVP |
| `/investments` | Investments Engine | ✅ MVP |
| `/goals` | Life Planning | ✅ MVP |
| `/balance-sheet` | Balance Sheet | 🔜 Phase 4 |
| `/household` | Household | 🔜 Phase 4 |
| `/settings` | Integrations | 🔜 Phase 4 |

## Component Architecture

```
components/
├── layout/
│   ├── Sidebar.tsx       Fixed sidebar with module navigation
│   └── Topbar.tsx        Sticky header with sync button
│
├── dashboard/
│   ├── NetWorthCard.tsx  Hero KPI card (net worth + 30d change)
│   ├── PlatformCards.tsx Per-platform summary cards
│   └── HoldingsTable.tsx Full holdings table with all positions
│
├── charts/
│   ├── NetWorthChart.tsx Area chart (recharts) with period selector
│   └── AllocationChart.tsx Donut chart with legend
│
└── ui/
    ├── Card.tsx          Base card with CardHeader
    └── ComingSoon.tsx    Placeholder for unbuilt modules
```

## Adding a New Integration

When you connect a new platform (e.g. a new broker), the frontend doesn't need changes — only the backend collector and `PlatformCards` color map need updating. The `PortfolioSummary` response automatically includes the new platform.
