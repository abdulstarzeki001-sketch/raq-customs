# Iraq Customs — Project Source (Recovered Frontend)

هذه نسخة مسترجعة من **ملفات الواجهة المنشورة علناً** على https://iraq-customs.pages.dev/ بتاريخ 2026-10-13.

> **تنبيه:** هذا المستودع **ليس** نسخة كاملة من Cloudflare Pages الأصلي؛ ملفات الـ Pages Functions، إعدادات KV، الـ Secrets، وسجل بيانات التجار في السحابة غير متاحة من النشر العام، ولم تُنسخ. **لم يتم ربط هذا المستودع تلقائياً بنشر Cloudflare الحالي.**

## ما الذي يتوفر؟
- بوابة الشركات، البحث عن الشركات، نموذج الوثيقة، عرض المستند، حسابات التجار.
- بيانات **839 شركة** من `data/companies.json` المتاحة علناً.
- ملفات HTML / CSS / JavaScript للواجهة، مع تعديلات لإزالة روابط الأصول المطلقة إلى النشر الحالي.
- `js/sync.js` بديل **محلي فقط**: لا يتضمن رمز المزامنة القديم؛ لا يقرأ/يكتب بيانات الحسابات إلى Cloudflare.
- حماية مؤقتة من حذف القيود المالية نهائياً وإمكانية تنزيل نسخة JSON احتياطية.

## تشغيل محلي
```bash
python3 -m http.server 8080
```
افتح http://localhost:8080 . لا تفتح ملفات HTML عبر `file://` لأن المتصفح يمنع تحميل JSON بهذه الطريقة.

## قبل ربط الإنتاج
1. صدِّر نسخاً احتياطية من Cloudflare KV والبيانات المالية الحالية.
2. **ألغِ رمز المزامنة القديم الموجود في النسخة الحية** من إعدادات الخادم؛ إخفاؤه هنا لا يلغي استخدامه.
3. استرجع Pages Functions من المصدر الأصلي أو أنشئ API جديداً مع Cloudflare Access والتحقق من المستخدم على جانب الخادم.
4. لا تنشر بيانات مالية حقيقية عبر صفحات عامة ولا تعتمد على localStorage لحسابات متعددة المستخدمين.
5. استخدم D1 ومعاملات وقاعدة تدقيق وسلة محذوفات قبل تشغيل حسابات تجارية حقيقية.

## حدود النسخة
- `document.html` صفحة عرض محلية **أعيد تركيبها** لتعمل مع `js/document-page.js`؛ لا تعتبر نسخة بكسل-بكسل من صفحة النشر الأصلية.
- الأيقونات والخطوط الثنائية المملوكة للنشر الأصلي لم تُسترجع؛ بعض الموارد تعتمد على روابط عامة أو بدائل.
- هذه أداة إدارة داخلية تجريبية، وليست خدمة حكومية رسمية أو مصدراً للتحقق من الوثائق.

## إصلاحات الاستقرار بتاريخ 2026-10-13
- تُقبل مستندات بقيمة **0 USD** وتُعرض في كشف الحساب من دون إنشاء مبلغ مستحق.
- حذف حركات القبض أصبح نقلاً إلى سلة المحذوفات مع **استرجاع** من صفحة التجار.
- حذف التاجر ممنوع عندما تكون لديه قيود مالية، حتى لو كانت بعض القبوضات في السلة.
- انتهاء سعة السجلات المحلية يعطي رسالة خطأ بدلاً من حذف أقدم العمليات بصمت.
- لم يعد إنشاء الوثيقة يُعتبر ناجحاً إذا فشل تسجيلها في حساب التاجر.
- يتم التحقق من صورة QR قبل الحفظ (PNG/JPEG/WebP، حتى 1.5MB).
- إدخال المبالغ يدعم الفواصل الشائعة، مثال: `1,500.25` و `1.500,25` و `١٬٥٠٠٫٢٥`.
- اختيار شركة محددة في كشف الحساب يعرض وثائق تلك الشركة فقط؛ القبوضات المسجلة باسم التاجر **لا تنسب تلقائياً إلى شركة**.
- تشغيل اختبارات GitHub Actions في كل رفع لفرع `main`.

**مهم:** الحماية المحلية وسلة المحذوفات ليست بديلاً عن صلاحيات مستخدمين وقاعدة مالية آمنة على الخادم. أي ملفات منشورة على GitHub العام يمكن قراءتها من الآخرين. المزامنة السحابية السابقة **غير مفعلة** هنا.

## Cloudflare deployment - automated setup
GitHub Actions first validates four restored HTML pages, related assets and 839 companies, and packages only public site files in `site/`. The workflow uploads a ZIP artifact and deploys to the existing Cloudflare Pages project `iraq-customs` when its API token is configured. The account ID is prefilled from the Cloudflare dashboard link supplied for this project (and can be overridden through the `CLOUDFLARE_ACCOUNT_ID` secret).

**Set up once:** GitHub repository → Settings → Secrets and variables → Actions → New repository secret → Name: `CLOUDFLARE_API_TOKEN`. Value: a token created under Cloudflare → My Profile → API Tokens with `Account > Cloudflare Pages > Edit` permission for the project account. Never commit or send the secret in messages.

After the secret is set, choose Actions → **Publish recovered frontend to Cloudflare Pages** → **Run workflow**, or push any new commit to `main`. A successful packaging job with an explicit `NOT DEPLOYED` warning means no Cloudflare publish occurred.

## مطابقة الواجهة مع الملفات المرجعية (2026-10-22)
تم إعداد فرع مراجعة يكيّف معاينة وثيقة الحمولة وصفحة بحث الشركات وفق مكونات Vue المجمّعة المرفقة، دون نسخ بيانات الجلسة أو استبدال المشروع المحلي بمنظومة رسمية غير مكتملة. التفاصيل وحدود المطابقة في [SOURCE_ALIGNMENT_AR.md](SOURCE_ALIGNMENT_AR.md). **لا تُدمج التعديلات في الإنتاج قبل اختبار المعاينة والطباعة.**

### تشخيص صلاحيات Cloudflare (2026-10-22)

في حال ظهر `Authentication error [code: 10000]` فالمفتاح موجود لكنه لا يملك صلاحية الوصول إلى مشروع Pages بالحساب المحدد، أو الحساب/المشروع مختلف. فحص `scripts/check-cloudflare-pages.mjs` يتحقق من المشروع **قبل** رفع الملفات ويكتب سبب المنع في سجل Actions دون طباعة التوكن.

1. من Cloudflare → **Account API Tokens** أنشئ Custom Token مع **Account → Cloudflare Pages → Edit**، وحدد في **Account Resources** الحساب الذي يحتوي على مشروع `iraq-customs`.
2. حدّث أحد أسرار **Repository secrets** في GitHub: الاسم المفضل `CLOUDFLARE_PAGES_TOKEN` (أو `CLOUDFLARE_API_TOKEN`). إذا وُجد الاثنان، يُستخدم `CLOUDFLARE_PAGES_TOKEN` أولاً.
3. راجع `CLOUDFLARE_ACCOUNT_ID` إذا كنت تعمل على حساب Cloudflare آخر. ثم نفّذ `Publish recovered frontend to Cloudflare Pages` يدوياً من الفرع `main`.

**لا ترسل التوكن في المحادثة أو تحفظه داخل المستودع.** إعداد الصلاحيات يتم من Cloudflare/GitHub، ولا تستطيع ملفات المشروع إصلاح توكن مرفوض. النشر يستبدل الواجهة الحالية؛ احتفظ بنسخة احتياطية من البيانات والخدمات الأصلية قبل استخدام النسخة المسترجعة.
