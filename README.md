# Accounting World Model AI (acc_world_model)

A minimal, pure mathematical accounting engine and interactive world model simulator.

Based on double-entry bookkeeping conservation principles ($\mathbf{1}^T z(t) \equiv 0$), modeling accounting balances as fluid reservoirs and transactions as network flows.

## Features
- **5 Core Accounting Elements**: Asset, Liability, Equity, Revenue, Expense.
- **Double-Entry Conservation**: Verified trial balance ($\mathbf{1}^T z = 0$).
- **Live 6-Month Trajectory**: Dynamic asset simulation with solvency and runway diagnostics.
- **Interactive Dashboard**: Minimalist typography with two-way synced sliders and numerical inputs.

## Quick Start

### Web Interface
To run the interactive simulator locally:
```bash
python3 -m http.server 3000
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Python Engine
To run the terminal world model simulation:
```bash
python3 accounting_world_model_ai.py
```
