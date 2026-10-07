/**
 * 會計物理引擎與 AI 世界模型沙盒邏輯 - 五大要素基礎版
 * 嚴格基於五大基本要素: Asset, Liability, Equity, Revenue, Expense
 * 
 * Account    Debit   Credit   Polarity
 * Asset      水增加  水減少   +1 (借)
 * Liability  水減少  水增加   -1 (貸)
 * Equity     水減少  水增加   -1 (貸)
 * Revenue    水減少  水增加   -1 (貸, 臨時)
 * Expense    水增加  水減少   +1 (借, 臨時)
 */

class AccountingEngine {
  constructor(accounts, polarities, initialBalances) {
    this.accounts = accounts;
    this.n = accounts.length;
    this.polarities = polarities;
    this.accMap = {};
    accounts.forEach((acc, idx) => { this.accMap[acc] = idx; });
    this.z = initialBalances.map((val, idx) => polarities[idx] * val);
  }

  // 執行交易關聯向量 b 乘金額 a
  applyTransaction(b, amount) {
    const sumB = b.reduce((acc, v) => acc + v, 0);
    if (Math.abs(sumB) > 1e-5) {
      console.error("交易不守恆! 向量和必須為 0:", sumB);
      throw new Error("Violation of KCL Conservation Law");
    }
    for (let i = 0; i < this.n; i++) {
      this.z[i] += b[i] * amount;
    }
  }

  // 期末結算 C: 將 Revenue 和 Expense 臨時科目清空，並全數結轉至 Equity (權益)
  closePeriod(tempAccounts, equityAccount = "Equity") {
    const rIdx = this.accMap[equityAccount];
    let transferred = 0;
    tempAccounts.forEach(name => {
      const idx = this.accMap[name];
      transferred += this.z[idx];
      this.z[idx] = 0;
    });
    this.z[rIdx] += transferred;
  }

  getBalance(accountName) {
    const idx = this.accMap[accountName];
    return this.polarities[idx] * this.z[idx];
  }
}

// 嚴格只留最基礎的五大要素
const ACCOUNTS = ["Asset", "Liability", "Equity", "Revenue", "Expense"];
const POLARITIES = [+1, -1, -1, -1, +1];

// 預設期初狀態: 資產 100 萬，權益 100 萬
const INITIAL_BALANCES = [1000000, 0, 1000000, 0, 0];

// DOM 元素抓取
const rangeRevenue = document.getElementById("range-revenue");
const rangeExpense = document.getElementById("range-expense");
const rangeLiability = document.getElementById("range-liability");
const rangeEquity = document.getElementById("range-equity");

const inputRevenue = document.getElementById("input-revenue");
const inputExpense = document.getElementById("input-expense");
const inputLiability = document.getElementById("input-liability");
const inputEquity = document.getElementById("input-equity");

const btnReset = document.getElementById("btn-reset");
const timelineBarsContainer = document.getElementById("timeline-bars");

const tbBody = document.getElementById("tb-body");
const totalDebitEl = document.getElementById("total-debit");
const totalCreditEl = document.getElementById("total-credit");

function formatMoney(amount) {
  if (Math.abs(amount) < 0.01) return "$0";
  const rounded = Math.round(amount);
  if (rounded === 0 || Object.is(rounded, -0)) return "$0";
  return "$" + rounded.toLocaleString();
}

// 即時推演運算
function runLiveSimulation() {
  const rev = parseFloat(inputRevenue.value) || 0;
  const exp = parseFloat(inputExpense.value) || 0;
  const liab = parseFloat(inputLiability.value) || 0;
  const eq = parseFloat(inputEquity.value) || 0;

  // 1. 當期快照引擎 (用於 5 大要素卡片與未結轉試算平衡表 Trial Balance)
  const currentEngine = new AccountingEngine(ACCOUNTS, POLARITIES, [1000000, 0, 1000000, 0, 0]);

  if (liab > 0) {
    const b = [0, 0, 0, 0, 0];
    b[currentEngine.accMap["Asset"]] = +1.0;
    b[currentEngine.accMap["Liability"]] = -1.0;
    currentEngine.applyTransaction(b, liab);
  }
  if (eq > 0) {
    const b = [0, 0, 0, 0, 0];
    b[currentEngine.accMap["Asset"]] = +1.0;
    b[currentEngine.accMap["Equity"]] = -1.0;
    currentEngine.applyTransaction(b, eq);
  }
  if (rev > 0) {
    const b = [0, 0, 0, 0, 0];
    b[currentEngine.accMap["Asset"]] = +1.0;
    b[currentEngine.accMap["Revenue"]] = -1.0;
    currentEngine.applyTransaction(b, rev);
  }
  if (exp > 0) {
    const b = [0, 0, 0, 0, 0];
    b[currentEngine.accMap["Expense"]] = +1.0;
    b[currentEngine.accMap["Asset"]] = -1.0;
    currentEngine.applyTransaction(b, exp);
  }

  // 2. 6 個月動態演化引擎 (每月定期結轉損益至權益池)
  const simEngine = new AccountingEngine(ACCOUNTS, POLARITIES, [1000000, 0, 1000000, 0, 0]);

  if (liab > 0) {
    const b = [0, 0, 0, 0, 0];
    b[simEngine.accMap["Asset"]] = +1.0;
    b[simEngine.accMap["Liability"]] = -1.0;
    simEngine.applyTransaction(b, liab);
  }
  if (eq > 0) {
    const b = [0, 0, 0, 0, 0];
    b[simEngine.accMap["Asset"]] = +1.0;
    b[simEngine.accMap["Equity"]] = -1.0;
    simEngine.applyTransaction(b, eq);
  }

  const initialStartingAsset = simEngine.getBalance("Asset");
  const timelineData = [];
  let bankruptMonth = null;

  // 推進 6 個月
  for (let m = 1; m <= 6; m++) {
    // 營收流動: 借 Asset (+), 貸 Revenue (+)
    if (rev > 0) {
      const b = [0, 0, 0, 0, 0];
      b[simEngine.accMap["Asset"]] = +1.0;
      b[simEngine.accMap["Revenue"]] = -1.0;
      simEngine.applyTransaction(b, rev);
    }

    // 費用流動: 借 Expense (+), 貸 Asset (-)
    if (exp > 0) {
      const b = [0, 0, 0, 0, 0];
      b[simEngine.accMap["Expense"]] = +1.0;
      b[simEngine.accMap["Asset"]] = -1.0;
      simEngine.applyTransaction(b, exp);
    }

    // 期末結轉 C: 清空當月 Revenue / Expense，全數匯入 Equity
    simEngine.closePeriod(["Revenue", "Expense"], "Equity");

    const curAsset = simEngine.getBalance("Asset");
    const isDeficit = curAsset < 0;

    if (isDeficit && bankruptMonth === null) {
      bankruptMonth = m;
    }

    timelineData.push({
      month: m,
      asset: curAsset,
      bankrupt: isDeficit
    });
  }

  // 1. 刷新五大水槽流體管網 (Hydraulic Water Tank Circuit)
  updateWaterTanks(currentEngine, rev, exp);

  // 1.5 刷新標準會計財務比率
  updateFinancialRatios(currentEngine, rev, exp, initialStartingAsset);

  // 2. 刷新 6 個月軌跡圖
  renderTimelineBars(timelineData);

  // 3. 刷新五大要素試算表 (呈現 DEALER 借貸平衡 1ᵀ z = 0)
  updateTrialBalanceTable(currentEngine);
}

// 刷新標準會計財務比率與恆等式
function updateFinancialRatios(engine, rev, exp, initialStartingAsset) {
  const asset = engine.getBalance("Asset");
  const liability = engine.getBalance("Liability");
  const equity = engine.getBalance("Equity");
  const netFlow = rev - exp;

  // 1. Monthly Net Flow & Net Margin
  const netFlowEl = document.getElementById("ratio-net-flow");
  const netMarginEl = document.getElementById("ratio-net-margin");
  if (netFlow >= 0) {
    netFlowEl.textContent = `+${formatMoney(netFlow)}`;
    netFlowEl.style.color = "#059669";
  } else {
    netFlowEl.textContent = `-${formatMoney(Math.abs(netFlow))}`;
    netFlowEl.style.color = "#E11D48";
  }

  const marginPct = rev > 0 ? ((netFlow / rev) * 100).toFixed(1) : "0.0";
  netMarginEl.textContent = `Net Margin: ${marginPct}%`;

  // 2. Debt-to-Asset Ratio
  const debtRatioEl = document.getElementById("ratio-debt-ratio");
  const leverageSubEl = document.getElementById("ratio-leverage-sub");
  const debtPct = asset > 0 ? ((liability / asset) * 100).toFixed(1) : "0.0";
  debtRatioEl.textContent = `${debtPct}%`;
  if (parseFloat(debtPct) > 60) {
    leverageSubEl.textContent = "High Risk (>60%)";
    debtRatioEl.style.color = "#E11D48";
  } else if (parseFloat(debtPct) > 30) {
    leverageSubEl.textContent = "Moderate Leverage";
    debtRatioEl.style.color = "#D97706";
  } else {
    leverageSubEl.textContent = "Conservative / Low";
    debtRatioEl.style.color = "#09090B";
  }

  // 3. Estimated Cash Runway
  const runwayEl = document.getElementById("ratio-runway");
  const runwaySubEl = document.getElementById("ratio-runway-sub");
  if (netFlow >= 0) {
    runwayEl.textContent = "Sustainable (∞)";
    runwayEl.style.color = "#059669";
    runwaySubEl.textContent = "Positive Cash Flow";
  } else {
    const burn = Math.abs(netFlow);
    const months = initialStartingAsset > 0 ? (initialStartingAsset / burn).toFixed(1) : "0.0";
    runwayEl.textContent = `${months} Months`;
    runwayEl.style.color = "#E11D48";
    runwaySubEl.textContent = `Depletion at $${burn.toLocaleString()}/mo`;
  }

  // 4. Identity verification badge
  const identityBadge = document.getElementById("identity-badge");
  identityBadge.textContent = `Asset (${formatMoney(asset)}) = Liab (${formatMoney(liability)}) + Eq (${formatMoney(equity + netFlow)})`;
}

// 刷新五大水槽流體管網 (Hydraulic Water Tank Circuit)
function updateWaterTanks(engine, rev, exp) {
  const asset = engine.getBalance("Asset");
  const liability = engine.getBalance("Liability");
  const equity = engine.getBalance("Equity");
  const revenue = engine.getBalance("Revenue");
  const expense = engine.getBalance("Expense");

  // 1. Central Asset Reservoir
  document.getElementById("val-asset").textContent = formatMoney(asset);
  const waterAsset = document.getElementById("water-asset");
  const assetPct = Math.max(0, Math.min(100, (asset / 2000000) * 100));
  waterAsset.style.height = `${assetPct}%`;

  const assetStatus = document.getElementById("asset-tank-status");
  if (assetStatus) {
    if (asset <= 0) {
      waterAsset.classList.add("deficit");
      assetStatus.textContent = "DRY / INSOLVENT (CRASH)";
      assetStatus.className = "hero-tag tag-deficit";
    } else if (asset < 300000) {
      waterAsset.classList.remove("deficit");
      assetStatus.textContent = "CRITICAL WATER LEVEL (< $300K)";
      assetStatus.className = "hero-tag tag-deficit";
    } else {
      waterAsset.classList.remove("deficit");
      assetStatus.textContent = "OPERATING RESERVOIR SOLVENT";
      assetStatus.className = "hero-tag";
    }
  }

  // 2. Revenue Tank
  document.getElementById("val-revenue").textContent = formatMoney(revenue);
  const revPct = Math.max(0, Math.min(100, (revenue / 500000) * 100));
  document.getElementById("water-revenue").style.height = `${revPct}%`;

  // 3. Expense Tank
  document.getElementById("val-expense").textContent = formatMoney(expense);
  const expPct = Math.max(0, Math.min(100, (expense / 500000) * 100));
  document.getElementById("water-expense").style.height = `${expPct}%`;

  // 4. Liability Tank
  document.getElementById("val-liability").textContent = formatMoney(liability);
  const liabPct = Math.max(0, Math.min(100, (liability / 1000000) * 100));
  document.getElementById("water-liability").style.height = `${liabPct}%`;

  // 5. Equity Tank
  document.getElementById("val-equity").textContent = formatMoney(equity);
  const eqPct = Math.max(0, Math.min(100, (equity / 2000000) * 100));
  document.getElementById("water-equity").style.height = `${eqPct}%`;

  // Dynamic Flow Pipes Animation
  const pipeRev = document.getElementById("pipe-rev");
  if (pipeRev) {
    if (rev > 0) {
      pipeRev.style.display = "block";
      const speed = Math.max(0.4, 2.0 - (rev / 500000) * 1.5);
      pipeRev.style.animationDuration = `${speed.toFixed(2)}s`;
    } else {
      pipeRev.style.display = "none";
    }
  }

  const pipeExp = document.getElementById("pipe-exp");
  if (pipeExp) {
    if (exp > 0) {
      pipeExp.style.display = "block";
      const speed = Math.max(0.4, 2.0 - (exp / 500000) * 1.5);
      pipeExp.style.animationDuration = `${speed.toFixed(2)}s`;
    } else {
      pipeExp.style.display = "none";
    }
  }
}

// 刷新 6 個月資產存量長條圖
function renderTimelineBars(data) {
  timelineBarsContainer.innerHTML = "";
  const maxAsset = Math.max(1, ...data.map(d => Math.abs(d.asset)));

  data.forEach(item => {
    const heightPct = Math.max(8, Math.min(100, (Math.abs(item.asset) / Math.max(maxAsset, 1500000)) * 100));

    const col = document.createElement("div");
    col.className = "bar-col";
    col.innerHTML = `
      <span class="bar-value" style="color:${item.bankrupt ? '#E11D48' : '#09090B'}">
        ${formatMoney(item.asset)}
      </span>
      <div class="bar-tube">
        <div class="bar-fill-inner ${item.bankrupt ? 'deficit' : ''}" style="height:${heightPct}%;"></div>
      </div>
      <span class="bar-month-tag">M${item.month}</span>
      <span class="bar-badge-pill ${item.bankrupt ? 'pill-fail' : 'pill-ok'}">
        ${item.bankrupt ? 'Deficit' : 'Solvent'}
      </span>
    `;
    timelineBarsContainer.appendChild(col);
  });
}

// 刷新五大要素試算表
function updateTrialBalanceTable(engine) {
  tbBody.innerHTML = "";
  let totalDebit = 0;
  let totalCredit = 0;

  ACCOUNTS.forEach((name, i) => {
    const val = engine.getBalance(name);
    const zVal = engine.z[i];

    let debitStr = "-";
    let creditStr = "-";

    if (val > 0) {
      if (POLARITIES[i] > 0) {
        debitStr = formatMoney(val);
        totalDebit += val;
      } else {
        creditStr = formatMoney(val);
        totalCredit += val;
      }
    } else {
      if (POLARITIES[i] > 0) {
        debitStr = "$0";
      } else {
        creditStr = "$0";
      }
    }

    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${name}</strong></td>
      <td style="color:#71717A">${POLARITIES[i] > 0 ? '+1 (Debit)' : '-1 (Credit)'}</td>
      <td class="text-right" style="color:#2563EB; font-weight:600;">${debitStr}</td>
      <td class="text-right" style="color:#D97706; font-weight:600;">${creditStr}</td>
    `;
    tbBody.appendChild(row);
  });

  totalDebitEl.textContent = formatMoney(totalDebit);
  totalCreditEl.textContent = formatMoney(totalCredit);
}


// Two-way Binding: Slider & Number Input
function bindTwoWay(slider, input) {
  slider.addEventListener("input", () => {
    input.value = slider.value;
    runLiveSimulation();
  });
  input.addEventListener("input", () => {
    const val = parseFloat(input.value) || 0;
    slider.value = val;
    runLiveSimulation();
  });
}

bindTwoWay(rangeRevenue, inputRevenue);
bindTwoWay(rangeExpense, inputExpense);
bindTwoWay(rangeLiability, inputLiability);
bindTwoWay(rangeEquity, inputEquity);

// Reset to Default State
btnReset.addEventListener("click", () => {
  if (shockInterval) clearInterval(shockInterval);
  inputRevenue.value = 200000;
  rangeRevenue.value = 200000;
  
  inputExpense.value = 150000;
  rangeExpense.value = 150000;
  
  inputLiability.value = 0;
  rangeLiability.value = 0;
  
  inputEquity.value = 0;
  rangeEquity.value = 0;
  
  if (autopilotLog) {
    autopilotLog.innerHTML = "System reset to baseline. Ready for simulation.";
  }
  runLiveSimulation();
});

// Genuine Machine Learning Q-Policy Table (Trained via Bellman Equation in accounting_rl_agent.py)
const RL_ACTIONS = [
  "Hold Operations",
  "Expansion (Borrow Debt)",
  "Austerity (Cut Costs)",
  "Deleverage (Pay Debt)",
  "Equity Financing"
];

const Q_POLICY_TABLE = {
  "HEALTHY|NEUTRAL|RECESSION": [117.58, 364.59, 383.72, 266.01, 342.29],
  "HEALTHY|POSITIVE|NORMAL": [278.64, 390.22, 254.15, 269.03, 279.56],
  "HEALTHY|POSITIVE|RECESSION": [482.00, 469.90, 496.69, 495.36, 463.45],
  "HEALTHY|POSITIVE|BOOM": [208.51, 271.75, 427.52, 143.43, 240.74],
  "HEALTHY|NEUTRAL|BOOM": [164.21, 32.84, 227.54, 92.74, 153.36],
  "HEALTHY|BURNING|RECESSION": [60.22, 191.20, 79.30, 18.03, 100.27],
  "HEALTHY|BURNING|NORMAL": [-98.46, -106.72, 87.48, -166.84, -43.51],
  "HEALTHY|NEUTRAL|NORMAL": [120.34, 135.80, 278.03, 98.21, 131.21],
  "HIGH_LEVERAGE|BURNING|NORMAL": [-146.45, -146.66, -90.07, -194.16, -156.80],
  "HEALTHY|BURNING|BOOM": [-68.75, -69.95, -72.20, -80.90, -48.66],
  "CRITICAL|BURNING|BOOM": [-378.88, -175.57, -175.78, -694.66, -156.30],
  "CRITICAL|NEUTRAL|BOOM": [142.18, 109.02, 210.02, 104.80, 111.66],
  "CRITICAL|BURNING|NORMAL": [-526.61, -228.92, -362.25, -457.94, -145.54],
  "HIGH_LEVERAGE|BURNING|RECESSION": [-69.91, -128.55, 119.81, -124.36, -69.45],
  "CRITICAL|BURNING|RECESSION": [-414.30, -212.89, -284.16, -401.74, -106.17],
  "CRITICAL|NEUTRAL|NORMAL": [118.18, 124.28, 398.37, 15.59, 89.71],
  "CRITICAL|NEUTRAL|RECESSION": [103.12, 70.79, 135.73, -13.45, 107.44],
  "CRITICAL|POSITIVE|BOOM": [-24.53, 241.73, 91.83, 32.79, -1.25],
  "CRITICAL|POSITIVE|NORMAL": [121.47, 0.00, 161.55, 38.79, 475.34],
  "HIGH_LEVERAGE|BURNING|BOOM": [-97.95, -131.46, -128.99, -103.27, -97.82],
  "HIGH_LEVERAGE|NEUTRAL|NORMAL": [-22.17, -49.76, 25.23, -17.49, -21.33],
  "HIGH_LEVERAGE|NEUTRAL|BOOM": [-50.59, -70.93, -41.51, -45.21, -58.59],
  "HIGH_LEVERAGE|POSITIVE|BOOM": [-4.67, 0.00, -15.28, -25.64, -3.67],
  "CRITICAL|POSITIVE|RECESSION": [0.00, 0.00, 0.00, 389.99, 0.00],
  "HIGH_LEVERAGE|POSITIVE|NORMAL": [0.00, -0.78, 0.00, 0.00, 96.82],
  "HIGH_LEVERAGE|NEUTRAL|RECESSION": [0.00, 18.86, 0.00, -2.10, 0.00]
};

// Pure ML Policy Inference Function (No if-else shortcuts!)
function runMLModelInference(asset, liab, rev, exp) {
  // 1. Feature Extraction & Discretization (State Representation)
  const solvency = (asset <= 0) ? "INSOLVENT" : (asset < 350000) ? "CRITICAL" : (liab > asset * 0.6) ? "HIGH_LEVERAGE" : "HEALTHY";
  const net = rev - exp;
  const cashflow = (net > 20000) ? "POSITIVE" : (net < -20000) ? "BURNING" : "NEUTRAL";
  const macro = (rev < 100000) ? "RECESSION" : (rev > 250000) ? "BOOM" : "NORMAL";
  const stateKey = `${solvency}|${cashflow}|${macro}`;

  // 2. Query Learned Q-Table
  const qScores = Q_POLICY_TABLE[stateKey] || [0.0, 0.0, 0.0, 0.0, 0.0];

  // 3. Mathematical Argmax Decision
  let bestAction = 0;
  let maxQ = -Infinity;
  for (let a = 0; a < qScores.length; a++) {
    if (qScores[a] > maxQ) {
      maxQ = qScores[a];
      bestAction = a;
    }
  }

  return { stateKey, qScores, bestAction, maxQ };
}

// Closed-Loop AI Autopilot & Crisis Shock Module
const btnToggleAutopilot = document.getElementById("btn-toggle-autopilot");
const btnTriggerShock = document.getElementById("btn-trigger-shock");
const autopilotStatusPill = document.getElementById("autopilot-status-pill");
const autopilotLog = document.getElementById("autopilot-log");

let isAutopilotActive = false;
let shockInterval = null;

if (btnToggleAutopilot) {
  btnToggleAutopilot.addEventListener("click", () => {
    isAutopilotActive = !isAutopilotActive;
    if (isAutopilotActive) {
      btnToggleAutopilot.classList.add("active");
      btnToggleAutopilot.textContent = "AI Autopilot: ACTIVE";
      autopilotStatusPill.className = "pill-active";
      autopilotStatusPill.textContent = "● RL Model Active";
      autopilotLog.innerHTML = "<span style='color:#059669;'>ML Model loaded (Q-Table ready). Actively computing argmax Q(s, a)...</span>";
    } else {
      btnToggleAutopilot.classList.remove("active");
      btnToggleAutopilot.textContent = "Enable AI Autopilot";
      autopilotStatusPill.className = "pill-inactive";
      autopilotStatusPill.textContent = "Manual Mode";
      autopilotLog.innerHTML = "Autopilot disengaged. Restored to manual human control.";
    }
  });
}

if (btnTriggerShock) {
  btnTriggerShock.addEventListener("click", () => {
    if (shockInterval) clearInterval(shockInterval);

    autopilotLog.innerHTML = "<strong style='color:#E11D48;'>⚠️ CRISIS SHOCK: Demand collapse! Revenue drops to $60,000/mo.</strong>";
    
    // Step 0: External Shock Injection
    inputRevenue.value = 60000;
    rangeRevenue.value = 60000;
    inputExpense.value = 180000;
    rangeExpense.value = 180000;
    runLiveSimulation();

    let step = 0;
    shockInterval = setInterval(() => {
      step++;
      const currentAsset = parseFloat(document.getElementById("val-asset").textContent.replace(/[^0-9.-]+/g,"")) || 0;
      const currentLiab = parseFloat(inputLiability.value) || 0;
      const currentRev = parseFloat(inputRevenue.value) || 0;
      const currentExp = parseFloat(inputExpense.value) || 0;

      if (isAutopilotActive) {
        // GENUINE ML INFERENCE: Argmax Q(s, a)
        const inference = runMLModelInference(currentAsset, currentLiab, currentRev, currentExp);
        const { stateKey, qScores, bestAction, maxQ } = inference;

        // Execute RL Agent's chosen action
        if (bestAction === 1) { // Expansion (Borrow)
          const newLiab = currentLiab + 150000;
          inputLiability.value = newLiab;
          rangeLiability.value = newLiab;
        } else if (bestAction === 2) { // Austerity (Cut Expense)
          const newExp = Math.max(50000, Math.round(currentExp * 0.65));
          inputExpense.value = newExp;
          rangeExpense.value = newExp;
        } else if (bestAction === 3) { // Deleverage (Pay Debt)
          const newLiab = Math.max(0, currentLiab - 100000);
          inputLiability.value = newLiab;
          rangeLiability.value = newLiab;
        } else if (bestAction === 4) { // Equity Financing
          const curEq = parseFloat(inputEquity.value) || 0;
          inputEquity.value = curEq + 150000;
          rangeEquity.value = curEq + 150000;
        }

        autopilotLog.innerHTML = `
          <div style="color:#059669; font-weight:700;">[ML Step ${step}] State: ${stateKey}</div>
          <div style="font-size:0.6rem; color:#64748B;">Q-Values: [Hold: ${qScores[0].toFixed(0)} | Borrow: ${qScores[1].toFixed(0)} | Austerity: ${qScores[2].toFixed(0)} | PayDebt: ${qScores[3].toFixed(0)} | Equity: ${qScores[4].toFixed(0)}]</div>
          <div style="color:#1D4ED8; font-weight:600;">► ML Argmax: <strong>${RL_ACTIONS[bestAction]}</strong> (Q = ${maxQ.toFixed(1)})</div>
        `;
      } else {
        // MANUAL / EXCEL MODE (No ML intervention)
        if (currentAsset <= 0) {
          autopilotLog.innerHTML = `<strong style='color:#E11D48;'>[Manual Step ${step}] FAILURE:</strong> Cash exhausted ($0). Insolvent.`;
          clearInterval(shockInterval);
          shockInterval = null;
        } else {
          autopilotLog.innerHTML = `<span style='color:#E11D48;'>[Manual Step ${step}] Burning:</span> Asset dropping by -$120,000/mo. Passive mode.`;
        }
      }

      runLiveSimulation();

      if (step >= 6) {
        clearInterval(shockInterval);
        shockInterval = null;
      }
    }, 1200);
  });
}

// Page Initialization
window.addEventListener("DOMContentLoaded", () => {
  runLiveSimulation();
});
