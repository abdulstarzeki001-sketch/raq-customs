window.App = window.App || {};

document.addEventListener("DOMContentLoaded", async function () {
  // جلب أحدث البيانات من السحابة قبل تشغيل أي صفحة
  await window.App.sync?.pullAll?.();

  await window.App.indexPage?.init?.();
  await window.App.formPage?.init?.();
  await window.App.tradersPage?.init?.();
  window.App.documentPage?.fill?.();
  window.App.documentPage?.bindActions?.();
});
