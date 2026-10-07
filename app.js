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

const dispRevenue = document.getElementById("disp-revenue");
const dispExpense = document.getElementById("disp-expense");
const dispLiability = document.getElementById("disp-liability");
const dispEquity = document.getElementById("disp-equity");

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

// 即時推演運算
function runLiveSimulation() {
  const rev = parseFloat(rangeRevenue.value) || 0;
  const exp = parseFloat(rangeExpense.value) || 0;
  const liab = parseFloat(rangeLiability.value) || 0;
  const eq = parseFloat(rangeEquity.value) || 0;

  // 更新數值顯示
  dispRevenue.textContent = formatMoney(rev);
  dispExpense.textContent = formatMoney(exp);
  dispLiability.textContent = formatMoney(liab);
  dispEquity.textContent = formatMoney(eq);

  // 初始化純五大要素沙盒
  const simEngine = new AccountingEngine(ACCOUNTS, POLARITIES, INITIAL_BALANCES);

  // 首月負債融資動作: 借 Asset (+), 貸 Liability (+)
  if (liab > 0) {
    const b = [0, 0, 0, 0, 0];
    b[simEngine.accMap["Asset"]] = +1.0;
    b[simEngine.accMap["Liability"]] = -1.0;
    simEngine.applyTransaction(b, liab);
  }

  // 首月權益增資動作: 借 Asset (+), 貸 Equity (+)
  if (eq > 0) {
    const b = [0, 0, 0, 0, 0];
    b[simEngine.accMap["Asset"]] = +1.0;
    b[simEngine.accMap["Equity"]] = -1.0;
    simEngine.applyTransaction(b, eq);
  }

  const timelineData = [];
  let bankruptMonth = null;

  // 推進 6 個月
  for (let m = 1; m <= 6; m++) {
    // 1. 營收流動: 借 Asset (+), 貸 Revenue (+)
    if (rev > 0) {
      const b = [0, 0, 0, 0, 0];
      b[simEngine.accMap["Asset"]] = +1.0;
      b[simEngine.accMap["Revenue"]] = -1.0;
      simEngine.applyTransaction(b, rev);
    }

    // 2. 費用流動: 借 Expense (+), 貸 Asset (-)
    if (exp > 0) {
      const b = [0, 0, 0, 0, 0];
      b[simEngine.accMap["Expense"]] = +1.0;
      b[simEngine.accMap["Asset"]] = -1.0;
      simEngine.applyTransaction(b, exp);
    }

    // 3. 期末結轉 C: 清空 Revenue / Expense，全數匯入 Equity
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

  // 1. 刷新頂部五大要素卡片
  updateMetricsCards(simEngine);

  // 2. 刷新 6 個月軌跡圖
  renderTimelineBars(timelineData);

  // 3. 刷新五大要素試算表
  updateTrialBalanceTable(simEngine);

  // 4. 刷新 AI 評估簡報
  updateAIDiagnosis(bankruptMonth, timelineData, rev, exp);
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
        ${item.bankrupt ? '斷流' : '正常'}
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
      <td style="color:#71717A">${POLARITIES[i] > 0 ? '+1 (借方增加)' : '-1 (貸方增加)'}</td>
      <td class="text-right" style="color:#2563EB; font-weight:600;">${debitStr}</td>
      <td class="text-right" style="color:#D97706; font-weight:600;">${creditStr}</td>
    `;
    tbBody.appendChild(row);
  });

  totalDebitEl.textContent = formatMoney(totalDebit);
  totalCreditEl.textContent = formatMoney(totalCredit);
}

// AI 評估簡報
function updateAIDiagnosis(bankruptMonth, timelineData, rev, exp) {
  if (bankruptMonth) {
    aiStatusPill.textContent = "破產斷流";
    aiStatusPill.className = "pill-danger";
    aiText.innerHTML = `
      在當前參數下，月度費用 ($${exp.toLocaleString()}) 超過月度收入 ($${rev.toLocaleString()})。<br/>
      企業資產存量在 <strong>第 ${bankruptMonth} 個月</strong> 徹底穿底耗盡（資產赤字 ${formatMoney(timelineData[bankruptMonth-1].asset)}）。需提高收入或引入負債/權益注資。
    `;
  } else {
    aiStatusPill.textContent = "運行健康";
    aiStatusPill.className = "pill-safe";
    aiText.innerHTML = `
      五大要素動態保持良性平衡。月度淨收益 (${formatMoney(rev - exp)}) 穩定轉化為權益積累。<br/>
      預計第 6 個月資產存量可達 <strong>${formatMoney(timelineData[5].asset)}</strong>，借貸恒等式嚴格成立。
    `;
  }
}

// 滑動條事件綁定
[rangeRevenue, rangeExpense, rangeLiability, rangeEquity].forEach(slider => {
  slider.addEventListener("input", runLiveSimulation);
});

// 分段按鈕場景切換
btnPresetConservative.addEventListener("click", () => {
  setActiveSeg(btnPresetConservative);
  rangeRevenue.value = 200000;
  rangeExpense.value = 150000;
  rangeLiability.value = 0;
  rangeEquity.value = 0;
  runLiveSimulation();
});

btnPresetAggressive.addEventListener("click", () => {
  setActiveSeg(btnPresetAggressive);
  rangeRevenue.value = 350000;
  rangeExpense.value = 400000;
  rangeLiability.value = 0;
  rangeEquity.value = 0;
  runLiveSimulation();
});

btnPresetCrisis.addEventListener("click", () => {
  setActiveSeg(btnPresetCrisis);
  rangeRevenue.value = 100000;
  rangeExpense.value = 250000;
  rangeLiability.value = 500000; // 靠負債續命
  rangeEquity.value = 0;
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

  const b = [0, 0, 0, 0, 0];
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
