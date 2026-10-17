import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = name => fs.readFileSync(path.join(root, name), "utf8");

test("document PDF uses same-tab print on iOS without popup or immediate close", () => {
  const code = read("js/document-page.js");
  const page = read("document.html");
  assert.match(page, /id="downloadPdfBtn"/);
  assert.match(page, /href="\.\/css\/print-document\.css"/);
  assert.match(code, /pdfBtn\.addEventListener\("click", \(\) => this\.downloadPdf\(\)\)/);
  assert.match(code, /printLikeOriginal\(\)\s*\{[\s\S]*?window\.print\(\)/);
  assert.doesNotMatch(code, /window\.open\("", "_blank"/);
  assert.doesNotMatch(code, /win\.close\(\)/);
});

test("document PDF never clamps its content to one A4 sheet", () => {
  const css = read("css/print-document.css");
  assert.match(css, /@page \{\s*size:\s*A4 portrait;/);
  assert.match(css, /#documentPage\.a4-page[\s\S]*?height: auto !important;/);
  assert.match(css, /#documentPage\.a4-page[\s\S]*?overflow: visible !important;/);
  assert.match(css, /\.badge-internal\s*\{[\s\S]*?display: block !important;/);
  assert.match(css, /page-break-inside: avoid/);
});

test("ledger PDF prints the desktop table across pages with repeating headers", () => {
  const css = read("css/print-ledger.css");
  const html = read("traders.html");
  assert.match(html, /href="\.\/css\/print-ledger\.css"/);
  assert.match(html, /class="card overflow-hidden ledger-print-card"/);
  assert.match(css, /@page \{\s*size:\s*A4 landscape;/);
  assert.match(css, /thead\s*\{\s*display: table-header-group !important;/);
  assert.match(css, /break-inside: avoid !important;/);
  assert.match(css, /#tradersPage \.mobile-ledger-cards/);
  assert.match(css, /#tradersPage \.ledger-print-card/);
});

test("QR follows variable-height products table without absolute positioning or extra padding", () => {
  const html = read("document.html");
  const css = read("css/print-document.css");
  assert.match(html, /class="doc-grid items-table" id="itemsTable"/);
  assert.match(html, /class="verification-tail" id="verificationTail"/);
  assert.match(html, /class="qr-notes" id="qrNotes"/);
  assert.match(html, /https:\/\/ur\.gov\.iq\//);
  assert.match(css, /--document-table-to-qr:\s*2\.518mm;/);
  assert.match(css, /--document-qr-to-notes:\s*1\.150mm;/);
  assert.match(css, /--document-qr-width:\s*33\.425544mm;/);
  assert.match(css, /--document-qr-height:\s*33\.196596mm;/);
  assert.match(css, /#documentPage \.qr-zone\s*\{[\s\S]*?padding:\s*0 !important;/);
  assert.match(css, /#documentPage \.qr-notes\s*\{[\s\S]*?margin:\s*var\(--document-qr-to-notes\) 0 0 !important;/);
  assert.match(css, /#documentPage \.verification-tail\s*\{[\s\S]*?margin:\s*var\(--document-table-to-qr\) 0 0 !important;/);
});

test("long shipment descriptions push QR down through natural flow with exact gaps", () => {
  const page = read("document.html");
  const css = read("css/print-document.css");
  const wrapper = page.indexOf('class="document-end-block" id="documentEndBlock"');
  const table = page.indexOf('class="doc-grid items-table" id="itemsTable"');
  const tail = page.indexOf('class="verification-tail" id="verificationTail"');
  const notes = page.indexOf('class="qr-notes" id="qrNotes"');
  assert.ok(wrapper >= 0 && wrapper < table && table < tail && tail < notes);
  assert.match(css, /#documentPage\.a4-page\s*\{[\s\S]*?display: block !important;/);
  assert.match(css, /#documentPage \.doc-grid\.items-table\s*\{[\s\S]*?height: auto !important;/);
  assert.match(css, /#documentPage \.verification-tail\s*\{[\s\S]*?margin-top: var\(--document-table-to-qr\) !important;/);
  assert.match(css, /#documentPage \.qr-notes\s*\{[\s\S]*?margin-top: var\(--document-qr-to-notes\) !important;/);
  assert.match(css, /#documentPage \.verification-tail\s*\{[\s\S]*?break-before: avoid-page !important;/);
});
