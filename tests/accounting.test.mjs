import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
const source=readFileSync(new URL("../js/storage.js",import.meta.url),"utf8");
function harness(initial={}){
  const store=new Map(Object.entries(initial).map(([k,v])=>[k,JSON.stringify(v)]));
  const localStorage={
    setItem(k,v){store.set(k,String(v));},
    getItem(k){return store.has(k)?store.get(k):null;},
    removeItem(k){store.delete(k);}
  };
  const C={
    STORAGE_KEY:"doc",DRAFT_STORAGE_KEY:"draft",DRIVER_STORAGE_KEY:"drivers",
    TRADERS_STORAGE_KEY:"traders",TRADER_LEDGER_KEY:"ledger",TRADER_PAYMENT_KEY:"payments",
    SELECTED_COMPANY_KEY:"selected",DEFAULT_DRIVERS:[],DEFAULTS:{}
  };
  const App={constants:C,utils:{
    normalizeSearchText(v){return String(v??"").trim().toLowerCase();},
    showStatus(){},
  },sync:{push(){}}};
  const sandbox={window:{App},App,localStorage,console,Date,Math,Number,JSON,Set,String,Object};
  runInNewContext(source,sandbox);
  return {storage:sandbox.window.App.storage,store,localStorage};
}
const document=(amount,id="9001")=>({
   trader_name:"Trader",company_name_project:"Factory",driver_name:"Driver",
   destination_governorate:"بغداد",doc_id:id,date_str:"2026-10-13",document_value_usd:amount
});
const payment=(amount=100)=>({
  trader_name:"Trader",payment_date:"2026-10-13",payment_type:"receipt",amount
});
test("zero-dollar documents are saved and do not count as debt",()=>{
  const {storage,store}=harness();
  assert.equal(storage.saveTraderTransaction(document("0")),true);
  assert.equal(storage.getTraderLedger().length,1);
  assert.equal(storage.getTraderLedger()[0].document_value_usd,"0.00");
  assert.equal(storage.saveTraderTransaction(document("")),false);
  assert.equal(storage.saveTraderTransaction(document("-10")),false);
  assert.equal(JSON.parse(store.get("ledger")).length,1);
});
test("payments go to trash, are excluded from totals, then restore",()=>{
  const {storage}=harness();
  assert.equal(storage.saveTraderPayment(payment(150)),true);
  const [p]=storage.getTraderPayments();
  assert.equal(storage.deleteTraderPayment(p.id),true);
  assert.equal(storage.getTraderPayments().length,0);
  assert.equal(storage.getDeletedTraderPayments().length,1);
  assert.equal(storage.restoreTraderPayment(p.id),true);
  assert.equal(storage.getDeletedTraderPayments().length,0);
  assert.equal(storage.getTraderPayments().length,1);
  assert.equal(storage.deleteTraderPayment("missing"),false);
});
test("adding a new receipt does not erase trashed receipts",()=>{
  const {storage}=harness();
  storage.saveTraderPayment(payment(100));
  const id=storage.getTraderPayments()[0].id;
  storage.deleteTraderPayment(id);
  storage.saveTraderPayment(payment(300));
  assert.equal(storage.getDeletedTraderPayments()[0].id,id);
  assert.equal(storage.getTraderPayments().length,1);
});
test("traders with active or archived accounting history cannot be deleted",()=>{
  const {storage}=harness();
  storage.saveTraderTransaction(document("0"));
  assert.equal(storage.deleteTrader("Trader"),false);
  const {storage:other}=harness();
  other.saveTraderPayment(payment());
  const id=other.getTraderPayments()[0].id;
  other.deleteTraderPayment(id);
  assert.equal(other.deleteTrader("Trader"),false);
  const {storage:empty}=harness();
  empty.saveTrader("Unused");
  assert.equal(empty.deleteTrader("Unused"),true);
});
test("saving at capacity never discards old ledger rows",()=>{
  const initial=Array.from({length:5000},(_,i)=>({trader_name:"Trader",doc_id:String(i),date_str:"2026-10-01",document_value_usd:"1.00"}));
  const {storage,store}=harness({ledger:initial});
  assert.equal(storage.saveTraderTransaction(document("5","new")),false);
  const remaining=JSON.parse(store.get("ledger"));
  assert.equal(remaining.length,5000);
  assert.equal(remaining[4999].doc_id,"4999");
});
test("saving at capacity never discards old receipts",()=>{
  const initial=Array.from({length:5000},(_,i)=>({id:"p"+i,trader_name:"Trader",amount:"1.00"}));
  const {storage,store}=harness({payments:initial});
  assert.equal(storage.saveTraderPayment(payment()),false);
  assert.equal(JSON.parse(store.get("payments")).length,5000);
});

import { runInNewContext as runSource } from "node:vm";
import { readFileSync as readSource } from "node:fs";
test("money parser does not silently turn 1,500 into 1.5",()=>{
  const source=readSource(new URL("../js/traders-page.js", import.meta.url),"utf8");
  const App={utils:{normalizeDigits(v){return String(v).replace(/[٠-٩]/g,d=>String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));}}};
  runSource(source,{window:{App},App,Number,String,NaN});
  const parse=App.tradersPage.normalizeAmount;
  assert.equal(parse("1,500"),1500);
  assert.equal(parse("1,500.25"),1500.25);
  assert.equal(parse("1.500,25"),1500.25);
  assert.equal(parse("١٬٥٠٠٫٢٥"),1500.25);
  assert.equal(parse("0.50"),0.5);
  assert.ok(Number.isNaN(parse("1,50,0")));
  assert.ok(Number.isNaN(parse("1.2345")));
  assert.ok(Number.isNaN(parse("hello")));
});
