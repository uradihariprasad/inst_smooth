# Docker Deployment on Render

## Architecture (Single Container)

```
┌─────────────────────────────────────────────┐
│  Docker Container (ai-trading-platform)     │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │  Express Server (port 10000)          │  │
│  │                                       │  │
│  │  /api/*  → REST API endpoints         │  │
│  │  /ws     → WebSocket (real-time)      │  │
│  │  /*      → React SPA (static files)   │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │  Upstox API Client                    │  │
│  │  → Live quotes, candles, option chain │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
         https://your-app.onrender.com
```

## Deploy Steps

### 1. Push to GitHub

```bash
cd ai-trading-platform
git init
git add .
git commit -m "Docker deployment"
git remote add origin https://github.com/YOUR_USERNAME/ai-trading-platform.git
git push -u origin main
```

### 2. Create Web Service on Render

1. Go to https://dashboard.render.com
2. Click **New +** → **Web Service**
3. Connect your GitHub repo
4. Render auto-detects the `Dockerfile`
5. Fill in:

| Field | Value |
|---|---|
| **Name** | `ai-trading-platform` |
| **Runtime** | Docker |
| **Region** | Mumbai |
| **Plan** | Starter ($7/mo) |
| **Dockerfile Path** | `./Dockerfile` |
| **Health Check Path** | `/api/health` |

6. Click **Create Web Service**

### 3. Access Your App

Once deployed, open:
```
https://ai-trading-platform.onrender.com
```

That's it — single URL serves everything.

## Local Testing with Docker

```bash
# Build
docker build -t ai-trading-platform .

# Run
docker run -p 10000:10000 -e NODE_ENV=production ai-trading-platform

# Or use docker-compose
docker-compose up --build

# Open http://localhost:10000
```

## What the Dockerfile Does

```
Stage 1 (frontend-build):
  npm install → vite build → dist/ (HTML + JS + CSS)

Stage 2 (backend-build):
  npm install → tsc → dist/ (compiled JS)

Stage 3 (production):
  Copy only production deps + built files
  Express serves:
    /api/* → backend routes
    /ws    → WebSocket
    /*     → React SPA
```

## Render Blueprint (render.yaml)

If you prefer one-click deploy via Blueprint:

```yaml
services:
  - type: web
    name: ai-trading-platform
    runtime: docker
    dockerfilePath: ./Dockerfile
    region: mumbai
    plan: starter
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
    healthCheckPath: /api/health
    autoDeploy: true
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Set to `production` |
| `PORT` | `8000` | Server port (Render uses 10000) |
| `ALLOWED_ORIGINS` | `*` | Comma-separated CORS origins |

## How It Works

1. User opens `https://your-app.onrender.com`
2. Express serves the React SPA (`/public/index.html`)
3. React app loads, shows auth screen
4. User enters Upstox access token → stored in server memory
5. User clicks "Start Scanner"
6. Backend fetches live data from Upstox APIs
7. 7 intelligence modules analyze every F&O stock
8. Decision engine ranks top 5 opportunities
9. Results pushed to frontend via WebSocket in real-time
10. All data is live — zero mock/simulated values
