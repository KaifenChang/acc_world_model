/**
 * FlowLedger - 會計物理引擎與 AI 世界模型沙盒邏輯 (IG Minimalist Edition)
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

// 帳套設定
const ACCOUNTS = [
  "Cash", "Equipment", "Bank Loan", "Common Stock",
  "Retained Earnings", "Sales Revenue", "Operating Expense"
];
const POLARITIES = [+1, +1, -1, -1, -1, -1, +1];
const INITIAL_BALANCES = [1000000, 0, 0, 1000000, 0, 0, 0];

let mainEngine = new AccountingEngine(ACCOUNTS, POLARITIES, INITIAL_BALANCES);

// DOM 元素
const inputSales = document.getElementById("input-sales");
const inputExpense = document.getElementById("input-expense");
const inputCapex = document.getElementById("input-capex");
const inputLoan = document.getElementById("input-loan");

const btnPresetAggressive = document.getElementById("btn-preset-aggressive");
const btnPresetConservative = document.getElementById("btn-preset-conservative");
const btnPresetCrisis = document.getElementById("btn-preset-crisis");
const btnRunSimulation = document.getElementById("btn-run-simulation");

const aiConclusionText = document.getElementById("ai-conclusion-text");
const timelineContainer = document.getElementById("trajectory-timeline");
const tbBody = document.getElementById("tb-body");
const totalDebitEl = document.getElementById("total-debit");
const totalCreditEl = document.getElementById("total-credit");

function formatMoney(amount) {
  return "$" + Math.round(amount).toLocaleString();
}

// 更新 IG Stories 風格的水箱存量
function updateTanksUI(engine) {
  const maxScale = 2000000;

  const cash = engine.getBalance("Cash");
  const equipment = engine.getBalance("Equipment");
  const loan = engine.getBalance("Bank Loan");
  const equity = engine.getBalance("Common Stock");
  const retained = engine.getBalance("Retained Earnings");

  // Cash Story Ring
  const cashH = Math.max(0, Math.min(100, (cash / maxScale) * 100));
  const fillCash = document.getElementById("ring-fill-cash");
  fillCash.style.height = `${cashH}%`;
  document.getElementById("tank-val-cash").textContent = formatMoney(cash);
  if (cash < 0) {
    fillCash.classList.add("fill-danger");
  } else {
    fillCash.classList.remove("fill-danger");
  }

  // Equipment Story Ring
  const eqH = Math.max(0, Math.min(100, (equipment / maxScale) * 100));
  document.getElementById("ring-fill-equipment").style.height = `${eqH}%`;
  document.getElementById("tank-val-equipment").textContent = formatMoney(equipment);

  // Loan Story Ring
  const loanH = Math.max(0, Math.min(100, (loan / maxScale) * 100));
  document.getElementById("ring-fill-loan").style.height = `${loanH}%`;
  document.getElementById("tank-val-loan").textContent = formatMoney(loan);

  // Stock Story Ring
  const eqStockH = Math.max(0, Math.min(100, (equity / maxScale) * 100));
  document.getElementById("ring-fill-equity").style.height = `${eqStockH}%`;
  document.getElementById("tank-val-equity").textContent = formatMoney(equity);

  // Retained Earnings Story Ring
  const retH = Math.max(0, Math.min(100, (Math.abs(retained) / (maxScale * 0.5)) * 100));
  const fillRet = document.getElementById("ring-fill-retained");
  fillRet.style.height = `${retH}%`;
  document.getElementById("tank-val-retained").textContent = formatMoney(retained);
  if (retained < 0) {
    fillRet.classList.add("fill-danger");
  } else {
    fillRet.classList.remove("fill-danger");
  }
}

// 更新分類帳試算表
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
      <td style="color:#737373">${POLARITIES[i] > 0 ? '借 (+)' : '貸 (-)'}</td>
      <td class="text-right" style="color:#0095F6; font-weight:600;">${debitStr}</td>
      <td class="text-right" style="color:#D97706; font-weight:600;">${creditStr}</td>
    `;
    tbBody.appendChild(row);
  });

  totalDebitEl.textContent = formatMoney(totalDebit);
  totalCreditEl.textContent = formatMoney(totalCredit);
}

// 6 個月軌跡推演
function runSimulation() {
  const sales = parseFloat(inputSales.value) || 0;
  const expense = parseFloat(inputExpense.value) || 0;
  const capex = parseFloat(inputCapex.value) || 0;
  const loan = parseFloat(inputLoan.value) || 0;

  const simEngine = new AccountingEngine(ACCOUNTS, POLARITIES, INITIAL_BALANCES);

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

  renderTimeline(timelineData);
  updateTanksUI(simEngine);
  updateTrialBalanceTable(simEngine);

  // 簡約文字風格 AI 總結
  if (bankruptMonth) {
    aiConclusionText.innerHTML = `
      <strong style="color:#EF4444;">[斷流預警]</strong>
      在當前參數下，企業在 <strong>第 ${bankruptMonth} 個月</strong> 現金將徹底穿底（餘額 ${formatMoney(timelineData[bankruptMonth-1].cash)}）。前期投資過重，需延後採購或補足融資 ${formatMoney(Math.abs(timelineData[bankruptMonth-1].cash) + 50000)}。
    `;
  } else {
    aiConclusionText.innerHTML = `
      <strong style="color:#10B981;">[運行健康]</strong>
      此策略在 6 個月推演期間平穩運行。期末現金存量累積達 <strong>${formatMoney(timelineData[5].cash)}</strong>，累計利潤 <strong>${formatMoney(timelineData[5].profit)}</strong>。
    `;
  }
}

function renderTimeline(data) {
  timelineContainer.innerHTML = "";
  data.forEach(item => {
    const card = document.createElement("div");
    card.className = `time-capsule ${item.bankrupt ? 'capsule-bankrupt' : ''}`;
    card.innerHTML = `
      <div class="cap-m">M${item.month}</div>
      <div class="cap-cash" style="color:${item.bankrupt ? '#ED4956' : '#262626'}">
        ${formatMoney(item.cash)}
      </div>
      <span class="cap-tag ${item.bankrupt ? 'tag-danger' : 'tag-ok'}">
        ${item.bankrupt ? '斷流' : '正常'}
      </span>
    `;
    timelineContainer.appendChild(card);
  });
}

// 膠囊預設切換
btnPresetConservative.addEventListener("click", () => {
  setActivePill(btnPresetConservative);
  inputSales.value = 200000;
  inputExpense.value = 150000;
  inputCapex.value = 0;
  inputLoan.value = 0;
  runSimulation();
});

btnPresetAggressive.addEventListener("click", () => {
  setActivePill(btnPresetAggressive);
  inputSales.value = 200000;
  inputExpense.value = 300000;
  inputCapex.value = 850000;
  inputLoan.value = 0;
  runSimulation();
});

btnPresetCrisis.addEventListener("click", () => {
  setActivePill(btnPresetCrisis);
  inputSales.value = 100000;
  inputExpense.value = 180000;
  inputCapex.value = 0;
  inputLoan.value = 300000;
  runSimulation();
});

function setActivePill(activeBtn) {
  [btnPresetAggressive, btnPresetConservative, btnPresetCrisis].forEach(btn => {
    btn.classList.remove("pill-active");
  });
  activeBtn.classList.add("pill-active");
}

btnRunSimulation.addEventListener("click", runSimulation);

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
  updateTanksUI(mainEngine);
  updateTrialBalanceTable(mainEngine);
});

window.addEventListener("DOMContentLoaded", () => {
  runSimulation();
});
