// Opening-list signup: a modal <dialog> driven by the Wix Forms store installed at /js/wix/.
// The fields come from the live form schema (edit them in the Wix dashboard, not here).
import { createFormStore, FORM_ERROR } from "../js/wix/form-store.js";

const FORM_ID = "56869e1e-56b6-47ff-acfb-cac94da3f074";

const dlg = document.getElementById("opening-list");
if (dlg) {
  const body = dlg.querySelector(".modal-body");
  let store = null;
  let formEl = null;
  let rendered = new Map(); // target -> { wrap, control, err }
  let btn = null, formErr = null;

  function open(e) {
    if (e) e.preventDefault();
    if (!store) {
      store = createFormStore({ formId: FORM_ID });
      store.subscribe(render);
      store.start();
    }
    render();
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    document.body.classList.add("modal-open");
  }
  function close() {
    if (typeof dlg.close === "function" && dlg.open) dlg.close(); else dlg.removeAttribute("open");
    document.body.classList.remove("modal-open");
  }
  document.querySelectorAll("[data-openlist]").forEach((a) => a.addEventListener("click", open));
  dlg.querySelector(".modal-close").addEventListener("click", close);
  dlg.addEventListener("click", (e) => { if (e.target === dlg) close(); });
  dlg.addEventListener("close", () => document.body.classList.remove("modal-open"));
  if (location.hash === "#opening-list") open();

  function el(tag, attrs, text) {
    const n = document.createElement(tag);
    for (const k in attrs || {}) {
      if (attrs[k] === null || attrs[k] === undefined || attrs[k] === false) continue;
      n.setAttribute(k, attrs[k] === true ? "" : attrs[k]);
    }
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function paragraphs(text) {
    const frag = document.createDocumentFragment();
    String(text).split("\n").filter((s) => s.trim()).forEach((s) => frag.appendChild(el("p", {}, s)));
    return frag;
  }
  const DIAL = { US: "1", CA: "1", MX: "52", GB: "44" };
  function toE164(raw, country) {
    const s = String(raw || "").trim();
    if (!s) return "";
    if (s.startsWith("+")) return "+" + s.slice(1).replace(/\D/g, "");
    const digits = s.replace(/\D/g, "");
    const cc = DIAL[(country || "US").toUpperCase()] || "1";
    if (cc === "1" && digits.length === 11 && digits.startsWith("1")) return "+" + digits;
    if (cc === "1" && digits.length === 10) return "+1" + digits;
    if (digits.length >= 8) return "+" + cc + digits;
    return digits; // too short to be a number yet; the validator will say so
  }
  function labelText(f, form) {
    let t = f.label;
    if (f.required && form.requiredIndicator === "ASTERISK") t += " *";
    if (f.required && form.requiredIndicator === "TEXT") t += " (required)";
    return t;
  }

  function buildControl(f, values) {
    const id = "ol-" + f.target;
    const wrap = el("div", { class: "field" });
    const lab = el("label", { for: id, class: f.showLabel === false ? "sr" : null });
    const err = el("p", { class: "ferr", id: "err-" + f.target, role: "alert" });
    let control;
    const common = { id, name: f.target, "aria-describedby": "err-" + f.target };
    switch (f.control) {
      case "textarea":
        control = el("textarea", { ...common, rows: 3, placeholder: f.placeholder || null });
        control.value = values[f.target] || "";
        break;
      case "select":
        control = el("select", common);
        control.appendChild(el("option", { value: "" }, f.placeholder || "Choose…"));
        (f.choices || []).forEach((c) => control.appendChild(el("option", { value: c.value }, c.label)));
        control.value = values[f.target] || "";
        break;
      case "checkbox": {
        control = el("input", { ...common, type: "checkbox" });
        control.checked = Boolean(values[f.target]);
        const row = el("div", { class: "check-row" });
        row.appendChild(control);
        row.appendChild(lab);
        lab.textContent = labelText(f, store.getState().form);
        wrap.appendChild(row);
        wrap.appendChild(err);
        control.addEventListener("change", () => store.setValue(f.target, control.checked));
        control.addEventListener("blur", () => store.validate(f.target));
        return { wrap, control, err };
      }
      default: {
        const type = f.control === "email" ? "email" : f.control === "phone" ? "tel" : f.control === "url" ? "url" : f.control === "number" ? "number" : f.control === "date" ? "date" : "text";
        control = el("input", { ...common, type, placeholder: f.placeholder || (type === "tel" ? "(949) 555-0123" : null), inputmode: type === "tel" ? "tel" : null, autocomplete: type === "email" ? "email" : type === "tel" ? "tel" : /first/i.test(f.label) ? "given-name" : /last/i.test(f.label) ? "family-name" : null });
        control.value = values[f.target] || "";
      }
    }
    lab.textContent = labelText(f, store.getState().form);
    wrap.appendChild(lab);
    wrap.appendChild(control);
    if (f.description) wrap.appendChild(el("p", { class: "fhelp" }, f.description));
    wrap.appendChild(err);
    // Wix stores phones in E.164 (+1…); visitors type local numbers, so add the country code for them.
    const read = () => (f.control === "phone" ? toE164(control.value, f.phoneCountry) : control.value);
    control.addEventListener("input", () => store.setValue(f.target, read()));
    control.addEventListener("change", () => store.setValue(f.target, read()));
    control.addEventListener("blur", () => store.validate(f.target));
    return { wrap, control, err };
  }

  function render() {
    const s = store.getState();
    if (s.outcome) {
      body.innerHTML = "";
      const ok = el("div", { class: "ok" });
      ok.appendChild(el("div", { class: "ok-ico", "aria-hidden": "true" }, "✓"));
      const h = el("h4", {}, "Thank you");
      ok.appendChild(h);
      ok.appendChild(paragraphs(s.outcome.message || "Thanks — we'll be in touch with the date."));
      const done = el("button", { type: "button", class: "btn btn-blue" }, "Done");
      done.addEventListener("click", close);
      ok.appendChild(done);
      body.appendChild(ok);
      formEl = null; rendered = new Map();
      if (s.outcome.url) { if (s.outcome.newTab) window.open(s.outcome.url); else window.location.assign(s.outcome.url); }
      return;
    }
    if (!s.form) {
      body.innerHTML = "";
      body.appendChild(el("p", { class: s.errors[FORM_ERROR] ? "ferr" : "fine" }, s.errors[FORM_ERROR] || "Loading…"));
      formEl = null; rendered = new Map();
      return;
    }
    if (s.closed) {
      body.innerHTML = "";
      body.appendChild(el("p", { class: "fine" }, s.form.disabledMessage || "The opening list is no longer accepting sign-ups."));
      formEl = null; rendered = new Map();
      return;
    }
    if (!formEl) {
      body.innerHTML = "";
      formEl = el("form", { novalidate: true, class: "olform" });
      formEl.addEventListener("submit", (e) => { e.preventDefault(); store.submit(e); });
      const fieldsBox = el("div", { class: "fields" });
      formErr = el("p", { class: "ferr form-err", role: "alert" });
      btn = el("button", { type: "submit", class: "btn btn-coral" });
      formEl.appendChild(fieldsBox);
      formEl.appendChild(formErr);
      formEl.appendChild(btn);
      formEl.appendChild(el("p", { class: "fine small" }, "We'll only use this to tell you about the opening."));
      body.appendChild(formEl);
    }
    const fieldsBox = formEl.querySelector(".fields");
    const step = s.form.steps[s.step] || s.form.steps[0];
    const fields = s.form.fields.filter((f) => !step || f.stepId === step.id || !f.stepId);
    const want = new Set(fields.map((f) => f.target));
    for (const [t, r] of rendered) if (!want.has(t)) { r.wrap.remove(); rendered.delete(t); }
    let prev = null;
    fields.forEach((f) => {
      let r = rendered.get(f.target);
      if (!r) { r = buildControl(f, s.values); rendered.set(f.target, r); }
      const ref = prev ? prev.nextSibling : fieldsBox.firstChild;
      if (r.wrap !== ref) fieldsBox.insertBefore(r.wrap, ref);
      const msg = s.errors[f.target] || "";
      r.err.textContent = msg;
      r.control.setAttribute("aria-invalid", msg ? "true" : "false");
      r.wrap.classList.toggle("has-err", Boolean(msg));
      prev = r.wrap;
    });
    formErr.textContent = s.errors[FORM_ERROR] || "";
    btn.textContent = s.loading ? "Sending…" : (s.form.submitText || "Join the list");
    btn.disabled = s.loading;
  }
}
