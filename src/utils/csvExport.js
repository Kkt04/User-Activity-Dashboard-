const { Parser } = require("json2csv");
const fs = require("fs");
const path = require("path");

// Converts an array of plain objects into a CSV file on disk and returns the path
function writeCsvFile(records, fields, filenamePrefix) {
  const parser = new Parser({ fields });
  const csv = parser.parse(records);

  const dir = process.env.REPORTS_DIR || "./reports";
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filename = `${filenamePrefix}-${Date.now()}.csv`;
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, csv);

  return filePath;
}

module.exports = { writeCsvFile };
