let NCO_DATA = null;
let OFFICER_DATA = null;

const els = {
  activity: document.getElementById("activity"),
  profession: document.getElementById("profession"),
  incentiveGroup: document.getElementById("incentiveGroup"),

  s2_rank: document.getElementById("s2_rank"),
  s2_rating: document.getElementById("s2_rating"),
  s2_seniority: document.getElementById("s2_seniority"),
  s2_gamulA: document.getElementById("s2_gamulA"),

  s3_rank: document.getElementById("s3_rank"),
  s3_rating: document.getElementById("s3_rating"),
  s3_seniority: document.getElementById("s3_seniority"),
  s3_gamulA: document.getElementById("s3_gamulA"),
  s3_gamulB: document.getElementById("s3_gamulB"),

  s4_role: document.getElementById("s4_role"),
  s4_rating: document.getElementById("s4_rating"),
  s4_seniority: document.getElementById("s4_seniority"),
  s4_gamulA: document.getElementById("s4_gamulA"),
  s4_gamulB: document.getElementById("s4_gamulB"),

  calcBtn: document.getElementById("calcBtn"),
  resetBtn: document.getElementById("resetBtn"),
  pdfBtn: document.getElementById("pdfBtn"),
  results: document.getElementById("results")
};

const uniq = arr => [...new Set(
  arr.filter(v => v !== null && v !== undefined && String(v).trim() !== "")
     .map(v => String(v).trim())
)];

function same(a,b){ return String(a ?? "").trim() === String(b ?? "").trim(); }

function setOptions(selectEl, options, placeholder="בחרי") {
  if (!selectEl) return;
  const old = selectEl.value;
  selectEl.innerHTML = "";
  const ph = document.createElement("option");
  ph.value = "";
  ph.textContent = placeholder;
  ph.selected = true;
  selectEl.appendChild(ph);

  options.forEach(v => {
    const o = document.createElement("option");
    o.value = String(v);
    o.textContent = String(v);
    selectEl.appendChild(o);
  });

  if ([...selectEl.options].some(o => o.value === old)) selectEl.value = old;
}

function setSingleDisabled(selectEl, value) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  const o = document.createElement("option");
  o.value = value ?? "";
  o.textContent = value ?? "";
  selectEl.appendChild(o);
  selectEl.value = value ?? "";
  selectEl.disabled = true;
}

function money(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  return Number(v).toLocaleString("he-IL", {minimumFractionDigits:0, maximumFractionDigits:0});
}

function emptyState() {
  return `
    <div class="empty-state">
      <div class="empty-icon"><i class="fa-solid fa-calculator"></i></div>
      <strong>התוצאה תופיע כאן</strong>
      <span>מלאי את השדות ולחצי על “חשב שכר”.</span>
    </div>`;
}

function clearResults(){ if (els.results) els.results.innerHTML = emptyState(); }
function warn(msg){ if (els.results) els.results.innerHTML = `<div class="warn">${msg}</div>`; }

function currentNcoProfile() {
  return NCO_DATA?.professions?.[els.profession?.value] || null;
}

function ncoRows() {
  return currentNcoProfile()?.rows || [];
}

function stage2Gamul() {
  return { a: !!els.s2_gamulA?.checked, b: false };
}
function stage3Gamul() {
  return { a: !!els.s3_gamulA?.checked, b: !!els.s3_gamulB?.checked };
}
function stage4Gamul() {
  return { a: !!els.s4_gamulA?.checked, b: !!els.s4_gamulB?.checked };
}

function rowsForGamul(rows, gamul) {
  return rows.filter(r => !!r.gamul_a === !!gamul.a && !!r.gamul_b === !!gamul.b);
}

function getNextRank(stage2Rank) {
  if (stage2Rank === 'רס"מ 0') return 'רס"מ 3';
  if (stage2Rank === 'רס"מ 3') return 'רס"מ 5';
  if (stage2Rank === 'רס"מ 5') return 'רס"מ 5';
  return "";
}

function optionExists(selectEl, value){
  return !!selectEl && [...selectEl.options].some(o => o.value === String(value));
}

function enforceGamulRules() {

  // שלב 3 - המשתמשת יכולה לבחור אם גמול א' מסומן או לא
  // אבל אם מסומן גמול ב' - חייב להיות גם גמול א'
  if (els.s3_gamulB?.checked) {
    els.s3_gamulA.checked = true;
  }

  // שלב 4 - גמול א' תמיד מסומן ולא ניתן לבטל
  if (els.s4_gamulA) {
    els.s4_gamulA.checked = true;
    els.s4_gamulA.disabled = true;
  }

  // גם בשלב 4, אם יש גמול ב' - גמול א' נשאר מסומן
  if (els.s4_gamulB?.checked) {
    els.s4_gamulA.checked = true;
  }
}

function fillProfile() {
  const p = currentNcoProfile();
  if (!p) return;
  setSingleDisabled(els.activity, p.activity_level || "");
  setSingleDisabled(els.incentiveGroup, String(p.incentive_group ?? ""));

  setOptions(els.s2_rank, uniq(p.rows.map(r => r.rank)), "בחרי דרגה");
  setOptions(els.s2_rating, [], "בחרי דירוג");
  setOptions(els.s2_seniority, [], "בחרי ותק");

  setOptions(els.s3_rank, uniq(p.rows.map(r => r.rank)), "בחרי דרגה");
  setOptions(els.s3_rating, [], "בחרי דירוג");
  setOptions(els.s3_seniority, [], "בחרי ותק");

  els.s4_role.value = "";
  setOptions(els.s4_rating, [], "בחרי דירוג");
  setOptions(els.s4_seniority, [], "בחרי ותק");
  els.s4_rating.disabled = true;
  els.s4_seniority.disabled = true;
}

function refreshStage2(preserve=true) {
  const rows = rowsForGamul(ncoRows(), stage2Gamul());
  const oldRank = els.s2_rank.value, oldRating = els.s2_rating.value, oldSen = els.s2_seniority.value;

  setOptions(els.s2_rank, uniq(rows.map(r => r.rank)), "בחרי דרגה");
  if (preserve && optionExists(els.s2_rank, oldRank)) els.s2_rank.value = oldRank;

  const byRank = rows.filter(r => same(r.rank, els.s2_rank.value));
  setOptions(els.s2_rating, uniq(byRank.map(r => r.rating)), "בחרי דירוג");
  if (preserve && optionExists(els.s2_rating, oldRating)) els.s2_rating.value = oldRating;

  const byRating = byRank.filter(r => same(r.rating, els.s2_rating.value));
  const sens = uniq(byRating.map(r => r.seniority)).sort((a,b)=>Number(a)-Number(b));
  setOptions(els.s2_seniority, sens, "בחרי ותק");
  if (preserve && optionExists(els.s2_seniority, oldSen)) els.s2_seniority.value = oldSen;
}

function refreshStage3(preserve=true) {
  const rows = rowsForGamul(ncoRows(), stage3Gamul());
  const oldRank = els.s3_rank.value, oldRating = els.s3_rating.value, oldSen = els.s3_seniority.value;

  setOptions(els.s3_rank, uniq(rows.map(r => r.rank)), "בחרי דרגה");

  // חוק הדרגות: ברירת המחדל לשלב 3 נגזרת מדרגת שלב 2
  const nextRank = getNextRank(els.s2_rank.value);
  if (nextRank && optionExists(els.s3_rank, nextRank)) {
    els.s3_rank.value = nextRank;
  } else if (preserve && optionExists(els.s3_rank, oldRank)) {
    els.s3_rank.value = oldRank;
  }

  const byRank = rows.filter(r => same(r.rank, els.s3_rank.value));
  setOptions(els.s3_rating, uniq(byRank.map(r => r.rating)), "בחרי דירוג");
  if (preserve && optionExists(els.s3_rating, oldRating)) els.s3_rating.value = oldRating;

  const byRating = byRank.filter(r => same(r.rating, els.s3_rating.value));
  const sens = uniq(byRating.map(r => r.seniority)).sort((a,b)=>Number(a)-Number(b));
  setOptions(els.s3_seniority, sens, "בחרי ותק");

  const s2sen = els.s2_seniority.value;
  if (s2sen && optionExists(els.s3_seniority, s2sen)) {
    els.s3_seniority.value = s2sen;
  } else if (preserve && optionExists(els.s3_seniority, oldSen)) {
    els.s3_seniority.value = oldSen;
  }
}

function officerProfileKey() {
  const p = currentNcoProfile();
  const role = els.s4_role.value;
  if (!p || !role) return "";

  // בקובץ הקצינים, שורות פקד נמצאות תחת "קצונת ימ\"ס"
  const officerProfession = role === "pakad" ? 'קצונת ימ"ס' : p.profession;
  return `${officerProfession} - ${p.activity_level}`;
}

function officerRowsForStage4() {
  const role = els.s4_role.value;
  const key = officerProfileKey();
  if (!role || !key) return [];
  const block = OFFICER_DATA?.professions?.[key];
  return block?.roles?.[role] || [];
}

function refreshStage4(preserve=true) {
  const role = els.s4_role.value;
  if (!role) {
    setOptions(els.s4_rating, [], "בחרי דירוג");
    setOptions(els.s4_seniority, [], "בחרי ותק");
    els.s4_rating.disabled = true;
    els.s4_seniority.disabled = true;
    return;
  }

  const rows = rowsForGamul(officerRowsForStage4(), stage4Gamul());
  const oldRating = els.s4_rating.value, oldSen = els.s4_seniority.value;

  setOptions(els.s4_rating, uniq(rows.map(r => r.rating)).sort((a,b)=>Number(a)-Number(b)), "בחרי דירוג");
  els.s4_rating.disabled = false;
  if (preserve && optionExists(els.s4_rating, oldRating)) els.s4_rating.value = oldRating;

  const byRating = rows.filter(r => same(r.rating, els.s4_rating.value));
  const sens = uniq(byRating.map(r => r.seniority)).sort((a,b)=>Number(a)-Number(b));
  setOptions(els.s4_seniority, sens, "בחרי ותק");
  els.s4_seniority.disabled = false;

  const s2sen = els.s2_seniority.value;
  if (s2sen && optionExists(els.s4_seniority, s2sen)) {
    els.s4_seniority.value = s2sen;
  } else if (preserve && optionExists(els.s4_seniority, oldSen)) {
    els.s4_seniority.value = oldSen;
  }
}

function findStage2() {
  const g = stage2Gamul();
  return ncoRows().find(r =>
    same(r.rank, els.s2_rank.value) &&
    same(r.rating, els.s2_rating.value) &&
    same(r.seniority, els.s2_seniority.value) &&
    !!r.gamul_a === g.a &&
    !!r.gamul_b === false
  ) || null;
}

function findStage3() {
  const g = stage3Gamul();
  return ncoRows().find(r =>
    same(r.rank, els.s3_rank.value) &&
    same(r.rating, els.s3_rating.value) &&
    same(r.seniority, els.s3_seniority.value) &&
    !!r.gamul_a === g.a &&
    !!r.gamul_b === g.b
  ) || null;
}

function findStage4() {
  const g = stage4Gamul();
  return officerRowsForStage4().find(r =>
    same(r.rating, els.s4_rating.value) &&
    same(r.seniority, els.s4_seniority.value) &&
    !!r.gamul_a === g.a &&
    !!r.gamul_b === g.b
  ) || null;
}

function syncCalcEnabled() {
  const stage2Ok = !!(
    els.profession.value &&
    els.s2_rank.value &&
    els.s2_rating.value &&
    els.s2_seniority.value
  );
  const stage3Ok = !!(
    els.s3_rank.value &&
    els.s3_rating.value &&
    els.s3_seniority.value
  );
  const role = els.s4_role.value;
  const stage4Ok = !role || !!(els.s4_rating.value && els.s4_seniority.value);
  els.calcBtn.disabled = !(stage2Ok && stage3Ok && stage4Ok);
}

function stepRow(label, value, extraClass="") {
  return `<div class="line ${extraClass}">
    <div class="label">${label}</div>
    <div class="val">₪ ${money(value)}</div>
  </div>`;
}

function diffHtml(delta) {
  if (delta >= 0) {
    return `<div class="diff positive">
      במהלך הקורס תתקבל תוספת על סך
      <span class="amount">₪ ${money(delta)}</span>
      עקב העלייה בדרגה ובדירוג
    </div>`;
  }

  return "";
}

function gamulText(g) {
  const parts = [];
  if (g.a) parts.push("גמול א׳");
  if (g.b) parts.push("גמול ב׳");
  return parts.length ? parts.join(" + ") : "ללא גמול";
}

function calc() {
  clearResults();

  const stage2 = findStage2();
  if (!stage2) {
    warn("לא נמצאה התאמה בשלב 2 לפי דרגה, דירוג, ותק וגמול א׳.");
    return;
  }

  const stage3 = findStage3();
  if (!stage3) {
    warn("לא נמצאה התאמה בשלב 3 לפי דרגה, דירוג, ותק וגמולים.");
    return;
  }

  const role = els.s4_role.value;
  let stage4 = null;
  if (role) {
    stage4 = findStage4();
    if (!stage4) {
      warn("לא נמצאה התאמה בשלב 4 לפי סוג המינוי, דירוג, ותק וגמולים.");
      return;
    }
  }

  const s2Salary = Number(stage2.salary);
  const s3Salary = Number(stage3.salary);
  const s4Salary = stage4 ? Number(stage4.salary) : null;

  const delta23 = s3Salary - s2Salary;
  const delta34 = s4Salary === null ? null : s4Salary - s3Salary;
  const referenceSalary = Math.max(s2Salary, s3Salary);
  const appointmentIsLower = s4Salary !== null && s4Salary < referenceSalary;
  const finalPaid = s4Salary === null ? referenceSalary : Math.max(s2Salary, s3Salary, s4Salary);
  const frozen = s4Salary !== null && s4Salary < referenceSalary;
  const freezeAmount = frozen ? referenceSalary - s4Salary : 0;

  const stage2Text = `${els.s2_rank.value}, דירוג ${els.s2_rating.value}, ${els.s2_seniority.value} שנות ותק, ${gamulText(stage2Gamul())}`;
  const stage3Text = `${els.s3_rank.value}, דירוג ${els.s3_rating.value}, ${els.s3_seniority.value} שנות ותק, ${gamulText(stage3Gamul())}`;

  let html = `<div class="calc">
    ${stepRow(`שכר ברוטו <b>בתחילת</b> קורס קצינים (${stage2Text})`, s2Salary)}
    <div class="line diff-line">${diffHtml(delta23)}</div>
    ${stepRow(`שכר ברוטו <b>בסיום</b> קורס קצינים (${stage3Text})`, s3Salary)}
  `;

  if (role) {
    const roleLabel = role === "mifkach" ? "מפקח" : "פקד";
    const stage4Text = `${roleLabel}, דירוג ${els.s4_rating.value}, ${els.s4_seniority.value} שנות ותק, ${gamulText(stage4Gamul())}`;
    html += `
      <div class="line diff-line">${diffHtml(delta34 ?? 0)}</div>
      ${stepRow(`שכר ברוטו לאחר מינוי (${stage4Text})`, s4Salary, appointmentIsLower ? "cancelled-salary" : "")}
      <div class="pay-box">
        <div class="label">שכר ברוטו כקצין</div>
        <div class="val"><span class="money-value"><span class="shekel-sign">₪</span><span class="money-number">${money(finalPaid)}</span></span></div>
      </div>`;
    if (frozen) {
      html += `<div class="freeze-box">השכר יכלול הקפאה על סך <b>${money(freezeAmount)} ₪ ברוטו</b></div>`;
    }
  } else {
    html += `<div class="pay-box">
      <div class="label">שכר בסיום הקורס</div>
      <div class="val"><span class="money-value"><span class="shekel-sign">₪</span><span class="money-number">${money(finalPaid)}</span></span></div>
    </div>`;
  }

  html += `</div>`;
  els.results.innerHTML = html;
}

function resetAll() {
  if (!NCO_DATA) return;

  setOptions(els.profession, Object.keys(NCO_DATA.professions || {}), "בחרי מקצוע");
  els.activity.innerHTML = "";
  els.incentiveGroup.innerHTML = "";

  [els.s2_rank, els.s2_rating, els.s2_seniority, els.s3_rank, els.s3_rating, els.s3_seniority]
    .forEach(s => setOptions(s, [], "בחרי"));

  els.s4_role.value = "";
  setOptions(els.s4_rating, [], "בחרי דירוג");
  setOptions(els.s4_seniority, [], "בחרי ותק");
  els.s4_rating.disabled = true;
  els.s4_seniority.disabled = true;

  els.s2_gamulA.checked = false;

  els.s3_gamulA.checked = true;
  els.s3_gamulA.disabled = false;
  els.s3_gamulB.checked = false;

  els.s4_gamulA.checked = true;
  els.s4_gamulA.disabled = true;
  els.s4_gamulB.checked = false;

  clearResults();
  syncCalcEnabled();
}

function initDisclaimer() {
  const modal = document.getElementById("disclaimerModal");
  const accept = document.getElementById("disclaimerAccept");
  if (!modal || !accept) return;

  modal.style.display = "grid";
  document.body.classList.add("modal-open");
  accept.addEventListener("click", () => {
    modal.style.display = "none";
    document.body.classList.remove("modal-open");
  });
}

function exportToPDF() {
  if (!els.results || els.results.querySelector(".empty-state")) {
    warn("יש לבצע חישוב לפני יצוא ל‑PDF.");
    return;
  }
  window.print();
}

function wireEvents() {
  els.profession.addEventListener("change", () => {
    clearResults();
    els.s2_gamulA.checked = false;
    els.s3_gamulA.checked = false;
    els.s3_gamulB.checked = false;
    els.s4_gamulA.checked = false;
    els.s4_gamulB.checked = false;
    enforceGamulRules();
    fillProfile();
    syncCalcEnabled();
  });

  els.s2_gamulA.addEventListener("change", () => {
    clearResults();
    enforceGamulRules("s2");
    refreshStage2(true);
    refreshStage3(true);
    refreshStage4(true);
    syncCalcEnabled();
  });

  els.s2_rank.addEventListener("change", () => {
    clearResults();
    refreshStage2(true);
    refreshStage3(true);
    refreshStage4(true);
    syncCalcEnabled();
  });

  els.s2_rating.addEventListener("change", () => {
    clearResults();
    refreshStage2(true);
    syncCalcEnabled();
  });

  els.s2_seniority.addEventListener("change", () => {
    clearResults();
    refreshStage3(true);
    refreshStage4(true);
    syncCalcEnabled();
  });

  [els.s3_gamulA, els.s3_gamulB].forEach(el => el.addEventListener("change", () => {
    clearResults();
    enforceGamulRules("s3");
    refreshStage3(true);
    syncCalcEnabled();
  }));

  els.s3_rank.addEventListener("change", () => {
    clearResults();
    refreshStage3(true);
    syncCalcEnabled();
  });

  els.s3_rating.addEventListener("change", () => {
    clearResults();
    refreshStage3(true);
    syncCalcEnabled();
  });

  els.s3_seniority.addEventListener("change", () => {
    clearResults();
    syncCalcEnabled();
  });

  els.s4_role.addEventListener("change", () => {
    clearResults();
    enforceGamulRules("s4");
    refreshStage4(false);
    syncCalcEnabled();
  });

  [els.s4_gamulA, els.s4_gamulB].forEach(el => el.addEventListener("change", () => {
    clearResults();
    enforceGamulRules("s4");
    refreshStage4(true);
    syncCalcEnabled();
  }));

  els.s4_rating.addEventListener("change", () => {
    clearResults();
    refreshStage4(true);
    syncCalcEnabled();
  });

  els.s4_seniority.addEventListener("change", () => {
    clearResults();
    syncCalcEnabled();
  });

  els.calcBtn.addEventListener("click", calc);
  els.resetBtn.addEventListener("click", resetAll);
  els.pdfBtn.addEventListener("click", exportToPDF);
}

async function init() {
  initDisclaimer();

  const ncoUrl = window.NCO_SALARY_TABLE_URL || "./nco_salary_data.json";
  const officerUrl = window.OFFICER_SALARY_TABLE_URL || "./officer_salary_data.json";

  try {
    const [ncoRes, offRes] = await Promise.all([
      fetch(ncoUrl, {cache:"no-store"}),
      fetch(officerUrl, {cache:"no-store"})
    ]);

    if (!ncoRes.ok) throw new Error(`שגיאה בטעינת קובץ הנגדים (${ncoRes.status})`);
    if (!offRes.ok) throw new Error(`שגיאה בטעינת קובץ הקצינים (${offRes.status})`);

    NCO_DATA = await ncoRes.json();
    OFFICER_DATA = await offRes.json();

    wireEvents();
    resetAll();
  } catch (err) {
    console.error(err);
    warn(`לא הצלחתי לטעון את נתוני השכר: ${err.message}`);
  }
}

init();
