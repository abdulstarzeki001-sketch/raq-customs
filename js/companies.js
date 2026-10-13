window.App = window.App || {};

(function (App) {
  App.companies = {
    normalize(company) {
      return {
        Number: company?.Number ?? "",
        CompanyNameProject: company?.CompanyNameProject ?? "",
        Brand: company?.Brand ?? "",
        LicenseApprovalNumber: company?.LicenseApprovalNumber ?? "",
        GovernorateName: company?.GovernorateName ?? "",
        GrantingLicenseApproval: company?.GrantingLicenseApproval ?? "",
        LicenseApprovalDate: company?.LicenseApprovalDate ?? "",
        LicenseTextSpecialization: company?.LicenseTextSpecialization ?? "",
        CargoDetails: company?.CargoDetails ?? "",
        TypeIndustryProduction: company?.TypeIndustryProduction ?? "",
        Unit: company?.Unit ?? ""
      };
    },

    tokens(company) {
      const normalized = this.normalize(company);
      return [
        normalized.Number,
        normalized.CompanyNameProject,
        normalized.Brand,
        normalized.LicenseApprovalNumber,
        normalized.GovernorateName,
        normalized.GrantingLicenseApproval,
        normalized.LicenseTextSpecialization,
        normalized.CargoDetails,
        normalized.TypeIndustryProduction,
        normalized.Unit
      ].map(function (value) {
        return App.utils.normalizeSearchText(value);
      }).filter(Boolean);
    },

    search(query, limit = 20) {
      const normalizedQuery = App.utils.normalizeSearchText(query);
      if (!normalizedQuery) return [];

      return App.state.companies.filter((company) => {
        return this.tokens(company).some(function (value) {
          return value.includes(normalizedQuery);
        });
      }).slice(0, limit);
    },

    async load() {
      if (App.state.companies.length) return App.state.companies;

      try {
        const response = await fetch("data/companies.json");
        if (!response.ok) throw new Error("companies.json not found");

        const data = await response.json();
        App.state.companies = Array.isArray(data) ? data : [];
        App.utils.showStatus(`تم تحميل ${App.state.companies.length} شركة`, "success");
      } catch (error) {
        console.error(error);
        App.utils.showStatus("تعذّر تحميل قاعدة بيانات الشركات. تحقق من اتصالك بالإنترنت وأعد المحاولة.", "error");
      }

      return App.state.companies;
    },

    fillForm(company) {
      const normalized = this.normalize(company);
      App.dom.setFormValue("company_name_project", normalized.CompanyNameProject);
      App.dom.setFormValue("governorate_name", normalized.GovernorateName);
      App.dom.setFormValue("granting_license_approval", normalized.GrantingLicenseApproval);
      App.dom.setFormValue("license_approval_number", normalized.LicenseApprovalNumber);
      App.dom.setFormValue("license_approval_date", normalized.LicenseApprovalDate);
      App.dom.setFormValue("license_text_specialization", normalized.LicenseTextSpecialization);
      App.dom.setFormValue("brand", normalized.Brand);
      App.dom.setFormValue("cargo_typedetails", normalized.CargoDetails || normalized.TypeIndustryProduction);
      App.dom.setFormValue("item_name", normalized.TypeIndustryProduction || normalized.CargoDetails);
      App.dom.setFormValue("production_capacity", "");
      App.dom.setFormValue("unit", normalized.Unit);
    },

    findByNumber(number) {
      const normalizedNumber = App.utils.normalizeSearchText(number);
      return App.state.companies.find(function (entry) {
        return App.utils.normalizeSearchText(entry.Number) === normalizedNumber;
      }) || null;
    }
  };
})(window.App);
