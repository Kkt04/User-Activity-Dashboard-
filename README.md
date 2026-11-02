# TradeFlow — User Activity & Analytics Dashboard

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-black?style=flat&logo=vercel)](https://vercel.com)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg?style=flat&logo=node.js)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.19-lightgrey.svg?style=flat&logo=express)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20%2F%20Local-brightgreen.svg?style=flat&logo=mongodb)](https://www.mongodb.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A full-stack trading and user activity analytics platform built with **Node.js, Express, MongoDB (Mongoose), and vanilla JavaScript**. It features trade execution, wallet ledger accounting, automated daily P&L reporting, high-performance aggregation pipelines for business intelligence, and a modern dark-mode trading dashboard.

Engineered to operate seamlessly in **both standalone server environments (Node.js/Docker)** and **serverless cloud platforms (Vercel)** with zero reconfiguration.

---

## Table of Contents

- [Features](#features)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Project Structure](#project-structure)
- [Local Quick Start](#local-quick-start)
- [Deploying to Vercel (Step-by-Step)](#deploying-to-vercel-step-by-step)
- [API Reference](#api-reference)
- [Testing via cURL](#testing-via-curl)
- [Environment Variables](#environment-variables)
- [Automated Reporting & Cron Jobs](#automated-reporting--cron-jobs)
- [Security & Optimization Highlights](#security--optimization-highlights)

---

## Features

- **Trading Ledger & Wallet Accounting**:
  - Secure BUY and SELL trade execution with atomic wallet deductions and credits.
  - Deposits, withdrawals, and multi-tier investment plan subscriptions (`basic`, `growth`, `premium`).
  - Strict input sanitization and protection against floating-point precision errors and negative-quantity financial exploits.
- **Self-Service Analytics & Realized P&L**:
  - Live calculations of wallet balance, realized P&L, cumulative buy/sell volumes, and deposit/withdrawal histories.
  - On-demand streaming CSV export of complete user trade histories (`/api/analytics/report/csv`).
- **Executive Business Intelligence (Admin)**:
  - Aggregation pipelines to rank top users by trading volume.
  - Platform-wide volume, active traders, and 7-day vs. 30-day cohort retention rates.
- **Automated Scheduled Reporting**:
  - Auto-generates consolidated daily activity and P&L CSV summaries across all users.
  - Dual scheduling: In-memory `node-cron` for local servers and native HTTP `crons` for Vercel.
- **Modern Responsive Dashboard UI**:
  - Built-in single-page interface with real-time portfolio metrics, trade execution form, interactive wallet actions, and 1-click CSV report downloads.
- **Vercel Serverless Ready**:
  - Caches database connection instances across serverless invocations to eliminate connection churn.
  - In-memory CSV streaming prevents filesystem errors on read-only serverless runtimes.

---

## Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────┐
│             Single-Page Dashboard (public/index.html)  │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / JSON / JWT
                           ▼
┌────────────────────────────────────────────────────────┐
│         Routing & Serverless Adapter Layer             │
│   - Local: src/server.js (Express HTTP Server)         │
│   - Vercel: api/index.js + vercel.json (Serverless)    │
└──────────────────────────┬─────────────────────────────┘
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Auth Routes  │    │ Trade/Wallet │    │  Analytics   │
│ & JWT Guard  │    │  Controller  │    │ Aggregations │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│     Cached Mongoose Connection & Index-Optimized DB    │
│           (MongoDB Local or MongoDB Atlas)             │
└────────────────────────────────────────────────────────┘
```

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM (utilizing compound indexes on `{ user: 1, createdAt: -1 }`)
- **Authentication**: Stateless JSON Web Tokens (JWT) + bcryptjs salted password hashing
- **Automation & Reporting**: json2csv, node-cron, Vercel Crons
- **Frontend**: Vanilla ES6+, CSS3 design tokens, responsive CSS grid/flexbox

---

## Project Structure

```
trade-activity-dashboard/
├── api/
│   └── index.js             # Vercel Serverless Function entry point
├── public/
│   └── index.html           # Dark-mode dashboard UI (portfolio, trades, admin)
├── reports/                 # Auto-generated CSV reports for local cron (gitignored)
├── src/
│   ├── app.js               # Express application configuration & middleware
│   ├── server.js            # Standalone Node.js server entrypoint
│   ├── config/
│   │   └── db.js            # Serverless-cached MongoDB connection manager
│   ├── controllers/
│   │   ├── authController.js       # Register, login, profile (/api/auth)
│   │   ├── tradeController.js      # Trades, deposits, withdrawals, subscriptions
│   │   └── analyticsController.js  # P&L metrics, admin intelligence, CSV stream
│   ├── jobs/
│   │   └── reportCron.js    # Consolidated daily P&L report generation
│   ├── middleware/
│   │   └── auth.js          # JWT authentication & role-based access control
│   ├── models/
│   │   ├── Trade.js         # Trade activity log schema with compound index
│   │   ├── Transaction.js   # Deposits, withdrawals, and plan subscriptions
│   │   └── User.js          # User profile, wallet balance, and secure passwords
│   ├── routes/
│   │   ├── analyticsRoutes.js
│   │   ├── authRoutes.js
│   │   ├── cronRoutes.js    # Vercel Cron trigger endpoint (/api/cron/daily-report)
│   │   └── tradeRoutes.js
│   └── utils/
│       ├── csvExport.js     # Direct CSV string generator & file writer
│       └── seed.js          # 30-day realistic trade/deposit seed generator
├── .env.example             # Template environment variables
├── .vercelignore            # Excluded files for clean cloud deployments
├── package.json
└── vercel.json              # Vercel routing, rewrites, and cron definitions
```

---

## Local Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v18 or later
- MongoDB installed locally OR a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster connection URI

### 2. Install Dependencies
```bash
git clone https://github.com/Kkt04/User-Activity-Dashboard-.git
cd User-Activity-Dashboard-
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `.env` contains:
```env
PORT=5003
MONGO_URI=mongodb://127.0.0.1:27017/trade-activity-dashboard
JWT_SECRET=super_secret_jwt_key_at_least_32_characters
JWT_EXPIRES_IN=7d
REPORT_CRON_SCHEDULE=0 1 * * *
REPORTS_DIR=./reports
```

### 4. Seed Demo Data (Optional but Recommended)
Populate the database with 5 demo accounts, wallet deposits, and 30 days of randomized BUY/SELL trades:
```bash
npm run seed
```
> Demo Admin: `user1@example.com` / `password123`  
> Demo Users: `user2@example.com` through `user5@example.com` / `password123`

### 5. Launch the Server
```bash
npm run dev     # with nodemon auto-reload
# or
npm start       # standard node runner
```
Open **[http://localhost:5003](http://localhost:5003)** in your browser.

> **Note on macOS**: Port `5003` is used by default because macOS AirPlay Receiver / ControlCenter occupies port `5000`. The server also includes automatic port fallback if port `5000` is requested while occupied.

---

## Deploying to Vercel (Step-by-Step)

The project includes pre-configured `vercel.json`, `api/index.js`, and connection-caching logic designed specifically for Vercel.

### Step 1: Set Up MongoDB Atlas (Free Cloud Database)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free M0 cluster.
2. In **Database Access**, create a database user (e.g., `dashboardUser`) with a password.
3. In **Network Access**, add IP `0.0.0.0/0` (Allow Access from Anywhere) so Vercel Serverless Functions can reach your database.
4. Click **Connect** > **Drivers** and copy your connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/trade-activity-dashboard?retryWrites=true&w=majority
   ```

### Step 2: Deploy via Vercel Dashboard (Recommended)
1. Push your repository to GitHub.
2. Sign in to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import your `User-Activity-Dashboard-` repository.
4. In the **Environment Variables** section, add:
   - `MONGO_URI`: Your MongoDB Atlas connection URI.
   - `JWT_SECRET`: A secure random secret string (e.g. `openssl rand -hex 32`).
   - `JWT_EXPIRES_IN`: `7d`
   - `CRON_SECRET`: *(Optional)* A secret string to protect the scheduled cron route.
5. Click **Deploy**. Vercel will build and deploy your project automatically.

### Step 3: Deploy via Vercel CLI (Alternative)
You can also deploy directly from your terminal using the Vercel CLI:
```bash
# Log in to Vercel
npx vercel login

# Link and deploy preview
npx vercel

# Set environment variables
npx vercel env add MONGO_URI
npx vercel env add JWT_SECRET

# Deploy to production
npx vercel --prod
```

### Serverless Compatibility Features
- **Cached DB Connections**: `src/config/db.js` caches `mongoose.connection` on `global.mongoose`, avoiding connection exhaustion across serverless function lifecycles.
- **In-Memory CSV Streaming**: Reports are streamed directly using HTTP response buffers, bypassing read-only filesystem restrictions in `/var/task`.
- **Native Vercel Crons**: Configured in `vercel.json` to trigger `/api/cron/daily-report` at `0 1 * * *` daily.

---

## API Reference

### Public & Health Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server status, environment runtime, and database connection state |
| `GET` | `/` | Serves dashboard web application |

### Authentication (`/api/auth`)
| Method | Endpoint | Auth | Request Body | Description |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | None | `{ name, email, password }` | Creates new account and returns JWT |
| `POST` | `/api/auth/login` | None | `{ email, password }` | Authenticates credentials and returns JWT |
| `GET` | `/api/auth/me` | Bearer Token | None | Returns authenticated user profile |

### Trades & Wallet Transactions (`/api`)
| Method | Endpoint | Auth | Request Body / Query | Description |
|---|---|---|---|---|
| `POST` | `/api/trades` | Bearer Token | `{ symbol, type, quantity, price }` | Executes BUY/SELL trade and adjusts wallet |
| `GET` | `/api/trades` | Bearer Token | `?page=1&limit=20&from=...&to=...` | Lists paginated trades with date filters |
| `POST` | `/api/transactions/deposit` | Bearer Token | `{ amount }` | Credits funds to wallet balance |
| `POST` | `/api/transactions/withdraw` | Bearer Token | `{ amount }` | Debits funds if balance is sufficient |
| `POST` | `/api/transactions/subscribe` | Bearer Token | `{ planName, amount }` | Subscribes to `basic`, `growth`, or `premium` plan |

### Analytics & Reporting (`/api/analytics`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/analytics/summary` | Bearer Token | User portfolio metrics: balance, P&L, buy/sell breakdown |
| `GET` | `/api/analytics/report/csv` | Bearer Token | Streams trade history directly as a downloadable CSV |
| `GET` | `/api/analytics/admin/overview` | Admin Only | Platform-wide volume, top 10 traders, and 7d/30d retention |

### Scheduled Automation (`/api/cron`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/cron/daily-report` | Optional `CRON_SECRET` | Generates consolidated daily P&L CSV across all users |

---

## Testing via cURL

### 1. Register & Login
```bash
# Login as demo admin
curl -s -X POST http://localhost:5003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@example.com","password":"password123"}'
```
*Save the `token` from the JSON response and export it:*
```bash
export TOKEN="<paste_token_here>"
```

### 2. Deposit Funds
```bash
curl -X POST http://localhost:5003/api/transactions/deposit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 10000}'
```

### 3. Place Trades
```bash
# Execute BUY order
curl -X POST http://localhost:5003/api/trades \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTC","type":"BUY","quantity":0.5,"price":64000}'

# Execute SELL order
curl -X POST http://localhost:5003/api/trades \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTC","type":"SELL","quantity":0.2,"price":67500}'
```

### 4. Fetch Portfolio Summary
```bash
curl -X GET http://localhost:5003/api/analytics/summary \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Download Trade Report CSV
```bash
curl -X GET http://localhost:5003/api/analytics/report/csv \
  -H "Authorization: Bearer $TOKEN" \
  -o my-trade-report.csv
```

### 6. Admin Overview (Requires Admin Role)
```bash
curl -X GET http://localhost:5003/api/analytics/admin/overview \
  -H "Authorization: Bearer $TOKEN"
```

### 7. Trigger Daily Report Job
```bash
curl -X GET http://localhost:5003/api/cron/daily-report
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5003` | HTTP port for standalone Express server (avoids macOS AirPlay port 5000) |
| `NODE_ENV` | No | `development` | Runtime environment (`development`, `production`, `test`) |
| `MONGO_URI` | **Yes** | — | MongoDB connection string (Local or MongoDB Atlas) |
| `JWT_SECRET` | **Yes** | — | Secret key used for signing and verifying JSON Web Tokens |
| `JWT_EXPIRES_IN` | No | `7d` | Token expiration duration string |
| `REPORT_CRON_SCHEDULE`| No | `0 1 * * *` | Cron schedule pattern for local standalone servers |
| `REPORTS_DIR` | No | `./reports` | Output directory for local disk CSV generation |
| `CRON_SECRET` | No | — | Optional Bearer token to secure `/api/cron/daily-report` |

---

## Automated Reporting & Cron Jobs

### Local Node.js Runtime
When running locally (`npm start` or `npm run dev`), `src/server.js` schedules the daily report job using `node-cron`. Every day at 1:00 AM server time (or according to `REPORT_CRON_SCHEDULE`), the server queries all active users, aggregates their realized P&L, total bought/sold volume, and current balances, and exports the report to `./reports/daily-platform-report-<timestamp>.csv`.

### Vercel Serverless Runtime
In serverless deployments, persistent timers cannot run in-memory because instances spin down between requests. The system delegates scheduling to **Vercel Crons** defined in `vercel.json`:
```json
"crons": [
  {
    "path": "/api/cron/daily-report",
    "schedule": "0 1 * * *"
  }
]
```
At the scheduled time, Vercel initiates an HTTP GET request to `/api/cron/daily-report`, executing the report pipeline and storing the result in `/tmp/reports` or returning execution metadata as JSON.

---

## Security & Optimization Highlights

1. **Financial Precision**: Floating-point inputs are strictly cast to `Number` and rounded to 2 decimal places using fixed arithmetic to prevent JavaScript IEEE 754 precision artifacts.
2. **Exploit Prevention**: Trade and transaction endpoints enforce strict positivity (`amount > 0`, `quantity > 0`, `price > 0`), disallowing negative inputs that could fabricate balance.
3. **Database Indexing**: Compound index `{ user: 1, createdAt: -1 }` on `Trade` and `Transaction` schemas ensures sub-millisecond pagination and date-range queries.
4. **Stateless Scalability**: Uses JWT authentication, allowing server instances to scale horizontally across regions without shared session storage.
5. **Robust Error Resilience**: Graceful database reconnection fallbacks prevent serverless functions from abruptly crashing on transient network drops.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
