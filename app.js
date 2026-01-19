// app.js

const els = {
    // שלב 1
    currentRank: document.getElementById("currentRank"),

    // שלב 2
    courseStartRank: document.getElementById("courseStartRank"),
    currentRating: document.getElementById("currentRating"),
    operationalStartSeg: document.getElementById("operationalStartSeg"),
    operationalStart: document.getElementById("operationalStart"),

    // שלב 3
    courseEndRank: document.getElementById("courseEndRank"),
    operationalEndSeg: document.getElementById("operationalEndSeg"),
    operationalEnd: document.getElementById("operationalEnd"),

    // שלב 4
    appointment: document.getElementById("appointment"),
    officerRating: document.getElementById("officerRating"),
    operationalAppSeg: document.getElementById("operationalAppSeg"),
    operationalApp: document.getElementById("operationalApp"),

    // actions/results
    calcBtn: document.getElementById("calcBtn"),
    resetBtn: document.getElementById("resetBtn"),
    results: document.getElementById("results"),
    exportBtn: document.getElementById("exportBtn"),
  };


let DATA = [];

const normalize = (v) => String(v ?? "").trim().replace(/\s+/g, " ");
const moneyILS = (n) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" }).format(Number(n));

const uniq = (arr) => [...new Set(arr)];

function setOptions(selectEl, values, placeholder = "בחר...") {
  selectEl.innerHTML = "";
  const p = document.createElement("option");
  p.value = "";
  p.textContent = placeholder;
  selectEl.appendChild(p);

  values.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    selectEl.appendChild(opt);
  });
}
const END_RANK_BY_START = {
    'רס"מ 0': 'רס"מ 3',
    'רס"מ 3': 'רס"מ 5',
    'רס"מ 5': 'רס"מ 5',
  };
function updateEndRank() {
    const start = normalize(els.courseStartRank.value);
    const end = END_RANK_BY_START[start] || "";
    setOptions(els.courseEndRank, end ? [end] : [], end ? end : "בחרי תחילת קורס קודם...");
    if (end) els.courseEndRank.value = end;
}
function wireSegment(containerEl, hiddenSelectEl) {
  if (!containerEl) return;
  const buttons = [...containerEl.querySelectorAll(".seg-btn")];
  buttons.forEach((b) => {
    b.addEventListener("click", () => {
      buttons.forEach((x) => x.classList.remove("active"));
      b.classList.add("active");

      // אם זה select אמיתי
      if (hiddenSelectEl && typeof hiddenSelectEl.dispatchEvent === "function") {
        hiddenSelectEl.value = b.dataset.value;
        hiddenSelectEl.dispatchEvent(new Event("change"));
      }
    });
  });
}

function iconForActivity(name) {
  const t = normalize(name);
  if (t.includes("א'")) return "fa-flag";
  if (t.includes("א'+")) return "fa-flag";
  if (t.includes("ב'")) return "fa-flag";
  return "fa-layer-group";
}

function renderActivityCards(values) {
  els.activityCards.innerHTML = "";
  values.forEach((v) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "activity-card";
    btn.dataset.value = v;
    btn.innerHTML = `
      <div class="icon"><i class="fa-solid ${iconForActivity(v)}"></i></div>
      <div class="name">${v}</div>
    `;
    btn.addEventListener("click", () => {
      [...els.activityCards.querySelectorAll(".activity-card")].forEach((x) => x.classList.remove("active"));
      btn.classList.add("active");
      els.activity.value = v;
      els.activity.dispatchEvent(new Event("change"));
    });
    els.activityCards.appendChild(btn);
  });
}

function filterBase() {
  const a  = normalize(els.activity.value);
  const rb = normalize(els.rankBefore.value);
  const s  = normalize(els.seniority.value);
  const db = normalize(els.ratingBefore.value);

  const prof = normalize(els.profession?.value);
  const inc  = normalize(els.incentiveGroup?.value);

  return DATA.filter((r) => {
    const okBasic =
      normalize(r["רמת פעילות"]) === a &&
      normalize(r["דרגה לפני"]) === rb &&
      normalize(r["וותק (שנים)"]) === s &&
      normalize(r["דירוג_לפני"]) === db;

    if (!okBasic) return false;

    // אם השדות קיימים – תסנני גם עליהם
    if (els.profession && prof && normalize(r["מקצוע"]) !== prof) return false;
    if (els.incentiveGroup && inc && normalize(r["קבוצת תמריץ"]) !== inc) return false;

    return true;
  });
}


function findOne(rows, stage, operational, extra = {}) {
  const op = Number(operational);
  const candidates = rows.filter((r) => {
    if (normalize(r["שלב"]) !== normalize(stage)) return false;
    if (Number(r["תחנה_מבצעית"]) !== op) return false;
    for (const [k, v] of Object.entries(extra)) {
      if (normalize(r[k]) !== normalize(v)) return false;
    }
    return true;
  });
  return candidates[0] || null;
}

function clearResults() {
  els.results.innerHTML = "";
}

function showWarning(msg) {
  els.results.innerHTML = `<div class="warn">⚠️ ${msg}</div>`;
}

function renderResults(courseStartRow, courseEndRow, appointRow) {
  if (!els.results) return;

  const startSalary = Number(courseStartRow?.["שכר"]);
  const endSalary   = Number(courseEndRow?.["שכר"]);

  const hasStart = Number.isFinite(startSalary);
  const hasEnd   = Number.isFinite(endSalary);

  if (!hasStart || !hasEnd) {
    els.results.innerHTML = `<div class="warn">⚠️ חסר שכר לאחד משלבי הקורס.</div>`;
    return;
  }

  const deltaCourse = endSalary - startSalary;

  const hasApp = !!appointRow;
  const appSalary = hasApp ? Number(appointRow?.["שכר"]) : null;
  const hasAppSalary = hasApp && Number.isFinite(appSalary);

  const deltaApp = hasAppSalary ? (appSalary - endSalary) : null;

  const fmt = (n) => moneyILS(n).replace("₪", "").trim();

  const cls = (d) => (d < 0 ? "negative" : "positive");
  const sign = (d) => (d < 0 ? "-" : "+");

  const startRank = normalize(courseStartRow?.["דרגה"] || "");
  const startRating = normalize(courseStartRow?.["דירוג"] || "אחיד");

  const endRank = normalize(courseEndRow?.["דרגה"] || "");
  const endRating = normalize(courseEndRow?.["דירוג"] || "");

  const appStage = hasApp ? normalize(appointRow?.["שלב"] || "") : "";
  const appRating = hasApp ? normalize(appointRow?.["דירוג"] || "") : "";

  els.results.innerHTML = `
    <div class="calc">

      <div class="line">
        <div class="label">יום תחילת הקורס (${startRank} | דירוג: ${startRating})</div>
        <div class="val">₪ ${fmt(startSalary)}</div>
      </div>

      <div class="op ${cls(deltaCourse)}">
        <div class="sign">${sign(deltaCourse)}</div>
        <div>₪ ${fmt(Math.abs(deltaCourse))}</div>
      </div>

      <div class="line">
        <div class="label">יום סיום הקורס (${endRank} | דירוג: ${endRating})</div>
        <div class="val">₪ ${fmt(endSalary)}</div>
      </div>

      ${
        hasApp
          ? (hasAppSalary
              ? `
                <div class="op ${cls(deltaApp)}">
                  <div class="sign">${sign(deltaApp)}</div>
                  <div>₪ ${fmt(Math.abs(deltaApp))}</div>
                </div>

                <div class="total">
                  <div class="label">${appStage} | דירוג: ${appRating}</div>
                  <div class="val">₪ ${fmt(appSalary)}</div>
                </div>
              `
              : `
                <div class="warn">⚠️ נבחר תקן אחרי קק"צ אבל חסר שכר בשלב הזה.</div>
                <div class="total">
                  <div class="label">תוצאה</div>
                  <div class="val">₪ ${fmt(endSalary)}</div>
                </div>
              `
            )
          : `
            <div class="total">
              <div class="label">תוצאה</div>
              <div class="val">₪ ${fmt(endSalary)}</div>
            </div>
          `
      }

    </div>
  `;
}


function exportResultToFile() {
  // אם אין תוצאה בכלל – לא לייצא
  const hasResult = els.results && els.results.textContent.trim().length > 0;
  if (!hasResult) {
    showWarning("אין תוצאה לייצוא. קודם חשב שכר ואז ייצא.");
    return;
  }

  // אוספים ערכים שנבחרו
  const fields = [
    ["רמת פעילות", els.activity?.value || ""],
    ["מקצוע", els.profession?.value || ""],
    ["קבוצת תמריץ", els.incentiveGroup?.value || ""],
    ["דרגה לפני", els.rankBefore?.value || ""],
    ["וותק (שנים)", els.seniority?.value || ""],
    ["דירוג לפני", els.ratingBefore?.value || ""],
    ["תחנה מבצעית", els.operational?.value === "1" ? "כן" : "לא"],
    ["מינוי אחרי קק\"צ", els.appointment?.value || "בלי מינוי"],
    ["דירוג קצין", els.officerRating?.value || ""],
  ].filter(([_, v]) => v);

  const rows = fields
    .map(([k, v]) => `<tr><td class="k">${k}</td><td class="v">${v}</td></tr>`)
    .join("");

  const now = new Date();
  const dateStr = now.toLocaleString("he-IL");

  // דף להדפסה (PDF דרך Print)
  const doc = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>תוצאות מחשבון שכר</title>
<style>
  body{ font-family: Arial, sans-serif; margin: 24px; color:#0f172a; }
  .paper{ max-width: 820px; margin: 0 auto; border:1px solid #e6eaf2; border-radius: 16px; overflow:hidden; }
  .banner{ width:100%; display:block; }
  .content{ padding: 18px; }
  h1{ margin: 0 0 8px; font-size: 20px; }
  .meta{ color:#475569; font-size: 12px; margin-bottom: 14px; }
  table{ width:100%; border-collapse: collapse; margin: 10px 0 16px; }
  td{ border-bottom:1px solid #e6eaf2; padding: 10px; font-size: 14px; }
  td.k{ color:#475569; width: 38%; font-weight: 700; }
  .result{ border:1px solid #e6eaf2; border-radius: 14px; padding: 12px; }
  @media print{
    body{ margin:0; }
    .paper{ border:0; border-radius:0; }
  }
</style>
</head>
<body>
  <div class="paper">
    <img class="banner" src="./header.png" alt="כותרת"/>
    <div class="content">
      <h1>תוצאות מחשבון שכר</h1>
      <div class="meta">נוצר בתאריך: ${dateStr}</div>
      <table>${rows}</table>
      <div class="result">${els.results.innerHTML}</div>
    </div>
  </div>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) {
    showWarning("הדפדפן חסם חלון קופץ. אפשר Pop-ups לאתר ואז נסה שוב.");
    return;
  }

  w.document.open();
  w.document.write(doc);
  w.document.close();

  // חשוב: לחכות שהתמונה תיטען ואז להדפיס
  w.onload = () => {
    w.focus();
    w.print(); 
  };
}



function refreshOfficerRatings() {
  const ap = els.appointment.value;
  els.officerRating.disabled = !ap;

  if (!ap) {
    setOptions(els.officerRating, [], "בחר דירוג...");
    return;
  }

  const opApp = Number(els.operationalApp.value);

  // דירוגים מתוך הדאטה רק לשלב המינוי הנבחר + תחנה
  const ratings = uniq(
    DATA
      .filter(r => r["שלב"] === normalize(ap) && Number(r["תחנה_מבצעית"]) === opApp)
      .map(r => normalize(r["דירוג"]))
      .filter(Boolean)
  ).sort((a,b)=>a.localeCompare(b,"he"));

  setOptions(els.officerRating, ratings, "בחר דירוג...");
}


function refreshCalcEnabled() {
  const hasStartRank = !!els.courseStartRank.value;
  const hasEndRank = !!END_RANK_BY_START[normalize(els.courseStartRank.value)];
  const hasAppointment = !!els.appointment.value;
  const hasOfficerRating = !hasAppointment || !!els.officerRating.value;

  els.calcBtn.disabled = !(hasStartRank && hasEndRank && hasOfficerRating);
}


function attachListeners() {
  ["activity", "rankBefore", "seniority", "ratingBefore", "operational"].forEach((id) => {
    els[id].addEventListener("change", () => {
      clearResults();
      refreshOfficerRatings();
      refreshCalcEnabled();
    });
  });

  els.appointment.addEventListener("change", () => {
    clearResults();
    refreshOfficerRatings();
    refreshCalcEnabled();
  });

  els.officerRating.addEventListener("change", () => {
    clearResults();
    refreshCalcEnabled();
  });

  els.calcBtn.addEventListener("click", () => {
    clearResults();

    const baseRows = filterBase();
    if (!baseRows.length) {
      showWarning("לא נמצאו נתונים עבור הבחירות האלה. בדוק רמת פעילות/דרגה/וותק/דירוג.");
      return;
    }

    const op = els.operational.value;
    const beforeRow      = findOne(baseRows, 'לפני', op);
    const courseStartRow = findOne(baseRows, 'יום תחילת הקורס', op);
    const courseEndRow   = findOne(baseRows, 'יום סיום הקורס', op);

    if (!beforeRow)      return showWarning('חסר נתון לשלב "לפני" עבור הבחירות שלך.');
    if (!courseStartRow) return showWarning('חסר נתון לשלב "תחילת קורס" עבור הבחירות שלך.');
    if (!courseEndRow)   return showWarning('חסר נתון לשלב "סיום קורס" עבור הבחירות שלך.');


    const ap = els.appointment.value;
    let appointRow = null;

    if (ap) {
      const officerRating = els.officerRating.value;
      appointRow = findOne(baseRows, ap, op, { "דירוג": officerRating });
      if (!appointRow) return showWarning(`לא נמצא נתון עבור ${ap} עם דירוג קצין "${officerRating}".`);
    }

    renderResults(beforeRow, afterRow, appointRow);
  });

  els.resetBtn.addEventListener("click", () => {
    els.results.innerHTML = "";

    els.rankBefore.value = "";
    els.seniority.value = "";
    els.ratingBefore.value = "";
    els.appointment.value = "";
    els.officerRating.value = "";
    els.officerRating.disabled = true;

    // מבצעית ל"לא"
    els.operational.value = "0";
    [...els.operationalSeg.querySelectorAll(".seg-btn")].forEach((x) => x.classList.remove("active"));
    els.operationalSeg.querySelector('.seg-btn[data-value="0"]')?.classList.add("active");

    // פעילות
    els.activity.value = "";
    [...els.activityCards.querySelectorAll(".activity-card")].forEach((x) => x.classList.remove("active"));

    refreshCalcEnabled();
  });
  ["profession", "incentiveGroup"].forEach((id) => {
    if (!els[id]) return;
    els[id].addEventListener("change", () => {
      clearResults();
      refreshOfficerRatings();
      refreshCalcEnabled();
    });
  });
  if (els.exportBtn) {
    els.exportBtn.addEventListener("click", exportResultToFile);
  }

}

function init() {
  if (!window.SALARY_DATA) {
    els.results.innerHTML = `<div class="warn">⚠️ לא נמצא window.SALARY_DATA. ודאי ש-data_normalized.js נטען לפני app.js.</div>`;
    return;
  }

  DATA = window.SALARY_DATA.map((r) => ({
    ...r,
    "שלב": normalize(r["שלב"]),
    "דירוג": normalize(r["דירוג"]),
    "דרגה": normalize(r["דרגה"]),
    "תחנה_מבצעית": Number(r["תחנה_מבצעית"]),
    "שכר": Number(r["שכר"]),
  }));

  // שלב 1: דרגה נוכחית - רק רס"ר 8
  setOptions(els.currentRank, ['רס"ר 8'], 'בחר דרגה...');
  els.currentRank.value = 'רס"ר 8';
  els.currentRank.disabled = true;

  // שלב 2: תחילת קורס - דרגות קבועות
  setOptions(els.courseStartRank, ['רס"מ 0', 'רס"מ 3', 'רס"מ 5'], 'בחר דרגה...');
  // דירוג נוכחי - רק אחיד
  setOptions(els.currentRating, ['אחיד'], 'בחר דירוג...');
  els.currentRating.value = 'אחיד';
  els.currentRating.disabled = true;

  // שלב 3: סיום קורס - נקבע אוטומטית
  setOptions(els.courseEndRank, [], 'בחרי תחילת קורס קודם...');
  els.courseEndRank.disabled = true;

  // חיבור Segments
  wireSegment(els.operationalStartSeg, els.operationalStart);
  wireSegment(els.operationalEndSeg, els.operationalEnd);
  wireSegment(els.operationalAppSeg, els.operationalApp);

  // שינויים שמעדכנים דרגת סיום
  els.courseStartRank.addEventListener("change", () => {
    clearResults();
    updateEndRank();
    refreshOfficerRatings(); // כי השלב הבא תלוי בחיתוכים
    refreshCalcEnabled();
  });

  // מינוי ודירוג אחרי קק"צ
  els.appointment.addEventListener("change", () => {
    clearResults();
    refreshOfficerRatings();
    refreshCalcEnabled();
  });

  els.officerRating.addEventListener("change", () => {
    clearResults();
    refreshCalcEnabled();
  });

  // שינוי תחנה בכל אחד מהשלבים
  [els.operationalStart, els.operationalEnd, els.operationalApp].forEach((x) => {
    x.addEventListener("change", () => {
      clearResults();
      refreshOfficerRatings();
      refreshCalcEnabled();
    });
  });

  // כפתורים
  els.calcBtn.addEventListener("click", onCalculate);
  els.resetBtn.addEventListener("click", onReset);
  if (els.exportBtn) els.exportBtn.addEventListener("click", exportResultToFile);

  refreshOfficerRatings();
  refreshCalcEnabled();
}
function onCalculate() {
  clearResults();

  const startRank = normalize(els.courseStartRank.value);
  const endRank = END_RANK_BY_START[startRank];

  if (!startRank) return showWarning("בחרי דרגה ביום תחילת הקורס.");
  if (!endRank) return showWarning("לא הצלחתי לגזור דרגה ביום אחרון הקורס.");

  const opStart = Number(els.operationalStart.value);
  const opEnd   = Number(els.operationalEnd.value);

  // תחילת קורס (דירוג תמיד אחיד)
  const startRow = DATA.find(r =>
    r["שלב"] === "יום תחילת הקורס" &&
    r["דרגה"] === startRank &&
    r["דירוג"] === "אחיד" &&
    Number(r["תחנה_מבצעית"]) === opStart
  );

  if (!startRow) return showWarning('חסר נתון בטבלה: "יום תחילת הקורס" עבור הבחירות שלך.');

  // סיום קורס (דירוג — עדיין אחיד כרגע כי לא ביקשת בחירה פה. אם תרצי נוסיף בחירה.)
  const endRow = DATA.find(r =>
    r["שלב"] === "יום סיום הקורס" &&
    r["דרגה"] === endRank &&
    Number(r["תחנה_מבצעית"]) === opEnd
  );

  if (!endRow) return showWarning('חסר נתון בטבלה: "יום סיום הקורס" עבור הבחירות שלך.');

  // תקן אחרי קק"צ (אופציונלי)
  let appRow = null;
  const ap = normalize(els.appointment.value);
  const opApp = Number(els.operationalApp.value);

  if (ap) {
    const rating = normalize(els.officerRating.value);
    appRow = DATA.find(r =>
      r["שלב"] === ap &&
      r["דירוג"] === rating &&
      Number(r["תחנה_מבצעית"]) === opApp
    );
    if (!appRow) return showWarning(`חסר נתון בטבלה עבור ${ap} עם דירוג "${rating}" ותחנה "${opApp ? "כן" : "לא"}".`);
  }

  renderResults(startRow, endRow, appRow);
}
function onReset() {
  clearResults();

  els.courseStartRank.value = "";
  updateEndRank();

  // תחנות חזרה ל"לא"
  ["operationalStartSeg","operationalEndSeg","operationalAppSeg"].forEach((id) => {
    const seg = els[id];
    if (!seg) return;
    [...seg.querySelectorAll(".seg-btn")].forEach(b => b.classList.remove("active"));
    seg.querySelector('.seg-btn[data-value="0"]')?.classList.add("active");
  });

  els.operationalStart.value = "0";
  els.operationalEnd.value = "0";
  els.operationalApp.value = "0";

  els.appointment.value = "";
  setOptions(els.officerRating, [], "בחר דירוג...");
  els.officerRating.disabled = true;

  refreshCalcEnabled();
}


try {
  init();
} catch (e) {
  console.error(e);
  els.results.innerHTML = `<div class="warn">⚠️ שגיאה בהפעלה: ${e?.message || e}</div>`;
}