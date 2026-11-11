const { readFileSync, existsSync } = require("node:fs");
const { resolve, dirname } = require("node:path");

// Current public references. Historical handovers are explicitly marked as such.
const files = [
  "README.md", "SECURITY.md", "CONTRIBUTING.md", "docs/README.md",
  "docs/STATUS.md", "docs/ARCHITECTURE.md", "docs/ROADMAP.md",
  "docs/REPOSITORY_METADATA.md",
];
const failures = [];
for (const file of files) {
  if (!existsSync(file)) {
    failures.push(`${file}: missing current documentation`);
    continue;
  }
  const content = readFileSync(file, "utf8");
  // Report only file and category; never print the matching secret.
  const rules = [
    ["credential-bearing URL", /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|https?):\/\/[^\s/]+:[^\s/@]+@/i],
    ["private key", /\bprivate[_ -]?key[\s"'`]*[:=]?[\s"'`]*0x[a-f\d]{64}\b/i],
    ["operational credential assignment", /\b(?:DATABASE_URL|JWT_SECRET|(?:\w*_)?PRIVATE_KEY)\s*=\s*["']?[^\s"'`]+/],
    ["unverified pitch link", /youtu\.be\/kinetix-pitch-demo|pitch\.com\/v\/kinetix-unihack-deck/i],
    ["misleading security claim", /hardware.enforced|8(?:\.0)?%\s+(?:real|live)\s+APY/i],
    ["invalid Unicode", /\uFFFD/],
  ];
  for (const [category, pattern] of rules) {
    if (pattern.test(content)) failures.push(`${file}: ${category}`);
  }
  for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1].split("#")[0];
    if (!target || /^[a-z]+:/i.test(target)) continue;
    if (!existsSync(resolve(dirname(file), target))) {
      failures.push(`${file}: broken local documentation link`);
    }
  }
}
const deployment = JSON.parse(readFileSync("shared/deployment.json", "utf8"));
if (deployment.mode !== "single-chain" || deployment.features.erc20 ||
    deployment.features.crossChain || deployment.features.yield || deployment.features.relayer) {
  failures.push("T1 feature policy changed: review current public documentation before activation");
}
if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
} else {
  console.log(`Public documentation checks passed (${files.length} current references).`);
}
