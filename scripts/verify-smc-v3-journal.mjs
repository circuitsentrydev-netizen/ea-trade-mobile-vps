#!/usr/bin/env node
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/verify-smc-v3-journal.mjs <path-to-V3-journal.csv>");
  process.exit(2);
}

const expectedHeader = [
  "V3", "EVENT_ID", "PARENT_ID", "SETUP_ID", "SYMBOL", "DIR", "TF", "TYPE",
  "SOURCE_UTC", "CONFIRM_UTC", "SOURCE_BROKER_TIME", "CONFIRM_BROKER_TIME",
  "LOW", "HIGH", "CONFIG", "VALID", "REASON", "CHECKSUM",
];

function parseCsvLine(line) {
  const fields = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === ";" && !quoted) {
      fields.push(field);
      field = "";
    } else field += ch;
  }
  if (quoted) throw new Error("Unclosed CSV quote");
  fields.push(field);
  return fields;
}

// Matches CSetupJournal::Checksum: MQL5 StringGetCharacter UTF-16 code units,
// uint32 XOR/multiply overflow, and the exact serialized columns 1..16.
function sourceChecksum(fields) {
  const payload = fields.slice(1, 17).join("|");
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

let lines;
try {
  lines = readFileSync(file, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/);
} catch (error) {
  console.error("Could not read journal:", error.message);
  process.exit(2);
}
while (lines.length && lines[lines.length - 1] === "") lines.pop();
if (!lines.length) {
  console.error("Journal is empty.");
  process.exit(1);
}

let header;
try { header = parseCsvLine(lines[0]); }
catch (error) { console.error("Invalid header:", error.message); process.exit(1); }
if (header.length !== expectedHeader.length || header.some((v, i) => v !== expectedHeader[i])) {
  console.error("Header does not match the SMC EA v1.082 V3 18-column contract.");
  process.exit(1);
}

let passed = 0;
let failed = 0;
let qualified = 0;
for (let i = 1; i < lines.length; i++) {
  if (!lines[i]) continue;
  let fields;
  try { fields = parseCsvLine(lines[i]); }
  catch (error) {
    failed++;
    console.error(`Line ${i + 1}: CSV parse failed (${error.message})`);
    continue;
  }
  if (fields.length !== 18 || fields[0] !== "V3" || fields[14] !== "108" || fields[15] !== "1") {
    failed++;
    console.error(`Line ${i + 1}: invalid V3 row shape/config/valid flag`);
    continue;
  }
  const stored = Number(fields[17]);
  const calculated = sourceChecksum(fields);
  if (!Number.isInteger(stored) || stored < 0 || stored > 4294967295 || stored !== calculated) {
    failed++;
    console.error(`Line ${i + 1}: checksum mismatch for EVENT_ID=${fields[1]} (stored=${fields[17]}, calculated=${calculated})`);
    continue;
  }
  passed++;
  if (fields[7] === "10") qualified++;
}

console.log(`V3 rows verified: ${passed + failed}`);
console.log(`Checksum PASS: ${passed}`);
console.log(`Checksum FAIL: ${failed}`);
console.log(`QUALIFIED events: ${qualified}`);
console.log("This verifies the file's rows against the v1.082 source checksum algorithm; it does not enable API ingestion.");
process.exit(failed === 0 && passed > 0 ? 0 : 1);
