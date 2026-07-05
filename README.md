# AI Institutional Intraday Intelligence Platform

Production-grade AI-powered decision intelligence platform for NSE F&O stocks using live Upstox APIs.

## Quick Start (Local Development)

```bash
# 1. Install dependencies
cd server && npm install
cd ../client && npm install

# 2. Create symlink for shared types (server needs this)
cd ../server && ln -sf ../shared shared

# 3. Start backend (Terminal 1)
cd server && npm run dev

# 4. Start frontend (Terminal 2)
cd client && npm run dev

# 5. Open http://localhost:3000
# 6. Enter your Upstox access token
# 7. Click "Start Scanner"
```

## Deploy to Render

### Option A: Using render.yaml (Recommended)

1. Push this repo to GitHub
2. Go to [render.com](https://dashboard.render.com)
3. Click **New** → **Blueprint**
4. Connect your GitHub repo
5. Render will auto-detect `render.yaml` and create both services
6. Set environment variable `ALLOWED_ORIGINS` on the API service to your frontend URL

### Option B: Manual Setup

#### Backend (Web Service)
1. **New** → **Web Service**
2. Connect GitHub repo
3. Settings:
   - **Root Directory**: *(leave empty — uses repo root)*
   - **Build Command**: `cd server && npm install && ln -sf ../shared shared && npm run build`
   - **Start Command**: `cd server && node dist/index.js`
   - **Region**: Mumbai
   - **Plan**: Starter ($7/mo)
4. Environment Variables:
   - `NODE_ENV` = `production`
   - `PORT` = `10000`

#### Frontend (Static Site)
1. **New** → **Static Site**
2. Connect same GitHub repo
3. Settings:
   - **Build Command**: `cd client && npm install && npm run build`
   - **Publish Directory**: `./client/dist`
4. Environment Variables:
   - `VITE_API_URL` = `https://your-api-name.onrender.com`
5. Redirect/Rewrite:
   - Source: `/*`
   - Destination: `/index.html`

## Architecture

```
Frontend (React + Vite)          Backend (Express + WS)
┌─────────────────────┐         ┌─────────────────────────┐
│ Auth Screen         │         │ Upstox API Service      │
│ Dashboard           │  REST   │ Feature Engineering     │
│ Top Opportunities   │◄───────►│ 7 Intelligence Modules  │
│ Live Scanner        │  WS     │ Decision Engine         │
│ Market Overview     │◄───────►│ Ranking Engine          │
│ Option Chain        │         │ Scanner (orchestrator)  │
│ Market Breadth      │         └─────────────────────────┘
│ Risk Dashboard      │                    │
│ Settings            │         ┌─────────────────────────┐
└─────────────────────┘         │ Upstox Live APIs        │
                                │ - Quotes                │
                                │ - Historical Candles    │
                                │ - Option Chain          │
                                │ - Market Depth          │
                                └─────────────────────────┘
```

## Data Flow

```
User enters Upstox token
  → Scanner loads F&O instruments from Upstox
    → For each stock: fetches quote, candles, option chain
      → Feature Engineering computes 40+ derived metrics
        → 7 Intelligence Modules score independently
          → Decision Engine combines with configurable weights
            → Ranking Engine selects top 5 opportunities
              → UI displays via WebSocket real-time updates
```

## Intelligence Modules

1. **Trend Intelligence** — Direction, strength, quality, stage
2. **Momentum Intelligence** — Acceleration, breakout power, volume
3. **Institutional Intelligence** — Evidence-based participation estimate
4. **Option Chain Intelligence** — OI, PCR, writing, unwinding, IV
5. **Price Structure Intelligence** — Breakouts, support/resistance, compression
6. **Market Context Intelligence** — Nifty, BankNifty, VIX, breadth
7. **Risk Intelligence** — Liquidity, spread, false breakout risk

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `PORT` | Server port | No (default: 8000) |
| `NODE_ENV` | Environment | No (default: development) |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) | No |
| `VITE_API_URL` | Backend URL for frontend | Yes (production) |

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, Zustand, React Query
- **Backend**: Node.js, Express, TypeScript, WebSocket
- **Data**: Upstox v2 REST APIs (live only — no mock data)