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

// 嚴格五大基本要素
const ACCOUNTS = ["Asset", "Liability", "Equity", "Revenue", "Expense"];
const POLARITIES = [+1, -1, -1, -1, +1];

// 預設期初狀態: 資產 100 萬，權益 100 萬
const INITIAL_BALANCES = [1000000, 0, 1000000, 0, 0];

function formatMoney(amount) {
  if (Math.abs(amount) < 0.01) return "$0";
  const rounded = Math.round(amount);
  if (rounded === 0 || Object.is(rounded, -0)) return "$0";
  return "$" + rounded.toLocaleString();
}

// 雙語字典系統 (繁體中文 / 英文)
const I18N = {
  zh: {
    pageTitle: "會計世界模型 ｜ 流體力學與強化學習決策系統",
    flowParamsTitle: "動態流動參數",
    flowParamsDesc: "調整滑桿或直接輸入數值",
    resetBtn: "重設基準",
    controlTheoryTag: "控制理論系統",
    manualModePill: "手動模式",
    rlActivePill: "● RL 模型運作中",
    btnEnableAutopilot: "啟動 AI 自動駕駛",
    btnActiveAutopilot: "AI 自動駕駛：運作中",
    btnTriggerShock: "觸發危機衝擊 (壓力測試)",
    autopilotIdle: "系統待命中。參數目前由人工手動控制。",
    autopilotEngaged: "<span style='color:#059669;'>強化學習模型已就緒 (Q-Table 載入)。即時計算 argmax Q(s, a)...</span>",
    autopilotDisengaged: "自動駕駛已解除，恢復人工手動控制。",
    autopilotShockMsg: "<strong style='color:#E11D48;'>⚠️ 危機衝擊：需求斷崖式崩跌！營收驟降至每月 $60,000。</strong>",
    autopilotResetMsg: "系統已重設為基準狀態。可進行推演模擬。",
    
    // 滑桿標籤
    labelRevenue: "營業收入 (Revenue)",
    labelExpense: "營業費用 (Expense)",
    labelLiability: "負債總額 (Liability)",
    labelEquity: "股東權益 (Equity)",
    
    // 水網標題
    titleWaterNet: "會計流體動態水網",
    descWaterNet: "即時水力動態平衡：會計要素 = 水槽儲量 ｜ 交易往來 = 管道流動",
    identityFormula: (asset, liab, eqTotal) => `資產 (${formatMoney(asset)}) = 負債 (${formatMoney(liab)}) + 權益 (${formatMoney(eqTotal)})`,
    
    // 水槽名稱與標籤
    nameTankRevenue: "營業收入 (流入源)",
    tagPipeRevenue: "↓ 營收注入管",
    nameTankLiability: "負債總額 (融資)",
    tagPipeLiability: "⇄ 借貸雙向管",
    nameTankAsset: "核心資產水槽 (現金與流動資產)",
    nameTankExpense: "營業費用 (流出池)",
    tagPipeExpense: "↑ 營運支出排水",
    nameTankEquity: "股東權益 (資本儲備池)",
    tagPipeEquity: "⇄ 資本盈虧沉澱",
    
    // 核心水槽狀態
    statusAssetNormal: "核心水槽水位充足 (營運健康)",
    statusAssetCritical: "警戒水位：現金低於 30 萬",
    statusAssetDry: "水槽枯竭：資金鏈斷裂 (破產)",
    
    // 財務指標
    labelNetFlow: "每月淨現金流",
    netMargin: (pct) => `淨利率: ${pct}%`,
    labelDebtRatio: "資產負債率 (槓桿)",
    debtSubLow: "低槓桿 (穩健)",
    debtSubMod: "適度槓桿",
    debtSubHigh: "高風險槓桿 (>60%)",
    labelRunway: "預估現金跑道 (存活期)",
    runwaySustainable: "長期自給 (可持續)",
    runwayPositiveSub: "正向現金流",
    runwayMonths: (m) => `${m} 個月`,
    runwayDepleteSub: (burn) => `以每月 $${burn.toLocaleString()} 速度消耗`,
    
    // 軌跡圖
    titleTrajectory: "資產演化軌跡 (6 個月)",
    descTrajectory: "動態損益結轉模擬 (每月結算損益至權益)",
    monthPrefix: "第 ",
    monthSuffix: " 月",
    tagSolvent: "健全",
    tagDeficit: "虧損枯竭",
    
    // 試算表
    titleTrialBalance: "未結轉試算平衡表",
    badgeBalanced: "借貸平衡 (1ᵀ z = 0)",
    thAccount: "會計要素科目",
    thPolarity: "極性 P (借貸方向)",
    thDebit: "借方金額 (Debit)",
    thCredit: "貸方金額 (Credit)",
    tdTotal: "借貸合計 (Total)",
    
    // 科目名稱對照
    accNames: {
      "Asset": "資產 (Asset)",
      "Liability": "負債 (Liability)",
      "Equity": "權益 (Equity)",
      "Revenue": "收入 (Revenue)",
      "Expense": "費用 (Expense)"
    },
    polarityLabels: {
      debit: "+1 (借方增加)",
      credit: "-1 (貸方增加)"
    },
    
    // RL 強化學習決策
    rlActions: [
      "維持現狀 (Hold Operations)",
      "舉債擴張 (Borrow Debt)",
      "緊縮成本 (Cut Costs)",
      "清償負債 (Pay Debt)",
      "增資引資 (Equity Financing)"
    ],
    rlActionShort: ["維持", "舉債", "緊縮", "還債", "增資"],
    rlStepPrefix: (step, stateKey) => `[RL 決策 第 ${step} 步] 狀態: ${stateKey}`,
    rlQValuesLabel: "各動作 Q 值",
    rlArgmaxLabel: (action, q) => `► 強化學習最佳動作: <strong>${action}</strong> (Q = ${q})`,
    manualFailMsg: (step) => `<strong style='color:#E11D48;'>[手動模式 第 ${step} 步] 危機失敗：</strong> 水位耗竭 ($0)，資金鏈斷裂破產。`,
    manualBurnMsg: (step) => `<span style='color:#E11D48;'>[手動模式 第 ${step} 步] 現金失血：</span> 資產水槽每月流失 -$120,000，無主動調節機制。`
  },
  
  en: {
    pageTitle: "Accounting World Model | Fluid Simulation",
    flowParamsTitle: "Flow Parameters",
    flowParamsDesc: "Adjust sliders or enter numbers directly",
    resetBtn: "Reset",
    controlTheoryTag: "Control Theory System",
    manualModePill: "Manual Mode",
    rlActivePill: "● RL Model Active",
    btnEnableAutopilot: "Enable AI Autopilot",
    btnActiveAutopilot: "AI Autopilot: ACTIVE",
    btnTriggerShock: "Trigger Crisis Shock",
    autopilotIdle: "System idle. Sliders under manual control.",
    autopilotEngaged: "<span style='color:#059669;'>ML Model loaded (Q-Table ready). Actively computing argmax Q(s, a)...</span>",
    autopilotDisengaged: "Autopilot disengaged. Restored to manual human control.",
    autopilotShockMsg: "<strong style='color:#E11D48;'>⚠️ CRISIS SHOCK: Demand collapse! Revenue drops to $60,000/mo.</strong>",
    autopilotResetMsg: "System reset to baseline. Ready for simulation.",
    
    // Sliders
    labelRevenue: "Revenue",
    labelExpense: "Expense",
    labelLiability: "Liability",
    labelEquity: "Equity",
    
    // Hydraulic Circuit
    titleWaterNet: "Accounting Fluid Network",
    descWaterNet: "Real-time hydraulic balance: Accounts = Tanks | Transactions = Pipe Flows",
    identityFormula: (asset, liab, eqTotal) => `Asset (${formatMoney(asset)}) = Liab (${formatMoney(liab)}) + Eq (${formatMoney(eqTotal)})`,
    
    // Tanks
    nameTankRevenue: "Revenue (Inflow)",
    tagPipeRevenue: "↓ Inflow Pipe",
    nameTankLiability: "Liability (Debt)",
    tagPipeLiability: "⇄ Financing Conduit",
    nameTankAsset: "Asset Reservoir (Cash & Liquid)",
    nameTankExpense: "Expense (Outflow)",
    tagPipeExpense: "↑ Outflow Drain",
    nameTankEquity: "Equity (Reserve)",
    tagPipeEquity: "⇄ Capital Retention",
    
    // Asset Reservoir Status
    statusAssetNormal: "OPERATING RESERVOIR SOLVENT",
    statusAssetCritical: "CRITICAL WATER LEVEL (< $300K)",
    statusAssetDry: "DRY / INSOLVENT (CRASH)",
    
    // Financial Ratios
    labelNetFlow: "Monthly Net Flow",
    netMargin: (pct) => `Net Margin: ${pct}%`,
    labelDebtRatio: "Debt-to-Asset Ratio",
    debtSubLow: "Conservative / Low",
    debtSubMod: "Moderate Leverage",
    debtSubHigh: "High Risk (>60%)",
    labelRunway: "Estimated Cash Runway",
    runwaySustainable: "Sustainable (∞)",
    runwayPositiveSub: "Positive Cash Flow",
    runwayMonths: (m) => `${m} Months`,
    runwayDepleteSub: (burn) => `Depletion at $${burn.toLocaleString()}/mo`,
    
    // Trajectory
    titleTrajectory: "Asset Trajectory (6 Months)",
    descTrajectory: "Dynamic 6-Month Projection",
    monthPrefix: "M",
    monthSuffix: "",
    tagSolvent: "Solvent",
    tagDeficit: "Deficit",
    
    // Trial Balance
    titleTrialBalance: "Trial Balance",
    badgeBalanced: "Balanced",
    thAccount: "Account",
    thPolarity: "Polarity P",
    thDebit: "Debit",
    thCredit: "Credit",
    tdTotal: "Total",
    
    // Accounts in Table
    accNames: {
      "Asset": "Asset",
      "Liability": "Liability",
      "Equity": "Equity",
      "Revenue": "Revenue",
      "Expense": "Expense"
    },
    polarityLabels: {
      debit: "+1 (Debit)",
      credit: "-1 (Credit)"
    },
    
    // RL Telemetry
    rlActions: [
      "Hold Operations",
      "Expansion (Borrow Debt)",
      "Austerity (Cut Costs)",
      "Deleverage (Pay Debt)",
      "Equity Financing"
    ],
    rlActionShort: ["Hold", "Borrow", "Austerity", "PayDebt", "Equity"],
    rlStepPrefix: (step, stateKey) => `[ML Step ${step}] State: ${stateKey}`,
    rlQValuesLabel: "Q-Values",
    rlArgmaxLabel: (action, q) => `► ML Argmax: <strong>${action}</strong> (Q = ${q})`,
    manualFailMsg: (step) => `<strong style='color:#E11D48;'>[Manual Step ${step}] FAILURE:</strong> Cash exhausted ($0). Insolvent.`,
    manualBurnMsg: (step) => `<span style='color:#E11D48;'>[Manual Step ${step}] Burning:</span> Asset dropping by -$120,000/mo. Passive mode.`
  }
};

let currentLang = "zh";
try {
  const saved = localStorage.getItem("acc_lang");
  if (saved && I18N[saved]) {
    currentLang = saved;
  }
} catch (e) {}

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

// Closed-Loop AI Autopilot & Crisis Shock Module
const btnToggleAutopilot = document.getElementById("btn-toggle-autopilot");
const btnTriggerShock = document.getElementById("btn-trigger-shock");
const autopilotStatusPill = document.getElementById("autopilot-status-pill");
const autopilotLog = document.getElementById("autopilot-log");

let isAutopilotActive = false;
let shockInterval = null;

// 切換多語言功能
function setLanguage(lang) {
  if (!I18N[lang]) return;
  currentLang = lang;
  try {
    localStorage.setItem("acc_lang", lang);
  } catch (e) {}

  // 更新切換按鈕狀態
  const btnZh = document.getElementById("lang-zh");
  const btnEn = document.getElementById("lang-en");
  if (btnZh && btnEn) {
    if (lang === "zh") {
      btnZh.classList.add("active");
      btnEn.classList.remove("active");
    } else {
      btnEn.classList.add("active");
      btnZh.classList.remove("active");
    }
  }

  const t = I18N[lang];

  // 網頁標題
  document.title = t.pageTitle;

  // 標題與重設按鈕
  const headingTitle = document.getElementById("heading-title");
  if (headingTitle) headingTitle.textContent = t.flowParamsTitle;

  const headingDesc = document.getElementById("heading-desc");
  if (headingDesc) headingDesc.textContent = t.flowParamsDesc;

  const btnResetEl = document.getElementById("btn-reset");
  if (btnResetEl) btnResetEl.textContent = t.resetBtn;

  // 控制理論卡片
  const tagCtrl = document.getElementById("tag-control-theory");
  if (tagCtrl) tagCtrl.textContent = t.controlTheoryTag;

  const statusPill = document.getElementById("autopilot-status-pill");
  if (statusPill) {
    statusPill.textContent = isAutopilotActive ? t.rlActivePill : t.manualModePill;
  }

  const btnAuto = document.getElementById("btn-toggle-autopilot");
  if (btnAuto) {
    btnAuto.textContent = isAutopilotActive ? t.btnActiveAutopilot : t.btnEnableAutopilot;
  }

  const btnShock = document.getElementById("btn-trigger-shock");
  if (btnShock) btnShock.textContent = t.btnTriggerShock;

  const autoLog = document.getElementById("autopilot-log");
  if (autoLog && !shockInterval) {
    autoLog.textContent = isAutopilotActive ? t.autopilotEngaged : t.autopilotIdle;
  }

  // 滑桿群組標籤
  const lblRev = document.getElementById("label-revenue");
  if (lblRev) lblRev.textContent = t.labelRevenue;
  const lblExp = document.getElementById("label-expense");
  if (lblExp) lblExp.textContent = t.labelExpense;
  const lblLiab = document.getElementById("label-liability");
  if (lblLiab) lblLiab.textContent = t.labelLiability;
  const lblEq = document.getElementById("label-equity");
  if (lblEq) lblEq.textContent = t.labelEquity;

  // 水網卡片
  const titleWaterNet = document.getElementById("title-water-net");
  if (titleWaterNet) titleWaterNet.textContent = t.titleWaterNet;
  const descWaterNet = document.getElementById("desc-water-net");
  if (descWaterNet) descWaterNet.textContent = t.descWaterNet;

  // 水槽名稱與管道標籤
  const nameRev = document.getElementById("name-tank-revenue");
  if (nameRev) nameRev.textContent = t.nameTankRevenue;
  const tagRev = document.getElementById("tag-pipe-revenue");
  if (tagRev) tagRev.textContent = t.tagPipeRevenue;

  const nameLiab = document.getElementById("name-tank-liability");
  if (nameLiab) nameLiab.textContent = t.nameTankLiability;
  const tagLiab = document.getElementById("tag-pipe-liability");
  if (tagLiab) tagLiab.textContent = t.tagPipeLiability;

  const nameAsset = document.getElementById("name-tank-asset");
  if (nameAsset) nameAsset.textContent = t.nameTankAsset;

  const nameExp = document.getElementById("name-tank-expense");
  if (nameExp) nameExp.textContent = t.nameTankExpense;
  const tagExp = document.getElementById("tag-pipe-expense");
  if (tagExp) tagExp.textContent = t.tagPipeExpense;

  const nameEq = document.getElementById("name-tank-equity");
  if (nameEq) nameEq.textContent = t.nameTankEquity;
  const tagEq = document.getElementById("tag-pipe-equity");
  if (tagEq) tagEq.textContent = t.tagPipeEquity;

  // 財務比率標籤
  const lblRatioNetflow = document.getElementById("label-ratio-netflow");
  if (lblRatioNetflow) lblRatioNetflow.textContent = t.labelNetFlow;
  const lblRatioDebt = document.getElementById("label-ratio-debt");
  if (lblRatioDebt) lblRatioDebt.textContent = t.labelDebtRatio;
  const lblRatioRunway = document.getElementById("label-ratio-runway");
  if (lblRatioRunway) lblRatioRunway.textContent = t.labelRunway;

  // 軌跡圖卡片
  const titleTraj = document.getElementById("title-trajectory");
  if (titleTraj) titleTraj.textContent = t.titleTrajectory;
  const descTraj = document.getElementById("desc-trajectory");
  if (descTraj) descTraj.textContent = t.descTrajectory;

  // 試算表卡片
  const titleTb = document.getElementById("title-trial-balance");
  if (titleTb) titleTb.textContent = t.titleTrialBalance;
  const badgeTb = document.getElementById("badge-tb-balanced");
  if (badgeTb) badgeTb.textContent = t.badgeBalanced;

  const thAcc = document.getElementById("th-account");
  if (thAcc) thAcc.textContent = t.thAccount;
  const thPol = document.getElementById("th-polarity");
  if (thPol) thPol.textContent = t.thPolarity;
  const thDeb = document.getElementById("th-debit");
  if (thDeb) thDeb.textContent = t.thDebit;
  const thCre = document.getElementById("th-credit");
  if (thCre) thCre.textContent = t.thCredit;
  const tdTot = document.getElementById("td-total");
  if (tdTot) tdTot.textContent = t.tdTotal;

  // 重新渲染畫面
  runLiveSimulation();
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
  const t = I18N[currentLang];
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
  netMarginEl.textContent = t.netMargin(marginPct);

  // 2. Debt-to-Asset Ratio
  const debtRatioEl = document.getElementById("ratio-debt-ratio");
  const leverageSubEl = document.getElementById("ratio-leverage-sub");
  const debtPct = asset > 0 ? ((liability / asset) * 100).toFixed(1) : "0.0";
  debtRatioEl.textContent = `${debtPct}%`;
  if (parseFloat(debtPct) > 60) {
    leverageSubEl.textContent = t.debtSubHigh;
    debtRatioEl.style.color = "#E11D48";
  } else if (parseFloat(debtPct) > 30) {
    leverageSubEl.textContent = t.debtSubMod;
    debtRatioEl.style.color = "#D97706";
  } else {
    leverageSubEl.textContent = t.debtSubLow;
    debtRatioEl.style.color = "#09090B";
  }

  // 3. Estimated Cash Runway
  const runwayEl = document.getElementById("ratio-runway");
  const runwaySubEl = document.getElementById("ratio-runway-sub");
  if (netFlow >= 0) {
    runwayEl.textContent = t.runwaySustainable;
    runwayEl.style.color = "#059669";
    runwaySubEl.textContent = t.runwayPositiveSub;
  } else {
    const burn = Math.abs(netFlow);
    const months = initialStartingAsset > 0 ? (initialStartingAsset / burn).toFixed(1) : "0.0";
    runwayEl.textContent = t.runwayMonths(months);
    runwayEl.style.color = "#E11D48";
    runwaySubEl.textContent = t.runwayDepleteSub(burn);
  }

  // 4. Identity verification badges (both top and timeline)
  const idFormula = t.identityFormula(asset, liability, equity + netFlow);
  const identityBadgeTop = document.getElementById("identity-badge-top");
  if (identityBadgeTop) identityBadgeTop.textContent = idFormula;
  const identityBadgeTimeline = document.getElementById("identity-badge-timeline");
  if (identityBadgeTimeline) identityBadgeTimeline.textContent = idFormula;
}

// 刷新五大水槽流體管網 (Hydraulic Water Tank Circuit)
function updateWaterTanks(engine, rev, exp) {
  const t = I18N[currentLang];
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
      assetStatus.textContent = t.statusAssetDry;
      assetStatus.className = "hero-tag tag-deficit";
    } else if (asset < 300000) {
      waterAsset.classList.remove("deficit");
      assetStatus.textContent = t.statusAssetCritical;
      assetStatus.className = "hero-tag tag-deficit";
    } else {
      waterAsset.classList.remove("deficit");
      assetStatus.textContent = t.statusAssetNormal;
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
  const t = I18N[currentLang];
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
      <span class="bar-month-tag">${t.monthPrefix}${item.month}${t.monthSuffix}</span>
      <span class="bar-badge-pill ${item.bankrupt ? 'pill-fail' : 'pill-ok'}">
        ${item.bankrupt ? t.tagDeficit : t.tagSolvent}
      </span>
    `;
    timelineBarsContainer.appendChild(col);
  });
}

// 刷新五大要素試算表
function updateTrialBalanceTable(engine) {
  const t = I18N[currentLang];
  tbBody.innerHTML = "";
  let totalDebit = 0;
  let totalCredit = 0;

  ACCOUNTS.forEach((name, i) => {
    const val = engine.getBalance(name);

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

    const displayName = t.accNames[name] || name;
    const polarityText = POLARITIES[i] > 0 ? t.polarityLabels.debit : t.polarityLabels.credit;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${displayName}</strong></td>
      <td style="color:#71717A">${polarityText}</td>
      <td class="text-right" style="color:#2563EB; font-weight:600;">${debitStr}</td>
      <td class="text-right" style="color:#D97706; font-weight:600;">${creditStr}</td>
    `;
    tbBody.appendChild(row);
  });

  totalDebitEl.textContent = formatMoney(totalDebit);
  totalCreditEl.textContent = formatMoney(totalCredit);
}

// 雙向綁定滑桿與數值輸入框
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

// 重設為預設基準狀態
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
    autopilotLog.innerHTML = I18N[currentLang].autopilotResetMsg;
  }
  runLiveSimulation();
});

// 強化學習 Q-Policy 表 (由 Bellman 方程訓練生成自 accounting_rl_agent.py)
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

// 強化學習推論函數: Argmax Q(s, a)
function runMLModelInference(asset, liab, rev, exp) {
  // 1. 特徵離散化 (State 狀態空間)
  const solvency = (asset <= 0) ? "INSOLVENT" : (asset < 350000) ? "CRITICAL" : (liab > asset * 0.6) ? "HIGH_LEVERAGE" : "HEALTHY";
  const net = rev - exp;
  const cashflow = (net > 20000) ? "POSITIVE" : (net < -20000) ? "BURNING" : "NEUTRAL";
  const macro = (rev < 100000) ? "RECESSION" : (rev > 250000) ? "BOOM" : "NORMAL";
  const stateKey = `${solvency}|${cashflow}|${macro}`;

  // 2. 查閱 Q-Table
  const qScores = Q_POLICY_TABLE[stateKey] || [0.0, 0.0, 0.0, 0.0, 0.0];

  // 3. 數學 Argmax 決策
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

// 自動駕駛開關
if (btnToggleAutopilot) {
  btnToggleAutopilot.addEventListener("click", () => {
    isAutopilotActive = !isAutopilotActive;
    const t = I18N[currentLang];
    if (isAutopilotActive) {
      btnToggleAutopilot.classList.add("active");
      btnToggleAutopilot.textContent = t.btnActiveAutopilot;
      autopilotStatusPill.className = "pill-active";
      autopilotStatusPill.textContent = t.rlActivePill;
      autopilotLog.innerHTML = t.autopilotEngaged;
    } else {
      btnToggleAutopilot.classList.remove("active");
      btnToggleAutopilot.textContent = t.btnEnableAutopilot;
      autopilotStatusPill.className = "pill-inactive";
      autopilotStatusPill.textContent = t.manualModePill;
      autopilotLog.innerHTML = t.autopilotDisengaged;
    }
  });
}

// 危機衝擊壓力測試
if (btnTriggerShock) {
  btnTriggerShock.addEventListener("click", () => {
    if (shockInterval) clearInterval(shockInterval);
    const t = I18N[currentLang];
    autopilotLog.innerHTML = t.autopilotShockMsg;
    
    // 注入外部衝擊
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
        // RL 推論：計算最佳決策 Argmax Q(s, a)
        const inference = runMLModelInference(currentAsset, currentLiab, currentRev, currentExp);
        const { stateKey, qScores, bestAction, maxQ } = inference;

        // 執行 RL Agent 決策動作
        if (bestAction === 1) { // 舉債擴張
          const newLiab = currentLiab + 150000;
          inputLiability.value = newLiab;
          rangeLiability.value = newLiab;
        } else if (bestAction === 2) { // 緊縮成本
          const newExp = Math.max(50000, Math.round(currentExp * 0.65));
          inputExpense.value = newExp;
          rangeExpense.value = newExp;
        } else if (bestAction === 3) { // 清償負債
          const newLiab = Math.max(0, currentLiab - 100000);
          inputLiability.value = newLiab;
          rangeLiability.value = newLiab;
        } else if (bestAction === 4) { // 增資引資
          const curEq = parseFloat(inputEquity.value) || 0;
          inputEquity.value = curEq + 150000;
          rangeEquity.value = curEq + 150000;
        }

        const actionText = t.rlActions[bestAction];
        const shorts = t.rlActionShort;
        autopilotLog.innerHTML = `
          <div style="color:#059669; font-weight:700;">${t.rlStepPrefix(step, stateKey)}</div>
          <div style="font-size:0.6rem; color:#64748B;">${t.rlQValuesLabel}: [${shorts[0]}: ${qScores[0].toFixed(0)} | ${shorts[1]}: ${qScores[1].toFixed(0)} | ${shorts[2]}: ${qScores[2].toFixed(0)} | ${shorts[3]}: ${qScores[3].toFixed(0)} | ${shorts[4]}: ${qScores[4].toFixed(0)}]</div>
          <div style="color:#1D4ED8; font-weight:600;">${t.rlArgmaxLabel(actionText, maxQ.toFixed(1))}</div>
        `;
      } else {
        // 人工/Excel 被動模式
        if (currentAsset <= 0) {
          autopilotLog.innerHTML = t.manualFailMsg(step);
          clearInterval(shockInterval);
          shockInterval = null;
        } else {
          autopilotLog.innerHTML = t.manualBurnMsg(step);
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

// 註冊語言切換按鈕事件
const btnLangZh = document.getElementById("lang-zh");
const btnLangEn = document.getElementById("lang-en");
if (btnLangZh) {
  btnLangZh.addEventListener("click", () => setLanguage("zh"));
}
if (btnLangEn) {
  btnLangEn.addEventListener("click", () => setLanguage("en"));
}

// 頁面初次載入
window.addEventListener("DOMContentLoaded", () => {
  setLanguage(currentLang);
});
