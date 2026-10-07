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

const aiStatusPill = document.getElementById("ai-status-pill");
const aiText = document.getElementById("ai-text");
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

  // 1. 刷新頂部五大要素卡片 (使用 currentEngine 呈現活躍的當期流量與存量)
  updateMetricsCards(currentEngine);

  // 1.5 刷新標準會計財務比率
  updateFinancialRatios(currentEngine, rev, exp, initialStartingAsset);

  // 2. 刷新 6 個月軌跡圖
  renderTimelineBars(timelineData, rev, exp);

  // 3. 刷新五大要素試算表 (呈現 DEALER 借貸平衡 1ᵀ z = 0)
  updateTrialBalanceTable(currentEngine);

  // 4. 刷新 AI 評估簡報
  updateAIDiagnosis(bankruptMonth, timelineData, rev, exp);
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

// 刷新五大要素指標卡片
function updateMetricsCards(engine) {
  const maxScale = 2000000;

  const asset = engine.getBalance("Asset");
  const liability = engine.getBalance("Liability");
  const equity = engine.getBalance("Equity");
  const revenue = engine.getBalance("Revenue");
  const expense = engine.getBalance("Expense");

  // Asset (資產)
  document.getElementById("val-asset").textContent = formatMoney(asset);
  const barAsset = document.getElementById("bar-asset");
  const assetW = Math.max(0, Math.min(100, (asset / maxScale) * 100));
  barAsset.style.width = `${assetW}%`;
  if (asset < 0) {
    barAsset.classList.add("fill-danger");
  } else {
    barAsset.classList.remove("fill-danger");
  }

  // Liability (負債)
  document.getElementById("val-liability").textContent = formatMoney(liability);
  document.getElementById("bar-liability").style.width = `${Math.max(0, Math.min(100, (liability / maxScale) * 100))}%`;

  // Equity (權益)
  document.getElementById("val-equity").textContent = formatMoney(equity);
  document.getElementById("bar-equity").style.width = `${Math.max(0, Math.min(100, (equity / maxScale) * 100))}%`;

  // Revenue (收入)
  document.getElementById("val-revenue").textContent = formatMoney(revenue);
  document.getElementById("bar-revenue").style.width = `${Math.max(0, Math.min(100, (revenue / (maxScale * 0.5)) * 100))}%`;

  // Expense (費用)
  document.getElementById("val-expense").textContent = formatMoney(expense);
  document.getElementById("bar-expense").style.width = `${Math.max(0, Math.min(100, (expense / (maxScale * 0.5)) * 100))}%`;
}

// 刷新 6 個月資產存量長條圖
function renderTimelineBars(data, rev, exp) {
  timelineBarsContainer.innerHTML = "";
  const maxAsset = Math.max(1, ...data.map(d => Math.abs(d.asset)));
  const netFlow = rev - exp;

  data.forEach(item => {
    const heightPct = Math.max(8, Math.min(100, (Math.abs(item.asset) / Math.max(maxAsset, 1500000)) * 100));

    const col = document.createElement("div");
    col.className = "bar-col";
    col.innerHTML = `
      <span class="bar-value" style="color:${item.bankrupt ? '#E11D48' : '#09090B'}">
        ${formatMoney(item.asset)}
      </span>
      <span class="bar-delta ${netFlow >= 0 ? 'delta-pos' : 'delta-neg'}">
        ${netFlow >= 0 ? '+' : '-'}${formatMoney(Math.abs(netFlow))}
      </span>
      <div class="bar-tube">
        <div class="bar-fill-inner ${item.bankrupt ? 'deficit' : ''}" style="height:${heightPct}%;"></div>
      </div>
      <span class="bar-month-tag">Month ${item.month}</span>
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

// AI Evaluation Text
function updateAIDiagnosis(bankruptMonth, timelineData, rev, exp) {
  if (bankruptMonth) {
    aiStatusPill.textContent = "Deficit Warning";
    aiStatusPill.className = "pill-danger";
    aiText.innerHTML = `
      Monthly Expense ($${exp.toLocaleString()}) exceeds monthly Revenue ($${rev.toLocaleString()}).<br/>
      Asset is depleted in <strong>Month ${bankruptMonth}</strong> (Deficit: ${formatMoney(timelineData[bankruptMonth-1].asset)}). Consider increasing Revenue or injecting Liability/Equity capital.
    `;
  } else {
    aiStatusPill.textContent = "Solvent";
    aiStatusPill.className = "pill-safe";
    aiText.innerHTML = `
      Dynamic equilibrium holds. Monthly net profit (${formatMoney(rev - exp)}) steadily accumulates into Equity.<br/>
      Projected Month 6 Asset is <strong>${formatMoney(timelineData[5].asset)}</strong>. Double-entry identity is preserved.
    `;
  }
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
  inputRevenue.value = 200000;
  rangeRevenue.value = 200000;
  
  inputExpense.value = 150000;
  rangeExpense.value = 150000;
  
  inputLiability.value = 0;
  rangeLiability.value = 0;
  
  inputEquity.value = 0;
  rangeEquity.value = 0;
  
  runLiveSimulation();
});

// Page Initialization
window.addEventListener("DOMContentLoaded", () => {
  runLiveSimulation();
});
