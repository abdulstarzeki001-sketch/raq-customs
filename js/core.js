window.App = window.App || {};

(function (App) {
  App.constants = {
    STORAGE_KEY: "shipment_doc_final_all_files_v1",
    DRAFT_STORAGE_KEY: "shipment_doc_form_draft_v1",
    SELECTED_COMPANY_KEY: "selected_company_for_form",
    DRIVER_STORAGE_KEY: "saved_drivers_v1",
    TRADERS_STORAGE_KEY: "saved_traders_v1",
    TRADER_LEDGER_KEY: "trader_ledger_v1",
    TRADER_PAYMENT_KEY: "trader_payments_v1",
    DEFAULT_DRIVERS: [],
    DEFAULTS: {
      doc_id: "",
      date_str: "",
      time_str: "",
      current_date: "",
      subject: "الوثيقة المؤقتة لبيانات الحمولة من قبل الشركة",
      items: []
    }
  };

  App.state = {
    companies: []
  };

  App.dom = {
    byId(id) {
      return document.getElementById(id);
    },
    getFormField(name) {
      return document.querySelector(`[name="${name}"]`);
    },
    getFormValue(name) {
      const el = this.getFormField(name);
      return el ? el.value : "";
    },
    setFormValue(name, value) {
      const el = this.getFormField(name);
      if (el) el.value = value ?? "";
    }
  };

  App.utils = {
    safeText(value) {
      return String(value ?? "").replace(/[&<>"']/g, function (char) {
        return ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        })[char];
      });
    },

    normalizeSearchText(value) {
      return String(value ?? "")
        .toLowerCase()
        .trim()
        .replace(/[\u064B-\u065F\u0670]/g, "")
        .replace(/[أإآ]/g, "ا")
        .replace(/ة/g, "ه")
        .replace(/ى/g, "ي")
        .replace(/[٠-٩]/g, function (digit) {
          return String("٠١٢٣٤٥٦٧٨٩".indexOf(digit));
        })
        .replace(/\s+/g, " ");
    },

    showStatus(message, type = "info") {
      const box = App.dom.byId("status");
      const text = App.dom.byId("statusMessage");
      if (!box || !text) return;

      box.className = "status " + type;
      box.style.display = "block";
      text.textContent = message;

      if (type !== "error") {
        window.setTimeout(function () {
          box.style.display = "none";
          box.className = "status";
        }, 5000);
      }
    },

    formatDateInput(date) {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return "";
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    },

    formatTimeInput(date) {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return "";
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    },

    formatTimeForDocument(value) {
      if (!value) return "";
      const text = String(value).trim();
      if (!text) return "";
      if (text.toUpperCase().includes("AM") || text.toUpperCase().includes("PM")) return text;

      const parts = text.split(":");
      if (parts.length < 2) return text;

      let hours = parseInt(parts[0], 10);
      const minutes = String(parts[1]).slice(0, 2);
      if (Number.isNaN(hours)) return text;

      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      return `${hours}:${minutes} ${ampm}`;
    },


    normalizeDigits(value) {
      return String(value ?? "").replace(/[٠-٩]/g, function (digit) {
        return String("٠١٢٣٤٥٦٧٨٩".indexOf(digit));
      });
    },

    normalizeDateValue(value) {
      const text = String(value ?? "").trim();
      if (!text) return "";

      const normalized = this.normalizeDigits(text);
      let year = "";
      let month = "";
      let day = "";

      if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        [year, month, day] = normalized.split("-");
      } else {
        const match = normalized.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (!match) return text;
        day = match[1].padStart(2, "0");
        month = match[2].padStart(2, "0");
        year = match[3];
      }

      return `${year}-${month}-${day}`;
    },

    formatDateForDisplay(value) {
      const iso = this.normalizeDateValue(value);
      if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return String(value ?? "").trim();
      const [year, month, day] = iso.split("-");
      return iso;
    },

    ensureDocId() {
      const input = App.dom.getFormField("doc_id");
      if (!input || input.value.trim()) return;
      input.value = String(Date.now()).slice(-6);
    },

    setDefaultDateTime() {
      const date = App.dom.getFormField("date_str");
      const time = App.dom.getFormField("time_str");
      const now = new Date();

      if (date && !date.value) date.value = this.formatDateInput(now);
      if (time && !time.value) time.value = this.formatTimeInput(now);
      this.ensureDocId();
    },

    buildQrGeneratorUrl(text) {
      // In this recovered offline copy, never send document data to external QR services.
      return "";
    },

    getQrSrc(doc) {
      const uploadedImage = String(doc?.qr_image_data ?? "").trim();
      if (uploadedImage.startsWith("data:image")) return uploadedImage;
      if (/^[A-Za-z0-9+/=]+$/.test(uploadedImage) && uploadedImage.length > 80) {
        return `data:image/png;base64,${uploadedImage}`;
      }

      const raw = doc?.qr_code || doc?.response?.qr_code;
      const fallback = doc?.license_approval_number || doc?.vehicle_number || doc?.driver_name || "";

      if (!raw) {
        return fallback ? this.buildQrGeneratorUrl(fallback) : "";
      }

      const value = String(raw).trim();
      if (!value) return fallback ? this.buildQrGeneratorUrl(fallback) : "";
      if (value.startsWith("data:image")) return value;

      if (value.startsWith("https://customs-uboor.ur.gov.iq/robot?url=")) {
        const url = value.split("url=")[1] || "";
        return url ? this.buildQrGeneratorUrl(url) : (fallback ? this.buildQrGeneratorUrl(fallback) : "");
      }

      if (/^https?:\/\//i.test(value)) {
        const looksLikeImage = /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(value);
        return looksLikeImage ? value : this.buildQrGeneratorUrl(value);
      }

      if (/^[A-Za-z0-9+/=]+$/.test(value) && value.length > 80) {
        return `data:image/png;base64,${value}`;
      }

      return this.buildQrGeneratorUrl(value || fallback);
    },

    normalizeItems(doc) {
      const arr = Array.isArray(doc.items) ? doc.items : [];
      return arr.map(function (item) {
        return {
          item_name: String(item?.item_name ?? "").trim(),
          production_capacity: item?.production_capacity ?? "",
          unit: String(item?.unit ?? "").trim()
        };
      }).filter(function (item) {
        return item.item_name || item.production_capacity || item.unit;
      });
    }
  };
})(window.App);
