const bcrypt = require("bcryptjs");

// In-Memory store used when MONGO_URI is not configured (e.g. initial Vercel deploy)
const demoStore = {
  users: [],
  trades: [],
  transactions: [],
  initialized: false,
};

async function initDemoData() {
  if (demoStore.initialized) return;

  const defaultHash = await bcrypt.hash("password123", 10);

  // 5 standard demo users
  for (let i = 1; i <= 5; i++) {
    demoStore.users.push({
      _id: `demo_user_${i}`,
      name: `Demo User ${i}`,
      email: `user${i}@example.com`,
      password: defaultHash,
      role: i === 1 ? "admin" : "user",
      walletBalance: 50000,
      investmentPlan: i === 1 ? "premium" : "basic",
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    });
  }

  // Pre-seed some realistic trades over the last 30 days
  const symbols = ["BTC", "ETH", "SOL", "RELIANCE", "TCS"];
  for (const user of demoStore.users) {
    // Initial deposit
    demoStore.transactions.push({
      _id: `tx_dep_${user._id}`,
      user: user._id,
      type: "DEPOSIT",
      amount: 50000,
      status: "SUCCESS",
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    });

    for (let j = 0; j < 8; j++) {
      const type = j % 2 === 0 ? "BUY" : "SELL";
      const sym = symbols[j % symbols.length];
      const qty = (j + 1) * 0.5;
      const price = sym === "BTC" ? 64000 : sym === "ETH" ? 3400 : 180;
      const amount = Number((qty * price).toFixed(2));
      const daysAgo = Math.floor(Math.random() * 25);

      demoStore.trades.push({
        _id: `trade_${user._id}_${j}`,
        user: user._id,
        symbol: sym,
        type,
        quantity: qty,
        price,
        amount,
        status: "EXECUTED",
        createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
      });
    }
  }

  demoStore.initialized = true;
  console.log("[DEMO STORE] In-Memory mock store initialized with 5 demo accounts.");
}

// User methods
async function findUserByEmail(email) {
  await initDemoData();
  const normalized = (email || "").toLowerCase().trim();
  return demoStore.users.find((u) => u.email === normalized) || null;
}

async function findUserById(id) {
  await initDemoData();
  return demoStore.users.find((u) => u._id === id || u._id.toString() === id.toString()) || null;
}

async function createUser({ name, email, password }) {
  await initDemoData();
  const normalized = email.toLowerCase().trim();
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    _id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    name: name.trim(),
    email: normalized,
    password: hashedPassword,
    role: "user",
    walletBalance: 50000, // starting demo balance
    investmentPlan: "basic",
    createdAt: new Date(),
  };
  demoStore.users.push(newUser);
  return newUser;
}

// Trades methods
async function addTrade({ userId, symbol, type, quantity, price, amount }) {
  await initDemoData();
  const trade = {
    _id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    user: userId,
    symbol: symbol.toUpperCase().trim(),
    type,
    quantity,
    price,
    amount,
    status: "EXECUTED",
    createdAt: new Date(),
  };
  demoStore.trades.unshift(trade);
  return trade;
}

async function getUserTrades(userId, { page = 1, limit = 20, from, to } = {}) {
  await initDemoData();
  let list = demoStore.trades.filter((t) => t.user === userId || t.user.toString() === userId.toString());

  if (from) {
    const fromDate = new Date(from);
    list = list.filter((t) => new Date(t.createdAt) >= fromDate);
  }
  if (to) {
    const toDate = new Date(to);
    list = list.filter((t) => new Date(t.createdAt) <= toDate);
  }

  // Sort descending by date
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = list.length;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const startIndex = (pageNum - 1) * limitNum;
  const paginated = list.slice(startIndex, startIndex + limitNum);

  return {
    trades: paginated,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
  };
}

// Transaction methods
async function addTransaction({ userId, type, amount, planName }) {
  await initDemoData();
  const tx = {
    _id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    user: userId,
    type,
    amount,
    planName,
    status: "SUCCESS",
    createdAt: new Date(),
  };
  demoStore.transactions.unshift(tx);
  return tx;
}

// Analytics calculations
async function getUserSummary(userId) {
  await initDemoData();
  const user = await findUserById(userId);
  const userTrades = demoStore.trades.filter(
    (t) => (t.user === userId || t.user.toString() === userId.toString()) && t.status === "EXECUTED"
  );
  const userTxs = demoStore.transactions.filter(
    (t) => t.user === userId || t.user.toString() === userId.toString()
  );

  let buyAmount = 0, buyCount = 0;
  let sellAmount = 0, sellCount = 0;

  for (const t of userTrades) {
    if (t.type === "BUY") {
      buyAmount += t.amount;
      buyCount++;
    } else if (t.type === "SELL") {
      sellAmount += t.amount;
      sellCount++;
    }
  }

  let depositsTotal = 0;
  let withdrawalsTotal = 0;
  for (const tx of userTxs) {
    if (tx.type === "DEPOSIT") depositsTotal += tx.amount;
    if (tx.type === "WITHDRAWAL") withdrawalsTotal += tx.amount;
  }

  return {
    walletBalance: Number((user?.walletBalance || 0).toFixed(2)),
    trades: {
      buyCount,
      sellCount,
      totalTrades: buyCount + sellCount,
    },
    totals: {
      totalBought: Number(buyAmount.toFixed(2)),
      totalSold: Number(sellAmount.toFixed(2)),
    },
    realizedPnL: Number((sellAmount - buyAmount).toFixed(2)),
    deposits: Number(depositsTotal.toFixed(2)),
    withdrawals: Number(withdrawalsTotal.toFixed(2)),
  };
}

async function getAdminOverview() {
  await initDemoData();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  let totalVolume = 0;
  const userVolumes = {};
  const active7d = new Set();
  const active30d = new Set();

  for (const t of demoStore.trades) {
    if (t.status !== "EXECUTED") continue;
    totalVolume += t.amount;
    const uid = t.user.toString();
    userVolumes[uid] = userVolumes[uid] || { totalVolume: 0, tradeCount: 0 };
    userVolumes[uid].totalVolume += t.amount;
    userVolumes[uid].tradeCount++;

    const tDate = new Date(t.createdAt);
    if (tDate >= sevenDaysAgo) active7d.add(uid);
    if (tDate >= thirtyDaysAgo) active30d.add(uid);
  }

  const topUsersByVolume = Object.keys(userVolumes)
    .map((uid) => {
      const u = demoStore.users.find((user) => user._id === uid);
      return {
        userId: uid,
        name: u ? u.name : "Trader",
        email: u ? u.email : "user@demo.com",
        totalVolume: Number(userVolumes[uid].totalVolume.toFixed(2)),
        tradeCount: userVolumes[uid].tradeCount,
      };
    })
    .sort((a, b) => b.totalVolume - a.totalVolume)
    .slice(0, 10);

  return {
    totalUsers: demoStore.users.length,
    totalPlatformVolume: Number(totalVolume.toFixed(2)),
    topUsersByVolume,
    retention: {
      activeUsersLast7Days: active7d.size,
      activeUsersLast30Days: active30d.size,
      retentionRate7dOf30d: active30d.size
        ? +((active7d.size / active30d.size) * 100).toFixed(1)
        : 0,
    },
  };
}

module.exports = {
  demoStore,
  initDemoData,
  findUserByEmail,
  findUserById,
  createUser,
  addTrade,
  getUserTrades,
  addTransaction,
  getUserSummary,
  getAdminOverview,
};
