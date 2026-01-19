// app.js (מותאם ל-index שלך)

// ---------- DOM ----------
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

  // actions
  calcBtn: document.getElementById("calcBtn"),
  resetBtn: document.getElementById("resetBtn"),
  results: document.getElementById("results"),
};

let SALARY_TABLE = null;
let ACTIVE_PROFESSION_KEY = null; // בשלב הזה נבחר מקצוע קבוע (אפשר להוסיף select מקצוע אחרי זה)

// ---------- utils ----------
const uniq = (arr) => [...new Set(arr.filter(v => v !== null && v !== undefined && String(v).trim() !== ""))];

function setOptions(selectEl, options, { placeholder = "בחרי..." } = {}) {
  selectEl.innerHTML = "";
  const ph = document.createElement("option");
  ph.value = "";
  ph.textContent = placeholder;
  selectEl.appendChild(ph);

  for (const opt of options) {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt;
    selectEl.appendChild(o);
  }
}

function formatMoney(x) {
  if (x === null || x === undefined || Number.isNaN(x)) return "—";
  return Number(x).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function warn(msg) {
  els.results.innerHTML = `<div class="warn">${msg}</div>`;
}

function clearResults() {
  els.results.innerHTML = "";
}

function autoCourseEndRank(startRank) {
  const r = (startRank || "").trim();
  if (r === 'רס"מ 0') return 'רס"מ 3';
  if (r === 'רס"מ 3') return 'רס"מ 5';
  if (r === 'רס"מ 5') return 'רס"מ 5';
  return "";
}

// segmented helper
function bindSegment(segEl, hiddenSelectEl) {
  if (!segEl || !hiddenSelectEl) return;
  segEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".seg-btn");
    if (!btn) return;

    [...segEl.querySelectorAll(".seg-btn")].forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    hiddenSelectEl.value = btn.dataset.value;
    syncCalcEnabled();
  });
}

function isStation(selectEl) {
  return selectEl.value === "1";
}

// ---------- JSON helpers ----------
function getProfessionBlock(profKey) {
  return SALARY_TABLE?.professions?.[profKey] || null;
}

function getRows() {
  const p = getProfessionBlock(ACTIVE_PROFESSION_KEY);
  return p?.rows || [];
}

function findRowForCourseStart(rank, rating) {
  const rows = getRows();
  const r = (rank || "").trim();
  const rt = (rating || "").trim();

  // כרגע אנחנו לוקחים את ה-FIRST שמתאים לדרגה+דירוג (כי אצלך אין שדה וותק ב-HTML החדש עדיין)
  return rows.find(x =>
    (x.course_start?.rank || "").trim() === r &&
    (x.course_start?.rating || "").trim() === rt
  );
}

// ---------- UI fill ----------
function initStaticFields() {
  // שלב 1 - כרגע רק רס"ר 8
  setOptions(els.currentRank, ['רס"ר 8'], { placeholder: "רס\"ר 8 (קבוע)" });
  els.currentRank.value = 'רס"ר 8';

  // שלב 2 - דרגות תחילת קורס
  setOptions(els.courseStartRank, ['רס"מ 0', 'רס"מ 3', 'רס"מ 5'], { placeholder: "בחרי דרגה" });

  // דירוג נוכחי (לפי הדרישה שלך כרגע רק אחיד)
  setOptions(els.currentRating, ['אחיד'], { placeholder: "בחרי דירוג" });
  els.currentRating.value = 'אחיד';

  // שלב 4 - דירוג קצין: נפתח רק אם בוחרים מינוי
  els.officerRating.disabled = true;
  els.officerRating.innerHTML = "";
}

function syncCourseEndRank() {
  const endRank = autoCourseEndRank(els.courseStartRank.value);
  setOptions(els.courseEndRank, endRank ? [endRank] : [], { placeholder: "ממתין לדרגת התחלה..." });
  if (endRank) els.courseEndRank.value = endRank;
}

function syncOfficerRatingOptions() {
  const ap = els.appointment.value;
  if (!ap) {
    els.officerRating.disabled = true;
    els.officerRating.innerHTML = "";
    return;
  }

  const rows = getRows();
  const key = ap.includes("מפקח") ? "mifkash" : "pakad";
  const ratings = uniq(rows.map(r => r.appointment?.[key]?.rating).map(x => String(x).trim()));

  setOptions(els.officerRating, ratings, { placeholder: "בחרי דירוג" });
  els.officerRating.disabled = false;
}

function syncCalcEnabled() {
  // מינימום כדי לחשב: דרגת תחילת קורס + דירוג נוכחי
  const ok = Boolean(els.courseStartRank.value && els.currentRating.value);
  els.calcBtn.disabled = !ok;
}

// ---------- calc ----------
function calc() {
  clearResults();

  // בשלב הזה נשים מקצוע קבוע ראשון (כדי שלא יהיו עוד שדות).
  // אחרי זה נוסיף select מקצוע + auto incentive + activity.
  if (!ACTIVE_PROFESSION_KEY) {
    warn("לא נבחר מקצוע פעיל (בינתיים מוגדר אוטומטית).");
    return;
  }

  const startRank = els.courseStartRank.value;
  const startRating = els.currentRating.value;
  const row = findRowForCourseStart(startRank, startRating);

  if (!row) {
    warn('לא נמצאה שורה תואמת לדרגת תחילת הקורס + דירוג נוכחי בטבלה.');
    return;
  }

  // תחילת קורס
  const stationStart = isStation(els.operationalStart);
  const cs = row.course_start;
  const startSalary = stationStart ? cs.salary_station : cs.salary_not_station;

  // סוף קורס (אצלך בטבלה אין "תחנה" לשלב הזה, אז ניקח salary_not_station)
  const ce = row.course_end;
  const endRank = autoCourseEndRank(cs.rank);
  const stationEnd = isStation(els.operationalEnd);
  const endSalary = ce.salary_not_station; // כרגע כך לפי הנתונים שיש

  // מינוי אחרי קק"צ (אופציונלי)
  const ap = els.appointment.value;
  let apSalary = null, apLabel = null;
  if (ap) {
    const stationAp = isStation(els.operationalApp);
    const key = ap.includes("מפקח") ? "mifkash" : "pakad";
    const apBlock = row.appointment?.[key];
    apLabel = ap.includes("מפקח") ? "מינוי: מפקח" : "מינוי: פקד";
    apSalary = stationAp ? apBlock?.salary_station : apBlock?.salary_not_station;
  }

  els.results.innerHTML = `
    <div class="calc">
      <div class="line">
        <div class="label">יום תחילת הקורס</div>
        <div class="val">${cs.rank} · ${cs.rating}</div>
      </div>
      <div class="line">
        <div class="label">שכר בתחילת הקורס</div>
        <div class="val">${formatMoney(startSalary)}</div>
      </div>

      <div class="line">
        <div class="label">יום אחרון של הקורס</div>
        <div class="val">${endRank} · ${ce.rating}</div>
      </div>
      <div class="line">
        <div class="label">שכר בסוף הקורס</div>
        <div class="val">${formatMoney(endSalary)}</div>
      </div>

      ${ap ? `
        <div class="line">
          <div class="label">${apLabel}</div>
          <div class="val">${formatMoney(apSalary)}</div>
        </div>
      ` : ""}
    </div>
  `;
}

// ---------- reset ----------
function resetAll() {
  // segmented defaults ל"לא"
  const resetSeg = (seg, hidden) => {
    if (!seg || !hidden) return;
    [...seg.querySelectorAll(".seg-btn")].forEach(b => b.classList.remove("active"));
    const first = seg.querySelector('.seg-btn[data-value="0"]');
    first?.classList.add("active");
    hidden.value = "0";
  };

  els.courseStartRank.value = "";
  els.currentRating.value = "אחיד";
  syncCourseEndRank();

  els.appointment.value = "";
  syncOfficerRatingOptions();

  resetSeg(els.operationalStartSeg, els.operationalStart);
  resetSeg(els.operationalEndSeg, els.operationalEnd);
  resetSeg(els.operationalAppSeg, els.operationalApp);

  clearResults();
  syncCalcEnabled();
}

// ---------- init ----------
async function init() {
  bindSegment(els.operationalStartSeg, els.operationalStart);
  bindSegment(els.operationalEndSeg, els.operationalEnd);
  bindSegment(els.operationalAppSeg, els.operationalApp);

  // טוענים JSON
  const url = "./professions_salary_table.json";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    warn("לא הצלחתי לטעון professions_salary_table.json. בדקי שהוא באותה תיקייה של index.html");
    return;
  }
  SALARY_TABLE = await res.json();

  // כרגע נגדיר מקצוע פעיל ראשון (כמו ששלחת): 10847...
  ACTIVE_PROFESSION_KEY = "10847 - מש\"ק סייר מג\"ב";

  initStaticFields();

  els.courseStartRank.addEventListener("change", () => {
    syncCourseEndRank();
    clearResults();
    syncCalcEnabled();
  });

  els.currentRating.addEventListener("change", () => {
    clearResults();
    syncCalcEnabled();
  });

  els.appointment.addEventListener("change", () => {
    syncOfficerRatingOptions();
    clearResults();
    syncCalcEnabled();
  });

  els.officerRating.addEventListener("change", () => {
    clearResults();
    syncCalcEnabled();
  });

  els.calcBtn.addEventListener("click", calc);
  els.resetBtn.addEventListener("click", resetAll);

  resetAll();
}

init().catch(() => warn("שגיאה באתחול. בדקי קונסול (F12)."));
