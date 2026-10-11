import { readFileSync } from "node:fs";
import path from "node:path";
import { C, REPO_DIR, markSvg, tokens } from "./lib.mjs";
import { blob, bubbles, loop, page } from "./templates.mjs";

// Phone screens are drawn at 390x844 points (iPhone logical size) and scaled into each store frame.
const SCREEN_W = 390;
const SCREEN_H = 844;
const S = tokens.status;

// UI text comes from the shipping app's locale files, so the mockups use the same wording as the build.
const LOCALES = Object.fromEntries(
  ["en", "ar"].map((lang) => [lang, JSON.parse(readFileSync(path.join(REPO_DIR, `rd/mobile/src/locales/${lang}.json`), "utf8"))]),
);

// Ranges, fractions, and batch codes stay in one left-to-right run so Arabic shows "12.0–13.0 g" and "1/2", not "13.0–12.0".
const translator = (lang) => (key, values = {}) =>
  LOCALES[lang][key]
    .replace(/\{\w+\}(?:[–/]\{\w+\})*(?: \{unit\})?/g, (run) => `<span dir="ltr">${run}</span>`)
    .replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ""))
    .replace(/\d{6} \d/g, (code) => `<span dir="ltr">${code}</span>`);

// Sample content that is data, not UI text, so it is not in the locale files.
const SAMPLE = {
  en: { product: "Milk chocolate wafer bites", line: "Coating line 1" },
  ar: { product: "قطع الويفر بالشوكولاتة", line: "خط التغطية 1" },
};

const statusBar = (dark = false) => `
<div style="height:54px;display:flex;align-items:center;justify-content:space-between;padding:14px 30px 0 34px;font-weight:700;font-size:16px;color:${dark ? "#fff" : C.ink}" dir="ltr">
  <span>9:41</span>
  <span style="display:flex;gap:6px;align-items:center">
    <svg width="18" height="12" viewBox="0 0 18 12"><g fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="2.5" width="3" height="9.5" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></g></svg>
    <svg width="16" height="12" viewBox="0 0 16 12"><path fill="currentColor" d="M8 2.6c2.2 0 4.2.8 5.7 2.2l1.2-1.3A10 10 0 0 0 8 .8 10 10 0 0 0 1.1 3.5l1.2 1.3A8.2 8.2 0 0 1 8 2.6Zm0 3.6c1.2 0 2.3.4 3.2 1.2l1.2-1.3A6.6 6.6 0 0 0 8 4.4c-1.7 0-3.2.6-4.4 1.7l1.2 1.3c.9-.8 2-1.2 3.2-1.2ZM8 8c-.7 0-1.3.3-1.8.7L8 10.6l1.8-1.9C9.3 8.3 8.7 8 8 8Z"/></svg>
    <svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2" fill="currentColor"/><rect x="25" y="4.5" width="1.5" height="4" rx=".7" fill="currentColor" opacity=".4"/></svg>
  </span>
</div>`;

const homeIndicator = (dark = false) =>
  `<div style="position:absolute;left:50%;bottom:8px;width:134px;height:5px;border-radius:3px;background:${dark ? "#fff" : C.ink};transform:translateX(-50%);opacity:.9"></div>`;

const chip = (label, status) =>
  `<span style="display:inline-block;border-radius:999px;padding:4px 10px;font-size:12px;font-weight:700;background:${S[status].background};color:${S[status].text};white-space:nowrap">${label}</span>`;

const pill = (label) =>
  `<span style="flex:none;border-radius:999px;background:${C.mintSoft};padding:6px 10px;font-size:12px;color:${C.copy};white-space:nowrap">${label}</span>`;

const tile = (size) =>
  `<span style="display:inline-block;width:${size}px;height:${size}px;border-radius:${size * 0.28}px;overflow:hidden;box-shadow:0 0 0 1px rgba(23,62,51,.14)">${markSvg({ size, background: "tile", glyphScale: 0.6, id: `s${Math.round(Math.random() * 1e6)}` })}</span>`;

// Overline text: uppercase tracking only applies to Latin script.
const overline = (text, ar, color = C.copy) =>
  `<div class="${ar ? "ar" : ""}" style="font-size:11px;line-height:16px;font-weight:800;letter-spacing:${ar ? 0 : 2}px;text-transform:uppercase;color:${color}">${text}</div>`;

const title = (text, ar, size = 34) =>
  `<div class="${ar ? "ar" : "display"}" style="font-size:${size}px;line-height:${size * 1.18}px;font-weight:800;letter-spacing:${ar ? 0 : -0.8}px">${text}</div>`;

const header = (subtitle, ar = false) => `
<div style="display:flex;align-items:center;gap:12px;padding:6px 20px 0">
  ${tile(44)}
  <div style="flex:1">
    <div class="display" style="font-size:22px;line-height:26px;letter-spacing:0">Flavoneer</div>
    <div style="margin-top:2px">${overline(subtitle, ar)}</div>
  </div>
  <span style="width:40px;height:40px;border-radius:999px;background:#FFE3A8;color:#6B3F05;display:grid;place-items:center;font-weight:800;font-size:14px">SA</span>
</div>`;

const card = (inner, extra = "") =>
  `<div style="background:${C.cream};border:1px solid rgba(28,74,60,.14);border-radius:16px;${extra}">${inner}</div>`;

/** Back button, form serial, and status chip at the top of an inspection record. */
function recordHeader(lang) {
  const t = translator(lang);
  const ar = lang === "ar";
  const s = SAMPLE[lang];
  return `
${statusBar()}
<div style="display:flex;align-items:center;gap:10px;padding:8px 20px 0">
  <span style="width:40px;height:40px;border-radius:999px;border:1px solid rgba(28,74,60,.18);display:grid;place-items:center;font-size:22px">‹</span>
  <span style="flex:1;font-family:ui-monospace,Menlo,monospace;font-size:13px;color:${C.copy}" dir="ltr">${ar ? "" : "H2-0413"}</span>
  ${ar ? `<span style="font-family:ui-monospace,Menlo,monospace;font-size:13px;color:${C.copy}" dir="ltr">H2-0413</span>` : ""}
  ${chip(t("draft"), "draft")}
</div>
<div style="padding:16px 20px 0">
  ${title(t("hourlyInspections"), ar, 30)}
  <div class="${ar ? "ar" : ""}" style="margin-top:4px;font-size:14px;color:${C.copy}">${t("productionHall")} <span dir="ltr">2</span> · ${s.line} · <span dir="ltr">14:00 – 15:00</span></div>
</div>`;
}

function inspectionsScreen(lang) {
  const t = translator(lang);
  const ar = lang === "ar";
  const cls = ar ? "ar" : "";
  const s = SAMPLE[lang];
  const records = [
    ["H2-0412", "13:00", "pendingReview"],
    ["H2-0411", "12:00", "approved"],
    ["H2-0410", "11:00", "returned"],
    ["H2-0409", "10:00", "approved"],
    ["H2-0408", "09:00", "approved"],
  ]
    .map(
      ([serial, time, status], i) => `
    <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;${i ? "border-top:1px solid rgba(28,74,60,.1);" : ""}">
      <div style="flex:1;min-width:0">
        <div style="font-family:ui-monospace,Menlo,monospace;font-size:12px;color:${C.copy}"><span dir="ltr">${serial}</span></div>
        <div class="${cls}" style="margin-top:2px;font-size:15px;font-weight:700">${s.product}</div>
        <div class="${cls}" style="margin-top:2px;font-size:12px;color:${C.copy}"><span dir="ltr">${time}</span> · ${s.line}</div>
      </div>
      ${chip(t(status), status)}
    </div>`,
    )
    .join("");

  return `
${statusBar()}
${header(t("qualityControl"), ar)}
<div style="padding:26px 20px 0">
  ${overline(t("productionMonitoring"), ar)}
  <div style="margin-top:4px">${title(t("hourlyInspections"), ar)}</div>
</div>
<div style="margin:20px 20px 0;padding:20px;border-radius:20px;background:${C.forest};color:${C.cream};position:relative;overflow:hidden">
  <span style="position:absolute;${ar ? "left" : "right"}:-30px;top:-40px;width:140px;height:140px;border-radius:999px;background:rgba(210,242,212,.07)"></span>
  ${overline(t("currentHour"), ar, C.amber)}
  <div class="display" style="margin-top:6px;font-size:34px;line-height:38px"><span dir="ltr">14:00 – 15:00</span></div>
  <div class="${cls}" style="margin-top:6px;font-size:14px;color:${C.darkCopy}">${t("productionHall")} <span dir="ltr">2</span> · ${s.line}</div>
  <div class="${cls}" style="margin-top:16px;display:flex;align-items:center;justify-content:center;gap:8px;height:48px;border-radius:999px;background:${C.amber};color:${C.ink};font-weight:800;font-size:16px;box-shadow:inset 0 -3px 0 rgba(182,97,8,.22)">+ ${t("newInspection")}</div>
</div>
<div class="${ar ? "ar" : "display"}" style="margin:26px 20px 10px;font-size:22px;font-weight:800">${t("recentRecords")}</div>
<div style="margin:0 20px">${card(records)}</div>`;
}

function captureScreen(lang) {
  const t = translator(lang);
  const ar = lang === "ar";
  const cls = ar ? "ar" : "";
  return `
<div style="position:absolute;inset:0 0 auto;height:470px;background:#0D2B24;overflow:hidden">
  ${statusBar(true)}
  <div dir="ltr" style="position:absolute;left:44px;right:44px;top:120px;height:230px;transform:rotate(-2deg);border-radius:6px;background:linear-gradient(160deg,#D9B67C,#C49A5C);box-shadow:0 20px 40px rgba(0,0,0,.4)">
    <div style="position:absolute;inset:26px 26px;background:#FBF6EA;border-radius:4px;padding:18px 20px;font-family:ui-monospace,Menlo,monospace;color:#1d1d1d">
      <div style="font-size:11px;letter-spacing:2px;opacity:.6">MILK CHOCOLATE WAFER BITES</div>
      <div style="margin-top:12px;font-size:28px;font-weight:700;letter-spacing:1px">060826 1</div>
      <div style="margin-top:10px;font-size:12px;line-height:18px">BEST BEFORE 06/02/2027<br>NET WT 1.0 KG · HALL 2</div>
    </div>
  </div>
  ${["left:30px;top:100px;border-width:4px 0 0 4px", "right:30px;top:100px;border-width:4px 4px 0 0", "left:30px;top:340px;border-width:0 0 4px 4px", "right:30px;top:340px;border-width:0 4px 4px 0"]
    .map((pos) => `<span style="position:absolute;${pos};width:44px;height:44px;border-style:solid;border-color:${C.amber};border-radius:6px"></span>`)
    .join("")}
  <div class="${cls}" style="position:absolute;left:0;right:0;top:404px;text-align:center;color:#D2F2D4;font-size:14px;font-weight:600">${t("cameraReadyHelp")}</div>
</div>
<div style="position:absolute;left:0;right:0;top:440px;bottom:0;background:${C.mintSoft};border-radius:28px 28px 0 0;padding:26px 20px">
  <div style="font-family:ui-monospace,Menlo,monospace;font-size:12px;color:${C.copy}" dir="ltr">H2-0413</div>
  <div style="margin-top:4px">${title(t("cartonLabel"), ar, 26)}</div>
  <div class="${cls}" style="margin-top:20px;font-size:13px;font-weight:700">${t("printedBatchCode")}</div>
  <div dir="ltr" style="margin-top:8px;height:58px;border-radius:14px;border:2px solid ${C.forest};background:${C.cream};display:flex;align-items:center;justify-content:${ar ? "flex-end" : "flex-start"};padding:0 16px;font-family:ui-monospace,Menlo,monospace;font-size:24px;font-weight:700;letter-spacing:1px">060826 1<span style="margin-left:2px;width:2px;height:26px;background:${C.orange}"></span></div>
  <div class="${cls}" style="margin-top:6px;font-size:12px;color:${C.copy}">${t("batchCodeHelp")}</div>
  <div class="${cls}" style="margin-top:18px;display:flex;gap:12px;align-items:center;font-size:15px;font-weight:600">
    <span style="flex:none;width:26px;height:26px;border-radius:8px;background:${C.forest};color:${C.cream};display:grid;place-items:center;font-size:16px">✓</span>
    ${t("confirmMatch")}
  </div>
  <div class="${cls}" style="margin-top:24px;height:54px;border-radius:999px;background:${C.forest};color:${C.cream};display:grid;place-items:center;font-weight:800;font-size:17px">${t("confirmCode")}</div>
</div>`;
}

const RED = "#A43434";
const GREEN = "#247A51";

function readingsScreen(lang) {
  const t = translator(lang);
  const ar = lang === "ar";
  const cls = ar ? "ar" : "";
  const reading = (index, value, unit, within) => `
  <div>
    <div class="${cls}" style="margin-bottom:5px;font-size:12px;color:${C.copy}">${t("readingNumber", { number: index })}</div>
    <div style="height:50px;border-radius:16px;border:1px solid ${within ? "rgba(36,122,81,.45)" : "rgba(164,52,52,.55)"};background:${within ? "#F3FBF2" : "#FFF0ED"};display:flex;align-items:center;gap:8px;padding:0 14px">
      <span style="flex:1;font-size:18px" dir="ltr">${value}</span>
      <b style="font-size:14px;color:${C.copy}" dir="ltr">${unit}</b>
      <span style="width:18px;height:18px;border-radius:999px;border:2px solid ${within ? GREEN : RED};color:${within ? GREEN : RED};display:grid;place-items:center;font-size:11px;font-weight:900">${within ? "✓" : "!"}</span>
    </div>
    <div class="${cls}" style="margin-top:4px;font-size:12px;font-weight:700;color:${within ? GREEN : RED}">${within ? t("withinRange") : t("outsideRange")}</div>
  </div>`;
  const group = (key, min, max, unit, done, required, rows, border) => `
  <div style="padding:16px 18px 18px;${border ? "border-top:1px solid rgba(28,74,60,.1)" : ""}">
    <div style="display:flex;align-items:flex-start;gap:12px">
      <div style="flex:1">
        <div class="${cls}" style="font-size:15px;font-weight:700">${t(key)}</div>
        <div style="margin-top:2px;font-size:12px;color:${C.copy}">${t("acceptableRange", { minimum: min, maximum: max, unit })}</div>
      </div>
      ${pill(`<span class="${cls}">${t("readingsCompleted", { completed: done, required })}</span>`)}
    </div>
    <div style="margin-top:12px;display:grid;gap:10px">${rows}</div>
  </div>`;

  return `
${recordHeader(lang)}
<div style="margin:16px 20px 0">${card(
    `<div style="padding:16px 18px;border-bottom:1px solid rgba(28,74,60,.1)">
      ${overline(t("measurements"), ar)}
      <div class="${cls}" style="margin-top:6px;font-size:13px;line-height:18px;color:${C.copy}">${t("measurementHelp")}</div>
    </div>
    ${group("coatedPieceWeight", "12.0", "13.0", "g", 3, 3, reading(1, "12.4", "g", true) + reading(2, "12.7", "g", true) + reading(3, "13.4", "g", false), false)}
    ${group("chocolateTemperature", "29.0", "31.0", "°C", 1, 2, reading(1, "30.2", "°C", true), true)}`,
    "overflow:hidden",
  )}</div>`;
}

function complianceScreen(lang) {
  const t = translator(lang);
  const ar = lang === "ar";
  const cls = ar ? "ar" : "";
  const keys = ["checkSealingMachine", "checkProductionDate", "checkBatchNumber", "checkWeightOrVolume", "checkChocolateWeight", "checkPackaging", "checkProductShape"];
  const box = (size) =>
    `<span style="flex:none;width:${size}px;height:${size}px;border-radius:${size / 3}px;background:${C.forest};color:${C.cream};display:grid;place-items:center;font-size:${size * 0.55}px;font-weight:800">✓</span>`;
  const rows = keys.map((key) => `<div style="display:flex;align-items:center;gap:12px;height:40px;padding:0 12px">${box(24)}<span class="${cls}" style="font-size:15px">${t(key)}</span></div>`).join("");

  return `
${recordHeader(lang)}
<div style="margin:16px 20px 0">${card(
    `<div style="padding:16px 18px;border-bottom:1px solid rgba(28,74,60,.1)">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
        ${overline(t("complianceChecks"), ar)}
        ${pill(`<span class="${cls}">${t("complianceCompleted", { completed: 22, total: 22 })}</span>`)}
      </div>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px 6px">
      <span class="${cls}" style="font-size:15px;font-weight:700">${t("complianceProductPackaging")}</span>
      <span class="${cls}" style="display:flex;align-items:center;gap:8px;font-size:12px;color:${C.copy}">${box(20)}${t("clearAll")}</span>
    </div>
    <div style="padding:0 6px 12px">${rows}</div>`,
    "overflow:hidden",
  )}</div>
<div style="position:absolute;left:0;right:0;bottom:0;padding:16px 20px 34px;background:${C.cream};border-top:1px solid rgba(28,74,60,.12)">
  ${overline(t("reviewSubmission"), ar)}
  <div class="${cls}" style="margin-top:6px;display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:18px;color:${GREEN};font-weight:600">
    <span style="flex:none;width:18px;height:18px;border-radius:999px;border:2px solid ${GREEN};display:grid;place-items:center;font-size:11px;font-weight:900">✓</span>${t("readyForReview")}
  </div>
  <div class="${cls}" style="margin-top:14px;height:54px;border-radius:999px;background:${C.forest};color:${C.cream};display:grid;place-items:center;font-weight:800;font-size:17px">${t("submitForReview")}</div>
</div>`;
}

const icon = (paths, color, size = 19) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths.map((d) => `<path d="${d}"/>`).join("")}</svg>`;
const SCAN_FACE = ["M3 7V5a2 2 0 0 1 2-2h2", "M17 3h2a2 2 0 0 1 2 2v2", "M21 17v2a2 2 0 0 1-2 2h-2", "M7 21H5a2 2 0 0 1-2-2v-2", "M8 14s1.5 2 4 2 4-2 4-2", "M9 9h.01", "M15 9h.01"];
const REVIEW_CHECK = ["M22 12a10 10 0 1 1-20 0a10 10 0 1 1 20 0", "m9 12 2 2 4-4"];
const UNDO = ["M9 14 4 9l5-5", "M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"];

/** Reviewer's view of a pending record (ReviewDecisionPanel in the app) with the system Face ID prompt on top. */
function approvalScreen(lang) {
  const t = translator(lang);
  const ar = lang === "ar";
  const cls = ar ? "ar" : "";
  const s = SAMPLE[lang];
  const inspector = ar ? "سارة حدّاد" : "Sara Haddad";
  const summaryRow = (label, value) => `
    <div style="display:flex;align-items:center;gap:10px">
      ${icon(REVIEW_CHECK, GREEN, 18)}
      <span class="${cls}" style="flex:1;font-size:14px;font-weight:700">${label}</span>
      <span class="${cls}" style="font-size:12px">${value}</span>
    </div>`;
  const contextPill = (text) =>
    `<span class="${cls}" style="border-radius:999px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.1);padding:6px 11px;font-size:12px;color:#E1EEE6;white-space:nowrap">${text}</span>`;
  return `
${statusBar()}
<div style="display:flex;align-items:center;gap:12px;padding:6px 20px 0">
  <span style="flex:none;width:44px;height:44px;border-radius:999px;border:1px solid rgba(28,74,60,.1);background:${C.cream};display:grid;place-items:center">${icon([ar ? "m9 18 6-6-6-6" : "m15 18-6-6 6-6"], C.copy, 20)}</span>
  ${tile(40)}
  <div style="flex:1;min-width:0">
    <div class="display" style="font-size:20px;line-height:24px;letter-spacing:0">Flavoneer</div>
    <div style="margin-top:2px">${overline(t("qualityControl"), ar)}</div>
  </div>
  <span class="${cls}" style="flex:none;border-radius:999px;border:1px solid rgba(28,74,60,.1);background:rgba(255,253,244,.9);padding:7px 12px;font-size:12px;color:${C.copy}">${t("online")}</span>
</div>
<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 24px 0">
  ${overline(t("serial"), ar)}
  <b style="font-size:14px" dir="ltr">H2-0412</b>
</div>
<div style="margin:12px 20px 0;padding:18px 20px;border-radius:30px;background:${C.forest};position:relative;overflow:hidden">
  <span style="position:absolute;${ar ? "left" : "right"}:-44px;top:-52px;width:150px;height:150px;border-radius:999px;border:26px solid rgba(245,166,35,.15)"></span>
  ${overline(t("inspectionContext"), ar, "#B9D8C8")}
  <div class="${ar ? "ar" : "display"}" style="margin-top:6px;font-size:23px;line-height:28px;font-weight:800;color:${C.cream}">${s.product}</div>
  <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:6px">
    ${contextPill(`${t("productionHall")} <span dir="ltr">2</span>`)}${contextPill(s.line)}${contextPill(`<span dir="ltr">13:00</span>`)}
  </div>
</div>
<div style="margin:12px 20px 0;padding:20px;border-radius:30px;background:${C.cream};border:1px solid rgba(28,74,60,.14);box-shadow:0 10px 24px rgba(16,47,39,.07)">
  ${overline(t("productionReview"), ar)}
  <div class="${ar ? "ar" : "display"}" style="margin-top:6px;font-size:21px;line-height:26px;font-weight:800">${t("reviewDecision")}</div>
  <div class="${cls}" style="margin-top:6px;font-size:13px;line-height:18px;color:${C.copy}">${t("reviewDecisionHelp")}</div>
  <div style="margin-top:14px;border-radius:16px;background:${C.mintSoft};padding:12px 14px;display:grid;gap:10px">
    ${summaryRow(t("confirmedEvidence"), `<span style="font-family:ui-monospace,Menlo,monospace" dir="ltr">060826 1</span>`)}
    ${summaryRow(t("measurements"), t("allReadingsWithinRange"))}
    ${summaryRow(t("complianceChecks"), t("complianceCompleted", { completed: 22, total: 22 }))}
    <div class="${cls}" style="border-top:1px solid rgba(28,74,60,.1);padding-top:10px;font-size:12px;color:${C.copy}">${t("inspectedBy", { name: inspector })}</div>
  </div>
  <div style="margin-top:14px">${overline(t("reviewNote"), ar)}</div>
  <div class="${cls}" style="margin-top:8px;height:64px;border-radius:16px;border:1px solid rgba(28,74,60,.12);background:${C.mintSoft};padding:11px 14px;font-size:14px;color:#789489">${t("reviewNotePlaceholder")}</div>
  <div style="margin-top:16px;display:flex;gap:10px">
    <div class="${cls}" style="flex:1;height:54px;border-radius:19px;border:2px solid ${C.forest};display:flex;align-items:center;justify-content:center;gap:8px;font-weight:700;font-size:15px">${icon(UNDO, C.forest)}${t("returnRecord")}</div>
    <div class="${cls}" style="flex:1.4;height:54px;border-radius:19px;background:${C.forest};color:#fff;display:flex;align-items:center;justify-content:center;gap:8px;font-weight:700;font-size:15px">${icon(SCAN_FACE, "#fff")}${t("approveRecord")}</div>
  </div>
  <div class="${cls}" style="margin-top:12px;text-align:center;font-size:12px;color:${C.copy}">${t("biometricOnDevice")}</div>
</div>
<div dir="ltr" style="position:absolute;left:50%;top:136px;width:160px;height:160px;transform:translateX(-50%);border-radius:34px;background:rgba(242,242,237,.96);box-shadow:0 20px 50px rgba(0,0,0,.25);display:grid;place-items:center;text-align:center">
  <div>
    <svg width="70" height="70" viewBox="0 0 74 74" fill="none" stroke="${GREEN}" stroke-width="4" stroke-linecap="round"><path d="M4 20V12a8 8 0 0 1 8-8h8M54 4h8a8 8 0 0 1 8 8v8M70 54v8a8 8 0 0 1-8 8h-8M20 70h-8a8 8 0 0 1-8-8v-8"/><path d="M24 26v6M50 26v6M37 28v14h-4M27 51c6 5 14 5 20 0"/></svg>
    <div style="margin-top:10px;font-size:16px;font-weight:600;color:#1d1d1d">Face ID</div>
  </div>
</div>`;
}

const FLASK = ["M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2", "M6.453 15h11.094", "M8.5 2h7"];
const CIRCLE_CHECK = ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "m9 12 2 2 4-4"];

// Sample formulation; figures are formatted the way FormulationDetailScreen formats them (Latin digits in both languages).
const FORMULATION = {
  en: { name: "Cultured Oat Drink", category: "Beverages", ingredients: ["Oat base", "Canola oil", "Pea protein", "Mineral blend"] },
  ar: { name: "مشروب الشوفان المخمّر", category: "المشروبات", ingredients: ["قاعدة الشوفان", "زيت الكانولا", "بروتين البازلاء", "خليط المعادن"] },
};

/** Formulation detail in the R&D section (FormulationDetailScreen in the app). */
function formulationScreen(lang) {
  const t = translator(lang);
  const ar = lang === "ar";
  const cls = ar ? "ar" : "";
  const f = FORMULATION[lang];
  const divider = "rgba(28,74,60,.1)";
  const heroPill = (text) =>
    `<span class="${cls}" style="border-radius:999px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.1);padding:6px 11px;font-size:12px;color:#E1EEE6;white-space:nowrap">${text}</span>`;
  const figure = (label, value, mark = "") => `
    <div style="flex:1;min-width:0;padding:13px 18px">
      <div class="${cls}" style="font-size:12px;color:${C.copy}">${label}</div>
      <div style="margin-top:3px;display:flex;align-items:center;gap:6px;font-size:20px;line-height:26px;font-weight:700">${mark}<span dir="ltr">${value}</span></div>
    </div>`;
  const ingredient = ([name, amount, share], i) => `
    <div style="padding:11px 0;border-top:1px solid ${divider}">
      <div style="display:flex;align-items:baseline;gap:12px">
        <span class="${cls}" style="flex:1;font-size:14px;font-weight:700">${name}</span>
        <span style="font-size:12px;color:${C.copy}" dir="ltr">${amount}</span>
        <b style="font-size:14px" dir="ltr">${share}</b>
      </div>
      <div style="margin-top:8px;height:6px;border-radius:3px;background:#DCEBDD;overflow:hidden"><div style="width:${[84, 8, 6, 2][i]}%;height:100%;border-radius:3px;background:${C.amber}"></div></div>
    </div>`;
  return `
${statusBar()}
<div style="display:flex;align-items:center;gap:12px;padding:6px 20px 0">
  <span style="flex:none;width:44px;height:44px;border-radius:999px;border:1px solid rgba(28,74,60,.1);background:${C.cream};display:grid;place-items:center">${icon([ar ? "m9 18 6-6-6-6" : "m15 18-6-6 6-6"], C.ink, 20)}</span>
  <span style="flex:none;position:relative;width:48px;height:48px;border-radius:17px;background:${C.amber};display:grid;place-items:center;box-shadow:0 6px 10px rgba(16,47,39,.16)">
    ${icon(FLASK, C.ink, 23)}
    <span style="position:absolute;${ar ? "left" : "right"}:-4px;bottom:-4px;width:18px;height:18px;border-radius:999px;border:2px solid ${C.ink};background:${C.cream};display:grid;place-items:center">${icon(["m6 9 6 6 6-6"], C.ink, 10)}</span>
  </span>
  <div style="flex:1;min-width:0">
    <div class="display" style="font-size:22px;line-height:24px;letter-spacing:0">Flavoneer</div>
    <div style="margin-top:2px">${overline(t("researchWorkspace"), ar)}</div>
  </div>
</div>
<div style="margin:22px 20px 0;padding:22px;border-radius:32px;background:${C.forest};position:relative;overflow:hidden">
  <span style="position:absolute;${ar ? "left" : "right"}:-56px;top:-64px;width:176px;height:176px;border-radius:999px;border:30px solid rgba(245,166,35,.15)"></span>
  <div style="display:flex;align-items:center;justify-content:space-between">
    <span style="width:46px;height:46px;border-radius:16px;background:${C.amber};display:grid;place-items:center">${icon(FLASK, C.ink, 22)}</span>
    <span class="${cls}" style="border-radius:999px;padding:4px 10px;font-size:11px;font-weight:700;background:${C.mint};color:${C.ink}">${t("statusTesting")}</span>
  </div>
  <div style="margin-top:20px">${overline(t("formulation"), ar, "#B9D8C8")}</div>
  <div class="${ar ? "ar" : "display"}" style="margin-top:6px;font-size:30px;line-height:36px;font-weight:800;letter-spacing:${ar ? 0 : -0.8}px;color:${C.cream}">${f.name}</div>
  <div style="margin-top:16px;display:flex;flex-wrap:wrap;gap:6px">${heroPill(t("version", { version: "V4" }))}${heroPill(f.category)}</div>
</div>
<div style="margin:16px 20px 0">${card(
    `<div style="display:flex">${figure(t("batchWeight"), "100.0 kg")}<span style="width:1px;background:${divider}"></span>${figure(t("batchCost"), "$184.20")}</div>
    <div style="height:1px;background:${divider}"></div>
    <div style="display:flex">${figure(t("costPerServing"), "$0.37")}<span style="width:1px;background:${divider}"></span>${figure(t("massBalance"), "100.0%", icon(CIRCLE_CHECK, GREEN, 17))}</div>`,
    "overflow:hidden;border-radius:28px",
  )}</div>
<div style="margin:16px 20px 0">${card(
    `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">${overline(t("ingredients"), ar)}<span style="font-size:12px;color:${C.copy}">4</span></div>
    ${[
      [f.ingredients[0], "84,000 g", "84.0%"],
      [f.ingredients[1], "8,000 g", "8.00%"],
      [f.ingredients[2], "6,000 g", "6.00%"],
      [f.ingredients[3], "2,000 g", "2.00%"],
    ]
      .map(ingredient)
      .join("")}`,
    "border-radius:28px;padding:18px 20px 8px",
  )}</div>`;
}

const SCREENS = {
  inspections: inspectionsScreen,
  capture: captureScreen,
  approval: approvalScreen,
  formulation: formulationScreen,
  readings: readingsScreen,
  compliance: complianceScreen,
};

const ar = (text) => `<span class="ar">${text}</span>`;

// One set per store listing language. Screen `lang` can differ from the listing to show the other language.
export const SCREENSHOT_SETS = {
  en: [
    { id: "01-inspections", screen: "inspections", lang: "en", theme: "light", headline: `Every hour on the line, ${loop("recorded.", 1.4)}` },
    { id: "02-batch-label", screen: "capture", lang: "en", theme: "dark", headline: `Snap the label. Confirm the ${loop("batch.", 1.4)}` },
    { id: "03-approve", screen: "approval", lang: "en", theme: "light", headline: `Approve records with ${loop("Face ID.", 1.4)}` },
    { id: "04-formulations", screen: "formulation", lang: "en", theme: "dark", headline: `Every formula, costed to the ${loop("serving.", 1.4)}` },
    { id: "05-readings", screen: "readings", lang: "en", theme: "light", headline: `Every reading checked against ${loop("spec.", 1.4)}` },
    { id: "06-compliance", screen: "compliance", lang: "en", theme: "dark", headline: `Tick every check. Submit for ${loop("review.", 1.4)}` },
    {
      id: "07-arabic",
      screen: "inspections",
      lang: "ar",
      theme: "light",
      dir: "rtl",
      headline: ar(`يعمل ${loop("بالعربية", 1.4)} والإنجليزية`),
      sub: "Works in Arabic and English",
    },
  ],
  ar: [
    { id: "01-inspections", screen: "inspections", lang: "ar", theme: "light", dir: "rtl", headline: ar(`كل ساعة على الخط ${loop("مسجّلة.", 1.4)}`) },
    { id: "02-batch-label", screen: "capture", lang: "ar", theme: "dark", dir: "rtl", headline: ar(`صوّر البطاقة. ${loop("أكّد الدفعة.", 1.4)}`) },
    { id: "03-approve", screen: "approval", lang: "ar", theme: "light", dir: "rtl", headline: ar(`اعتمد السجلات ${loop("ببصمة الوجه.", 1.4)}`) },
    { id: "04-formulations", screen: "formulation", lang: "ar", theme: "dark", dir: "rtl", headline: ar(`كل تركيبة بتكلفتها ${loop("لكل حصة.", 1.4)}`) },
    { id: "05-readings", screen: "readings", lang: "ar", theme: "light", dir: "rtl", headline: ar(`كل قراءة تُقارن ${loop("بالمواصفة.", 1.4)}`) },
    { id: "06-compliance", screen: "compliance", lang: "ar", theme: "dark", dir: "rtl", headline: ar(`أكمل الفحوصات ثم ${loop("أرسلها للمراجعة.", 1.4)}`) },
    {
      id: "07-english",
      screen: "inspections",
      lang: "en",
      theme: "light",
      dir: "rtl",
      headline: ar(`يعمل بالعربية ${loop("والإنجليزية", 1.4)}`),
      sub: "Works in Arabic and English",
    },
  ],
};

const BEZEL = 14;

/** A phone showing one app screen, drawn at `scale` with its top-left corner at (`left`, `top`). */
function phone({ screen, lang, dark = false, scale, left, top, rotate = 0, shadow = 1 }) {
  return `<div class="abs" style="left:${left}px;top:${top}px;width:${SCREEN_W + BEZEL * 2}px;height:${SCREEN_H + BEZEL * 2}px;transform:rotate(${rotate}deg) scale(${scale});transform-origin:0 0;border-radius:64px;background:${dark ? "#081F1A" : C.ink};padding:${BEZEL}px;${rotate ? `filter:drop-shadow(0 30px 40px rgba(16,47,39,${(dark ? 0.6 : 0.28) * shadow}));` : `box-shadow:0 30px 80px rgba(16,47,39,${(dark ? 0.6 : 0.28) * shadow}),`}${rotate ? "box-shadow:" : ""}inset 0 0 0 2px ${dark ? "rgba(210,242,212,.2)" : "rgba(255,255,255,.08)"}">
    <div style="position:relative;width:${SCREEN_W}px;height:${SCREEN_H}px;border-radius:50px;overflow:hidden;background:${C.mintSoft}" dir="${lang === "ar" ? "rtl" : "ltr"}">
      ${SCREENS[screen](lang)}
      <div style="position:absolute;left:50%;top:11px;width:122px;height:35px;border-radius:20px;background:#000;transform:translateX(-50%)"></div>
      ${homeIndicator()}
    </div>
  </div>`;
}

/** A store screenshot: headline on top, scaled phone below. */
export function screenshot({ width, height, shot }) {
  const dark = shot.theme === "dark";
  const u = width / 1290;
  const headlineTop = height * 0.055;
  const headlineSize = 104 * u * (height / width > 2 ? 1 : 0.86);
  const phoneTop = height * (height / width > 2 ? 0.175 : 0.2);
  const scale = Math.min((height - phoneTop + 60 * u) / (SCREEN_H + BEZEL * 2), (width * 0.8) / (SCREEN_W + BEZEL * 2));
  const phoneW = (SCREEN_W + BEZEL * 2) * scale;

  const body = `
  <div class="abs ${dark ? "grid-bg dark" : ""}" style="inset:0;${dark ? `background-color:${C.deepForest};--g:${40 * u}px` : `background:radial-gradient(120% 60% at 50% 20%,${C.mintSoft},${C.mint} 70%)`}"></div>
  <div class="${dark ? "dark" : ""}">${bubbles([[0.06, 0.04, 40 * u], [0.86, 0.06, 64 * u], [0.9, 0.3, 24 * u], [0.04, 0.36, 18 * u]], 2 * u)}</div>
  <div class="abs" style="left:${80 * u}px;right:${80 * u}px;top:${headlineTop}px;text-align:center">
    <div class="display" style="font-size:${headlineSize}px;line-height:1.06;color:${dark ? "#EFFBEF" : C.inkDeep}" dir="${shot.dir ?? "ltr"}">${shot.headline}</div>
    ${shot.sub ? `<div style="margin-top:${24 * u}px;font-size:${40 * u}px;font-weight:600;color:${C.forest}">${shot.sub}</div>` : ""}
  </div>
  ${phone({ screen: shot.screen, lang: shot.lang, dark, scale, left: (width - phoneW) / 2, top: phoneTop })}`;
  return page({ width, height, body });
}

// --- App Store creative assets (iOS 27 product page header and search results) ---

// Short phrases only: Apple asks for one idea per asset, and no URLs or prices.
const CREATIVE_HEADLINES = {
  en: `Quality checks for every ${loop("production line.", 2.6)}`,
  ar: ar(`فحوصات الجودة لكل ${loop("خط إنتاج.", 2.6)}`),
};

// Three phones fanned around the center: the approval screen in front, capture and inspections behind it.
function phoneFan({ lang, centerX, top, scale, spread }) {
  const w = (SCREEN_W + BEZEL * 2) * scale;
  const rtl = lang === "ar";
  const side = (offset) => centerX - w / 2 + (rtl ? -offset : offset);
  return [
    phone({ screen: "capture", lang, dark: true, scale: scale * 0.9, left: side(-spread - w * 0.03), top: top + w * (rtl ? 0.1 : 0.22), rotate: rtl ? 7 : -7, shadow: 0.8 }),
    phone({ screen: "inspections", lang, scale: scale * 0.9, left: side(spread + w * 0.08), top: top + w * (rtl ? 0.22 : 0.1), rotate: rtl ? -7 : 7, shadow: 0.8 }),
    phone({ screen: "approval", lang, scale, left: centerX - w / 2, top }),
  ].join("");
}

const creativeBackground = (u) => `
  <div class="abs" style="inset:0;background:radial-gradient(70% 90% at 50% 40%,${C.mintSoft} 0%,${C.mint} 75%)"></div>
  ${bubbles([[0.07, 0.14, 90 * u], [0.16, 0.62, 40 * u], [0.84, 0.12, 120 * u], [0.9, 0.58, 54 * u], [0.3, 0.08, 30 * u], [0.68, 0.74, 36 * u]], 4 * u)}`;

/**
 * Product page header (21:9). Apple overlays the app icon, name, and Get button on the lower part and crops
 * the sides on narrow screens, so the art has no text and keeps the phones in the middle third.
 */
export function productHeader({ width, height, lang }) {
  const u = width / 3840;
  const scale = (height * 1.02) / (SCREEN_H + BEZEL * 2);
  const body = `
  ${creativeBackground(u)}
  ${blob({ width: 2600 * u, height: 900 * u, left: (width - 2600 * u) / 2, bottom: -560 * u, rotate: -3 })}
  ${phoneFan({ lang, centerX: width / 2, top: height * 0.1, scale, spread: 560 * u })}`;
  return page({ width, height, body });
}

/** Search results card (3:2): the app's purpose in one line above the phones, all within the center. */
export function searchResult({ width, height, lang }) {
  const u = width / 3840;
  const rtl = lang === "ar";
  const scale = (height * 0.86) / (SCREEN_H + BEZEL * 2);
  const body = `
  ${creativeBackground(u)}
  ${blob({ width: 2800 * u, height: 1000 * u, left: (width - 2800 * u) / 2, bottom: -640 * u, rotate: -3 })}
  <div class="abs" style="left:${360 * u}px;right:${360 * u}px;top:${150 * u}px;text-align:center">
    <div class="${rtl ? "" : "display"}" dir="${rtl ? "rtl" : "ltr"}" style="font-size:${190 * u}px;line-height:1.08;font-weight:800;color:${C.inkDeep}">${CREATIVE_HEADLINES[lang]}</div>
  </div>
  ${phoneFan({ lang, centerX: width / 2, top: height * 0.34, scale, spread: 620 * u })}`;
  return page({ width, height, body });
}
