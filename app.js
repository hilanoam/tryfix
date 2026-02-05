let DATA = null;

const els = {
  activity: document.getElementById("activity"),
  profession: document.getElementById("profession"),
  incentiveGroup: document.getElementById("incentiveGroup"),

  s1_rating: document.getElementById("s1_rating"),
  s1_rank: document.getElementById("s1_rank"),

  s2_rank: document.getElementById("s2_rank"),
  s2_rating: document.getElementById("s2_rating"),
  s2_seniority: document.getElementById("s2_seniority"),
  s2_stationSeg: document.getElementById("s2_stationSeg"),
  s2_station: document.getElementById("s2_station"),

  s3_rating: document.getElementById("s3_rating"),
  s3_rank: document.getElementById("s3_rank"),
  s3_hablanSeg: document.getElementById("s3_hablanSeg"),
  s3_hablan: document.getElementById("s3_hablan"),

  s4_role: document.getElementById("s4_role"),
  s4_rating: document.getElementById("s4_rating"),
  s4_stage: document.getElementById("s4_stage"),
  s4_stationSeg: document.getElementById("s4_stationSeg"),
  s4_station: document.getElementById("s4_station"),

  calcBtn: document.getElementById("calcBtn"),
  resetBtn: document.getElementById("resetBtn"),
  results: document.getElementById("results"),
};

const uniq = (arr) => [...new Set(arr.filter(v => v !== null && v !== undefined && String(v).trim() !== ""))];

function setOptions(selectEl, options, placeholder = null) {
  selectEl.innerHTML = "";

  // אם רוצים placeholder – נוסיף. אם לא, לא מוסיפים כלום.
  if (placeholder !== null) {
    const ph = document.createElement("option");
    ph.value = "";
    ph.textContent = placeholder;
    ph.disabled = true;
    ph.hidden = true;
    ph.selected = true;
    selectEl.appendChild(ph);
  }

  for (const opt of options) {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt;
    selectEl.appendChild(o);
  }

  // אם אין placeholder – נשאיר ריק (לא לבחור אוטומטית)
  if (placeholder === null) {
    selectEl.value = "";
  }
}


function setSingleDisabled(selectEl, value){
  selectEl.innerHTML = "";
  const o = document.createElement("option");
  o.value = value ?? "";
  o.textContent = value ?? "";
  selectEl.appendChild(o);
  selectEl.value = value ?? "";
  selectEl.disabled = true;
}

function diffHtml(delta) {
  const isPositive = delta >= 0;

  const cls = isPositive ? "positive" : "negative";
  const label = isPositive
    ? "התוספת שתתקבל בגין העליה בדרגה ובדירוג"
    : "סכום ההקפאה לצורך שימור שכר";

  return `
    <div class="diff ${cls}">
      <span class="label">${label}</span>
      <span class="amount">${money(Math.abs(delta))} ₪</span>
    </div>
  `;
}



function stepRow(label, value, opts = {}) {
  const { showCurrency = true, suffix = "" } = opts;
  const valText = showCurrency ? `${value} ₪` : `${value}`;
  const suffixHtml = suffix ? ` <span class="gross">${suffix}</span>` : "";

  return `
    <div class="line">
      <div class="label">${label}</div>
      <div class="val">${valText}${suffixHtml}</div>
    </div>
  `;
}



function money(x){
  if (x === null || x === undefined || Number.isNaN(x)) return "—";
  return Number(x).toLocaleString("he-IL", {minimumFractionDigits:2, maximumFractionDigits:2});
}

function warn(msg){ els.results.innerHTML = `<div class="warn">${msg} </div>`; }
function clearResults(){ els.results.innerHTML = ""; }

function bindSegment(segEl, hiddenSelectEl){
  if (!segEl || !hiddenSelectEl) return;
  segEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".seg-btn");
    if (!btn) return;
    [...segEl.querySelectorAll(".seg-btn")].forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    hiddenSelectEl.value = btn.dataset.value;
    clearResults();
    syncCalcEnabled();
  });
}

function isStation(sel){ return sel.value === "1"; }
function isYes(sel){ return sel.value === "1"; }

// ---------- data helpers ----------
function getProfBlock(){
  return DATA?.professions?.[els.profession.value] || null;
}
function getRows(){
  return getProfBlock()?.rows || [];
}

// ---------- reset stage 3/4 (לא ממלאים, רק מאפסים) ----------
function resetStage3(){
  setOptions(els.s3_rating, []);
  setOptions(els.s3_rank, []);
}
function resetStage4(){
  els.s4_role.value = "";
  els.s4_rating.innerHTML = "";
  els.s4_stage.innerHTML = "";
  els.s4_rating.disabled = true;
  els.s4_stage.disabled = true;
}

// ---------- Stage1 fill (בחירה בלבד) ----------
function fillStage1(){
  const rows = getRows();
  if (!rows.length) return;

  const r = rows[0];

  setSingleDisabled(els.s1_rating, r.stage1?.rating ?? "");
  setSingleDisabled(els.s1_rank, r.stage1?.rank ?? "");
}


// ---------- Stage2 cascade ----------
function fillStage2Ranks(){
  const rows = getRows();
  setOptions(els.s2_rank, uniq(rows.map(r => r.stage2?.rank)));
  setOptions(els.s2_rating, []);
  setOptions(els.s2_seniority, []);

  resetStage3();
  resetStage4();
}

function fillStage2Ratings(){
  const rows = getRows();
  const rank = (els.s2_rank.value || "").trim();
  if (!rank){
    setOptions(els.s2_rating, []);
    setOptions(els.s2_seniority, []);
    resetStage3();
    resetStage4();
    syncCalcEnabled();
    return;
  }
  const ratings = uniq(rows.filter(r => (r.stage2?.rank||"").trim()===rank).map(r => r.stage2?.rating));
  setOptions(els.s2_rating, ratings);
  setOptions(els.s2_seniority, []);
  resetStage3();
  resetStage4();
  syncCalcEnabled();
}

function fillStage2Seniorities(){
  const rows = getRows();
  const rank = (els.s2_rank.value || "").trim();
  const rating = (els.s2_rating.value || "").trim();
  if (!rank || !rating){
    setOptions(els.s2_seniority, []);
    resetStage3();
    resetStage4();
    syncCalcEnabled();
    return;
  }
  const sens = uniq(rows
    .filter(r => (r.stage2?.rank||"").trim()===rank && (r.stage2?.rating||"").trim()===rating)
    .map(r => String(r.stage2?.seniority ?? "").trim())
  );
  setOptions(els.s2_seniority, sens);

  // ✅ לא ממלאים שלב 3 אוטומטית! רק מאפשרים אופציות לבחירה
  fillStage3Ratings();

  resetStage4();
  syncCalcEnabled();
}

// ---------- Stage3 (בחירה) ----------
function rowsMatchingStage2(){
  const rows = getRows();
  const r = (els.s2_rank.value || "").trim();
  const rt = (els.s2_rating.value || "").trim();
  const s = String(els.s2_seniority.value || "").trim();
  if (!r || !rt || !s) return [];
  return rows.filter(x =>
    (x.stage2?.rank||"").trim()===r &&
    (x.stage2?.rating||"").trim()===rt &&
    String(x.stage2?.seniority ?? "").trim()===s
  );
}

function fillStage3Ranks(){
  const base = rowsMatchingStage2();
  if (base.length === 0){
    setOptions(els.s3_rank, []);
    return;
  }
  const ranks = uniq(base.map(r => r.stage3?.rank));
  setOptions(els.s3_rank, ranks);
  setOptions(els.s3_rating, []);
}

function fillStage3Ratings(){
  const base = rowsMatchingStage2();
  const rank = (els.s3_rank.value || "").trim();
  if (!rank){
    setOptions(els.s3_rating, []);
    return;
  }
  const ratings = uniq(
    base
      .filter(r => (r.stage3?.rank || "").trim() === rank)
      .map(r => r.stage3?.rating)
  );
  setOptions(els.s3_rating, ratings);
}



// Stage3 match
function rowsMatchingStage3(){
  const base = rowsMatchingStage2();
  const r3 = (els.s3_rank.value || "").trim();
  const rt3 = (els.s3_rating.value || "").trim();
  if (!r3 || !rt3) return [];
  return base.filter(x =>
    (x.stage3?.rank||"").trim()===r3 &&
    (x.stage3?.rating||"").trim()===rt3
  );
}

// ---------- Stage4 (בחירה) ----------
function fillStage4Ratings(){
  const role = els.s4_role.value;
  const base = rowsMatchingStage3();

  // רק אם המשתמשת בחרה role ויש התאמה לשלב 3
  if (!role || base.length === 0){
    els.s4_rating.innerHTML = "";
    els.s4_stage.innerHTML = "";
    els.s4_rating.disabled = true;
    els.s4_stage.disabled = true;
    syncCalcEnabled();
    return;
  }

  if (role === "mifkach"){
    const ratings = uniq(base.map(r => r.stage4?.mifkach?.rating));
    setOptions(els.s4_rating, ratings);
    els.s4_rating.disabled = false;

    setOptions(els.s4_stage, []);
    els.s4_stage.disabled = false;
  } else {
    const ratings = uniq(base.map(r => r.stage4?.pakad?.rating));
    setOptions(els.s4_rating, ratings);
    els.s4_rating.disabled = false;

    // לפקד אין שלב -> נשאיר נעול
    setOptions(els.s4_stage, ["(לא רלוונטי)"], "—");
    els.s4_stage.value = "(לא רלוונטי)";
    els.s4_stage.disabled = true;
  }

  syncCalcEnabled();
}

function fillStage4Stages(){
  const role = els.s4_role.value;
  if (role !== "mifkach") return;

  const base = rowsMatchingStage3();
  const rating = (els.s4_rating.value || "").trim();

  if (!rating || base.length === 0){
    setOptions(els.s4_stage, []);
    syncCalcEnabled();
    return;
  }

  const stages = uniq(
    base
      .filter(r => (r.stage4?.mifkach?.rating || "").trim() === rating)
      .map(r => String(r.stage4?.mifkach?.stage ?? "").trim())
  );

  setOptions(els.s4_stage, stages);
  syncCalcEnabled();
}

// ---------- enable calc ----------
function syncCalcEnabled(){
  const ok = Boolean(
    els.profession.value &&
    els.s2_rank.value &&
    els.s2_rating.value &&
    els.s2_seniority.value &&
    els.s2_station.value !== "" && 
    els.s3_rating.value &&
    els.s3_rank.value &&
    els.s3_hablan.value !== "" &&  
    els.s4_station.value !== ""   
  );
  els.calcBtn.disabled = !ok;
}

// ---------- calc ----------
function calc(){
  if (els.s2_station.value === "") {
      warn("חובה לבחור האם בתחנה (כן/לא).");
      return;
    }
    if (els.s3_hablan.value === "") {
      warn("חובה לבחור האם חבלן בכיר (כן/לא).");
      return;
    }
  clearResults();
  const p = getProfBlock();
  if (!p){
    warn("בחר מקצוע.");
    return;
  }

  const base3 = rowsMatchingStage3();
  if (base3.length === 0){
    warn("לא נמצאה התאמה לפי שלב 2 + שלב 3.");
    return;
  }

  // נבחר בסיס לתצוגה (שלב 2/3)
  const base = base3[0];

  const s2_station = isStation(els.s2_station);
  const s2_salary = s2_station ? base.stage2.salary_station : base.stage2.salary_not_station;

  const hablan = isYes(els.s3_hablan);
  const s3_salary = hablan ? base.stage3.salary_hablan_bachir : base.stage3.salary;

  // שלב 4 אופציונלי
  const role = els.s4_role.value;
  let s4_salary = null, s4_title = null, s4_desc = null;

  if (role){
    const st4 = isStation(els.s4_station);
    const r4 = (els.s4_rating.value || "").trim();
    const stg4 = (els.s4_stage.value || "").trim();

    if (!r4){
      warn("בחר דירוג בשלב 4.");
      return;
    }

    let chosen = null;

    if (role === "mifkach"){
      if (!stg4){
        warn("בחר שלב בשלב 4 (מפקח).");
        return;
      }
      chosen = base3.find(x =>
        (x.stage4?.mifkach?.rating || "").trim() === r4 &&
        String(x.stage4?.mifkach?.stage ?? "").trim() === stg4
      );
      if (!chosen){
        warn("לא נמצאה התאמה לשלב 4 (מפקח) לפי דירוג + שלב.");
        return;
      }
      s4_title = "שלב 4: מפקח";
      s4_desc = `${chosen.stage4.mifkach.rating} · שלב ${chosen.stage4.mifkach.stage} · ${st4 ? "בתחנה" : "לא בתחנה"}`;
      s4_salary = st4 ? chosen.stage4.mifkach.salary_station : chosen.stage4.mifkach.salary_not_station;
    } else {
      chosen = base3.find(x => (x.stage4?.pakad?.rating || "").trim() === r4);
      if (!chosen){
        warn("לא נמצאה התאמה לשלב 4 (פקד) לפי דירוג.");
        return;
      }
      s4_title = "שלב 4: פקד";
      s4_desc = `${chosen.stage4.pakad.rating || r4} · ${st4 ? "בתחנה" : "לא בתחנה"}`;
      s4_salary = st4 ? chosen.stage4.pakad.salary_station : chosen.stage4.pakad.salary_not_station;
    }
  }

  // הפרשים + הקפאה
const delta23 = s3_salary - s2_salary;
const delta34 = (s4_salary !== null && s4_salary !== undefined) ? (s4_salary - s3_salary) : null;

// הקפאה: כששלב 4 נמוך משלב 3, משלמים את הגבוה מביניהם ומציגים "הקפאה"
const frozen = (delta34 !== null && delta34 < 0);
const freezeAmount = frozen ? Math.abs(delta34) : 0;
const finalPaid = (delta34 === null) ? s3_salary : Math.max(s3_salary, s4_salary);

const stage2Text = `${els.s2_rank.value}, דירוג ${els.s2_rating.value}, ${els.s2_seniority.value} שנות וותק`;
const stage3Text = `${els.s3_rank.value}, דירוג ${els.s3_rating.value}`;
let stage4Text = "ללא מינוי";

if (role) {
  if (role === "mifkach") {
    stage4Text = `מפקח, דירוג ${els.s4_rating.value}, שלב ${els.s4_stage.value}`;
  } else {
    stage4Text = `פקד, דירוג ${els.s4_rating.value}`;
  }
}

els.results.innerHTML = `
  <div class="calc">

    ${stepRow(`בתחילת קורס קצינים (${stage2Text})`, money(s2_salary))}

    <div class="line diff-line">
      ${diffHtml(delta23)}
    </div>

    ${stepRow(`בסיום קורס קצינים (${stage3Text})`, money(s3_salary))}

    ${role ? `
      <div class="line diff-line">
        ${diffHtml(delta34 ?? 0)}
      </div>

      ${stepRow(`לאחר מינוי (${stage4Text})`, money(s4_salary))}

      <div class="pay-box">
        <div class="label">שכר משולם בפועל</div>
        <div class="val">${money(finalPaid)} ₪ ברוטו</div>
      </div>

      ${frozen ? `
        <div class="freeze-box">
          השכר כולל הקפאה על סך <b>${money(freezeAmount)} ₪ ברוטו</b>
        </div>
      ` : ``}


    ` : `
      <div class="line">
        <div class="label">שכר משולם בפועל</div>
        <div class="val">${money(s3_salary)} ₪ ברוטו</div>
      </div>
    `}

  </div>
`;

}

// ---------- reset ----------
function resetAll(){
  const resetSeg = (seg, hidden) => {
    if (!seg || !hidden) return;
    [...seg.querySelectorAll(".seg-btn")].forEach(b => b.classList.remove("active"));
    const resetSeg = (seg, hidden) => {
      if (!seg || !hidden) return;
      [...seg.querySelectorAll(".seg-btn")].forEach(b =>
        b.classList.remove("active")
      );
      hidden.value = ""; 
    };

  };

  els.profession.value = "";
  els.activity.innerHTML = "";
  els.incentiveGroup.innerHTML = "";

  setOptions(els.s1_rating, []);
  setOptions(els.s1_rank, []);

  setOptions(els.s2_rank, []);
  setOptions(els.s2_rating, []);
  setOptions(els.s2_seniority, []);

  resetStage3();
  resetStage4();

  resetSeg(els.s2_stationSeg, els.s2_station);
  resetSeg(els.s3_hablanSeg, els.s3_hablan);
  resetSeg(els.s4_stationSeg, els.s4_station);

  clearResults();
  syncCalcEnabled();
}

function initDisclaimer(){
  const modal = document.getElementById("disclaimerModal");
  const btn = document.getElementById("disclaimerAccept");
  if (!modal || !btn) return;

  document.body.classList.add("modal-open");

  btn.addEventListener("click", () => {
    document.body.classList.remove("modal-open");
    modal.remove();
  });
}


// ---------- init ----------
async function init(){
  initDisclaimer();

  bindSegment(els.s2_stationSeg, els.s2_station);
  bindSegment(els.s3_hablanSeg, els.s3_hablan);
  bindSegment(els.s4_stationSeg, els.s4_station);

  const url = window.SALARY_TABLE_URL || "/salary_data.json";
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok){
    warn(`לא הצלחתי לטעון salary_data.json. סטטוס: ${res.status}. URL: ${url}`);
    return;
  }

  DATA = await res.json();

  const profKeys = Object.keys(DATA.professions || {});
  setOptions(els.profession, profKeys);

  els.profession.addEventListener("change", () => {
    const p = getProfBlock();
    if (!p) return;

    setSingleDisabled(els.activity, p.activity_level || "");
    setSingleDisabled(els.incentiveGroup, String(p.incentive_group ?? ""));

    fillStage1();
    fillStage2Ranks();

    clearResults();
    syncCalcEnabled();
  });

  els.s2_rank.addEventListener("change", () => { fillStage2Ratings(); clearResults(); });
  els.s2_rating.addEventListener("change", () => { fillStage2Seniorities(); clearResults(); });

  // כאן רק ממלאים אופציות לשלב 3 (לא בוחרים)
  els.s2_seniority.addEventListener("change", () => {
    fillStage3Ranks();
    resetStage4();
    clearResults();
    syncCalcEnabled();
  });

  // שלב 3 - בחירה
  els.s3_rank.addEventListener("change", () => {
    fillStage3Ratings();
    resetStage4();
    clearResults();
    syncCalcEnabled();
  });

  els.s3_rank.addEventListener("change", () => {
    resetStage4();
    clearResults();
    syncCalcEnabled();
  });

  // שלב 4 - מתחיל רק אחרי בחירת role
  els.s4_role.addEventListener("change", () => {
    fillStage4Ratings();
    clearResults();
    syncCalcEnabled();
  });

  els.s4_rating.addEventListener("change", () => {
    fillStage4Stages();
    clearResults();
    syncCalcEnabled();
  });

  els.s4_stage.addEventListener("change", () => {
    clearResults();
    syncCalcEnabled();
  });

  els.calcBtn.addEventListener("click", calc);
  els.resetBtn.addEventListener("click", resetAll);

  resetAll();
}
function exportToPDF() {
  // לא מאפשר אם אין תוצאה
  const hasResult = els.results && els.results.innerText.trim().length > 0;
  if (!hasResult) {
    warn("אין תוצאות לייצוא. חשבי שכר קודם.");
    return;
  }

  // סימון מצב הדפסה (לא חובה, אבל מאפשר CSS מותאם)
  document.body.classList.add("print-mode");

  // פותח חלון הדפסה -> לבחור "Save as PDF"
  window.print();

  // מחזיר מצב רגיל
  setTimeout(() => document.body.classList.remove("print-mode"), 300);
}

document.getElementById("pdfBtn").addEventListener("click", exportToPDF);

init().catch(() => warn("שגיאה באתחול. בדקי קונסול (F12)."));

