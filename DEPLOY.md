# Deployment Guide — Render

## Architecture on Render

```
┌─────────────────────────────────────────────┐
│  Static Site (Frontend)                     │
│  ai-trading-platform-client.onrender.com    │
│  React + Vite → dist/                       │
│  Served as static HTML/JS/CSS               │
└──────────────────┬──────────────────────────┘
                   │ REST + WebSocket
                   ▼
┌─────────────────────────────────────────────┐
│  Web Service (Backend)                      │
│  ai-trading-platform-api.onrender.com       │
│  Node.js + Express + WebSocket              │
│  Connects to Upstox API                     │
└─────────────────────────────────────────────┘
```

## Step 1: Push to GitHub

```bash
cd ai-trading-platform
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/ai-trading-platform.git
git push -u origin main
```

## Step 2: Deploy Backend on Render

1. Go to https://dashboard.render.com
2. Click **New +** → **Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Name**: `ai-trading-platform-api`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node dist/index.js`
   - **Region**: Mumbai (closest to NSE)
   - **Instance Type**: Starter ($7/mo) or Free (for testing)
5. Add Environment Variables:
   - `NODE_ENV` = `production`
   - `PORT` = `10000`
6. Click **Create Web Service**

## Step 3: Deploy Frontend on Render

1. Click **New +** → **Static Site**
2. Connect same GitHub repo
3. Configure:
   - **Name**: `ai-trading-platform-client`
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `./dist`
4. Add Environment Variable:
   - `VITE_API_URL` = `https://ai-trading-platform-api.onrender.com`
5. Add Redirect/Rewrite Rule:
   - **Source**: `/*`
   - **Destination**: `/index.html`
   - **Action**: Rewrite
6. Click **Create Static Site**

## Step 4: Update CORS on Backend

After both services are deployed, update the backend CORS to allow the frontend domain.
