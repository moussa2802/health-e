/**
 * Verifies that the generated scaleDefinitions.js matches the source TS files.
 * Run: npx tsx scripts/generateScaleDefs.ts && node netlify/functions/_defi/scaleDefinitions.test.js
 * This test FAILS if the generated copy diverges from the TS sources.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const defsPath = path.resolve(__dirname, "scaleDefinitions.js");

console.log("── scaleDefinitions sync test ──");

// Read current generated file
const currentContent = fs.readFileSync(defsPath, "utf-8");

// Regenerate into a temp file
const tmpPath = defsPath + ".tmp";
try {
  execSync(
    `npx tsx scripts/generateScaleDefs.ts`,
    { cwd: path.resolve(__dirname, "../../.."), stdio: "pipe" }
  );

  // The script writes to the real path; read it and compare
  const freshContent = fs.readFileSync(defsPath, "utf-8");

  // Restore original
  fs.writeFileSync(defsPath, currentContent, "utf-8");

  // Compare
  if (currentContent === freshContent) {
    console.log("  ✓ scaleDefinitions.js is in sync with TS sources");
    process.exit(0);
  } else {
    console.error("  ✗ scaleDefinitions.js is OUT OF SYNC with TS sources!");
    console.error("    Run: npx tsx scripts/generateScaleDefs.ts");
    process.exit(1);
  }
} catch (err) {
  console.error("  ✗ Failed to run generateScaleDefs:", err.message);
  process.exit(1);
}
