"""
會計小型世界模型與 AI 決策推演原型 (Minimal World Model + AI Simulator)
用途: 演示利用會計矩陣物理引擎，讓 AI 自動在沙盒中推演不同商業決策的未來財務軌跡。
"""

from typing import List, Dict, Tuple
import copy

class AccountingEngine:
    """底層物理引擎: 保證守恆與狀態更新"""
    def __init__(self, accounts: List[str], polarities: List[int], initial_balances: List[float]):
        self.accounts = accounts
        self.n = len(accounts)
        self.polarities = polarities
        self.acc_map = {name: i for i, name in enumerate(accounts)}
        # 初始化帶符號狀態向量 z
        self.z = [polarities[i] * initial_balances[i] for i in range(self.n)]

    def apply_transaction(self, b: List[float], amount: float):
        """執行單筆或複合交易分錄，嚴格檢驗守恆律"""
        assert abs(sum(b)) < 1e-6, f"分錄不平衡! 總和必須為 0, 當前為: {sum(b)}"
        for i in range(self.n):
            self.z[i] += b[i] * amount

    def close_period(self, temp_accounts: List[str], retained_earnings: str):
        """期末損益結轉投影 C"""
        r_idx = self.acc_map[retained_earnings]
        transferred = 0.0
        for name in temp_accounts:
            idx = self.acc_map[name]
            transferred += self.z[idx]
            self.z[idx] = 0.0
        self.z[r_idx] += transferred

    def get_balance(self, account_name: str) -> float:
        idx = self.acc_map[account_name]
        return self.polarities[idx] * self.z[idx]

    def is_bankrupt(self) -> bool:
        """破產判定: 現金水箱斷流 (< 0)"""
        return self.get_balance("Cash") < 0


class WorldModelAISimulator:
    """AI 推演控制器: 在世界模型中推演多種決策，尋找最優路徑"""
    def __init__(self, base_engine: AccountingEngine):
        self.base_engine = base_engine

    def simulate_strategy(self, strategy_name: str, monthly_actions: List[Dict]) -> Dict:
        """在虛擬沙盒中複製一個世界，並推進時間推演未來"""
        sandbox = copy.deepcopy(self.base_engine)
        history = []
        bankrupt_month = None

        for month, action in enumerate(monthly_actions, start=1):
            # 1. 執行該月份的商業決策流 (Action)
            # 例如: 現金銷貨 (借: Cash, 貸: Sales Revenue)
            if action.get("sales", 0) > 0:
                b_sales = [0.0] * sandbox.n
                b_sales[sandbox.acc_map["Cash"]] = +1.0
                b_sales[sandbox.acc_map["Sales Revenue"]] = -1.0
                sandbox.apply_transaction(b_sales, action["sales"])

            # 支付運營成本與薪資 (借: Operating Expense, 貸: Cash)
            if action.get("expense", 0) > 0:
                b_exp = [0.0] * sandbox.n
                b_exp[sandbox.acc_map["Operating Expense"]] = +1.0
                b_exp[sandbox.acc_map["Cash"]] = -1.0
                sandbox.apply_transaction(b_exp, action["expense"])

            # 設備大額投資 (借: Equipment, 貸: Cash)
            if action.get("capex", 0) > 0:
                b_capex = [0.0] * sandbox.n
                b_capex[sandbox.acc_map["Equipment"]] = +1.0
                b_capex[sandbox.acc_map["Cash"]] = -1.0
                sandbox.apply_transaction(b_capex, action["capex"])

            # 2. 期末結算 (月結投影)
            sandbox.close_period(["Sales Revenue", "Operating Expense"], "Retained Earnings")

            cash = sandbox.get_balance("Cash")
            equity = sandbox.get_balance("Retained Earnings")
            history.append({"month": month, "cash": cash, "equity": equity})

            # 3. 檢查系統穩定性 (是否破產)
            if sandbox.is_bankrupt() and bankrupt_month is None:
                bankrupt_month = month

        return {
            "strategy": strategy_name,
            "bankrupt": bankrupt_month is not None,
            "bankrupt_month": bankrupt_month,
            "final_cash": history[-1]["cash"],
            "final_equity": history[-1]["equity"],
            "history": history
        }


if __name__ == "__main__":
    # 初始化科目表
    accounts = [
        "Cash",                 # 資產 (+1)
        "Equipment",            # 資產 (+1)
        "Bank Loan",            # 負債 (-1)
        "Common Stock",         # 權益 (-1)
        "Retained Earnings",    # 權益 (-1)
        "Sales Revenue",        # 收入 (-1, 臨時)
        "Operating Expense"     # 費用 (+1, 臨時)
    ]
    polarities = [+1, +1, -1, -1, -1, -1, +1]
    
    # 公司期初狀態: 現金 100 萬，股本 100 萬
    initial_balances = [1000000.0, 0.0, 0.0, 1000000.0, 0.0, 0.0, 0.0]
    
    engine = AccountingEngine(accounts, polarities, initial_balances)
    ai_simulator = WorldModelAISimulator(engine)

    print("==================================================================")
    print("      會計小型世界模型: AI 商業決策沙盒推演系統 (Demo)           ")
    print("==================================================================")

    # 策略 A: 激進擴張 (第 1 個月砸 85 萬買新設備，每月高薪開銷 30 萬，但營收只有 20 萬)
    plan_aggressive = [
        {"sales": 200000, "expense": 300000, "capex": 850000},  # Month 1: 100萬 - 85萬 - 10萬 = 5萬
        {"sales": 200000, "expense": 300000, "capex": 0},       # Month 2: 5萬 - 10萬 = -5萬 (破產!)
        {"sales": 200000, "expense": 300000, "capex": 0},       # Month 3
        {"sales": 200000, "expense": 300000, "capex": 0},       # Month 4
    ]

    # 策略 B: 穩健發展 (不買昂貴設備，控制開銷 15 萬，平穩營收 20 萬)
    plan_conservative = [
        {"sales": 200000, "expense": 150000, "capex": 0},       # Month 1
        {"sales": 200000, "expense": 150000, "capex": 0},       # Month 2
        {"sales": 200000, "expense": 150000, "capex": 0},       # Month 3
        {"sales": 200000, "expense": 150000, "capex": 0},       # Month 4
    ]

    res_a = ai_simulator.simulate_strategy("策略 A (激進擴張方案)", plan_aggressive)
    res_b = ai_simulator.simulate_strategy("策略 B (穩健保守方案)", plan_conservative)

    for res in [res_a, res_b]:
        print(f"\n【推演結果: {res['strategy']}】")
        for h in res["history"]:
            status = "⚠️ 破產警告" if h["cash"] < 0 else "正常運轉"
            print(f"  * 第 {h['month']} 個月 | 現金存量: ${h['cash']:>10,.2f} | 累計利潤: ${h['equity']:>10,.2f} [{status}]")
        
        if res["bankrupt"]:
            print(f"  ❌ 結論: 該決策在第 {res['bankrupt_month']} 個月發生現金斷流破產！")
        else:
            print(f"  ✅ 結論: 系統健康運轉，期末現金結餘 ${res['final_cash']:,.2f}")

    print("\n------------------------------------------------------------------")
    print("🤖 AI 算法綜合決策建議:")
    print("『策略 A 因前期資本支出過大，在第 2 個月即陷入現金斷流；")
    print("  推薦執行【策略 B】，其在維持充裕流動性的同時，4 個月累計創造了 20 萬淨利潤。』")
    print("==================================================================")
