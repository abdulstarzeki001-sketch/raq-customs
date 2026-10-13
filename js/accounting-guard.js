/** Local-only safeguards: reversible payment trash, backups and deletion prevention. */
window.App = window.App || {};
(function (App) {
  function backup() {
    const C = App.constants;
    const keys = [C.STORAGE_KEY,C.DRAFT_STORAGE_KEY,C.DRIVER_STORAGE_KEY,C.TRADERS_STORAGE_KEY,C.TRADER_LEDGER_KEY,C.TRADER_PAYMENT_KEY];
    const records = {};
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      try { records[key] = raw === null ? null : JSON.parse(raw); }
      catch { App.utils.showStatus("فشل تصدير أحد السجلات: بيانات غير صالحة.", "error"); return; }
    }
    const file = new Blob([JSON.stringify({version:2,exported_at:new Date().toISOString(),storage:"local-only",records},null,2)], {type:"application/json"});
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href=url;
    link.download="iraq-customs-backup-"+new Date().toISOString().slice(0,10)+".json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),2000);
  }
  function escape(value) { return App.utils.safeText(value); }
  App.accountingGuard = {
    backup,
    renderTrash() {
      const area=document.getElementById("accountingTrash");
      if (!area) return;
      const deleted=App.storage.getDeletedTraderPayments();
      const counter=document.getElementById("accountingTrashCount");
      if (counter) counter.textContent=String(deleted.length);
      const body=document.getElementById("accountingTrashList");
      if (!body) return;
      if (!deleted.length) { body.textContent="سلة المحذوفات فارغة"; return; }
      body.innerHTML=deleted.map((entry)=>{
        const id=escape(entry.id);
        return `<div style="display:flex;gap:8px;align-items:center;justify-content:space-between;padding:8px;border-bottom:1px solid #e5e7eb">
           <span>${escape(entry.trader_name)} — ${escape(entry.payment_date)} — ${escape(entry.amount)} $</span>
           <button type="button" class="mini-btn success" data-restore-payment="${id}">استرجاع</button>
        </div>`;
      }).join("");
      body.querySelectorAll("[data-restore-payment]").forEach(btn=>btn.addEventListener("click",()=>{
        if (!App.storage.restoreTraderPayment(btn.dataset.restorePayment)) {
          App.utils.showStatus("تعذر استرجاع الحركة", "error");return;
        }
        App.tradersPage?.refresh?.();
        App.utils.showStatus("تم استرجاع حركة القبض", "success");
      }));
    }
  };
  document.addEventListener("DOMContentLoaded",()=>{
    const clear=document.getElementById("clearLedgerBtn");
    if (!clear) return;
    clear.addEventListener("click",(event)=>{
      event.preventDefault();event.stopImmediatePropagation();
      App.utils.showStatus("الحذف الجماعي معطل لحماية سجلات المحاسبة.", "error");
    },true);
    clear.disabled=true;
    clear.title="الحذف الجماعي معطل لحماية البيانات";
    const backupBtn=document.createElement("button");
    backupBtn.type="button";backupBtn.className=clear.className;
    backupBtn.textContent="تنزيل نسخة احتياطية (JSON)";
    backupBtn.addEventListener("click",backup);
    clear.insertAdjacentElement("afterend",backupBtn);
    const section=document.createElement("details");
    section.id="accountingTrash";
    section.style.cssText="max-width:1100px;margin:24px auto;padding:12px 18px;background:#fff;border:1px solid #d1d5db;border-radius:12px";
    section.innerHTML='<summary style="cursor:pointer;font-weight:700">سلة محذوفات القبوضات (<span id="accountingTrashCount">0</span>)</summary><div id="accountingTrashList" style="padding-top:10px"></div>';
    const page=document.getElementById("tradersPage");
    (page||document.body).appendChild(section);
    App.accountingGuard.renderTrash();
  });
})(window.App);
