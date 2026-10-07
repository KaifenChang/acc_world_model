# 會計核心領域知識與系統架構指南
Accounting Domain Knowledge & Architectural Reference Guide

---

## 1. 會計五大要素與擴展會計恒等式 (The 5 Fundamental Elements)

在任何國際會計準則（IFRS / US GAAP）中，所有經濟活動都被歸納為五大基本要素。

### 1.1 五大要素定義

| 要素 (Element) | 定義 (Definition) | 經濟實質 | 報表歸屬 | 常態餘額 (Normal Balance) |
| :--- | :--- | :--- | :--- | :--- |
| **資產 (Assets)** | 過去交易產生、由企業擁有或控制、預期能帶來未來經濟利益的資源。 | 經濟資源的「具體形態」 | 資產負債表 (Balance Sheet) | 借方 (Debit) |
| **負債 (Liabilities)** | 過去交易產生、預期會導致經濟利益流出企業的現時義務。 | 對外部債權人的「權利主張」 | 資產負債表 (Balance Sheet) | 貸方 (Credit) |
| **權益 (Equity)** | 企業資產扣除負債後的剩餘權益（Net Assets / 淨資產），代表股東所有權。 | 對所有者的「權利主張」 | 資產負債表 (Balance Sheet) | 貸方 (Credit) |
| **收入 (Revenues)** | 企業在日常經營活動中形成的、會導致權益增加的經濟利益流入。 | 本期價值的創造 | 損益表 (Income Statement) | 貸方 (Credit) |
| **費用 (Expenses)** | 企業在日常經營活動中發生的、會導致權益減少的經濟利益流出。 | 本期資源的消耗 | 損益表 (Income Statement) | 借方 (Debit) |

---

### 1.2 恒等式的代數演進

1. **基本會計恒等式（靜態存量觀）**：
   $$\text{資產 (Assets)} = \text{負債 (Liabilities)} + \text{權益 (Equity)}$$
   *詮釋：企業的一切資產，不是借來的（負債），就是股東投入或賺來的（權益）。*

2. **擴展會計恒等式（動態流量觀）**：
   期末權益等於期初權益加上本期淨利潤（$\text{Net Income} = \text{Revenue} - \text{Expense}$）：
   $$\text{Assets} = \text{Liabilities} + \text{Equity}_{\text{begin}} + (\text{Revenues} - \text{Expenses})$$

3. **全正數對稱形式（DEALER 守恆形）**：
   移項消除負號，使所有項均為非負：
   $$\underbrace{\text{Assets} + \text{Expenses}}_{\text{借方常態 (Debit-Normal)}} = \underbrace{\text{Liabilities} + \text{Equity} + \text{Revenues}}_{\text{貸方常態 (Credit-Normal)}}$$

---

## 2. 借貸記賬法的本質與記憶模型 (The Nature of Debit & Credit)

「借（Debit, Dr.）」與「貸（Credit, Cr.）」在現代複式記帳中**完全剝離了日常字面意思（如借錢、貸款）**，它們純粹是代數空間中的**左側（Left）**與**右側（Right）**。

### 2.1 DEALER 助記法則

```
        ┌────────────────────────────────────────────────────────┐
        │            D  E  A  L  E  R   助 記 規 則              │
        └────────────────────────────────────────────────────────┘
              [ 借方增加 (Debit +) ]        [ 貸方增加 (Credit +) ]
              ─────────────────────        ─────────────────────
              D - Dividends (股利/分紅)     L - Liabilities (負債)
              E - Expenses  (費用)         E - Equity      (權益)
              A - Assets    (資產)         R - Revenue     (收入)
```

### 2.2 增減規則矩陣

| 會計要素分類 | 借方 (Debit) 記帳 | 貸方 (Credit) 記帳 | 常態餘額方向 (Normal Balance) |
| :--- | :---: | :---: | :---: |
| **資產 (Assets)** | **增加 (+)** | 減少 (-) | 借方 (Debit) |
| **費用 (Expenses)** | **增加 (+)** | 減少 (-) | 借方 (Debit) |
| **負債 (Liabilities)** | 減少 (-) | **增加 (+)** | 貸方 (Credit) |
| **權益 (Equity)** | 減少 (-) | **增加 (+)** | 貸方 (Credit) |
| **收入 (Revenues)** | 減少 (-) | **增加 (+)** | 貸方 (Credit) |

> **水流視角解釋**：
> * 借（Debit） = 資源流入（或使用途徑）
> * 貸（Credit） = 資源流出（或來源出處）
> 任何一筆經濟業務，一定是「從某個來源（Credit 貸方）流出，流入到某個用途（Debit 借方）」。

---

## 3. 實科目 vs 虛科目：科目的生命週期機制

在系統架構中，必須嚴格區分**持久化帳戶（實科目）**與**週期重置帳戶（虛科目）**：

### 3.1 實科目（Real / Permanent Accounts）
* **涵蓋科目**：所有資產、負債、權益科目。
* **特性**：
  * 跨期滾存（Balance Carried Forward）：期末餘額即為下一期的期初餘額。
  * 體現在**資產負債表**中。
  * 代表企業在特定時點（Point in Time）的靜態存量狀態。

### 3.2 虛科目（Nominal / Temporary Accounts）
* **涵蓋科目**：所有收入、費用、股利（Dividends）/ 業主提支。
* **特性**：
  * 計量特定期間（Period of Time）的經濟成果。
  * 體現在**損益表**中。
  * **期末歸零機制（Zeroing Out）**：會計期末必須進行「結帳分錄（Closing Entries）」，將本期累積額歸零，並將淨利潤結轉至實科目「留存收益（Retained Earnings）」。

---

## 4. 標準會計循環 (The Accounting Cycle)

會計資訊系統本質是一個遵循固定狀態機轉移的流程循環：

```
[原始交易憑證] 
      │ 1. 識別與計量
      ▼
[日記帳分錄 (Journal Entries)] ──── (借貸平衡檢驗: 1^T b_k = 0)
      │ 2. 過帳 (Posting)
      ▼
[分類帳 (General Ledger Accounts)] ──── (累計各科目餘額)
      │ 3. 匯總
      ▼
[未調整試算表 (Unadjusted Trial Balance)]
      │ 4. 期末調整 (權責發生制調整)
      ▼
[調整分錄 (Adjusting Entries)] ──── (折舊、預收/預付分攤、應計未付)
      │ 5. 再次檢驗
      ▼
[調整後試算表 (Adjusted Trial Balance)]
      │ 6. 生成核心報告
      ▼
[四大財務報表 (Financial Statements)] ──── (損益表 -> 資產負債表)
      │ 7. 結帳 (Closing)
      ▼
[結帳分錄 (Closing Entries)] ──── (虛科目清零，轉入 Retained Earnings)
      │ 8. 留存進入下一週期
      ▼
[結帳後試算表 (Post-Closing Trial Balance)] ──── (僅剩實科目，作為下期期初)
```

---

## 5. 四大核心財務報表架構 (The 4 Financial Statements)

四大報表不是孤立的表格，而是同一個狀態流網絡在不同維度上的切片與投影：

```
┌────────────────────────────────────────────────────────┐
│ 1. 損益表 (Income Statement)                           │
│    Revenues - Expenses = 淨利潤 (Net Income)           │
└───────────────────────────┬────────────────────────────┘
                            │ (注入留存收益)
                            ▼
┌────────────────────────────────────────────────────────┐
│ 2. 權益變動表 (Statement of Changes in Equity)         │
│    期初權益 + Net Income - 股利分配 = 期末權益           │
└───────────────────────────┬────────────────────────────┘
                            │ (支撐資產負債表平衡)
                            ▼
┌────────────────────────────────────────────────────────┐
│ 3. 資產負債表 (Balance Sheet)                          │
│    Assets = Liabilities + Equity (期末狀態快照)         │
└───────────────────────────┬────────────────────────────┘
                            │ (驗證現金科目動態)
                            ▼
┌────────────────────────────────────────────────────────┐
│ 4. 現金流量表 (Statement of Cash Flows)                │
│    營業現金流 + 投資現金流 + 籌資現金流 = 現金淨變動量     │
└────────────────────────────────────────────────────────┘
```

1. **資產負債表（Balance Sheet）**：
   * 形式：時點數（Snapshot at $t$）。
   * 公式：$\text{Assets}(t) = \text{Liabilities}(t) + \text{Equity}(t)$。
2. **綜合損益表（Income Statement / P&L）**：
   * 形式：期間數（Period $[t_1, t_2]$ 的流量）。
   * 公式：$\text{Net Income} = \sum \text{Revenues} - \sum \text{Expenses}$。
3. **現金流量表（Cash Flow Statement）**：
   * 形式：將「現金及約當現金水箱」的變動，依商業動機分解為三類：
     * **營業活動 (Operating Activities)**：銷售收款、採購付現、發薪。
     * **投資活動 (Investing Activities)**：購買/處分固定資產、對外投資。
     * **籌資活動 (Financing Activities)**：發行股份、借入借款、償還本金、支付股利。
4. **權益變動表（Statement of Changes in Equity）**：
   * 形式：股東權益內部細項（股本、資本公積、留存收益）的流轉追蹤。

---

## 6. 權責發生制（應計制）與緩衝水箱 (Accrual Accounting & Buffer Tanks)

現代會計建立在**權責發生制（Accrual Basis）**之上，而非簡單的**收付實現制（Cash Basis）**：

* **核心原則**：
  * **收入確認原則（Revenue Recognition Principle）**：在履行履約義務（提供貨物/服務）時確認收入，而非收到現金時。
  * **費用匹配原則（Matching Principle）**：費用必須在產生該收入的同一會計期間確認。

### 緩衝水箱機制（跨期調節科目）

為了協調「經濟實質發生時間」與「現金流動時間」的時間差，會計系統引入了 4 種典型的緩衝水箱：

```
                    ┌─────────────────────────┐
                    │  現金流動 vs 權責確認   │
                    └────────────┬────────────┘
                 先付/收現金      │     後付/收現金
          ┌──────────────────────┴──────────────────────┐
          ▼                                             ▼
  [ 遞延項目 (Deferrals) ]                      [ 應計項目 (Accruals) ]
  • 預付費用 (Prepaid Expenses, 資產)           • 應計費用 (Accrued Expenses, 負債)
    (先付錢，未來才享受效益)                       (先享受服務/產生費用，未來才付錢)
  • 預收收入 (Unearned Revenue, 負債)           • 應收帳款 (Accounts Receivable, 資產)
    (先收錢，未來才交貨履約)                       (先交貨確認收入，未來才收錢)
```

---

## 7. 特殊會計實務機制 (Special Mechanics for Modeling)

在建構系統模型時，有幾類反直覺的會計機制需要特殊處理：

### 7.1 備抵科目（Contra Accounts / 反向調節水箱）
* **定義**：依附於主科目，但其餘額方向與主科目**恰好相反**的科目。
* **典型代表**：
  * `累計折舊 (Accumulated Depreciation)`：資產類，但常態餘額在**貸方**，用以調減固定資產帳面價值。
  * `備抵壞帳 (Allowance for Doubtful Accounts)`：資產類，常態餘額在**貸方**，用以調減應收帳款。
* **數學建模**：其對角極性為 $p_i = -1$（與標準資產相反），但報表呈現時作為資產的扣除項。

### 7.2 權益細分層次
權益（Equity）並非單一水箱，而是包含多個層級：
1. **股本 (Common / Preferred Stock)**：投資人按股票面值投入的資本。
2. **資本公積 (Additional Paid-in Capital / APIC)**：投資人溢價投入的部分。
3. **留存收益 (Retained Earnings)**：企業歷年賺得且未分配給股東的累計利潤。
4. **其他綜合損益 (AOCI)**：未實現的公允價值變動（如外幣換算差額）。

### 7.3 外幣交易與匯兌損益 (FX Gain / Loss)
當涉及雙幣種交易時，單一標量守恆會被打破：
* 必須設定一個**基準記帳本位幣（Functional Currency）**。
* 匯率變動造成的本位幣估值差額，流入/流出「匯兌損益（Foreign Exchange Gain/Loss）」虛科目。

---

## 8. 標準會計科目表 (Chart of Accounts, COA) 編碼體系

在軟體系統與數據庫中，通常採用數字編碼體系來定義樹狀科目：

| 編碼區間 | 要素類別 | 科目代碼範例 | 科目名稱 (Account Name) | 極性 ($p_i$) |
| :--- | :--- | :--- | :--- | :---: |
| **1000 - 1999** | **資產 (Assets)** | 1001<br>1122<br>1501<br>1502 | 庫存現金 (Cash)<br>應收帳款 (Accounts Receivable)<br>固定資產 (Fixed Assets)<br>累計折舊 (Accumulated Depreciation, 備抵) | $+1$<br>$+1$<br>$+1$<br>$-1$ |
| **2000 - 2999** | **負債 (Liabilities)** | 2001<br>2202<br>2211 | 短期借款 (Short-term Debt)<br>應付帳款 (Accounts Payable)<br>應付職工薪酬 (Salaries Payable) | $-1$<br>$-1$<br>$-1$ |
| **3000 - 3999** | **權益 (Equity)** | 3001<br>3101 | 實收資本/股本 (Common Stock)<br>留存收益/未分配利潤 (Retained Earnings) | $-1$<br>$-1$ |
| **4000 - 4999** | **成本 (Cost)** | 4001 | 生產成本 (Production Cost) | $+1$ |
| **5000 - 5999** | **收入 (Revenues)** | 5001<br>5051 | 主營業務收入 (Sales Revenue)<br>其他業務收入 (Other Revenue) | $-1$<br>$-1$ |
| **6000 - 6999** | **費用 (Expenses)** | 6001<br>6601<br>6602 | 主營業務成本 (COGS)<br>銷售費用 (Selling Expense)<br>管理費用 (General & Admin Expense) | $+1$<br>$+1$<br>$+1$ |

這套編碼規則與極性映射，可以直接作為建立數據字典與初始化矩陣 $P$ 的基礎配置。
