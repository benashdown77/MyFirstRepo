# Personal Finance Tracker

A simple, dependency-free personal finance tracker that runs entirely in your
browser. No build step, no server, no account required — your data is saved
locally via `localStorage`.

Inspired by a personal wealth-tracking spreadsheet, this app keeps the same
core ideas (income vs. spending, an Essentials/Lifestyle/Savings budget split,
and net worth over time) but as a lightweight, general-purpose tool with no
personal data baked in.

## Features

- **Transactions** — log income and expenses with date, category, amount, and notes.
- **Dashboard** — monthly income, expenses, net savings, and savings rate, plus
  a spending-by-category breakdown and a 6-month income vs. expense trend chart.
- **Budget** — track spending against configurable targets for the classic
  50/30/20 rule (Essentials / Lifestyle / Savings), scaled to your actual income.
- **Net Worth** — record account balances (cash, savings, investments,
  pensions, debts) and snapshot your total net worth over time on a chart.
- **Settings** — change your currency symbol, export/import your data as JSON,
  or reset everything.

All charts are drawn with plain `<canvas>` — no external libraries or CDNs.

## Running it

Just open `index.html` in a browser, or serve the folder locally:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Data storage

All data (transactions, accounts, net worth history, settings) is stored in
your browser's `localStorage` under the key `financeTracker.v1`. Nothing is
sent to a server. Use the **Export Data** button in Settings to back up your
data as a JSON file, and **Import Data** to restore it (e.g. in a different
browser).
