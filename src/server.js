const app = require("./app");
const connectDB = require("./config/db");
const { startReportCron } = require("./jobs/reportCron");

const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 5003;

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.warn("[SERVER] Starting server without initial MongoDB connection:", err.message);
  }

  startReportCron();

  function listenOnPort(port, attempts = 0) {
    const server = app.listen(port, () => {
      console.log(`[SERVER] Running on http://localhost:${port}`);
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE" && attempts < 5) {
        // Port 5000 is occupied by macOS ControlCenter / AirPlay by default
        const nextPort = port === 5000 ? 5003 : port + 1;
        console.warn(
          `[SERVER] Port ${port} is already in use (often macOS AirPlay / Control Center). Retrying on port ${nextPort}...`
        );
        listenOnPort(nextPort, attempts + 1);
      } else {
        console.error("[SERVER] Fatal server error:", err.message);
        process.exit(1);
      }
    });
  }

  listenOnPort(DEFAULT_PORT);
}

if (require.main === module) {
  start();
}

module.exports = app;
