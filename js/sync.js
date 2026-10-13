/**
 * Recovered public frontend — LOCAL-ONLY safe default.
 * The production site's exposed X-Sync-Token must be revoked separately.
 * Do not assume cloud data has been copied or is available here.
 */
window.App = window.App || {};
(function (App) {
  App.sync = {
    mode: "local-only",
    async ready() { return false; },
    push() { return Promise.resolve(false); },
    async pull() { return null; },
    async pullAll() { return; },
    async waitForIdle() { return false; }
  };
  document.addEventListener("DOMContentLoaded", function () {
    if (document.getElementById("localOnlyNotice")) return;
    const el = document.createElement("div");
    el.id = "localOnlyNotice";
    el.setAttribute("role", "status");
    el.setAttribute("dir", "rtl");
    el.textContent = "نسخة مسترجعة مستقلة — يتم الحفظ على هذا المتصفح فقط، ولا توجد مزامنة سحابية.";
    el.style.cssText = "position:relative;z-index:20000;box-sizing:border-box;background:#fff3cd;color:#573700;border-bottom:1px solid #e6c878;padding:10px 16px;font:600 14px/1.7 Tahoma,Arial,sans-serif;text-align:center";
    document.body.prepend(el);
    const style=document.createElement("style");
    style.textContent="@media print { #localOnlyNotice {display:none!important} }";
    document.head.append(style);
  });
})(window.App);
