"""
會計水流系統與矩陣代數數學模型 - 最小驗證原型 (無需第三方庫)
Accounting Fluid System & Matrix-Algebraic Model - Zero-dependency Prototype
"""

from typing import List, Dict

class AccountingFluidSystem:
    def __init__(self, accounts: List[str], polarities: List[int]):
        """
        :param accounts: 科目名稱列表
        :param polarities: 各科目極性 (+1: 借方常態, -1: 貸方常態)
        """
        assert len(accounts) == len(polarities), "科目數量與極性數量必須一致"
        self.accounts = accounts
        self.n = len(accounts)
        self.account_idx = {name: i for i, name in enumerate(accounts)}
        self.polarities = polarities  # P 對角線元素
        self.z = [0.0] * self.n       # 帶符號狀態向量 (Signed Balance Vector)

    def execute_batch(self, B: List[List[float]], a: List[float]):
        """
        執行批次交易矩陣乘法: z(t+1) = z(t) + B @ a
        :param B: 關聯矩陣 (n x m)
        :param a: 交易金額向量 (m,)
        """
        m = len(a)
        assert all(len(row) == m for row in B), "矩陣 B 的列數必須等於交易數 m"
        
        # 1. 檢驗基爾霍夫電流定律 (KCL) / 每筆交易借貸相等: 每列之和為 0
        for col_idx in range(m):
            col_sum = sum(B[row_idx][col_idx] for row_idx in range(self.n))
            if abs(col_sum) > 1e-6:
                raise ValueError(f"交易 #{col_idx+1} 不平衡! 列和必須為 0, 當前為: {col_sum}")

        # 2. 狀態轉移: Delta_z = B @ a
        for row_idx in range(self.n):
            delta_i = sum(B[row_idx][col_idx] * a[col_idx] for col_idx in range(m))
            self.z[row_idx] += delta_i

        # 3. 系統全局試算平衡檢驗: 1^T z = 0
        total_balance = sum(self.z)
        if abs(total_balance) > 1e-6:
            raise RuntimeError(f"系統試算平衡被破壞! 全局總和: {total_balance}")

    def get_nominal_balances(self) -> List[float]:
        """還原為會計報表端無符號名義餘額 x = P @ z"""
        return [self.polarities[i] * self.z[i] for i in range(self.n)]

    def close_temporary_accounts(self, temp_accounts: List[str], retained_earnings_acc: str):
        """
        損益結轉算子 C: 將臨時科目清零，並全數匯入留存收益
        """
        r_idx = self.account_idx[retained_earnings_acc]
        temp_indices = {self.account_idx[name] for name in temp_accounts}
        
        transferred_amount = 0.0
        for idx in temp_indices:
            transferred_amount += self.z[idx]
            self.z[idx] = 0.0
            
        self.z[r_idx] += transferred_amount
        assert abs(sum(self.z)) < 1e-6, "結轉後試算平衡破壞!"

    def display_trial_balance(self, title="試算平衡表 (Trial Balance)"):
        nominal = self.get_nominal_balances()
        print(f"\n=== {title} ===")
        print(f"{'科目 (Account)':<20} | {'借方 (Debit)':<15} | {'貸方 (Credit)':<15}")
        print("-" * 56)
        total_debit = 0.0
        total_credit = 0.0
        for i, name in enumerate(self.accounts):
            val = nominal[i]
            # 若 z[i] > 0 代表借方餘額；z[i] < 0 代表貸方餘額
            if self.z[i] >= 0:
                print(f"{name:<20} | {val:<15.2f} | {'':<15}")
                total_debit += val
            else:
                print(f"{name:<20} | {'':<15} | {val:<15.2f}")
                total_credit += val
        print("-" * 56)
        print(f"{'合計 (Total)':<20} | {total_debit:<15.2f} | {total_credit:<15.2f}\n")


if __name__ == "__main__":
    # 定義 6 個科目
    accounts = [
        "Cash",                 # 1. 現金 (Asset)
        "Bank Loan",            # 2. 銀行借款 (Liability)
        "Common Stock",         # 3. 股本 (Equity)
        "Retained Earnings",    # 4. 留存收益 (Equity)
        "Sales Revenue",        # 5. 銷售收入 (Revenue, Temporary)
        "Salary Expense"        # 6. 薪酬費用 (Expense, Temporary)
    ]
    # 極性: Asset(+1), Liability(-1), Equity(-1), Revenue(-1), Expense(+1)
    polarities = [+1, -1, -1, -1, -1, +1]

    system = AccountingFluidSystem(accounts, polarities)

    # 4 筆交易 (m = 4):
    # 1. 創始人出資 100,000 現金 -> 借: Cash, 貸: Common Stock
    # 2. 向銀行借款 50,000 現金 -> 借: Cash, 貸: Bank Loan
    # 3. 收到銷售收入 40,000 現金 -> 借: Cash, 貸: Sales Revenue
    # 4. 支付員工薪水 15,000 現金 -> 借: Salary Expense, 貸: Cash
    B = [
        # T1    T2    T3    T4
        [+1.0, +1.0, +1.0, -1.0],  # Cash
        [ 0.0, -1.0,  0.0,  0.0],  # Bank Loan
        [-1.0,  0.0,  0.0,  0.0],  # Common Stock
        [ 0.0,  0.0,  0.0,  0.0],  # Retained Earnings
        [ 0.0,  0.0, -1.0,  0.0],  # Sales Revenue
        [ 0.0,  0.0,  0.0, +1.0],  # Salary Expense
    ]
    amounts = [100000.0, 50000.0, 40000.0, 15000.0]

    system.execute_batch(B, amounts)
    system.display_trial_balance("期末結轉前 試算平衡表")

    # 執行損益結轉 (清空 Revenue 和 Expense，匯入 Retained Earnings)
    system.close_temporary_accounts(
        temp_accounts=["Sales Revenue", "Salary Expense"],
        retained_earnings_acc="Retained Earnings"
    )
    system.display_trial_balance("損益結轉後 試算平衡表 (資產負債表狀態)")
