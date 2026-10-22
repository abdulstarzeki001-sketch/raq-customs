import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = name => fs.readFileSync(path.join(root, name), "utf8");

test("shipment preview mirrors supplied header, metadata, subject and product structure", () => {
  const html = read("document.html");
  assert.match(html, /class="header-clean"/);
  assert.match(html, /class="header-right"/);
  assert.match(html, /class="header-center logo-wrap"/);
  assert.match(html, /class="header-left"/);
  assert.match(html, /class="doc-meta"/);
  assert.match(html, /class="subject-row"/);
  assert.match(html, /class="doc-footer"/);
  assert.match(html, /id="itemsBody"/);
  assert.match(html, /id="qrArea"/);
  const keys = new Set([...html.matchAll(/data-out="([^"]+)"/g)].map(match => match[1]));
  for (const key of [
    "doc_id", "date_str", "time_str", "subject", "company_name_project",
    "license_approval_number", "license_approval_date", "driver_name",
    "vehicle_number", "destination_governorate", "cargo_typedetails",
    "weight_quantity", "registration_governorate"
  ]) assert.ok(keys.has(key), "missing data field: " + key);
});

test("the source-aligned document remains printable, nonofficial and self-contained", () => {
  const html = read("document.html");
  const css = read("css/document-source.css");
  const core = read("js/core.js");
  assert.match(html, /href="\.\/css\/document-source\.css"/);
  assert.match(html, /id="localOnlyNotice"/);
  assert.match(html, /ليست وثيقة رسمية/);
  assert.match(css, /@media print/);
  assert.match(css, /height: auto !important;/);
  assert.match(css, /overflow: visible !important;/);
  assert.doesNotMatch(html, /quickchart\.io|customs-uboor\.ur\.gov\.iq/);
  assert.match(core, /never send document data to external QR services/);
});

test("company search does not ship hard-coded owner identity or false approval", () => {
  const html = read("index.html");
  const js = read("js/index-page.js");
  assert.match(html, /class="portal-local-notice"/);
  assert.match(html, /id="hashCompanyResults"[^>]+role="region"/);
  assert.match(js, /<button type="button" class="company-result-row"/);
  assert.doesNotMatch(html, /gadeer@gmail\.com|شركة الغدير|شركة معتمدة|مسجلة ونشطة في النظام/);
  assert.match(html, /معلومات غير مصدّقة/);
});
