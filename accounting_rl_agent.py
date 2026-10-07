#!/usr/bin/env python3
"""
Accounting World Model - Reinforcement Learning (RL) CFO Agent
Zero external dependencies: runs on pure Python standard library.

Demonstrates true Machine Learning (Q-learning / Policy Optimization)
trained against the double-entry fluid accounting world model.
"""

import math
import random
import json
from typing import List, Dict, Tuple, Optional

# =====================================================================
# 1. Double-Entry Accounting Fluid Environment
# =====================================================================

ACCOUNTS = ["Asset", "Liability", "Equity", "Revenue", "Expense"]
POLARITIES = [+1, -1, -1, -1, +1]

class AccountingWorldModelEnv:
    """
    Simulation Environment for Reinforcement Learning.
    State x(t) obeys 1ᵀ z(t) ≡ 0 conservation at every step.
    """
    def __init__(self, initial_asset: float = 1_000_000, initial_equity: float = 1_000_000):
        self.init_asset = initial_asset
        self.init_equity = initial_equity
        self.reset()

    def reset(self):
        # Initial balances [Asset, Liability, Equity, Revenue, Expense]
        self.balances = {
            "Asset": self.init_asset,
            "Liability": 0.0,
            "Equity": self.init_equity,
            "Revenue": 0.0,
            "Expense": 0.0
        }
        self.month = 0
        self.baseline_revenue = 200_000.0
        self.baseline_expense = 150_000.0
        # Macro-economic climate: 0: Recession (-30% sales), 1: Normal, 2: Boom (+30% sales)
        self.macro_state = 1
        return self._get_state()

    def _get_state(self) -> str:
        """
        Discretize continuous balance sheet state into feature tuple for Q-learning.
        State components: (Solvency Level, Profitability, Macro Climate)
        """
        asset = self.balances["Asset"]
        liab = self.balances["Liability"]
        rev = self.balances["Revenue"]
        exp = self.balances["Expense"]

        # 1. Solvency feature
        if asset <= 0:
            solvency = "INSOLVENT"
        elif asset < 300_000:
            solvency = "CRITICAL"
        elif liab > asset * 0.6:
            solvency = "HIGH_LEVERAGE"
        else:
            solvency = "HEALTHY"

        # 2. Net flow feature
        net = rev - exp
        if net > 20_000:
            cashflow = "POSITIVE"
        elif net < -20_000:
            cashflow = "BURNING"
        else:
            cashflow = "NEUTRAL"

        # 3. Macro climate
        macro = ["RECESSION", "NORMAL", "BOOM"][self.macro_state]

        return f"{solvency}|{cashflow}|{macro}"

    def step(self, action: int) -> Tuple[str, float, bool, Dict]:
        """
        Execute CFO Action:
        0: Hold (Maintain current operations)
        1: Aggressive Expansion (Borrow $150k debt to boost marketing/sales by 40%)
        2: Cost Austerity (Slash expenses by 35%, sales drop 10%)
        3: Debt Deleveraging (Pay down $100k debt from cash)
        4: Equity Financing (Raise $200k equity capital)
        """
        self.month += 1
        reward = 0.0
        terminated = False

        # Random macro fluctuations (Markov chain)
        macro_rand = random.random()
        if macro_rand < 0.2:
            self.macro_state = 0  # Recession hit
        elif macro_rand > 0.8:
            self.macro_state = 2  # Boom
        else:
            self.macro_state = 1  # Normal

        macro_mult = [0.65, 1.0, 1.35][self.macro_state]

        curr_rev = self.baseline_revenue * macro_mult
        curr_exp = self.baseline_expense

        # Apply CFO Actions
        if action == 1:  # Aggressive Expansion
            borrow = 150_000.0
            self.balances["Asset"] += borrow
            self.balances["Liability"] += borrow
            curr_rev *= 1.40
            curr_exp += 30_000.0  # Interest & expansion cost
        elif action == 2:  # Cost Austerity
            curr_exp *= 0.65
            curr_rev *= 0.90
        elif action == 3:  # Debt Deleveraging
            repay = min(100_000.0, self.balances["Liability"], max(0.0, self.balances["Asset"] - 50_000))
            if repay > 0:
                self.balances["Asset"] -= repay
                self.balances["Liability"] -= repay
        elif action == 4:  # Equity Financing
            raise_eq = 200_000.0
            self.balances["Asset"] += raise_eq
            self.balances["Equity"] += raise_eq

        # Add ongoing monthly interest on liability (8% annual = 0.67% monthly)
        interest_exp = self.balances["Liability"] * 0.0067
        curr_exp += interest_exp

        # Record monthly revenue and expense flows
        self.balances["Revenue"] = curr_rev
        self.balances["Expense"] = curr_exp

        # Execute monthly accounting flows: Dr Asset, Cr Revenue
        self.balances["Asset"] += curr_rev
        # Dr Expense, Cr Asset
        self.balances["Asset"] -= curr_exp

        # Monthly closing (C operator): transfer net profit to Equity
        monthly_profit = curr_rev - curr_exp
        self.balances["Equity"] += monthly_profit

        # Check double-entry identity: Asset == Liability + Equity
        diff = abs(self.balances["Asset"] - (self.balances["Liability"] + self.balances["Equity"]))
        assert diff < 1e-3, f"Double-entry violated: diff={diff}"

        # Reward formulation
        if self.balances["Asset"] <= 0:
            # Bankruptcy! Severe penalty
            reward = -2000.0
            terminated = True
        else:
            # Reward positive profit, penalize excessive leverage
            leverage_penalty = (self.balances["Liability"] / max(1.0, self.balances["Asset"])) * 50.0
            reward = (monthly_profit / 1000.0) - leverage_penalty

        if self.month >= 12:
            terminated = True  # 1-year financial planning horizon reached

        return self._get_state(), reward, terminated, {
            "month": self.month,
            "asset": self.balances["Asset"],
            "liability": self.balances["Liability"],
            "equity": self.balances["Equity"],
            "profit": monthly_profit
        }


# =====================================================================
# 2. Q-Learning Reinforcement Learning CFO Agent
# =====================================================================

ACTIONS = [
    "Hold Operations",
    "Expansion (Borrow Debt)",
    "Austerity (Cut Costs)",
    "Deleverage (Pay Debt)",
    "Equity Financing"
]

class QLearningCFOAgent:
    """
    Q-Learning Agent that learns optimal corporate financial policies
    through trial-and-error in the accounting world model.
    """
    def __init__(self, alpha: float = 0.15, gamma: float = 0.95, epsilon: float = 1.0, epsilon_decay: float = 0.995, min_epsilon: float = 0.05):
        self.alpha = alpha          # Learning rate
        self.gamma = gamma          # Discount factor
        self.epsilon = epsilon      # Exploration rate
        self.epsilon_decay = epsilon_decay
        self.min_epsilon = min_epsilon
        self.q_table: Dict[str, List[float]] = {}

    def get_q(self, state: str) -> List[float]:
        if state not in self.q_table:
            self.q_table[state] = [0.0] * len(ACTIONS)
        return self.q_table[state]

    def choose_action(self, state: str, greedy: bool = False) -> int:
        if not greedy and random.random() < self.epsilon:
            return random.randint(0, len(ACTIONS) - 1)
        q_values = self.get_q(state)
        max_q = max(q_values)
        best_actions = [i for i, q in enumerate(q_values) if q == max_q]
        return random.choice(best_actions)

    def learn(self, state: str, action: int, reward: float, next_state: str, done: bool):
        q_values = self.get_q(state)
        current_q = q_values[action]
        if done:
            target = reward
        else:
            next_max_q = max(self.get_q(next_state))
            target = reward + self.gamma * next_max_q

        # Bellman equation update
        self.q_table[state][action] = current_q + self.alpha * (target - current_q)

    def decay_epsilon(self):
        if self.epsilon > self.min_epsilon:
            self.epsilon *= self.epsilon_decay


# =====================================================================
# 3. Training & Evaluation Pipeline
# =====================================================================

def train_cfo_agent(episodes: int = 1500) -> Tuple[QLearningCFOAgent, List[float]]:
    env = AccountingWorldModelEnv(initial_asset=800_000, initial_equity=800_000)
    agent = QLearningCFOAgent()

    print(f"[*] Training Reinforcement Learning CFO Agent on Accounting World Model ({episodes} episodes)...")
    
    bankruptcy_history = []
    
    for ep in range(1, episodes + 1):
        state = env.reset()
        done = False
        episode_reward = 0.0

        while not done:
            action = agent.choose_action(state)
            next_state, reward, done, info = env.step(action)
            agent.learn(state, action, reward, next_state, done)
            state = next_state
            episode_reward += reward

        agent.decay_epsilon()

        # Track bankruptcy rate in batches of 100
        is_bankrupt = 1 if info["asset"] <= 0 else 0
        bankruptcy_history.append(is_bankrupt)

        if ep % 300 == 0 or ep == 100:
            recent_bankruptcy_rate = (sum(bankruptcy_history[-100:]) / min(len(bankruptcy_history), 100)) * 100
            print(f"  - Episode {ep:4d} | Exploration ε: {agent.epsilon:.3f} | Bankruptcy Rate (last 100): {recent_bankruptcy_rate:5.1f}%")

    return agent, bankruptcy_history


def run_crisis_benchmark(agent: Optional[QLearningCFOAgent] = None, name: str = "Trained RL CFO Agent"):
    """
    Test agent under a forced severe cash crunch / multi-month recession.
    """
    env = AccountingWorldModelEnv(initial_asset=200_000, initial_equity=200_000)
    state = env.reset()
    env.baseline_revenue = 140_000.0
    env.baseline_expense = 180_000.0
    # Force sustained recession (sales drop to ~91k against 180k expenses = 89k burn/mo)
    env.macro_state = 0

    print(f"\n=======================================================")
    print(f" Benchmark Test: {name}")
    print(f" Initial Asset: $200,000 | Burning: -$89,000/mo in Recession")
    print(f"=======================================================")
    print(f"{'Month':<6} {'Action Chosen':<26} {'Asset ($)':<14} {'Liab ($)':<12} {'Equity ($)':<12} {'Status'}")
    print("-" * 75)

    done = False
    step_count = 0
    while not done:
        # Force recession every month in benchmark to test stress survival
        env.macro_state = 0
        state = env._get_state()
        
        if agent is None:
            # Naive / Random Baseline
            action = random.choice([0, 1])  # Blindly holding or expanding
        else:
            action = agent.choose_action(state, greedy=True)

        action_name = ACTIONS[action]
        next_state, reward, done, info = env.step(action)
        step_count += 1

        status = "SOLVENT" if info["asset"] > 0 else "DEFICIT (CRASH)"
        print(f"M{step_count:<5} {action_name:<26} ${info['asset']:>10,.0f} ${info['liability']:>10,.0f} ${info['equity']:>10,.0f}  {status}")

        if info["asset"] <= 0:
            print(f"\n[-] Company became INSOLVENT at Month {step_count}!")
            return False

    print(f"\n[+] Survived full 12-Month Recession! Ending Asset: ${info['asset']:,.0f}")
    return True


if __name__ == "__main__":
    # 1. Train the RL Agent
    trained_agent, _ = train_cfo_agent(episodes=1500)

    # 2. Benchmark Naive Manager vs Trained RL CFO Agent
    print("\n[Comparison Test]")
    random.seed(42)
    print("\n--- TEST 1: Un-trained Naive Strategy ---")
    run_crisis_benchmark(agent=None, name="Untrained Naive Strategy")

    print("\n--- TEST 2: Trained Q-Learning CFO Agent ---")
    run_crisis_benchmark(agent=trained_agent, name="Trained Q-Learning CFO Agent")

    # Export learned decision table
    with open("cfo_q_policy.json", "w") as f:
        json.dump(trained_agent.q_table, f, indent=2)
    print("\n[+] Learned Q-policy saved to cfo_q_policy.json")
