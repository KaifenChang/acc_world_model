/**
 * FlowLedger - 會計物理引擎與 AI 世界模型沙盒邏輯
 * 實現代數圖論關聯矩陣、基爾霍夫守恆律與動態軌跡模擬
 */

// 1. 會計物理引擎核心類
class AccountingEngine {
  constructor(accounts, polarities, initialBalances) {
    this.accounts = accounts;
    this.n = accounts.length;
    this.polarities = polarities; // +1: Debit-normal, -1: Credit-normal
    this.accMap = {};
    accounts.forEach((acc, idx) => { this.accMap[acc] = idx; });
    
    // 帶符號狀態向量 z = P * x
    this.z = initialBalances.map((val, idx) => polarities[idx] * val);
  }

  clone() {
    const copy = new AccountingEngine(this.accounts, this.polarities, [0,0,0,0,0,0,0]);
    copy.z = [...this.z];
    return copy;
  }

  // 執行單筆交易向量 (關聯向量 b 乘金額 a)
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

  // 期末損益結轉投影算子 C: 清空臨時科目，注入留存收益
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

  // 取得名義報表餘額 x_i = p_i * z_i
  getBalance(accountName) {
    const idx = this.accMap[accountName];
    return this.polarities[idx] * this.z[idx];
  }

  // 檢驗試算平衡 (全和必須為 0)
  checkConservation() {
    const total = this.z.reduce((acc, v) => acc + v, 0);
    return Math.abs(total) < 1e-4;
  }
}

// 2. 初始化帳套
const ACCOUNTS = [
  "Cash",                 // 0: 資產 (+1)
  "Equipment",            // 1: 資產 (+1)
  "Bank Loan",            // 2: 負債 (-1)
  "Common Stock",         // 3: 權益 (-1)
  "Retained Earnings",    // 4: 權益 (-1)
  "Sales Revenue",        // 5: 收入 (-1, 臨時)
  "Operating Expense"     // 6: 費用 (+1, 臨時)
];
const POLARITIES = [+1, +1, -1, -1, -1, -1, +1];

// 預設期初狀態: 現金 100 萬，股本 100 萬
const INITIAL_BALANCES = [1000000, 0, 0, 1000000, 0, 0, 0];

let mainEngine = new AccountingEngine(ACCOUNTS, POLARITIES, INITIAL_BALANCES);

// 3. UI 元素抓取
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

// 4. 格式化貨幣
function formatMoney(amount) {
  return "$" + Math.round(amount).toLocaleString();
}

// 5. 更新水箱液體高度與標籤
function updateTanksUI(engine) {
  const maxScale = 2000000; // 水箱刻度基準 200 萬

  const cash = engine.getBalance("Cash");
  const equipment = engine.getBalance("Equipment");
  const loan = engine.getBalance("Bank Loan");
  const equity = engine.getBalance("Common Stock");
  const retained = engine.getBalance("Retained Earnings");

  // Cash Tank
  const cashHeight = Math.max(0, Math.min(100, (cash / maxScale) * 100));
  const cashFluid = document.getElementById("tank-fluid-cash");
  cashFluid.style.height = `${cashHeight}%`;
  document.getElementById("tank-val-cash").textContent = formatMoney(cash);
  if (cash < 0) {
    cashFluid.classList.add("fluid-danger");
  } else {
    cashFluid.classList.remove("fluid-danger");
  }

  // Equipment Tank
  const eqHeight = Math.max(0, Math.min(100, (equipment / maxScale) * 100));
  document.getElementById("tank-fluid-equipment").style.height = `${eqHeight}%`;
  document.getElementById("tank-val-equipment").textContent = formatMoney(equipment);

  // Loan Tank
  const loanHeight = Math.max(0, Math.min(100, (loan / maxScale) * 100));
  document.getElementById("tank-fluid-loan").style.height = `${loanHeight}%`;
  document.getElementById("tank-val-loan").textContent = formatMoney(loan);

  // Common Stock Tank
  const equityHeight = Math.max(0, Math.min(100, (equity / maxScale) * 100));
  document.getElementById("tank-fluid-equity").style.height = `${equityHeight}%`;
  document.getElementById("tank-val-equity").textContent = formatMoney(equity);

  // Retained Earnings Tank
  const retHeight = Math.max(0, Math.min(100, (Math.abs(retained) / (maxScale * 0.5)) * 100));
  const retFluid = document.getElementById("tank-fluid-retained");
  retFluid.style.height = `${retHeight}%`;
  document.getElementById("tank-val-retained").textContent = formatMoney(retained);
  if (retained < 0) {
    retFluid.classList.add("fluid-danger");
  } else {
    retFluid.classList.remove("fluid-danger");
  }
}

// 6. 更新試算平衡表 (Live Trial Balance)
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
      <td>${name}</td>
      <td style="color:${POLARITIES[i] > 0 ? '#60A5FA' : '#C084FC'}">${POLARITIES[i] > 0 ? '+1 (借)' : '-1 (貸)'}</td>
      <td style="color:#60A5FA">${debitStr}</td>
      <td style="color:#FBBF24">${creditStr}</td>
    `;
    tbBody.appendChild(row);
  });

  totalDebitEl.textContent = formatMoney(totalDebit);
  totalCreditEl.textContent = formatMoney(totalCredit);
}

// 7. AI 商業沙盒軌跡推演器 (World Model Trajectory Simulator)
function runSimulation() {
  const sales = parseFloat(inputSales.value) || 0;
  const expense = parseFloat(inputExpense.value) || 0;
  const capex = parseFloat(inputCapex.value) || 0;
  const loan = parseFloat(inputLoan.value) || 0;

  // 重置回期初狀態沙盒
  const simEngine = new AccountingEngine(ACCOUNTS, POLARITIES, INITIAL_BALANCES);

  // Month 1 初始資本動作 (Capex & Loan)
  if (loan > 0) {
    // 借款: 借 Cash, 貸 Bank Loan
    const b = [0,0,0,0,0,0,0];
    b[simEngine.accMap["Cash"]] = +1.0;
    b[simEngine.accMap["Bank Loan"]] = -1.0;
    simEngine.applyTransaction(b, loan);
  }
  if (capex > 0) {
    // 買設備: 借 Equipment, 貸 Cash
    const b = [0,0,0,0,0,0,0];
    b[simEngine.accMap["Equipment"]] = +1.0;
    b[simEngine.accMap["Cash"]] = -1.0;
    simEngine.applyTransaction(b, capex);
  }

  const timelineData = [];
  let bankruptMonth = null;

  // 推進 6 個月時間步 (Ticks)
  for (let m = 1; m <= 6; m++) {
    // 1. 銷貨收入: 借 Cash, 貸 Sales Revenue
    if (sales > 0) {
      const b = [0,0,0,0,0,0,0];
      b[simEngine.accMap["Cash"]] = +1.0;
      b[simEngine.accMap["Sales Revenue"]] = -1.0;
      simEngine.applyTransaction(b, sales);
    }

    // 2. 營運費用: 借 Operating Expense, 貸 Cash
    if (expense > 0) {
      const b = [0,0,0,0,0,0,0];
      b[simEngine.accMap["Operating Expense"]] = +1.0;
      b[simEngine.accMap["Cash"]] = -1.0;
      simEngine.applyTransaction(b, expense);
    }

    // 3. 期末結轉投影 (Closing)
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

  // 渲染時間軸卡片
  renderTimeline(timelineData);

  // 更新水箱為第 6 個月推演後的終局狀態 (或當前狀態)
  updateTanksUI(simEngine);
  updateTrialBalanceTable(simEngine);

  // AI 診斷文本生成
  if (bankruptMonth) {
    aiConclusionText.innerHTML = `
      <span style="color:#F87171; font-weight:700;">⚠️ 高度破產風險警告：</span><br/>
      依據世界模型推演，該方案在 <strong>第 ${bankruptMonth} 個月</strong> 現金水箱將徹底穿底斷流（當期餘額 ${formatMoney(timelineData[bankruptMonth-1].cash)}）。<br/>
      💡 <strong>AI 改善建議：</strong> 前期資本支出 ($${capex.toLocaleString()}) 過大，建議延後設備投資，或將銀行貸款調高至少 ${formatMoney(Math.abs(timelineData[bankruptMonth-1].cash) + 100000)} 以穿透流動性死亡之谷。
    `;
  } else {
    const netProfit = timelineData[5].profit;
    aiConclusionText.innerHTML = `
      <span style="color:#34D399; font-weight:700;">✅ 財務軌跡健康穩定：</span><br/>
      該策略在 6 個月推演期間始終處於安全集 $\\mathcal{S}$ 內部。<br/>
      期末現金存量累積達 <strong>${formatMoney(timelineData[5].cash)}</strong>，6 個月累計創造淨利潤 <strong>${formatMoney(netProfit)}</strong>。建議維持此穩健擴張節奏。
    `;
  }
}

// 8. 渲染時間軸卡片
function renderTimeline(data) {
  timelineContainer.innerHTML = "";
  data.forEach(item => {
    const card = document.createElement("div");
    card.className = `timeline-month-card ${item.bankrupt ? 'card-bankrupt' : ''}`;
    card.innerHTML = `
      <div class="timeline-m-title">第 ${item.month} 個月</div>
      <div class="timeline-m-cash" style="color:${item.bankrupt ? '#F87171' : '#38BDF8'}">
        ${formatMoney(item.cash)}
      </div>
      <div class="timeline-m-status ${item.bankrupt ? 'status-danger' : 'status-ok'}">
        ${item.bankrupt ? '⚠️ 斷流破產' : '✅ 正常運轉'}
      </div>
    `;
    timelineContainer.appendChild(card);
  });
}

// 9. 預設按鈕綁定
btnPresetAggressive.addEventListener("click", () => {
  setActivePreset(btnPresetAggressive);
  inputSales.value = 200000;
  inputExpense.value = 300000;
  inputCapex.value = 850000;
  inputLoan.value = 0;
  runSimulation();
});

btnPresetConservative.addEventListener("click", () => {
  setActivePreset(btnPresetConservative);
  inputSales.value = 200000;
  inputExpense.value = 150000;
  inputCapex.value = 0;
  inputLoan.value = 0;
  runSimulation();
});

btnPresetCrisis.addEventListener("click", () => {
  setActivePreset(btnPresetCrisis);
  inputSales.value = 100000;
  inputExpense.value = 180000;
  inputCapex.value = 0;
  inputLoan.value = 300000; // 靠貸款續命
  runSimulation();
});

function setActivePreset(activeBtn) {
  [btnPresetAggressive, btnPresetConservative, btnPresetCrisis].forEach(btn => {
    btn.classList.remove("btn-active");
  });
  activeBtn.classList.add("btn-active");
}

btnRunSimulation.addEventListener("click", runSimulation);

// 10. 手動分錄注入
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

// 頁面加載時自動運行一次預設推演
window.addEventListener("DOMContentLoaded", () => {
  runSimulation();
});
