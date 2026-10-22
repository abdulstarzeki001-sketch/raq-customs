#!/usr/bin/env node
/**
 * Verify that the configured API token can access the exact Pages project.
 * This never prints or persists the token; run before Wrangler uploads assets.
 */
import { appendFile } from "node:fs/promises";

const token = (process.env.CLOUDFLARE_API_TOKEN || "").trim();
const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
const projectName = "iraq-customs";

async function stop(message) {
  const safeMessage = message.replace(/[\r\n]/g, " ");
  console.error(`::error title=Cloudflare Pages deployment::${safeMessage}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `## Cloudflare: deployment blocked\n\n${safeMessage}\n`);
  }
  process.exitCode = 1;
}

if (!token) {
  await stop("Missing CLOUDFLARE_PAGES_TOKEN or CLOUDFLARE_API_TOKEN repository secret. No deployment attempted.");
} else if (!/^[a-f\d]{32}$/i.test(accountId)) {
  await stop("CLOUDFLARE_ACCOUNT_ID is missing or invalid. Copy the 32-character Account ID from the Pages project account.");
} else {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}`;
  try {
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(20000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success !== true) {
      const codes = Array.isArray(payload.errors)
        ? payload.errors.map((entry) => Number(entry.code)).filter(Number.isFinite)
        : [];
      const codeText = codes.length ? ` (API error codes: ${codes.join(", ")})` : "";
      if (response.status === 401 || response.status === 403 || codes.includes(10000)) {
        await stop(`Cloudflare denied project access (HTTP ${response.status})${codeText}. Create a Cloudflare API token with Account > Cloudflare Pages > Edit, scope Account Resources to the account containing iraq-customs, then replace the GitHub repository secret. No deployment attempted.`);
      } else if (response.status === 404) {
        await stop(`Pages project ${projectName} was not found in account ${accountId}. Verify the Pages project name and CLOUDFLARE_ACCOUNT_ID. No deployment attempted.`);
      } else {
        await stop(`Cloudflare Pages project lookup failed (HTTP ${response.status})${codeText}. Check Cloudflare API status and token/account permissions. No deployment attempted.`);
      }
    } else {
      console.log(`Cloudflare Pages access verified: project ${projectName} in configured account. Proceeding with Wrangler deployment.`);
    }
  } catch (error) {
    await stop(`Unable to verify Cloudflare Pages project access: ${error instanceof Error ? error.name : "network failure"}. No deployment attempted.`);
  }
}
