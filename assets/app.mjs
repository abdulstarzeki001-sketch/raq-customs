import {KEY,nameKey,toCents,usd,esc,empty,checked,addDocument,addReceipt,changeStatus,statement} from "../lib/model.mjs";

const byId=id=>document.getElementById(id);
const money=n=>usd(n);
const stamp=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");};
const uniqueId=()=>globalThis.crypto?.randomUUID?.() || "r_"+Date.now()+"_"+Math.random().toString(36).slice(2);
let db=empty(), companies=[], toastTimer;
function load(){
  try {const raw=localStorage.getItem(KEY);db=raw?checked(JSON.parse(raw)):empty();}
  catch(e){db=empty();notice("تعذر قراءة البيانات القديمة، لم يتم استبدالها. صدّرها من المتصفح قبل التعديل.",true);}
}
function notice(message,error=false){
  const el=byId("toast");el.textContent=message;el.className="show"+(error?" error":"");
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.className="",4500);
}
function saveChange(change){
  const snapshot=JSON.stringify(db);
  try {
    const result=change();
    localStorage.setItem(KEY,JSON.stringify(db));
    render();
    return result;
  } catch(e) {
    db=JSON.parse(snapshot);
    notice(e.message||"تعذر الحفظ على الجهاز",true);
    return null;
  }
}
function switchTab(tab){
  if(!byId(tab))return;
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===tab));
  document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
  window.scrollTo({top:0,behavior:"auto"});
}
function rowTable(headers,rows){
  if(!rows.length)return '<div class="empty">لا توجد بيانات بعد</div>';
  return '<table><thead><tr>'+headers.map(s=>"<th>"+esc(s)+"</th>").join("")+"</tr></thead><tbody>"+rows.join("")+"</tbody></table>";
}
function cell(v,css=""){return '<td'+(css?' class="'+css+'"':"")+">"+esc(v)+"</td>";}
function btn(action,id,label,css=""){
  return '<button type="button" class="row-btn '+css+'" data-action="'+esc(action)+'" data-id="'+esc(id)+'">'+esc(label)+"</button>";
}
function uniqueNames(records,key){return [...new Set(records.map(x=>String(x[key]||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"ar"));}
function optionList(el,values,first){
  if(!el)return;
  const selected=el.value;
  el.innerHTML='<option value="">'+esc(first)+"</option>"+values.map(x=>'<option value="'+esc(x)+'">'+esc(x)+"</option>").join("");
  if(values.includes(selected))el.value=selected;
}
function renderDatalists(){
  byId("companyChoices").innerHTML=companies.map(c=>'<option value="'+esc(c.CompanyNameProject)+'"></option>').join("");
  const traders=uniqueNames(db.traders.concat(db.documents,db.receipts),"name").concat(uniqueNames(db.documents.concat(db.receipts),"trader"));
  byId("traderChoices").innerHTML=[...new Set(traders)].map(x=>'<option value="'+esc(x)+'"></option>').join("");
  byId("driverChoices").innerHTML=db.drivers.map(x=>'<option value="'+esc(x.name)+'"></option>').join("");
}
function renderHome(){
  const stats=statement(db);
  byId("homeDocCount").textContent=String(db.documents.filter(x=>x.status==="active").length);
  byId("homeDebit").textContent=money(stats.debit);
  byId("homeCredit").textContent=money(stats.credit);
  byId("homeBalance").textContent=money(stats.balance);
  const recent=db.documents.filter(x=>x.status==="active").slice(0,8);
  byId("homeRecent").innerHTML=rowTable(["التاريخ","الرقم","الشركة","السائق","المبلغ"],recent.map(x=>"<tr>"+cell(x.date)+cell(x.number)+cell(x.company)+cell(x.driver)+cell(money(x.amount),"number")+"</tr>"));
}
function renderCompanies(){
  const q=nameKey(byId("companySearch").value);
  const filtered=companies.filter(c=>[c.CompanyNameProject,c.Number,c.LicenseApprovalNumber,c.Brand].some(v=>nameKey(v).includes(q))).slice(0,25);
  byId("companiesCount").textContent=companies.length+" شركة ضمن الدليل العام";
  byId("companyList").innerHTML=filtered.map(c=>'<div class="company-item"><div><strong>'+esc(c.CompanyNameProject)+'</strong><small>رقم الشركة: '+esc(c.Number)+' | رقم الإجازة: '+esc(c.LicenseApprovalNumber||"—")+'</small></div>'+btn("choose-company",String(c.Number),"اختيار")+"</div>").join("")||'<div class="empty">لا توجد نتائج مطابقة</div>';
}
function renderDocuments(){
 const docs=db.documents;
 byId("documentList").innerHTML=rowTable(["التاريخ","الوثيقة","الشركة","التاجر","السائق / السيارة","المبلغ","الحالة","إجراء"],docs.map(x=>{
   const deleted=x.status==="deleted";
   return "<tr>"+cell(x.date)+cell(x.number)+cell(x.company)+cell(x.trader)+cell(x.driver+" / "+x.plate)+cell(money(x.amount),"number")+cell(deleted?"في السلة":"نشطة")+'<td>'+btn("print-document",x.id,"طباعة")+" "+btn(deleted?"restore-doc":"delete-doc",x.id,deleted?"استرجاع":"إلى السلة",deleted?"":"delete")+"</td></tr>";
 }));
}
function renderLedger(){
 const traderNames=[...new Set([...db.traders.map(x=>x.name),...db.documents.map(x=>x.trader),...db.receipts.map(x=>x.trader)])].filter(Boolean).sort((a,b)=>a.localeCompare(b,"ar"));
 const companyNames=uniqueNames([...db.documents,...db.receipts],"company");
 optionList(byId("ledgerTrader"),traderNames,"كل التجار");
 optionList(byId("ledgerCompany"),companyNames,"كل الشركات");
 const st=statement(db,{trader:byId("ledgerTrader").value,company:byId("ledgerCompany").value});
 byId("ledgerDebit").textContent=money(st.debit);byId("ledgerCredit").textContent=money(st.credit);byId("ledgerBalance").textContent=money(st.balance);
 byId("ledgerRows").innerHTML=rowTable(["التاريخ","النوع","المرجع","التاجر","الشركة","مدين","دائن","الرصيد","إجراء"],st.rows.map(r=>{
  const x=r.item;const kind=r.type==="document"?"doc":"receipt";
  return "<tr>"+cell(r.date)+cell(kind==="doc"?"وثيقة":"قبض")+cell(kind==="doc"?x.number:x.reference||"—")+cell(x.trader)+cell(x.company||"—")+cell(r.debit?money(r.debit):kind==="doc"?"0.00 $":"—","number")+cell(r.credit?money(r.credit):"—","number")+cell(money(r.balance),"number")+'<td>'+btn("delete-"+kind,x.id,"إلى السلة","delete")+"</td></tr>";
 }));
}
function renderDrivers(){
 byId("driverCount").textContent=db.drivers.length+" سائق";
 byId("driversList").innerHTML=rowTable(["اسم السائق","رقم السيارة","محافظة التسجيل","إجراء"],db.drivers.map(x=>"<tr>"+cell(x.name)+cell(x.plate)+cell(x.governorate||"—")+'<td>'+btn("delete-driver",x.id,"حذف","delete")+"</td></tr>"));
}
function render(){renderDatalists();renderHome();renderCompanies();renderDocuments();renderLedger();renderDrivers();renderTrash();}
function formValues(form){return Object.fromEntries(new FormData(form).entries());}
function readQrImage(file){
 if(!file)return Promise.resolve("");
 if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>200000) return Promise.reject(Error("يجب أن تكون صورة QR من نوع PNG أو JPG أو WebP وبحجم لا يزيد عن 200KB."));
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(String(reader.result||""));
  reader.onerror=()=>reject(Error("تعذر قراءة صورة QR"));
  reader.readAsDataURL(file);
 });
}
function registerForms(){
 byId("documentForm").addEventListener("submit",async ev=>{
  ev.preventDefault();const form=ev.currentTarget;
  const values=formValues(form);
  try {values.qrImage=await readQrImage(form.elements.qrFile.files?.[0]);}
  catch(e){notice(e.message,true);return;}
  const record=saveChange(()=>addDocument(db,values,uniqueId()));
  if(record){form.reset();form.elements.date.value=stamp();form.elements.amount.value="0";notice("تم تسجيل الوثيقة في السجل الجديد");}
 });
 byId("receiptForm").addEventListener("submit",ev=>{
  ev.preventDefault();const form=ev.currentTarget;
  const record=saveChange(()=>addReceipt(db,formValues(form),uniqueId()));
  if(record){form.reset();form.elements.date.value=stamp();notice("تم تسجيل حركة القبض");}
 });
 byId("traderForm").addEventListener("submit",ev=>{
  ev.preventDefault();const form=ev.currentTarget;const name=form.elements.name.value.trim();
  const result=saveChange(()=>{
   if(!name)throw Error("أدخل اسم التاجر");
   if(db.traders.some(x=>nameKey(x.name)===nameKey(name)))throw Error("التاجر موجود بالفعل");
   db.traders.push({id:uniqueId(),name});return true;
  });
  if(result){form.reset();notice("تمت إضافة التاجر");}
 });
 byId("driverForm").addEventListener("submit",ev=>{
  ev.preventDefault();const form=ev.currentTarget,v=formValues(form);
  const result=saveChange(()=>{
    if(!String(v.name).trim()||!String(v.plate).trim())throw Error("الاسم ورقم السيارة مطلوبان");
    if(db.drivers.some(x=>nameKey(x.name)===nameKey(v.name)&&nameKey(x.plate)===nameKey(v.plate)))throw Error("السائق والسيارة مسجلان");
    db.drivers.push({id:uniqueId(),name:v.name.trim(),plate:v.plate.trim(),governorate:v.governorate.trim()});return true;
  });
  if(result){form.reset();notice("تمت إضافة السائق");}
 });
 const form=byId("documentForm");
 form.elements.driver.addEventListener("change",()=>{
  const d=db.drivers.find(x=>nameKey(x.name)===nameKey(form.elements.driver.value));
  if(d&&!form.elements.plate.value)form.elements.plate.value=d.plate;
 });
}
function printable(title,sub,heads,rows,qrImage=""){
  const qr=/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(qrImage) && qrImage.length<280000 ? '<p><img alt="رمز QR مرفق" class="print-qr" src="'+esc(qrImage)+'"></p>' : "";
  byId("printArea").innerHTML='<div class="print-sheet"><h1>'+esc(title)+'</h1><p>'+esc(sub)+'</p><hr>'+rowTable(heads,rows)+qr+"<p>تاريخ الطباعة: "+esc(new Date().toLocaleString("ar-IQ"))+"</p><small>سجل خاص بالشركة وليس وثيقة صادرة عن جهة حكومية.</small></div>";
  const image=byId("printArea").querySelector("img");
  if(image&&image.decode){image.decode().catch(()=>{}).finally(()=>window.print());}
  else window.print();
}
function printDoc(id){
 const x=db.documents.find(d=>d.id===id);if(!x)return;
 printable("وثيقة حمولة داخلية","رقم الوثيقة: "+x.number,["الحقل","البيان"],[
  ["رقم الوثيقة",x.number],["التاريخ",x.date],["الشركة",x.company],["التاجر",x.trader],["السائق",x.driver],["السيارة",x.plate],["الوجهة",x.destination],["الحمولة",x.cargo],["المبلغ",money(x.amount)]
 ].map(pair=>"<tr>"+cell(pair[0])+cell(pair[1])+"</tr>"),x.qrImage||"");
}
function handleAction(action,id){
 const kind=action.includes("receipt")?"receipts":"documents";
 if(action==="print-document"){printDoc(id);return;}
 if(action==="choose-company"){
  const item=companies.find(x=>String(x.Number)===id);
  if(!item)return;
  const form=byId("documentForm");
  form.elements.company.value=item.CompanyNameProject;
  if(item.CargoDetails)form.elements.cargo.value=item.CargoDetails;
  switchTab("documents");notice("تم اختيار الشركة");return;
 }
 if(action==="delete-driver"){
  if(!confirm("حذف هذا السائق من الدليل؟ لن يتم حذف الوثائق السابقة."))return;
  saveChange(()=>{db.drivers=db.drivers.filter(x=>x.id!==id);return true;});return;
 }
 if(action.startsWith("delete-")&&!confirm("نقل السجل إلى السلة؟ يمكن استرجاعه من الإعدادات."))return;
 const status=action.startsWith("restore")?"active":"deleted";
 if(saveChange(()=>changeStatus(db,kind,id,status)))notice(status==="active"?"تم الاسترجاع":"تم نقل السجل إلى السلة");
}
function exportData(){
 const data=JSON.stringify(db,null,2),blob=new Blob([data],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="transport-office-backup-"+stamp()+".json";
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
}
function renderTrash(){
 const panel=byId("trashList");
 if(!panel)return;
 const all=[...db.documents.filter(x=>x.status==="deleted").map(x=>({kind:"doc",id:x.id,name:x.company+" — "+x.number})),...db.receipts.filter(x=>x.status==="deleted").map(x=>({kind:"receipt",id:x.id,name:x.trader+" — "+money(x.amount)}))];
 panel.innerHTML=all.map(x=>'<div class="company-item"><span>'+esc(x.name)+'</span>'+btn("restore-"+x.kind,x.id,"استرجاع")+"</div>").join("")||'<div class="empty">السلة فارغة</div>';
}
async function importData(file){
 if(!file||file.size>8e6){notice("الملف كبير أو غير صالح",true);return;}
 try{
  const newDb=checked(JSON.parse(await file.text()));
  if(!confirm("استبدال كل بيانات البرنامج الجديد بهذه النسخة؟"))return;
  localStorage.setItem(KEY,JSON.stringify(newDb));db=newDb;render();renderTrash();notice("تم استيراد النسخة");
 }catch(e){notice(e.message||"تعذر الاستيراد",true);}
}
function bind(){
 document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>{switchTab(b.dataset.tab);if(b.dataset.tab==="settings")renderTrash();}));
 document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.go)));
 byId("companySearch").addEventListener("input",renderCompanies);
 for(const id of ["ledgerTrader","ledgerCompany"])byId(id).addEventListener("change",renderLedger);
 byId("main").addEventListener("click",ev=>{const target=ev.target.closest("[data-action]");if(target)handleAction(target.dataset.action,target.dataset.id);});
 byId("printLedger").addEventListener("click",()=>{
  const tr=byId("ledgerTrader").value,co=byId("ledgerCompany").value;
  const st=statement(db,{trader:tr,company:co});
  const rows=st.rows.map(r=>"<tr>"+cell(r.date)+cell(r.type==="document"?"وثيقة":"قبض")+cell(r.item.trader)+cell(r.item.company||"—")+cell(r.debit?money(r.debit):"—")+cell(r.credit?money(r.credit):"—")+cell(money(r.balance))+"</tr>");
  rows.push('<tr><th colspan="4">المجموع</th>'+cell(money(st.debit))+cell(money(st.credit))+cell(money(st.balance))+"</tr>");
  printable("كشف حساب داخلي","التاجر: "+(tr||"الكل")+" | الشركة: "+(co||"الكل"),["التاريخ","النوع","التاجر","الشركة","مدين","دائن","الرصيد"],rows);
 });
 byId("exportData").addEventListener("click",exportData);
 byId("importData").addEventListener("change",ev=>{importData(ev.target.files?.[0]);ev.target.value="";});
 byId("clearAll").addEventListener("click",()=>{
  if(prompt("لمسح بيانات البرنامج الجديد على هذا الجهاز، اكتب كلمة حذف")==="حذف"){
   localStorage.removeItem(KEY);db=empty();render();renderTrash();notice("تمت إعادة ضبط البرنامج الجديد");
  }
 });
 registerForms();
}
async function init(){
 load();for(const form of ["documentForm","receiptForm"])byId(form).elements.date.value=stamp();
 bind();
 try{
  const r=await fetch("./data/companies.json",{cache:"force-cache"});
  if(!r.ok)throw Error("HTTP "+r.status);
  const data=await r.json();if(!Array.isArray(data))throw Error("قائمة غير صحيحة");
  companies=data;
 }catch(e){notice("تعذر تحميل دليل الشركات: "+e.message,true);}
 render();renderTrash();
 byId("clock").textContent=new Date().toLocaleDateString("ar-IQ");
}
init();
