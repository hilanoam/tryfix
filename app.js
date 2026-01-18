// app.js

const els = {
  activity: document.getElementById("activity"),
  rankBefore: document.getElementById("rankBefore"),
  seniority: document.getElementById("seniority"),
  ratingBefore: document.getElementById("ratingBefore"),
  operational: document.getElementById("operational"),
  appointment: document.getElementById("appointment"),
  officerRating: document.getElementById("officerRating"),
  calcBtn: document.getElementById("calcBtn"),
  results: document.getElementById("results"),

  activityCards: document.getElementById("activityCards"),
  population: document.getElementById("population"),
  operationalSeg: document.getElementById("operationalSeg"),
  resetBtn: document.getElementById("resetBtn"),

  profession: document.getElementById("profession"),
  incentiveGroup: document.getElementById("incentiveGroup"),
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

function renderResults(beforeRow, afterRow, appointRow) {
  const beforeSalary = Number(beforeRow["שכר"]);
  const afterSalary = Number(afterRow["שכר"]);
  const delta1 = afterSalary - beforeSalary;

  const hasApp = !!appointRow;
  const appSalary = hasApp ? Number(appointRow["שכר"]) : null;
  const delta2 = hasApp ? (appSalary - afterSalary) : null;

  const fmt = (n) => moneyILS(n).replace("₪", "").trim(); // להציג כמו אצלך בלי סימן ₪ אם בא לך

  const opClass1 = delta1 < 0 ? "negative" : "positive";
  const sign1 = delta1 < 0 ? "-" : "+";

  const op2 = hasApp ? (delta2 < 0 ? "negative" : "positive") : "";
  const sign2 = hasApp ? (delta2 < 0 ? "-" : "+") : "";

  els.results.innerHTML = `
    <div class="calc">
      <div class="line">
        <div class="label">לפני קק"צ</div>
        <div class="val">₪ ${fmt(beforeSalary)}</div>
      </div>

      <div class="op ${opClass1}">
        <div class="sign">${sign1}</div>
        <div>₪ ${fmt(Math.abs(delta1))}</div>
      </div>

      <div class="line">
        <div class="label">אחרי קק"צ</div>
        <div class="val">₪ ${fmt(afterSalary)}</div>
      </div>

      ${
        hasApp
          ? `
          <div class="op ${op2}">
            <div class="sign">${sign2}</div>
            <div>₪ ${fmt(Math.abs(delta2))}</div>
          </div>

          <div class="total">
            <div class="label">${normalize(appointRow["שלב"])}</div>
            <div class="val">₪ ${fmt(appSalary)}</div>
          </div>
        `
          : `
          <div class="total">
            <div class="label">תוצאה</div>
            <div class="val">₪ ${fmt(afterSalary)}</div>
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
    setOptions(els.officerRating, [], "בחר דירוג קצין...");
    return;
  }

  const baseRows = filterBase();
  const ratings = uniq(
    baseRows
      .filter((r) => normalize(r["שלב"]) === normalize(ap))
      .map((r) => normalize(r["דירוג"]))
      .filter(Boolean)
  ).sort((a, b) => a.localeCompare(b, "he"));

  setOptions(els.officerRating, ratings, "בחר דירוג קצין...");
}

function refreshCalcEnabled() {
  const ok =
    els.activity.value &&
    els.rankBefore.value &&
    els.seniority.value &&
    els.ratingBefore.value &&
    els.operational.value !== "";

  const ap = els.appointment.value;
  const officerOk = !ap || !!els.officerRating.value;

  els.calcBtn.disabled = !(ok && officerOk);
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
    const beforeRow = findOne(baseRows, "לפני", op);
    const afterRow = findOne(baseRows, 'אחרי קק"צ', op);

    if (!beforeRow) return showWarning("חסר נתון לשלב 'לפני' עבור הבחירות שלך.");
    if (!afterRow) return showWarning('חסר נתון לשלב "אחרי קק"צ" עבור הבחירות שלך.');

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
    els.results.innerHTML =
      `<div class="warn">⚠️ לא נמצא window.SALARY_DATA. ודא ש-data.js נטען לפני app.js.</div>`;
    return;
  }

  DATA = window.SALARY_DATA.map((r) => ({
    ...r,
    "רמת פעילות": normalize(r["רמת פעילות"]),
    "דרגה לפני": normalize(r["דרגה לפני"]),
    "דירוג_לפני": normalize(r["דירוג_לפני"]),
    "שלב": normalize(r["שלב"]),
    "דירוג": normalize(r["דירוג"]),
    "וותק (שנים)": String(r["וותק (שנים)"]).trim(),
    "תחנה_מבצעית": Number(r["תחנה_מבצעית"]),
    "שכר": Number(r["שכר"]),
    "דרגה": normalize(r["דרגה"]),
  }));

  if (els.profession) {
    const professions = uniq(DATA.map(r => normalize(r["מקצוע"])).filter(Boolean))
      .sort((a,b) => a.localeCompare(b,"he"));
    setOptions(els.profession, professions, "בחרי מקצוע...");
  }

  if (els.incentiveGroup) {
    const groups = uniq(DATA.map(r => normalize(r["קבוצת תמריץ"])).filter(Boolean))
      .sort((a,b) => a.localeCompare(b,"he"));
    setOptions(els.incentiveGroup, groups, "בחר קבוצת תמריץ...");
  }


  const activities = uniq(DATA.map((r) => r["רמת פעילות"]).filter(Boolean)).sort((a, b) => a.localeCompare(b, "he"));
  const ranksBefore = uniq(DATA.map((r) => r["דרגה לפני"]).filter(Boolean)).sort((a, b) => a.localeCompare(b, "he"));

  // הסלקטים החבויים/רגילים (לוגיקה)
  setOptions(els.activity, activities, "בחר רמת פעילות...");
  setOptions(els.rankBefore, ranksBefore, "בחר דרגה...");

  // UI כרטיסים
  renderActivityCards(activities);

  // segmented buttons
  wireSegment(els.operationalSeg, els.operational);
  wireSegment(els.population, null); // כרגע רק UI

  // תלויות
  els.activity.addEventListener("change", refreshDependent);
  els.rankBefore.addEventListener("change", refreshDependent);

  function refreshDependent() {
    clearResults();

    const a = normalize(els.activity.value);
    const rb = normalize(els.rankBefore.value);

    const subset = DATA.filter((r) =>
      (!a || r["רמת פעילות"] === a) &&
      (!rb || r["דרגה לפני"] === rb)
    );

    const seniorities = uniq(subset.map((r) => r["וותק (שנים)"]).filter(Boolean))
      .sort((x, y) => Number(x) - Number(y));

    const ratingsBefore = uniq(subset.map((r) => r["דירוג_לפני"]).filter(Boolean))
      .sort((a, b) => a.localeCompare(b, "he"));

    setOptions(els.seniority, seniorities, "בחר ותק...");
    setOptions(els.ratingBefore, ratingsBefore, "בחר דירוג...");

    refreshOfficerRatings();
    refreshCalcEnabled();
  }

  refreshDependent();
  attachListeners();
  refreshCalcEnabled();
}

try {
  init();
} catch (e) {
  console.error(e);
  els.results.innerHTML = `<div class="warn">⚠️ שגיאה בהפעלה: ${e?.message || e}</div>`;
}