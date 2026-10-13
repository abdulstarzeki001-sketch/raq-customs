# حالة الاستعادة — 13 أكتوبر 2026

## ما تمت استعادته
- الصفحات الأربع: `index.html`, `form.html`, `traders.html`, `document.html`.
- منطق الشركات، الوثائق، السائقين، التجار، المحاسبة وطباعة الوثيقة من آخر نسخة مؤرشفة وقابلة للاختبار في GitHub.
- ملفات CSS الخاصة بالرئيسية والنموذج والتجار، و`basemodal-original.css` المسترجع من النسخة الحية.
- دليل 839 شركة في `data/companies.json`.
- `wrangler.toml` مناسب لاستضافة Pages الثابتة وGitHub Action اختياري للنشر.
- نسخة V2 التي كانت على الفرع الرئيسي محفوظة في `backup-v2-before-legacy-restore`.

## حدود الاستعادة
- استعادة **واجهة تشغيل محلية** وليست نسخة حرفية من الأصول الثلاثين في Cloudflare. لا يمكن الوصول من النشر العام إلى المصدر الأصلي لـ Pages Functions أو قاعدة بيانات KV أو مفاتيح Cloudflare.
- صور `iraqEagle.png` و`Customs.jpg` والخطوط `cairo-regular.ttf` و`cairo-bold.ttf` لم تُنسخ؛ استُخدمت أيقونة SVG محلية وخطوط النظام كبدائل.
- صفحة `document.html` مستعادة وظيفياً، وليست نسخة بصرية طبق الأصل من HTML الأصلي.
- تم تعطيل المزامنة السحابية القديمة عمداً لأن رمزها كان مكشوفاً في JavaScript المنشور. يجب إلغاؤه/تغييره على خادم Cloudflare.
- الحسابات القديمة لا تُستورد؛ حفظ السجلات الجديدة محلي داخل المتصفح. صدّر نسخة احتياطية JSON بانتظام.
- لم تُعَد تهيئة Cloudflare ولا تُحذف بياناته القديمة. النشر إلى مشروع Cloudflare لا يتم إلا بعد تزويد GitHub Actions بأسرار Cloudflare وتشغيله، أو إعادة ربط Pages بالمستودع.

## نشر المشروع على نفس رابط Cloudflare
1. ضمن GitHub → Settings → Secrets and variables → Actions أضف `CLOUDFLARE_API_TOKEN` و`CLOUDFLARE_ACCOUNT_ID`.
2. أنشئ API Token صالحاً لصلاحية Cloudflare Pages Edit للمشروع المعني، ولا تكتب قيمته في GitHub code أو الدردشة.
3. افتح GitHub → Actions → **Publish recovered frontend to Cloudflare Pages** → **Run workflow**.
4. انتظر نتيجة النشر، ثم افتح `https://iraq-customs.pages.dev`.

يمكن كذلك النشر محلياً: `npx wrangler pages deploy . --project-name iraq-customs --branch main`.

**تنبيه:** النظام داخلي خاص بالشركات وغير رسمي؛ لا تنسب الوثائق إلى منصة حكومية أو تستخدمه للتحقق الحكومي.
