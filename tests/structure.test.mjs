import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const root = path.resolve(import.meta.dirname, "..");
const text = rel => fs.readFileSync(path.join(root,rel),"utf8");
const pages = ["index.html","form.html","traders.html","document.html"];

test("every recovered page exists and all local script and style links resolve", () => {
  for (const name of pages) {
    const body = text(name);
    assert.match(body, /<html/i, name);
    const resources = [...body.matchAll(/<(?:script|link)[^>]+(?:src|href)=["'](\.\/[^"'?#]+)/gi)].map(x=>x[1].replace(/^\.\//,""));
    for (const rel of resources) assert.ok(fs.existsSync(path.join(root,rel)), name+" references missing "+rel);
  }
});
test("JavaScript syntax is valid", () => {
  for(const filename of fs.readdirSync(path.join(root,"js")).filter(x=>x.endsWith(".js"))) {
    const proc = spawnSync(process.execPath,["--check",path.join(root,"js",filename)],{encoding:"utf8"});
    assert.equal(proc.status,0,filename+": "+proc.stderr);
  }
});
test("catalog has all 839 public company records",()=>{
  const records=JSON.parse(text("data/companies.json"));
  assert.equal(records.length,839);
  assert.ok(records.every(v=>v.CompanyNameProject && v.Number),"company fields");
});
test("no public sync token or seeded driver roster are shipped",()=>{
  for(const filename of fs.readdirSync(path.join(root,"js")).filter(x=>x.endsWith(".js"))){
    assert.doesNotMatch(text("js/"+filename),/X-Sync-Token|SYNC_TOKEN\s*=/,filename);
  }
  assert.match(text("js/core.js"),/DEFAULT_DRIVERS:\s*\[\s*\]/);
  assert.match(text("js/sync.js"),/local-only/);
});
test("financial deletion guard is installed on ledger page",()=>{
  assert.match(text("traders.html"),/js\/accounting-guard\.js/);
  assert.match(text("js/accounting-guard.js"),/restoreTraderPayment/);
});
