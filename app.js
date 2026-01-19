// app.js
let DATA = null;

const els = {
  activity: document.getElementById("activity"),
  profession: document.getElementById("profession"),
  incentiveGroup: document.getElementById("incentiveGroup"),

  s1_rating: document.getElementById("s1_rating"),
  s1_rank: document.getElementById("s1_rank"),

  s2_rating: document.getElementById("s2_rating"),
  s2_rank: document.getElementById("s2_rank"),
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

function setOptions(selectEl, options, placeholder="בחרי..."){
  selectEl.innerHTML = "";
  const ph = document.createElement("option");
  ph.value = "";
  ph.textContent = placeholder;
  selectEl.appendChild(ph);

  for (const opt of options){
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt;
    selectEl.appendChild(o);
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

function money(x){
  if (x === null || x === undefined || Number.isNaN(x)) return "—";
  return Number(x).toLocaleString("he-IL", {minimumFractionDigits:2, maximumFractionDigits:2});
}

function bindSegment(segEl, hiddenSelectEl){
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

function isStation(selectEl){ return selectEl.value === "1"; }
function isYes(selectEl){ return selectEl.value === "1"; }

function clearResults(){ els.results.innerHTML = ""; }
function warn(msg){ els.results.innerHTML = `<div class="warn">${msg}</div>`; }

function getProfBlock(){
  const key = els.profession.value;
  return DATA?.professions?.[key] || null;
}

function getRows(){
  return getProfBlock()?.rows || [];
}

// We match a single row by Stage2 fields (rating+rank+seniority).
// Stage1 values are displayed/selected but are informational here (per table structure).
function findRow(){
  const rows = getRows();
  const s2r = (els.s2_rating.value || "").trim();
  const s2k = (els.s2_rank.value || "").trim();
  const s2s = String(els.s2_seniority.value || "").trim();

  return rows.find(r =>
    (r.stage2?.rating || "").trim() === s2r &&
    (r.stage2?.rank || "").trim() === s2k &&
    String(r.stage2?.seniority ?? "").trim() === s2s
  ) || null;
}

function fillStage2FromRows(){
  const rows = getRows();

  // Stage2 rank options
  const ranks = uniq(rows.map(r => r.stage2?.rank));
  setOptions(els.s2_rank, ranks, "בחרי דרגה");
  setOptions(els.s2_rating, [], "בחרי קודם דרגה");
  setOptions(els.s2_seniority, [], "בחרי קודם דירוג");

  // Stage1 options (from table)
  const s1r = uniq(rows.map(r => r.stage1?.rating));
  const s1k = uniq(rows.map(r => r.stage1?.rank));
  setOptions(els.s1_rating, s1r, "בחרי דירוג");
  setOptions(els.s1_rank, s1k, "בחרי דרגה");

  // Stage3 is auto-filled after Stage2 selection
  els.s3_rating.innerHTML = "";
  els.s3_rank.innerHTML = "";
  els.s3_rating.disabled = true;
  els.s3_rank.disabled = true;

  // Stage4 depends on role selection
  resetStage4();

  clearResults();
  syncCalcEnabled();
}

function fillStage2Rating(){
  const rows = getRows();
  const rank = (els.s2_rank.value || "").trim();
  if (!rank){
    setOptions(els.s2_rating, [], "בחרי קודם דרגה");
    setOptions(els.s2_seniority, [], "בחרי קודם דירוג");
    clearResults();
    syncCalcEnabled();
    return;
  }
  const ratings = uniq(rows.filter(r => (r.stage2?.rank||"").trim()===rank).map(r => r.stage2?.rating));
  setOptions(els.s2_rating, ratings, "בחרי דירוג");
  setOptions(els.s2_seniority, [], "בחרי קודם דירוג");
  clearResults();
  syncCalcEnabled();
}

function fillStage2Seniority(){
  const rows = getRows();
  const rank = (els.s2_rank.value || "").trim();
  const rating = (els.s2_rating.value || "").trim();
  if (!rank || !rating){
    setOptions(els.s2_seniority, [], "בחרי קודם דרגה + דירוג");
    clearResults();
    syncCalcEnabled();
    return;
  }
  const sens = uniq(rows
    .filter(r => (r.stage2?.rank||"").trim()===rank && (r.stage2?.rating||"").trim()===rating)
    .map(r => String(r.stage2?.seniority ?? "").trim())
  );
  setOptions(els.s2_seniority, sens, "בחרי ותק");
  clearResults();
  syncCalcEnabled();
  syncStage3Autofill();
  syncStage4Autofill(); // in case role already chosen
}

function syncStage3Autofill(){
  const row = findRow();
  if (!row){
    els.s3_rating.innerHTML = "";
    els.s3_rank.innerHTML = "";
    els.s3_rating.disabled = true;
    els.s3_rank.disabled = true;
    return;
  }
  setSingleDisabled(els.s3_rating, row.stage3?.rating || "");
  setSingleDisabled(els.s3_rank, row.stage3?.rank || "");
}

function resetStage4(){
  els.s4_role.value = "";
  els.s4_rating.innerHTML = "";
  els.s4_stage.innerHTML = "";
  els.s4_rating.disabled = true;
  els.s4_stage.disabled = true;
}

function syncStage4Autofill(){
  const role = els.s4_role.value;
  const row = findRow();

  if (!role){
    els.s4_rating.innerHTML = "";
    els.s4_stage.innerHTML = "";
    els.s4_rating.disabled = true;
    els.s4_stage.disabled = true;
    return;
  }

  if (!row){
    // wait for stage2 selection
    els.s4_rating.innerHTML = "";
    els.s4_stage.innerHTML = "";
    els.s4_rating.disabled = true;
    els.s4_stage.disabled = true;
    return;
  }

  if (role === "mifkach"){
    // rating + stage exist
    const r = row.stage4?.mifkach?.rating || "";
    const s = row.stage4?.mifkach?.stage ?? "";
    setSingleDisabled(els.s4_rating, r);
    setSingleDisabled(els.s4_stage, String(s));
  } else if (role === "pakad"){
    // In the table, pakad may have rating but no stage; handle gracefully.
    const r = row.stage4?.pakad?.rating || "";
    setSingleDisabled(els.s4_rating, r || "(לפי טבלה)");
    setSingleDisabled(els.s4_stage, "(לא רלוונטי)");
  }
}

function syncCalcEnabled(){
  // Must have profession + stage2 rank/rating/seniority at least
  const ok = Boolean(
    els.profession.value &&
    els.s2_rank.value &&
    els.s2_rating.value &&
    els.s2_seniority.value
  );
  els.calcBtn.disabled = !ok;
}

function calc(){
  clearResults();
  const p = getProfBlock();
  if (!p){
    warn("בחרי מקצוע.");
    return;
  }
  const row = findRow();
  if (!row){
    warn("לא נמצאה שורה מתאימה לפי שלב 2 (דירוג/דרגה/וותק). בדקי בחירות.");
    return;
  }

  // Stage2 salary depends on station
  const s2_station = isStation(els.s2_station);
  const s2_salary = s2_station ? row.stage2.salary_station : row.stage2.salary_not_station;

  // Stage3 salary depends on hablan
  const hablan = isYes(els.s3_hablan);
  const s3_salary = hablan ? row.stage3.salary_hablan_bachir : row.stage3.salary;

  // Stage4 optional
  const role = els.s4_role.value;
  let s4_salary = null;
  let s4_title = null;
  if (role){
    const st = isStation(els.s4_station);
    if (role === "mifkach"){
      s4_title = "שלב 4: מפקח";
      s4_salary = st ? row.stage4.mifkach.salary_station : row.stage4.mifkach.salary_not_station;
    } else {
      s4_title = "שלב 4: פקד";
      s4_salary = st ? row.stage4.pakad.salary_station : row.stage4.pakad.salary_not_station;
    }
  }

  const html = `
    <div class="calc">
      <div class="line"><div class="label">מקצוע</div><div class="val">${els.profession.value}</div></div>
      <div class="line"><div class="label">רמת פעילות</div><div class="val">${p.activity_level || "—"}</div></div>
      <div class="line"><div class="label">קבוצת תמריץ</div><div class="val">${p.incentive_group ?? "—"}</div></div>

      <div class="line"><div class="label">שלב 1</div><div class="val">${els.s1_rank.value || row.stage1.rank || "—"} · ${els.s1_rating.value || row.stage1.rating || "—"}</div></div>

      <div class="line"><div class="label">שלב 2</div><div class="val">${row.stage2.rank} · ${row.stage2.rating} · ותק ${row.stage2.seniority} · ${s2_station ? "בתחנה" : "לא בתחנה"}</div></div>
      <div class="line"><div class="label">שכר שלב 2</div><div class="val">${money(s2_salary)}</div></div>

      <div class="line"><div class="label">שלב 3</div><div class="val">${row.stage3.rank} · ${row.stage3.rating} · ${hablan ? "חבלן בכיר" : "לא חבלן בכיר"}</div></div>
      <div class="line"><div class="label">שכר שלב 3</div><div class="val">${money(s3_salary)}</div></div>

      ${role ? `
        <div class="line"><div class="label">${s4_title}</div><div class="val">${role === "mifkach" ? (row.stage4.mifkach.rating + " · שלב " + row.stage4.mifkach.stage) : (row.stage4.pakad.rating || "(לפי טבלה)")}</div></div>
        <div class="line"><div class="label">שכר שלב 4</div><div class="val">${money(s4_salary)}</div></div>
      ` : ``}
    </div>
  `;

  els.results.innerHTML = html;
}

function resetAll(){
  // reset segmented buttons to "0"
  const resetSeg = (seg, hidden) => {
    if (!seg || !hidden) return;
    [...seg.querySelectorAll('.seg-btn')].forEach(b => b.classList.remove('active'));
    const first = seg.querySelector('.seg-btn[data-value="0"]');
    first?.classList.add('active');
    hidden.value = "0";
  };

  els.profession.value = "";
  els.activity.innerHTML = "";
  els.incentiveGroup.innerHTML = "";

  setOptions(els.s1_rating, [], "בחרי מקצוע קודם");
  setOptions(els.s1_rank, [], "בחרי מקצוע קודם");

  setOptions(els.s2_rank, [], "בחרי מקצוע קודם");
  setOptions(els.s2_rating, [], "בחרי מקצוע קודם");
  setOptions(els.s2_seniority, [], "בחרי מקצוע קודם");

  els.s3_rating.innerHTML = "";
  els.s3_rank.innerHTML = "";
  els.s3_rating.disabled = true;
  els.s3_rank.disabled = true;

  resetStage4();

  resetSeg(els.s2_stationSeg, els.s2_station);
  resetSeg(els.s3_hablanSeg, els.s3_hablan);
  resetSeg(els.s4_stationSeg, els.s4_station);

  clearResults();
  syncCalcEnabled();
}

async function init(){
  bindSegment(els.s2_stationSeg, els.s2_station);
  bindSegment(els.s3_hablanSeg, els.s3_hablan);
  bindSegment(els.s4_stationSeg, els.s4_station);

  const url = window.SALARY_TABLE_URL || "./salary_data.json";
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok){
    warn("לא הצלחתי לטעון salary_data.json. בדקי שהוא באותה תיקייה של index.html");
    return;
  }
  DATA = await res.json();

  // professions dropdown
  const profKeys = Object.keys(DATA.professions || {});
  setOptions(els.profession, profKeys, "בחרי מקצוע");

  els.profession.addEventListener("change", () => {
    const p = getProfBlock();
    if (!p) return;

    // auto-fill activity + incentive
    setSingleDisabled(els.activity, p.activity_level || "");
    setSingleDisabled(els.incentiveGroup, String(p.incentive_group ?? ""));

    fillStage2FromRows();
  });

  els.s2_rank.addEventListener("change", fillStage2Rating);
  els.s2_rating.addEventListener("change", fillStage2Seniority);
  els.s2_seniority.addEventListener("change", () => { syncStage3Autofill(); syncStage4Autofill(); clearResults(); syncCalcEnabled(); });

  els.s4_role.addEventListener("change", () => { syncStage4Autofill(); clearResults(); syncCalcEnabled(); });

  els.calcBtn.addEventListener("click", calc);
  els.resetBtn.addEventListener("click", resetAll);

  // initial state
  resetAll();
  // set initial placeholders
  setOptions(els.s1_rating, [], "בחרי מקצוע קודם");
  setOptions(els.s1_rank, [], "בחרי מקצוע קודם");
}

init().catch(() => warn("שגיאה באתחול. בדקי קונסול (F12)."));