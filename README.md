# User Activity Analytics Dashboard

Backend for a trading/investment-style platform: users deposit funds, place BUY/SELL trades,
subscribe to investment plans, and the system logs every action. A cron job auto-generates
daily P&L + activity CSV reports, and analytics endpoints expose aggregate business metrics
(top users by volume, retention, platform P&L).

Built to mirror real BITBNS-style backend requirements: user activity logs, automated
reporting, P&L statistics, and analytics for both users and business teams.

## Tech Stack
- Node.js + Express (REST API)
- MongoDB + Mongoose (NoSQL data + aggregation pipelines)
- JWT + bcrypt (authentication)
- node-cron (scheduled report automation)
- json2csv (CSV report generation)

## Project Structure
```
trade-activity-dashboard/
├── package.json
├── .env.example
├── reports/                  # auto-generated CSV reports land here (gitignored)
└── src/
    ├── server.js             # app entrypoint
    ├── config/
    │   └── db.js             # MongoDB connection
    ├── models/
    │   ├── User.js            # user + wallet balance + password hashing
    │   ├── Trade.js            # every BUY/SELL trade (the core activity log)
    │   └── Transaction.js      # deposits, withdrawals, subscriptions
    ├── middleware/
    │   └── auth.js            # JWT verification + role-based access
    ├── controllers/
    │   ├── authController.js       # register/login/me
    │   ├── tradeController.js      # place trades, deposit/withdraw/subscribe
    │   └── analyticsController.js  # P&L summary, admin overview, CSV export
    ├── routes/
    │   ├── authRoutes.js
    │   ├── tradeRoutes.js
    │   └── analyticsRoutes.js
    ├── jobs/
    │   └── reportCron.js      # scheduled daily report generation
    └── utils/
        ├── csvExport.js       # shared CSV writer
        └── seed.js            # populates dummy users/trades for demo
```

## Setup & Run (step by step)

### 1. Prerequisites
- Node.js 18+ installed
- MongoDB running locally, OR a free MongoDB Atlas cluster (get a connection string)

### 2. Install dependencies
```bash
cd trade-activity-dashboard
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
```
Open `.env` and set:
- `MONGO_URI` — your local Mongo (`mongodb://127.0.0.1:27017/trade-activity-dashboard`) or Atlas URI
- `JWT_SECRET` — any long random string

### 4. Start MongoDB (if running locally)
```bash
# macOS (Homebrew)
brew services start mongodb-community

# Or run directly
mongod --dbpath /path/to/data
```
If using Atlas, skip this — just make sure your `.env` URI is correct.

### 5. Seed dummy data (optional but recommended for demo)
```bash
npm run seed
```
This creates 5 demo users (`user1@example.com` ... `user5@example.com`, password
`password123`, `user1` is admin) with random trades and deposits over the last 30 days.

### 6. Run the server
```bash
npm run dev     # with nodemon (auto-restart on changes)
# or
npm start       # plain node
```
Server starts on `http://localhost:5000`. You should see:
```
[DB] MongoDB connected -> trade-activity-dashboard
[CRON] Daily report job scheduled with pattern "0 1 * * *"
[SERVER] Running on http://localhost:5000
```

### 7. Test it (with curl, or import into Postman)

**Register / Login**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@example.com","password":"password123"}'
```
Copy the `token` from the response — use it as `Authorization: Bearer <token>` on every
request below.

**Place a trade**
```bash
curl -X POST http://localhost:5000/api/trades \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTC","type":"BUY","quantity":2,"price":100}'
```

**View your trades**
```bash
curl http://localhost:5000/api/trades -H "Authorization: Bearer <token>"
```

**Deposit funds**
```bash
curl -X POST http://localhost:5000/api/transactions/deposit \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"amount":10000}'
```

**Your P&L / activity summary**
```bash
curl http://localhost:5000/api/analytics/summary -H "Authorization: Bearer <token>"
```

**Download your trade report as CSV**
```bash
curl http://localhost:5000/api/analytics/report/csv \
  -H "Authorization: Bearer <token>" -o my-report.csv
```

**Admin: platform-wide analytics** (login as `user1@example.com`, the seeded admin)
```bash
curl http://localhost:5000/api/analytics/admin/overview -H "Authorization: Bearer <admin_token>"
```

**Manually trigger the daily report job** (instead of waiting for 1 AM)
Temporarily lower `REPORT_CRON_SCHEDULE` in `.env` to `* * * * *` (every minute) and
restart the server — a CSV will appear in `./reports/` on the next tick.

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Login, returns JWT |
| GET | `/api/auth/me` | Yes | Current user profile |
| POST | `/api/trades` | Yes | Place a BUY/SELL trade |
| GET | `/api/trades` | Yes | List own trades (supports `?from=&to=&page=&limit=`) |
| POST | `/api/transactions/deposit` | Yes | Add funds |
| POST | `/api/transactions/withdraw` | Yes | Withdraw funds |
| POST | `/api/transactions/subscribe` | Yes | Subscribe to an investment plan |
| GET | `/api/analytics/summary` | Yes | Own P&L + activity summary |
| GET | `/api/analytics/report/csv` | Yes | Download own trade report as CSV |
| GET | `/api/analytics/admin/overview` | Yes (admin) | Platform-wide analytics: top users, volume, retention |

## Resume bullet points you can lift from this project
- Architected a Node.js/Express REST API with JWT-based authentication and role-based
  access control for a multi-user trading platform.
- Designed MongoDB schemas and compound indexes to support high-volume activity logging
  (trades, deposits, subscriptions) with efficient date-range queries.
- Built a node-cron scheduled job that automates daily P&L and activity report generation,
  exporting results as downloadable CSV files.
- Implemented aggregation pipelines to derive business analytics — top users by trading
  volume, platform-wide P&L, and 7-day/30-day user retention rates.
# Trade-Activity-Dashboard-
