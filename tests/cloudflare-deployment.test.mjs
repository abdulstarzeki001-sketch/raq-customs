import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const preflight = "scripts/check-cloudflare-pages.mjs";

function checkWithEnv(overrides) {
  return spawnSync(process.execPath, [preflight], {
    encoding: "utf8",
    timeout: 10000,
    env: {
      ...process.env,
      CLOUDFLARE_API_TOKEN: "",
      CLOUDFLARE_ACCOUNT_ID: "",
      GITHUB_STEP_SUMMARY: "",
      ...overrides,
    },
  });
}

test("Cloudflare deploy preflight refuses missing API token without contacting the API", () => {
  const result = checkWithEnv({ CLOUDFLARE_API_TOKEN: "" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing CLOUDFLARE_PAGES_TOKEN/);
});

test("Cloudflare deploy preflight rejects invalid account ID without printing API token", () => {
  const secret = "secret-only-for-test-do-not-print";
  const result = checkWithEnv({
    CLOUDFLARE_API_TOKEN: secret,
    CLOUDFLARE_ACCOUNT_ID: "wrong-id",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /CLOUDFLARE_ACCOUNT_ID is missing or invalid/);
  assert.ok(!result.stderr.includes(secret));
  assert.ok(!result.stdout.includes(secret));
});

for (const workflow of ["deploy-pages.yml", "package-deploy.yml"]) {
  test(`${workflow} verifies Cloudflare access before publishing`, () => {
    const yaml = readFileSync(`.github/workflows/${workflow}`, "utf8");
    assert.match(yaml, /secrets\.CLOUDFLARE_PAGES_TOKEN \|\| secrets\.CLOUDFLARE_API_TOKEN/);
    assert.match(yaml, /CLOUDFLARE_ACCOUNT_ID: d45cb55f3d7654fc0eee90ca0e844378/);
    const verify = yaml.indexOf("run: node scripts/check-cloudflare-pages.mjs");
    const deploy = yaml.indexOf("wrangler@4 pages deploy");
    assert.ok(verify > 0 && deploy > verify);
  });
}
