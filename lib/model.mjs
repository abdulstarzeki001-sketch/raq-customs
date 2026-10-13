export const KEY="transport_office_v2_local";
export const nameKey=value=>String(value??"").trim().toLowerCase().replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي").replace(/\s+/g," ");
export function toCents(value){
  let x=String(value??"").trim().replace(/[٠-٩]/g,d=>String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/٫/g,".").replace(/٬/g,",");
  if(/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(x))x=x.replace(/,/g,"");
  else if(/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(x))x=x.replace(/\./g,"").replace(",",".");
  else if(/^\d+([.,]\d{1,2})?$/.test(x))x=x.replace(",",".");
  else throw Error("المبلغ غير صحيح");
  const [a,b=""]=x.split(".");
  const n=Number(a)*100+Number(b.padEnd(2,"0"));
  if(!Number.isSafeInteger(n)||n<0||n>1e13)throw Error("المبلغ خارج النطاق");
  return n;
}
export const usd=cents=>(Number(cents)/100).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})+" $";
export const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const empty=()=>({version:2,documents:[],receipts:[],drivers:[],traders:[],createdAt:new Date().toISOString()});
export function checked(data){
  if(!data||data.version!==2||!["documents","receipts","drivers","traders"].every(k=>Array.isArray(data[k])))throw Error("ملف البيانات غير متوافق");
  if(data.documents.length>20000||data.receipts.length>20000)throw Error("عدد السجلات كبير جداً");
  for(const entry of [...data.documents,...data.receipts]){
    if(typeof entry.id!=="string"||!Number.isSafeInteger(entry.amount)||entry.amount<0||!["active","deleted"].includes(entry.status))throw Error("سجل مالي غير صالح");
  }
  return {version:2,documents:data.documents,receipts:data.receipts,drivers:data.drivers,traders:data.traders,createdAt:String(data.createdAt||"")};
}
export function addDocument(db,input,id){
 const number=String(input.number||"").trim(),company=String(input.company||"").trim(),trader=String(input.trader||"").trim();
 const driver=String(input.driver||"").trim(),plate=String(input.plate||"").trim(),date=String(input.date||"").trim();
 if(!/^[0-9٠-٩]{1,30}$/.test(number)||!company||!trader||!driver||!plate||!date)throw Error("أكمل رقم الوثيقة والشركة والتاجر والسائق والسيارة والتاريخ");
 if(db.documents.some(d=>d.number===number&&nameKey(d.company)===nameKey(company)))throw Error("رقم الوثيقة مكرر لهذه الشركة");
 const entry={id,number,company,trader,driver,plate,date,destination:String(input.destination||""),cargo:String(input.cargo||"").slice(0,1000),qrImage:typeof input.qrImage==="string" && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(input.qrImage) && input.qrImage.length<280000 ? input.qrImage : "",amount:toCents(input.amount),status:"active"};
 db.documents.unshift(entry);
 if(!db.traders.some(t=>nameKey(t.name)===nameKey(trader)))db.traders.push({id:"auto_"+id,name:trader});
 return entry;
}
export function addReceipt(db,input,id){
 const trader=String(input.trader||"").trim(),date=String(input.date||"").trim(),amount=toCents(input.amount);
 if(!trader||!date||amount<=0)throw Error("أدخل التاجر والتاريخ ومبلغ قبض أكبر من صفر");
 const entry={id,trader,date,company:String(input.company||""),reference:String(input.reference||""),amount,status:"active"};
 db.receipts.unshift(entry);
 if(!db.traders.some(t=>nameKey(t.name)===nameKey(trader)))db.traders.push({id:"auto_"+id,name:trader});
 return entry;
}
export function changeStatus(db,kind,id,status){
 if(!["documents","receipts"].includes(kind)||!["active","deleted"].includes(status))throw Error("إجراء غير صحيح");
 const x=db[kind].find(t=>t.id===id);
 if(!x)throw Error("السجل غير موجود");
 x.status=status;return x;
}
export function statement(db,{trader="",company=""}={}){
 const tr=nameKey(trader),co=nameKey(company);
 const match=x=>(!tr||nameKey(x.trader)===tr)&&(!co||nameKey(x.company)===co);
 const documents=db.documents.filter(x=>x.status==="active"&&match(x));
 // Company-specific statements include only payments explicitly assigned to that company.
 const receipts=db.receipts.filter(x=>x.status==="active"&&match(x));
 const debit=documents.reduce((n,x)=>n+x.amount,0),credit=receipts.reduce((n,x)=>n+x.amount,0);
 const rows=[...documents.map(x=>({type:"document",item:x,date:x.date,debit:x.amount,credit:0})),...receipts.map(x=>({type:"receipt",item:x,date:x.date,debit:0,credit:x.amount}))].sort((a,b)=>a.date.localeCompare(b.date));
 let balance=0;for(const x of rows){balance+=x.debit-x.credit;x.balance=balance;}
 return {debit,credit,balance:debit-credit,rows};
}
