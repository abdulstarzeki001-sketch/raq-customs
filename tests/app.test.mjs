import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {spawnSync} from "node:child_process";
import {KEY,empty,toCents,usd,checked,addDocument,addReceipt,statement,changeStatus,esc} from "../lib/model.mjs";
const root=new URL("../",import.meta.url);
const file=path=>fs.readFileSync(new URL(path,root),"utf8");
const doc=(number="100",company="Factory A",trader="Ahmed",amount="0")=>({number,company,trader,date:"2026-10-13",driver:"Ali",plate:"21212",destination:"بغداد",amount});
const payment=(company="",amount="200")=>({trader:"Ahmed",company,date:"2026-10-13",amount,reference:"P1"});
test("v2 starts with completely empty finances",()=>{
 const db=empty();assert.equal(db.version,2);assert.equal(db.documents.length,0);assert.equal(db.receipts.length,0);assert.equal(statement(db).balance,0);assert.equal(KEY,"transport_office_v2_local");
});
test("USD parser handles Arabic and western thousands without losing magnitude",()=>{
 assert.equal(toCents("0"),0);assert.equal(toCents("١٬٥٠٠٫٢٥"),150025);assert.equal(toCents("1,500.25"),150025);
 assert.equal(toCents("1.500,25"),150025);assert.equal(toCents("0.01"),1);assert.equal(toCents("1000"),100000);
 for(const bad of ["","abc","1,50,0","-5","1.2345"])assert.throws(()=>toCents(bad));
});
test("documents with $0 count as records and duplicate numbers are rejected",()=>{
 const db=empty();const saved=addDocument(db,doc(),"d1");assert.equal(saved.amount,0);
 assert.equal(db.documents.length,1);assert.equal(statement(db).debit,0);
 assert.throws(()=>addDocument(db,doc(),"d2"));assert.equal(db.documents.length,1);
});
test("receipt and selected company calculations do not cross-charge traders",()=>{
 const db=empty();addDocument(db,doc("11","Factory A","Ahmed","100"),"d1");
 addDocument(db,doc("12","Factory B","Ahmed","500"),"d2");
 addDocument(db,doc("13","Factory A","Sara","400"),"d3");
 addReceipt(db,payment("Factory A","40"),"p1");addReceipt(db,payment("","80"),"p2");
 assert.equal(statement(db).balance,88000);
 const scoped=statement(db,{trader:"Ahmed",company:"Factory A"});
 assert.equal(scoped.debit,10000);assert.equal(scoped.credit,4000);assert.equal(scoped.balance,6000);
 assert.equal(scoped.rows.length,2);
});
test("soft delete can restore receipt and document without losing history",()=>{
 const db=empty();addDocument(db,doc("91","A","Ahmed","30"),"d1");addReceipt(db,payment("A","10"),"p1");
 assert.equal(statement(db).balance,2000);
 changeStatus(db,"receipts","p1","deleted");assert.equal(statement(db).balance,3000);
 changeStatus(db,"receipts","p1","active");assert.equal(statement(db).balance,2000);
 changeStatus(db,"documents","d1","deleted");assert.equal(statement(db).balance,-1000);
 changeStatus(db,"documents","d1","active");assert.equal(statement(db).balance,2000);
});
test("backup validation rejects invalid financial amounts and wrong schema",()=>{
 const db=empty();addDocument(db,doc(),"d1");
 assert.equal(checked(JSON.parse(JSON.stringify(db))).documents.length,1);
 assert.throws(()=>checked({version:1,documents:[],receipts:[],drivers:[],traders:[]}));
 const fake=structuredClone(db);fake.documents[0].amount=-100;assert.throws(()=>checked(fake));
});
test("user names are escaped when rendering",()=>{
 assert.equal(esc('<img src=x onerror="evil()">'),'&lt;img src=x onerror=&quot;evil()&quot;&gt;');
});
test("all frontend imports and assets exist",()=>{
 const html=file("index.html");
 for(const match of html.matchAll(/(?:href|src)="\.\/([^"]+)"/g))assert.ok(fs.existsSync(new URL(match[1],root)),match[1]);
 for(const match of file("assets/app.mjs").matchAll(/from ["']\.\.\/([^"']+)["']/g))assert.ok(fs.existsSync(new URL(match[1],root)),match[1]);
 assert.match(html,/id="trashList"/);
});
test("JavaScript modules pass syntax check",()=>{
 for(const item of ["assets/app.mjs","lib/model.mjs"]){
  const run=spawnSync(process.execPath,["--check",new URL(item,root).pathname],{encoding:"utf8"});
  assert.equal(run.status,0,run.stderr);
 }
});
test("no legacy cloud sync token or external scripts",()=>{
 const html=file("index.html"),app=file("assets/app.mjs"),model=file("lib/model.mjs");
 assert.doesNotMatch(html,/<script[^>]+https?:\/\//i);
 assert.doesNotMatch(html+app+model,/X-Sync-Token|SYNC_TOKEN|api\/data\/|70525cc3f68b080d085da561681b7029b91a390fa677493e/);
});
