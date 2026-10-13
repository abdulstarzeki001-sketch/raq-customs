/** Recovered frontend: prevent irreversible financial deletions until a backend audit trail exists. */
window.App = window.App || {};
(function (App) {
  if (!App.storage) return;
  const normalize = value => App.utils.normalizeSearchText(value);
  const originalDeleteTrader = App.storage.deleteTrader.bind(App.storage);
  App.storage.deleteTrader = function (name) {
    const key = normalize(name);
    const hasDocs = this.getTraderLedger().some(row => normalize(row.trader_name) === key);
    const hasPayments = this.getTraderPayments().some(row => normalize(row.trader_name) === key);
    if (hasDocs || hasPayments) {
      App.utils.showStatus("لا يمكن حذف تاجر لديه مستندات أو حركات مالية.", "error");
      return false;
    }
    return originalDeleteTrader(name);
  };
  App.storage.deleteTraderPayment = function () {
    App.utils.showStatus("الحذف النهائي لحركات القبض معطل لحماية السجلات.", "error");
    return false;
  };
  function backup() {
    const C=App.constants;
    const keys=[C.STORAGE_KEY,C.DRIVER_STORAGE_KEY,C.TRADERS_STORAGE_KEY,C.TRADER_LEDGER_KEY,C.TRADER_PAYMENT_KEY];
    const data={exported_at:new Date().toISOString(),source:"recovered-local-frontend",records:{}};
    keys.forEach(key => {try {data.records[key]=JSON.parse(localStorage.getItem(key) || "null");} catch (_) {data.records[key]=null;}});
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="iraq-customs-local-backup-"+new Date().toISOString().slice(0,10)+".json";document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  document.addEventListener("DOMContentLoaded",function(){
    const clear=document.getElementById("clearLedgerBtn");
    if(!clear)return;
    clear.addEventListener("click",function(e){e.preventDefault();e.stopImmediatePropagation();App.utils.showStatus("الحذف الجماعي معطل لحماية البيانات.","error");},true);
    const btn=document.createElement("button");btn.type="button";btn.className=clear.className;btn.textContent="تنزيل نسخة احتياطية (JSON)";btn.addEventListener("click",backup);clear.insertAdjacentElement("afterend",btn);
  });
})(window.App);
