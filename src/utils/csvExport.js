const { Parser } = require("json2csv");
const fs = require("fs");
const path = require("path");
const os = require("os");

// Generates CSV string directly without touching disk (safe for serverless & streaming)
function generateCsv(records, fields) {
  const parser = new Parser({ fields });
  return parser.parse(records);
}

// Determines a writable directory for report files
function getReportsDir() {
  if (process.env.REPORTS_DIR) {
    return process.env.REPORTS_DIR;
  }
  // Serverless environments like Vercel have a read-only filesystem except /tmp
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), "reports");
  }
  return path.join(process.cwd(), "reports");
}

// Converts an array of plain objects into a CSV file on disk and returns the path
function writeCsvFile(records, fields, filenamePrefix) {
  const csv = generateCsv(records, fields);
  let dir = getReportsDir();

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    // Fallback to os tmpdir if permission denied / read-only filesystem
    console.warn(`[CSV] Could not create directory ${dir}, falling back to tmpdir: ${err.message}`);
    dir = path.join(os.tmpdir(), "reports");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const filename = `${filenamePrefix}-${Date.now()}.csv`;
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, csv, "utf8");

  return filePath;
}

module.exports = { generateCsv, writeCsvFile, getReportsDir };
