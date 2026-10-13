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


test("responsive Arabic admin UI has six tabs and restored legacy form fields",()=>{
 const html=file("index.html"),css=file("assets/atelier.css"),app=file("assets/app.mjs");
 assert.match(html,/lang="ar" dir="rtl"/);
 const sections=["home","companies","documents","ledger","drivers","settings"];
 for(const page of sections){
  assert.match(html,new RegExp('id="'+page+'"'),page);
  assert.match(html,new RegExp('data-tab="'+page+'"'),page);
 }
 for(const id of ["homeDocCount","homeDebit","homeCredit","homeBalance","companySearch","companyList","companiesCount","documentForm","documentList","ledgerTrader","ledgerCompany","ledgerRows","receiptForm","traderForm","traderDirectory","driverForm","driversList","exportData","importData","clearAll","trashList","companyMetaPreview","printArea"]){
  assert.match(html,new RegExp('id="'+id+'"'),id);
 }
 for(const field of ["number","date","time","subject","company","companyNumber","governorate","license","licenseDate","grantor","specialization","brand","trader","driver","plate","registrationGovernorate","checkpoint","destination","weight","unit","itemName","productionCapacity","cargo","qrReference","amount","qrFile"]){
  assert.match(html,new RegExp('name="'+field+'"'),field);
 }
 assert.match(html,/name="paymentType"/);
 assert.match(html,/name="note"/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
 assert.match(css,/@media print/);
 assert.match(app,/function fillCompanyMetadata/);
});
test("legacy company and cargo metadata are persisted in document records",()=>{
 const state=empty();
 const created=addDocument(state,{
  number:"120",date:"2026-10-13",time:"15:40",subject:"سجل نقل",
  company:"الشركة",companyNumber:"18",governorate:"دهوك",license:"13181",
  licenseDate:"2026-01-01",grantor:"المديرية",brand:"ستار",
  specialization:"صناعة",trader:"تاجر",driver:"سائق",plate:"3377",
  registrationGovernorate:"أربيل",checkpoint:"سيطرة",destination:"بغداد",
  weight:"12",unit:"طن",itemName:"كارتون",productionCapacity:"13400",
  cargo:"وصف",qrReference:"INTERNAL",amount:"0"
 },"new-doc");
 assert.equal(created.license,"13181");
 assert.equal(created.companyNumber,"18");
 assert.equal(created.time,"15:40");
 assert.equal(created.productionCapacity,"13400");
 assert.equal(created.qrReference,"INTERNAL");
 assert.equal(checked(JSON.parse(JSON.stringify(state))).documents[0].licenseDate,"2026-01-01");
});
test("receipts and settlements preserve type, notes and balances",()=>{
 const state=empty();
 addReceipt(state,{trader:"تاجر",date:"2026-10-13",amount:"100",paymentType:"settlement",reference:"1",note:"حوالة"},"r-set");
 addReceipt(state,{trader:"تاجر",date:"2026-10-13",amount:"50",paymentType:"receipt"},"r-rec");
 assert.equal(statement(state).credit,15000);
 assert.equal(state.receipts[0].paymentType,"receipt");
 assert.equal(state.receipts[1].paymentType,"settlement");
 assert.equal(state.receipts[1].note,"حوالة");
});
