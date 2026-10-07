/**
 * 會計物理引擎與 AI 世界模型沙盒邏輯
 * 支援滑動條即時響應、即時軌跡渲染與守恆驗證
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

  closePeriod(tempAccounts, retainedEarningsAccount) {
    const rIdx = this.accMap[retainedEarningsAccount];
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

// 帳套配置
const ACCOUNTS = [
  "Cash", "Equipment", "Bank Loan", "Common Stock",
  "Retained Earnings", "Sales Revenue", "Operating Expense"
];
const POLARITIES = [+1, +1, -1, -1, -1, -1, +1];
const INITIAL_BALANCES = [1000000, 0, 0, 1000000, 0, 0, 0];

let mainEngine = new AccountingEngine(ACCOUNTS, POLARITIES, INITIAL_BALANCES);

// DOM 元素
const rangeSales = document.getElementById("range-sales");
const rangeExpense = document.getElementById("range-expense");
const rangeCapex = document.getElementById("range-capex");
const rangeLoan = document.getElementById("range-loan");

const dispSales = document.getElementById("disp-sales");
const dispExpense = document.getElementById("disp-expense");
const dispCapex = document.getElementById("disp-capex");
const dispLoan = document.getElementById("disp-loan");

const btnPresetConservative = document.getElementById("btn-preset-conservative");
const btnPresetAggressive = document.getElementById("btn-preset-aggressive");
const btnPresetCrisis = document.getElementById("btn-preset-crisis");
const btnReset = document.getElementById("btn-reset");

const aiStatusPill = document.getElementById("ai-status-pill");
const aiText = document.getElementById("ai-text");
const timelineBarsContainer = document.getElementById("timeline-bars");

const tbBody = document.getElementById("tb-body");
const totalDebitEl = document.getElementById("total-debit");
const totalCreditEl = document.getElementById("total-credit");

function formatMoney(amount) {
  return "$" + Math.round(amount).toLocaleString();
}

// 執行沙盒推演並即時刷新畫面
function runLiveSimulation() {
  const sales = parseFloat(rangeSales.value) || 0;
  const expense = parseFloat(rangeExpense.value) || 0;
  const capex = parseFloat(rangeCapex.value) || 0;
  const loan = parseFloat(rangeLoan.value) || 0;

  // 更新數值顯示文字
  dispSales.textContent = formatMoney(sales);
  dispExpense.textContent = formatMoney(expense);
  dispCapex.textContent = formatMoney(capex);
  dispLoan.textContent = formatMoney(loan);

  // 初始化推演沙盒
  const simEngine = new AccountingEngine(ACCOUNTS, POLARITIES, INITIAL_BALANCES);

  // 首月資本動作 (Capex & Loan)
  if (loan > 0) {
    const b = [0,0,0,0,0,0,0];
    b[simEngine.accMap["Cash"]] = +1.0;
    b[simEngine.accMap["Bank Loan"]] = -1.0;
    simEngine.applyTransaction(b, loan);
  }
  if (capex > 0) {
    const b = [0,0,0,0,0,0,0];
    b[simEngine.accMap["Equipment"]] = +1.0;
    b[simEngine.accMap["Cash"]] = -1.0;
    simEngine.applyTransaction(b, capex);
  }

  const timelineData = [];
  let bankruptMonth = null;

  // 推進 6 個月
  for (let m = 1; m <= 6; m++) {
    if (sales > 0) {
      const b = [0,0,0,0,0,0,0];
      b[simEngine.accMap["Cash"]] = +1.0;
      b[simEngine.accMap["Sales Revenue"]] = -1.0;
      simEngine.applyTransaction(b, sales);
    }
    if (expense > 0) {
      const b = [0,0,0,0,0,0,0];
      b[simEngine.accMap["Operating Expense"]] = +1.0;
      b[simEngine.accMap["Cash"]] = -1.0;
      simEngine.applyTransaction(b, expense);
    }

    simEngine.closePeriod(["Sales Revenue", "Operating Expense"], "Retained Earnings");

    const curCash = simEngine.getBalance("Cash");
    const curEquity = simEngine.getBalance("Retained Earnings");
    const isB = curCash < 0;

    if (isB && bankruptMonth === null) {
      bankruptMonth = m;
    }

    timelineData.push({
      month: m,
      cash: curCash,
      profit: curEquity,
      bankrupt: isB
    });
  }

  // 1. 刷新頂部指標卡片
  updateMetricsCards(simEngine);

  // 2. 刷新 6 個月長條圖
  renderTimelineBars(timelineData);

  // 3. 刷新試算表
  updateTrialBalanceTable(simEngine);

  // 4. 刷新 AI 評估文字
  updateAIDiagnosis(bankruptMonth, timelineData, capex, loan);
}

// 刷新頂部 5 大指標卡片
function updateMetricsCards(engine) {
  const maxScale = 2000000;

  const cash = engine.getBalance("Cash");
  const eq = engine.getBalance("Equipment");
  const loan = engine.getBalance("Bank Loan");
  const equity = engine.getBalance("Common Stock");
  const retained = engine.getBalance("Retained Earnings");

  // Cash
  document.getElementById("val-cash").textContent = formatMoney(cash);
  const barCash = document.getElementById("bar-cash");
  const cashW = Math.max(0, Math.min(100, (cash / maxScale) * 100));
  barCash.style.width = `${cashW}%`;
  if (cash < 0) {
    barCash.classList.add("fill-danger");
  } else {
    barCash.classList.remove("fill-danger");
  }

  // Equipment
  document.getElementById("val-equipment").textContent = formatMoney(eq);
  document.getElementById("bar-equipment").style.width = `${Math.max(0, Math.min(100, (eq / maxScale) * 100))}%`;

  // Loan
  document.getElementById("val-loan").textContent = formatMoney(loan);
  document.getElementById("bar-loan").style.width = `${Math.max(0, Math.min(100, (loan / maxScale) * 100))}%`;

  // Equity
  document.getElementById("val-equity").textContent = formatMoney(equity);
  document.getElementById("bar-equity").style.width = `${Math.max(0, Math.min(100, (equity / maxScale) * 100))}%`;

  // Retained
  document.getElementById("val-retained").textContent = formatMoney(retained);
  const barRet = document.getElementById("bar-retained");
  const retW = Math.max(0, Math.min(100, (Math.abs(retained) / (maxScale * 0.5)) * 100));
  barRet.style.width = `${retW}%`;
  if (retained < 0) {
    barRet.classList.add("fill-danger");
  } else {
    barRet.classList.remove("fill-danger");
  }
}

// 刷新 6 個月軌跡長條圖
function renderTimelineBars(data) {
  timelineBarsContainer.innerHTML = "";
  const maxCashInTimeline = Math.max(1, ...data.map(d => Math.abs(d.cash)));

  data.forEach(item => {
    const heightPct = Math.max(8, Math.min(100, (Math.abs(item.cash) / Math.max(maxCashInTimeline, 1500000)) * 100));
    
    const col = document.createElement("div");
    col.className = "bar-col";
    col.innerHTML = `
      <span class="bar-value" style="color:${item.bankrupt ? '#E11D48' : '#09090B'}">
        ${formatMoney(item.cash)}
      </span>
      <div class="bar-tube">
        <div class="bar-fill-inner ${item.bankrupt ? 'deficit' : ''}" style="height:${heightPct}%;"></div>
      </div>
      <span class="bar-month-tag">M${item.month}</span>
      <span class="bar-badge-pill ${item.bankrupt ? 'pill-fail' : 'pill-ok'}">
        ${item.bankrupt ? '斷流' : '健康'}
      </span>
    `;
    timelineBarsContainer.appendChild(col);
  });
}

// 刷新分類帳試算表
function updateTrialBalanceTable(engine) {
  tbBody.innerHTML = "";
  let totalDebit = 0;
  let totalCredit = 0;

  ACCOUNTS.forEach((name, i) => {
    const val = engine.getBalance(name);
    const zVal = engine.z[i];

    let debitStr = "-";
    let creditStr = "-";

    if (zVal > 0) {
      debitStr = formatMoney(val);
      totalDebit += val;
    } else if (zVal < 0) {
      creditStr = formatMoney(val);
      totalCredit += val;
    } else {
      debitStr = "$0";
    }

    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${name}</strong></td>
      <td style="color:#71717A">${POLARITIES[i] > 0 ? '+1 (借)' : '-1 (貸)'}</td>
      <td class="text-right" style="color:#2563EB; font-weight:600;">${debitStr}</td>
      <td class="text-right" style="color:#D97706; font-weight:600;">${creditStr}</td>
    `;
    tbBody.appendChild(row);
  });

  totalDebitEl.textContent = formatMoney(totalDebit);
  totalCreditEl.textContent = formatMoney(totalCredit);
}

// 刷新 AI 評估簡報
function updateAIDiagnosis(bankruptMonth, timelineData, capex, loan) {
  if (bankruptMonth) {
    aiStatusPill.textContent = "破產預警";
    aiStatusPill.className = "pill-danger";
    aiText.innerHTML = `
      系統檢測到企業將在 <strong>第 ${bankruptMonth} 個月</strong> 發生現金斷流（赤字 ${formatMoney(timelineData[bankruptMonth-1].cash)}）。<br/>
      主要導因於前期投資規模與營運開銷超出營收承載能力。建議降低設備採購額，或增加融資備用額度。
    `;
  } else {
    aiStatusPill.textContent = "運行健康";
    aiStatusPill.className = "pill-safe";
    const finalProfit = timelineData[5].profit;
    aiText.innerHTML = `
      該決策組合在 6 個月推演期間始終保持流動性安全。<br/>
      預計期末現金存量累積達 <strong>${formatMoney(timelineData[5].cash)}</strong>，累計利潤 <strong>${formatMoney(finalProfit)}</strong>。資產與權益保持良性擴張。
    `;
  }
}

// 滑動條事件綁定 (即時聯動推演，0 延遲響應)
[rangeSales, rangeExpense, rangeCapex, rangeLoan].forEach(slider => {
  slider.addEventListener("input", runLiveSimulation);
});

// 分段按鈕場景切換
btnPresetConservative.addEventListener("click", () => {
  setActiveSeg(btnPresetConservative);
  rangeSales.value = 200000;
  rangeExpense.value = 150000;
  rangeCapex.value = 0;
  rangeLoan.value = 0;
  runLiveSimulation();
});

btnPresetAggressive.addEventListener("click", () => {
  setActiveSeg(btnPresetAggressive);
  rangeSales.value = 200000;
  rangeExpense.value = 300000;
  rangeCapex.value = 850000;
  rangeLoan.value = 0;
  runLiveSimulation();
});

btnPresetCrisis.addEventListener("click", () => {
  setActiveSeg(btnPresetCrisis);
  rangeSales.value = 100000;
  rangeExpense.value = 180000;
  rangeCapex.value = 0;
  rangeLoan.value = 300000;
  runLiveSimulation();
});

function setActiveSeg(activeBtn) {
  [btnPresetConservative, btnPresetAggressive, btnPresetCrisis].forEach(b => {
    b.classList.remove("active");
  });
  activeBtn.classList.add("active");
}

btnReset.addEventListener("click", () => {
  btnPresetConservative.click();
});

// 手動分錄注入
document.getElementById("btn-inject-tx").addEventListener("click", () => {
  const debitAcc = document.getElementById("select-debit").value;
  const creditAcc = document.getElementById("select-credit").value;
  const amount = parseFloat(document.getElementById("manual-amount").value) || 0;

  if (debitAcc === creditAcc) {
    alert("借貸科目不能相同!");
    return;
  }
  if (amount <= 0) {
    alert("請輸入大於 0 的金額!");
    return;
  }

  const b = [0,0,0,0,0,0,0];
  b[mainEngine.accMap[debitAcc]] = +1.0;
  b[mainEngine.accMap[creditAcc]] = -1.0;

  mainEngine.applyTransaction(b, amount);
  updateMetricsCards(mainEngine);
  updateTrialBalanceTable(mainEngine);
});

// 頁面初始化
window.addEventListener("DOMContentLoaded", () => {
  runLiveSimulation();
});
