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

  s3_rank: document.getElementById("s3_rank"),
  s3_rating: document.getElementById("s3_rating"),
  s3_seniority: document.getElementById("s3_seniority"),

  s4_role: document.getElementById("s4_role"),
  s4_rating: document.getElementById("s4_rating"),
  s4_seniority: document.getElementById("s4_seniority"),
  s4_stationSeg: document.getElementById("s4_stationSeg"),
  s4_station: document.getElementById("s4_station"),

  calcBtn: document.getElementById("calcBtn"),
  resetBtn: document.getElementById("resetBtn"),
  results: document.getElementById("results")
};


// ======================================================
// HELPERS
// ======================================================

const uniq = arr => [
  ...new Set(
    arr
      .filter(
        v =>
          v !== null &&
          v !== undefined &&
          String(v).trim() !== ""
      )
      .map(v => String(v).trim())
  )
];


function same(a, b) {
  return String(a ?? "").trim() === String(b ?? "").trim();
}


function setOptions(selectEl, options, placeholder = "בחר") {
  if (!selectEl) return;

  selectEl.innerHTML = "";

  const ph = document.createElement("option");
  ph.value = "";
  ph.textContent = placeholder;
  ph.selected = true;

  selectEl.appendChild(ph);

  options.forEach(value => {
    const option = document.createElement("option");

    option.value = String(value);
    option.textContent = String(value);

    selectEl.appendChild(option);
  });
}


function setSingleDisabled(selectEl, value) {
  if (!selectEl) return;

  selectEl.innerHTML = "";

  const option = document.createElement("option");

  option.value = value ?? "";
  option.textContent = value ?? "";

  selectEl.appendChild(option);

  selectEl.value = value ?? "";
  selectEl.disabled = true;
}


function optionExists(selectEl, value) {
  if (!selectEl || value === "") return false;

  return [...selectEl.options].some(
    option => String(option.value) === String(value)
  );
}


function money(value) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value))
  ) {
    return "—";
  }

  return Number(value).toLocaleString("he-IL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}


function warn(message) {
  if (!els.results) return;

  els.results.innerHTML =
    `<div class="warn">${message}</div>`;
}


function clearResults() {
  if (els.results) {
    els.results.innerHTML = "";
  }
}


function getProfBlock() {
  if (!DATA || !els.profession) return null;

  return DATA.professions?.[els.profession.value] || null;
}


function isStation(selectEl) {
  return selectEl?.value === "1";
}


// ======================================================
// SEGMENTED BUTTONS
// ======================================================

function bindSegment(segEl, hiddenSelectEl) {
  if (!segEl || !hiddenSelectEl) return;

  segEl.addEventListener("click", event => {
    const btn = event.target.closest(".seg-btn");

    if (!btn) return;

    segEl
      .querySelectorAll(".seg-btn")
      .forEach(button => {
        button.classList.remove("active");
      });

    btn.classList.add("active");

    hiddenSelectEl.value = btn.dataset.value;

    clearResults();
    syncCalcEnabled();
  });
}


function resetSegment(segEl, hiddenSelectEl) {
  if (!segEl || !hiddenSelectEl) return;

  segEl
    .querySelectorAll(".seg-btn")
    .forEach(button => {
      button.classList.remove("active");
    });

  hiddenSelectEl.value = "";
}


// ======================================================
// חוקים בין דרגות
// ======================================================

function getNextRank(stage2Rank) {
  if (stage2Rank === 'רס"מ 0') {
    return 'רס"מ 3';
  }

  if (stage2Rank === 'רס"מ 3') {
    return 'רס"מ 5';
  }

  if (stage2Rank === 'רס"מ 5') {
    return 'רס"מ 5';
  }

  return "";
}


// ======================================================
// STAGE 2 - ותק לפי דרגה
// ======================================================

function fillStage2SenioritiesByRank() {
  const p = getProfBlock();
  const rank = els.s2_rank?.value || "";

  if (!p || !rank) {
    setOptions(
      els.s2_seniority,
      [],
      "בחרי ותק"
    );

    return;
  }

  const rows = p.stage2 || [];

  const seniorities = uniq(
    rows
      .filter(row => same(row.rank, rank))
      .map(row => row.seniority)
  ).sort(
    (a, b) => Number(a) - Number(b)
  );

  setOptions(
    els.s2_seniority,
    seniorities,
    "בחרי ותק"
  );
}


// ======================================================
// STAGE 3 - ותק לפי דרגה
// ======================================================

function fillStage3SenioritiesByRank() {
  const p = getProfBlock();
  const rank = els.s3_rank?.value || "";

  if (!p || !rank) {
    setOptions(
      els.s3_seniority,
      [],
      "בחרי ותק"
    );

    return;
  }

  const rows = p.stage3 || [];

  const seniorities = uniq(
    rows
      .filter(row => same(row.rank, rank))
      .map(row => row.seniority)
  ).sort(
    (a, b) => Number(a) - Number(b)
  );

  setOptions(
    els.s3_seniority,
    seniorities,
    "בחרי ותק"
  );
}


// ======================================================
// העתקת הדרגה והוותק מתחילת קורס
// ======================================================

function syncStage3RankFromStage2() {
  const stage2Rank = els.s2_rank?.value || "";

  const nextRank = getNextRank(stage2Rank);

  if (!nextRank) {
    els.s3_rank.value = "";

    setOptions(
      els.s3_seniority,
      [],
      "בחרי ותק"
    );

    return;
  }

  if (optionExists(els.s3_rank, nextRank)) {
    els.s3_rank.value = nextRank;

    fillStage3SenioritiesByRank();
  }
}


function syncSeniorityFromStage2() {
  const seniority =
    els.s2_seniority?.value || "";

  if (!seniority) return;


  // סיום קורס
  if (
    els.s3_seniority &&
    optionExists(
      els.s3_seniority,
      seniority
    )
  ) {
    els.s3_seniority.value =
      seniority;
  } else if (els.s3_seniority) {
    // אם הוותק לא קיים בדרגה שאליה עבר,
    // לא נכניס ערך לא חוקי
    els.s3_seniority.value = "";
  }


  // לאחר מינוי
  if (
    els.s4_seniority &&
    optionExists(
      els.s4_seniority,
      seniority
    )
  ) {
    els.s4_seniority.value =
      seniority;
  }
}


// ======================================================
// מילוי נתוני מקצוע
// ======================================================

function fillIndependentOptions() {
  const p = getProfBlock();

  if (!p) {
    return;
  }


  // רמת פעילות
  setSingleDisabled(
    els.activity,
    p.activity_level || ""
  );


  // קבוצת תמריץ
  setSingleDisabled(
    els.incentiveGroup,
    String(
      p.incentive_group ?? ""
    )
  );


  // שלב מוסתר
  if (p.stage1) {
    setSingleDisabled(
      els.s1_rating,
      p.stage1.rating || ""
    );

    setSingleDisabled(
      els.s1_rank,
      p.stage1.rank || ""
    );
  }


  // ====================================================
  // תחילת קורס
  // ====================================================

  const s2 =
    Array.isArray(p.stage2)
      ? p.stage2
      : [];


  const s2Ranks =
    uniq(
      s2.map(row => row.rank)
    );


  const s2Ratings =
    uniq(
      s2.map(row => row.rating)
    );


  setOptions(
    els.s2_rank,
    s2Ranks,
    "בחרי דרגה"
  );


  setOptions(
    els.s2_rating,
    s2Ratings,
    "בחרי דירוג"
  );


  // ותק יתמלא רק אחרי בחירת דרגה
  setOptions(
    els.s2_seniority,
    [],
    "בחרי ותק"
  );


  // ====================================================
  // סיום קורס
  // ====================================================

  const s3 =
    Array.isArray(p.stage3)
      ? p.stage3
      : [];


  const s3Ranks =
    uniq(
      s3.map(row => row.rank)
    );


  const s3Ratings =
    uniq(
      s3.map(row => row.rating)
    );


  setOptions(
    els.s3_rank,
    s3Ranks,
    "בחרי דרגה"
  );


  setOptions(
    els.s3_rating,
    s3Ratings,
    "בחרי דירוג"
  );


  setOptions(
    els.s3_seniority,
    [],
    "בחרי ותק"
  );


  // ====================================================
  // לאחר מינוי
  // ====================================================

  if (els.s4_role) {
    els.s4_role.value = "";
  }


  setOptions(
    els.s4_rating,
    [],
    "בחרי דירוג"
  );


  setOptions(
    els.s4_seniority,
    [],
    "בחרי ותק"
  );


  els.s4_rating.disabled = true;
  els.s4_seniority.disabled = true;
}


// ======================================================
// STAGE 4 - מפקח / פקד
// ======================================================

function fillStage4Options() {
  const p = getProfBlock();

  const role =
    els.s4_role?.value || "";


  if (!p || !role) {
    setOptions(
      els.s4_rating,
      [],
      "בחרי דירוג"
    );

    setOptions(
      els.s4_seniority,
      [],
      "בחרי ותק"
    );

    els.s4_rating.disabled = true;
    els.s4_seniority.disabled = true;

    return;
  }


  const rows =
    Array.isArray(
      p.stage4?.[role]
    )
      ? p.stage4[role]
      : [];


  const ratings =
    uniq(
      rows.map(row => row.rating)
    );


  const seniorities =
    uniq(
      rows.map(row => row.seniority)
    ).sort(
      (a, b) =>
        Number(a) - Number(b)
    );


  setOptions(
    els.s4_rating,
    ratings,
    "בחרי דירוג"
  );


  setOptions(
    els.s4_seniority,
    seniorities,
    "בחרי ותק"
  );


  els.s4_rating.disabled = false;
  els.s4_seniority.disabled = false;


  // העתקת הוותק מתחילת קורס
  const stage2Seniority =
    els.s2_seniority?.value || "";


  if (
    stage2Seniority &&
    optionExists(
      els.s4_seniority,
      stage2Seniority
    )
  ) {
    els.s4_seniority.value =
      stage2Seniority;
  }
}


// ======================================================
// FIND ROWS
// ======================================================

function findStage2() {
  const p = getProfBlock();

  if (!p) return null;


  return (p.stage2 || []).find(
    row =>
      same(
        row.rank,
        els.s2_rank.value
      ) &&
      same(
        row.rating,
        els.s2_rating.value
      ) &&
      same(
        row.seniority,
        els.s2_seniority.value
      )
  ) || null;
}


function findStage3() {
  const p = getProfBlock();

  if (!p) return null;


  return (p.stage3 || []).find(
    row =>
      same(
        row.rank,
        els.s3_rank.value
      ) &&
      same(
        row.rating,
        els.s3_rating.value
      ) &&
      same(
        row.seniority,
        els.s3_seniority.value
      )
  ) || null;
}


function findStage4() {
  const p = getProfBlock();

  const role =
    els.s4_role?.value || "";


  if (!p || !role) {
    return null;
  }


  return (
    p.stage4?.[role] || []
  ).find(
    row =>
      same(
        row.rating,
        els.s4_rating.value
      ) &&
      same(
        row.seniority,
        els.s4_seniority.value
      )
  ) || null;
}


// ======================================================
// ENABLE CALCULATE
// ======================================================

function syncCalcEnabled() {
  if (!els.calcBtn) return;


  const stage2Ok = Boolean(
    els.profession?.value &&
    els.s2_rank?.value &&
    els.s2_rating?.value &&
    els.s2_seniority?.value &&
    els.s2_station?.value !== ""
  );


  const stage3Ok = Boolean(
    els.s3_rank?.value &&
    els.s3_rating?.value &&
    els.s3_seniority?.value
  );


  const role =
    els.s4_role?.value || "";


  const stage4Ok =
    !role ||
    Boolean(
      els.s4_rating?.value &&
      els.s4_seniority?.value &&
      els.s4_station?.value !== ""
    );


  els.calcBtn.disabled =
    !(
      stage2Ok &&
      stage3Ok &&
      stage4Ok
    );
}


// ======================================================
// RESULTS UI
// ======================================================

function stepRow(label, value, extraClass = "") {
  return `
    <div class="line ${extraClass}">
      <div class="label">
        ${label}
      </div>

      <div class="val">
        ₪ ${money(value)}
      </div>
    </div>
  `;
}


function diffHtml(delta) {
  if (delta >= 0) {
    return `
      <div class="diff positive diff-inline-text">
        במהלך הקורס תתקבל תוספת על סך
        <span class="amount">
          ₪ ${money(delta)}
        </span>
        עקב השינוי בנתוני השכר
      </div>
    `;
  }


  return `
    <div class="diff negative">
      סכום ההקפאה לצורך שימור שכר:
      <span class="amount">
        ₪ ${money(
          Math.abs(delta)
        )}
      </span>
    </div>
  `;
}


// ======================================================
// CALCULATE
// ======================================================

function calc() {
  clearResults();


  const p = getProfBlock();

  if (!p) {
    warn("בחרי מקצוע.");
    return;
  }


  // ====================================================
  // תחילת קורס
  // ====================================================

  const stage2 =
    findStage2();


  if (!stage2) {
    warn(
      "השילוב שבחרת בתחילת קורס קצינים אינו קיים בטבלת השכר. בדקי דרגה, דירוג וותק."
    );

    return;
  }


  // ====================================================
  // סיום קורס
  // ====================================================

  const stage3 =
    findStage3();


  if (!stage3) {
    warn(
      "השילוב שבחרת בסיום קורס קצינים אינו קיים בטבלת השכר. בדקי דרגה, דירוג וותק."
    );

    return;
  }


  const s2Salary =
    isStation(
      els.s2_station
    )
      ? stage2.salary_station
      : stage2.salary_not_station;


  // בסיום קורס אין תחנה ואין חבלן
  const s3Salary =
    stage3.salary_not_station;


  // ====================================================
  // לאחר מינוי
  // ====================================================

  const role =
    els.s4_role?.value || "";


  let stage4 = null;
  let s4Salary = null;


  if (role) {
    stage4 =
      findStage4();


    if (!stage4) {
      warn(
        "השילוב שבחרת לאחר מינוי אינו קיים בטבלת השכר. בדקי סוג מינוי, דירוג וותק."
      );

      return;
    }


    s4Salary =
      isStation(
        els.s4_station
      )
        ? stage4.salary_station
        : stage4.salary_not_station;
  }


  // ====================================================
  // חישובי הפרשים
  // ====================================================

  const delta23 =
    s3Salary - s2Salary;


  const delta34 =
    s4Salary === null
      ? null
      : s4Salary - s3Salary;


  const frozen =
    delta34 !== null &&
    delta34 < 0;


  const freezeAmount =
    frozen
      ? Math.abs(delta34)
      : 0;


  const referenceSalary = Math.max(s2Salary, s3Salary);


  const appointmentIsLower =
    s4Salary !== null &&
    s4Salary < referenceSalary;


  const finalPaid =
    s4Salary === null
      ? referenceSalary
      : Math.max(
          s2Salary,
          s3Salary,
          s4Salary
        );


  // ====================================================
  // טקסט
  // ====================================================

  const stage2Text =
    `${els.s2_rank.value}, ` +
    `דירוג ${els.s2_rating.value}, ` +
    `${els.s2_seniority.value} שנות ותק, ` +
    `${
      isStation(
        els.s2_station
      )
        ? "בתחנה"
        : "לא בתחנה"
    }`;


  const stage3Text =
    `${els.s3_rank.value}, ` +
    `דירוג ${els.s3_rating.value}, ` +
    `${els.s3_seniority.value} שנות ותק`;


  let stage4Text = "";


  if (role) {
    const roleLabel =
      role === "mifkach"
        ? "מפקח"
        : "פקד";


    stage4Text =
      `${roleLabel}, ` +
      `דירוג ${els.s4_rating.value}, ` +
      `${els.s4_seniority.value} שנות ותק, ` +
      `${
        isStation(
          els.s4_station
        )
          ? "בתחנה"
          : "לא בתחנה"
      }, כולל גמול ב׳`;
  }


  // ====================================================
  // הצגת התוצאות
  // ====================================================

  let html = `
    <div class="calc">

      ${stepRow(
        `<b>בתחילת</b> קורס קצינים (${stage2Text}, גמול א')`,
        s2Salary
      )}

      <div class="line diff-line">
        ${diffHtml(delta23)}
      </div>

      ${stepRow(
        `<b>בסיום</b> קורס קצינים (${stage3Text}, גמול א')`,
        s3Salary
      )}
  `;


  if (role) {
    html += `
      <div class="line diff-line">
        ${diffHtml(
          delta34 ?? 0
        )}
      </div>

      ${stepRow(
        `לאחר מינוי (${stage4Text})`,
        s4Salary,
        appointmentIsLower ? "cancelled-salary" : ""
      )}
    `;


    if (frozen) {
      html += `
        <div class="freeze-box">
          השכר יכלול הקפאה על סך
          <b>
            ${money(
              freezeAmount
            )} ₪ ברוטו
          </b>
        </div>
      `;
    }


    html += `
      <div class="pay-box">
        <div class="label">
          שכר משולם בפועל
        </div>

        <div class="val">
           ${money(
            finalPaid
          )} ₪ ברוטו
        </div>
      </div>
    `;
  } else {
    html += `
      <div class="pay-box">
        <div class="label">
          שכר משולם בפועל
        </div>

        <div class="val">
           ₪ ${money(
            s3Salary
          )}  ברוטו
        </div>
      </div>
    `;
  }


  html += `</div>`;


  els.results.innerHTML =
    html;
}


// ======================================================
// RESET
// ======================================================

function resetAll() {
  if (els.profession) {
    els.profession.value = "";
  }


  if (els.activity) {
    els.activity.innerHTML = "";
  }


  if (els.incentiveGroup) {
    els.incentiveGroup.innerHTML = "";
  }


  setOptions(
    els.s2_rank,
    [],
    "בחרי דרגה"
  );


  setOptions(
    els.s2_rating,
    [],
    "בחרי דירוג"
  );


  setOptions(
    els.s2_seniority,
    [],
    "בחרי ותק"
  );


  setOptions(
    els.s3_rank,
    [],
    "בחרי דרגה"
  );


  setOptions(
    els.s3_rating,
    [],
    "בחרי דירוג"
  );


  setOptions(
    els.s3_seniority,
    [],
    "בחרי ותק"
  );


  if (els.s4_role) {
    els.s4_role.value = "";
  }


  setOptions(
    els.s4_rating,
    [],
    "בחרי דירוג"
  );


  setOptions(
    els.s4_seniority,
    [],
    "בחרי ותק"
  );


  els.s4_rating.disabled =
    true;


  els.s4_seniority.disabled =
    true;


  resetSegment(
    els.s2_stationSeg,
    els.s2_station
  );


  resetSegment(
    els.s4_stationSeg,
    els.s4_station
  );


  clearResults();

  syncCalcEnabled();
}


// ======================================================
// DISCLAIMER
// ======================================================

function initDisclaimer() {
  const modal =
    document.getElementById(
      "disclaimerModal"
    );


  const btn =
    document.getElementById(
      "disclaimerAccept"
    );


  if (!modal || !btn) {
    return;
  }


  document.body.classList.add(
    "modal-open"
  );


  btn.addEventListener(
    "click",
    () => {
      document.body.classList.remove(
        "modal-open"
      );

      modal.remove();
    }
  );
}


// ======================================================
// INIT
// ======================================================

async function init() {
  initDisclaimer();


  bindSegment(
    els.s2_stationSeg,
    els.s2_station
  );


  bindSegment(
    els.s4_stationSeg,
    els.s4_station
  );


  const url =
    window.SALARY_TABLE_URL ||
    "./salary_data.json";


  const res =
    await fetch(
      url,
      {
        cache: "no-store"
      }
    );


  if (!res.ok) {
    warn(
      `לא הצלחתי לטעון salary_data.json. סטטוס: ${res.status}. URL: ${url}`
    );

    return;
  }


  DATA =
    await res.json();


  console.log(
    "Salary data loaded:",
    DATA
  );


  // ====================================================
  // מקצועות
  // ====================================================

  const professions =
    Object.keys(
      DATA.professions || {}
    );


  setOptions(
    els.profession,
    professions,
    "בחרי מקצוע"
  );


  // ====================================================
  // שינוי מקצוע
  // ====================================================

  els.profession?.addEventListener(
    "change",
    () => {
      clearResults();


      resetSegment(
        els.s2_stationSeg,
        els.s2_station
      );


      resetSegment(
        els.s4_stationSeg,
        els.s4_station
      );


      fillIndependentOptions();

      syncCalcEnabled();
    }
  );


  // ====================================================
  // דרגה בתחילת קורס
  // ====================================================

  els.s2_rank?.addEventListener(
    "change",
    () => {
      clearResults();


      // רק ותק ששייך לדרגה שנבחרה
      fillStage2SenioritiesByRank();


      // חוק הדרגות
      syncStage3RankFromStage2();


      // ניקוי הוותק עד בחירה מחדש
      if (els.s2_seniority) {
        els.s2_seniority.value = "";
      }


      if (els.s3_seniority) {
        els.s3_seniority.value = "";
      }


      syncCalcEnabled();
    }
  );


  // ====================================================
  // ותק בתחילת קורס
  // ====================================================

  els.s2_seniority?.addEventListener(
    "change",
    () => {
      clearResults();


      // לוודא שהדרגה בסיום כבר מסונכרנת
      syncStage3RankFromStage2();


      // העתקת הוותק לסיום ולמינוי
      syncSeniorityFromStage2();


      syncCalcEnabled();
    }
  );


  // ====================================================
  // שינוי ידני של דרגה בסיום קורס
  // ====================================================

  els.s3_rank?.addEventListener(
    "change",
    () => {
      clearResults();


      // רק ותק שקיים עבור הדרגה
      fillStage3SenioritiesByRank();


      syncCalcEnabled();
    }
  );


  // ====================================================
  // שאר השדות
  // ====================================================

  [
    els.s2_rating,

    els.s3_rating,
    els.s3_seniority,

    els.s4_rating,
    els.s4_seniority

  ].forEach(el => {
    el?.addEventListener(
      "change",
      () => {
        clearResults();
        syncCalcEnabled();
      }
    );
  });


  // ====================================================
  // מפקח / פקד
  // ====================================================

  els.s4_role?.addEventListener(
    "change",
    () => {
      clearResults();


      resetSegment(
        els.s4_stationSeg,
        els.s4_station
      );


      fillStage4Options();


      syncCalcEnabled();
    }
  );


  // ====================================================
  // BUTTONS
  // ====================================================

  els.calcBtn?.addEventListener(
    "click",
    calc
  );


  els.resetBtn?.addEventListener(
    "click",
    resetAll
  );


  resetAll();
}


// ======================================================
// PDF
// ======================================================

function exportToPDF() {
  const hasResult =
    els.results &&
    els.results.innerText
      .trim()
      .length > 0;


  if (!hasResult) {
    warn(
      "אין תוצאות לייצוא. חשבי שכר קודם."
    );

    return;
  }


  document.body.classList.add(
    "print-mode"
  );


  window.print();


  setTimeout(
    () => {
      document.body.classList.remove(
        "print-mode"
      );
    },
    300
  );
}


document
  .getElementById("pdfBtn")
  ?.addEventListener(
    "click",
    exportToPDF
  );


// ======================================================
// START
// ======================================================

init().catch(error => {
  console.error(
    "INIT ERROR:",
    error
  );


  warn(
    "שגיאה באתחול. בדקי Console ב-F12."
  );
});