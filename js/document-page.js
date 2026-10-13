window.App = window.App || {};

(function (App) {
  App.documentPage = {
    printRequiredFields: [
      { key: "doc_id", label: "رقم الوثيقة" },
      { key: "date_str", label: "تاريخ الوثيقة" },
      { key: "time_str", label: "التوقيت" },
      { key: "company_name_project", label: "اسم الشركة / المشروع" },
      { key: "license_approval_number", label: "رقم الإجازة / الموافقة" },
      { key: "driver_name", label: "اسم السائق" },
      { key: "vehicle_number", label: "رقم العجلة" },
      { key: "destination_governorate", label: "الوجهة النهائية / المحافظة" }
    ],

    printWarningFields: [
      { key: "checkpoint_name_control", label: "اسم سيطرة الدخول" },
      { key: "registration_governorate", label: "محافظة تسجيل العجلة" },
      { key: "cargo_typedetails", label: "نوع / تفاصيل الحمولة" },
      { key: "weight_quantity", label: "الوزن / الكمية" }
    ],

    fill() {
      const page = App.dom.byId("documentPage");
      if (!page) return;

      const doc = App.storage.getDoc();
      const required = this.getMissingDocFields(this.printRequiredFields, doc);

      if (required.length && !App.storage.hasDoc()) {
        page.innerHTML = `
          <div style="max-width:720px;margin:40px auto;padding:24px;border-radius:16px;background:#fff;box-shadow:0 8px 30px rgba(0,0,0,.08);text-align:center">
            <h2 style="margin:0 0 12px;color:#a40000">لا توجد وثيقة محفوظة لعرضها</h2>
            <p style="margin:0 0 18px;line-height:1.9">ارجع إلى صفحة التعبئة وأنشئ الوثيقة أولًا، ثم ستظهر هنا بشكل صحيح.</p>
            <a href="form.html" style="display:inline-block;padding:10px 18px;border-radius:10px;background:#a40000;color:#fff;text-decoration:none;font-weight:700">العودة إلى صفحة التعبئة</a>
          </div>
        `;
        return;
      }

      document.querySelectorAll("[data-out]").forEach(function (element) {
        const key = element.getAttribute("data-out");
        let value = doc[key] || "";
        if (key === "date_str" || key === "license_approval_date" || key === "current_date") {
          value = App.utils.formatDateForDisplay(value);
        }
        element.textContent = value;
      });

      const tbody = App.dom.byId("itemsBody");
      const itemsHeader = App.dom.byId("itemsHeader");
      const items = App.utils.normalizeItems(doc);

      if (tbody && itemsHeader) {
        if (items.length) {
          itemsHeader.style.display = "";
          tbody.innerHTML = items.map(function (item) {
            return `
              <tr>
                <td>${App.utils.safeText(item.item_name)}</td>
                <td class="ltr-right">${App.utils.safeText(item.production_capacity)} ${App.utils.safeText(item.unit)}</td>
              </tr>
            `;
          }).join("");
        } else {
          itemsHeader.style.display = "none";
          tbody.innerHTML = "";
        }
      }

      const qrArea = App.dom.byId("qrArea");
      if (qrArea) {
        const src = App.utils.getQrSrc(doc);
        if (src) {
          qrArea.innerHTML = `<img src="${App.utils.safeText(src)}" alt="QR" class="barcode-img" crossorigin="anonymous">`;
        } else {
          qrArea.innerHTML = '<div class="qr-empty"></div>';
        }
      }
    },

    getMissingDocFields(fields, doc) {
      return fields.filter((field) => !String(doc?.[field.key] ?? "").trim());
    },

    validateBeforePrint() {
      const doc = App.storage.getDoc();
      const missingRequired = this.getMissingDocFields(this.printRequiredFields, doc);

      if (missingRequired.length) {
        window.alert(`ما أگدر أكمل العملية لأن بعض الحقول المطلوبة ناقصة:\n- ${missingRequired.map((field) => field.label).join("\n- ")}\n\nارجع إلى صفحة التعبئة وكملها أولًا.`);
        return false;
      }

      const missingWarnings = this.getMissingDocFields(this.printWarningFields, doc);
      if (missingWarnings.length) {
        return window.confirm(
          `ملاحظة: توجد حقول مهمة لكنها غير إلزامية وما زالت فارغة:\n- ${missingWarnings.map((field) => field.label).join("\n- ")}\n\nهل تريد المتابعة؟`
        );
      }

      return true;
    },

    async waitForImages(container) {
      const images = Array.from(container.querySelectorAll("img"));
      await Promise.all(images.map((image) => new Promise((resolve) => {
        if (image.complete) {
          resolve();
          return;
        }
        const done = () => resolve();
        image.addEventListener("load", done, { once: true });
        image.addEventListener("error", done, { once: true });
      })));
    },

    async renderDocumentCanvas() {
      const docElement = App.dom.byId("documentPage");
      if (!docElement) throw new Error("تعذر العثور على الوثيقة");

      if (!window.html2canvas) {
        throw new Error("مكتبة تحويل الصفحة إلى صورة غير محمّلة");
      }

      await this.waitForImages(docElement);

      return await window.html2canvas(docElement, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        scale: Math.max(window.devicePixelRatio || 1, 2),
        scrollX: 0,
        scrollY: 0,
        width: docElement.scrollWidth,
        height: docElement.scrollHeight,
        windowWidth: docElement.scrollWidth,
        windowHeight: docElement.scrollHeight
      });
    },

    triggerBlobDownload(blob, fileName) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    },

    buildExportFileBaseName() {
      const doc = App.storage.getDoc();
      const company = String(doc.company_name_project || "document").trim().replace(/[^\p{L}\p{N}\-_ ]/gu, "").replace(/\s+/g, "_");
      const id = String(doc.doc_id || "000000").trim();
      return `shipment_document_${id}_${company || "company"}`;
    },

    async downloadImage() {
      if (!this.validateBeforePrint()) return;

      try {
        const canvas = await this.renderDocumentCanvas();
        const fileName = `${this.buildExportFileBaseName()}.png`;

        if (canvas.toBlob) {
          canvas.toBlob((blob) => {
            if (!blob) {
              window.alert("تعذر إنشاء ملف الصورة");
              return;
            }
            this.triggerBlobDownload(blob, fileName);
          }, "image/png");
          return;
        }

        const dataUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = fileName;
        link.click();
      } catch (error) {
        console.error(error);
        window.alert("تعذر تنزيل صورة الوثيقة. تأكد من تحميل الصفحة والاتصال بالإنترنت إن كان QR خارجيًا.");
      }
    },

    /* PDF = نفس الطباعة = مطابق 100% للشاشة */
    downloadPdf() {
      this.printLikeOriginal();
    },

    printLikeOriginal() {
      if (!this.validateBeforePrint()) return;

      const docElement = App.dom.byId("documentPage");
      if (!docElement) {
        window.print();
        return;
      }

      const html = docElement.outerHTML;
      const win = window.open("", "_blank", "width=900,height=1000");
      if (!win) {
        window.print();
        return;
      }

      const headParts = [];
      headParts.push('<meta charset="utf-8" />');
      headParts.push("<title>طباعة الوثيقة</title>");

      document.querySelectorAll('link[rel="stylesheet"], link[rel="preconnect"]').forEach(function (link) {
        const clone = link.cloneNode(true);
        if (clone.getAttribute("rel") === "stylesheet") {
          const href = clone.getAttribute("href");
          if (href) {
            const separator = href.includes("?") ? "&" : "?";
            clone.setAttribute("href", `${href}${separator}print_copy=${Date.now()}`);
          }
        }
        headParts.push(clone.outerHTML);
      });

      document.querySelectorAll("style").forEach(function (styleTag) {
        headParts.push(styleTag.outerHTML);
      });

      headParts.push(`
        <style>
          @page { size: A4; margin: 0; }
          html, body { margin: 0; padding: 0; background: #fff; }
          .a4-page {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 auto;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            padding: 11mm 13mm 9mm !important;
            overflow: hidden;
            position: static !important;
            transform: none !important;
            box-shadow: none !important;
            border: none !important;
          }
          .toolbar { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        </style>
      `);

      win.document.open();
      win.document.write(`
        <!doctype html>
        <html dir="rtl" lang="ar">
          <head>${headParts.join("\n")}</head>
          <body>${html}</body>
        </html>
      `);
      win.document.close();

      const triggerPrint = function () {
        win.focus();
        win.print();
        win.close();
      };

      if (win.document.readyState === "complete") {
        window.setTimeout(triggerPrint, 300);
      } else {
        win.onload = function () {
          window.setTimeout(triggerPrint, 300);
        };
      }
    },

    bindActions() {
      const imageBtn = App.dom.byId("downloadImageBtn");
      if (imageBtn) {
        imageBtn.addEventListener("click", () => void this.downloadImage());
      }

      const refreshBtn = App.dom.byId("refreshBtn");
      if (refreshBtn) {
        refreshBtn.addEventListener("click", () => location.reload());
      }
    }
  };

  window.printDocumentLikeOriginal = function () {
    App.documentPage.printLikeOriginal();
  };
})(window.App);
