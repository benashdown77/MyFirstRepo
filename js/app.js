(() => {
  "use strict";

  /* ---------- Data model & storage ---------- */

  const STORAGE_KEY = "financeTracker.v1";

  const CATEGORY_GROUPS = {
    // Essentials (needs)
    "Housing/Rent": "Essentials",
    "Utilities": "Essentials",
    "Groceries": "Essentials",
    "Transport": "Essentials",
    "Insurance": "Essentials",
    "Healthcare": "Essentials",
    "Debt Payments": "Essentials",
    // Lifestyle (wants)
    "Dining Out": "Lifestyle",
    "Entertainment": "Lifestyle",
    "Shopping": "Lifestyle",
    "Subscriptions": "Lifestyle",
    "Travel": "Lifestyle",
    "Personal Care": "Lifestyle",
    "Other": "Lifestyle",
    // Savings & investing
    "Emergency Fund": "Savings",
    "Investments": "Savings",
    "Retirement/Pension": "Savings",
    "Other Savings": "Savings",
  };

  const INCOME_CATEGORIES = ["Salary", "Bonus", "Interest", "Investment Income", "Other Income"];

  const GROUP_COLORS = { Essentials: "#60a5fa", Lifestyle: "#fbbf24", Savings: "#34d399" };
  const CATEGORY_COLORS = [
    "#60a5fa", "#fbbf24", "#34d399", "#f87171", "#a78bfa",
    "#38bdf8", "#f472b6", "#facc15", "#4ade80", "#fb923c", "#c084fc"
  ];

  const defaultState = () => ({
    transactions: [], // {id, date, type, category, group, amount, note}
    accounts: [],     // {id, name, type, balance}
    netWorthHistory: [], // {date, total}
    settings: { currency: "$", budgetTargets: { Essentials: 50, Lifestyle: 30, Savings: 20 } },
  });

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return { ...defaultState(), ...parsed, settings: { ...defaultState().settings, ...(parsed.settings || {}) } };
    } catch (e) {
      console.warn("Failed to load saved data, starting fresh.", e);
      return defaultState();
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* ---------- Helpers ---------- */

  function fmt(amount) {
    const n = Number(amount) || 0;
    return state.settings.currency + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function monthKey(dateStr) {
    return dateStr ? dateStr.slice(0, 7) : "";
  }

  function currentMonthDefault() {
    return new Date().toISOString().slice(0, 7);
  }

  function txForMonth(month) {
    if (!month) return state.transactions;
    return state.transactions.filter((t) => monthKey(t.date) === month);
  }

  /* ---------- Tabs ---------- */

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");
      if (btn.dataset.tab === "dashboard") renderDashboard();
      if (btn.dataset.tab === "budget") renderBudget();
      if (btn.dataset.tab === "accounts") renderAccounts();
    });
  });

  /* ---------- Transactions form ---------- */

  const txForm = document.getElementById("txForm");
  const txType = document.getElementById("txType");
  const txCategory = document.getElementById("txCategory");
  const txDate = document.getElementById("txDate");
  const txMonthFilter = document.getElementById("txMonthFilter");

  function populateCategoryOptions() {
    const cats = txType.value === "income" ? INCOME_CATEGORIES : Object.keys(CATEGORY_GROUPS);
    txCategory.innerHTML = cats.map((c) => `<option value="${c}">${c}</option>`).join("");
  }
  txType.addEventListener("change", populateCategoryOptions);
  populateCategoryOptions();
  txDate.value = new Date().toISOString().slice(0, 10);

  txForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const type = txType.value;
    const category = txCategory.value;
    const group = type === "income" ? "Income" : CATEGORY_GROUPS[category] || "Other";
    state.transactions.push({
      id: uid(),
      date: document.getElementById("txDate").value,
      type,
      category,
      group,
      amount: parseFloat(document.getElementById("txAmount").value) || 0,
      note: document.getElementById("txNote").value.trim(),
    });
    save();
    txForm.reset();
    txDate.value = new Date().toISOString().slice(0, 10);
    populateCategoryOptions();
    renderTransactions();
    renderDashboard();
    renderBudget();
  });

  txMonthFilter.addEventListener("change", renderTransactions);
  document.getElementById("clearFilter").addEventListener("click", () => {
    txMonthFilter.value = "";
    renderTransactions();
  });

  function renderTransactions() {
    const month = txMonthFilter.value;
    const list = [...txForMonth(month)].sort((a, b) => b.date.localeCompare(a.date));
    const body = document.getElementById("txTableBody");
    if (list.length === 0) {
      body.innerHTML = `<tr><td colspan="6" style="color:var(--muted)">No transactions${month ? " for this month" : ""} yet.</td></tr>`;
      return;
    }
    body.innerHTML = list.map((t) => `
      <tr>
        <td>${t.date}</td>
        <td>${t.type === "income" ? "Income" : "Expense"}</td>
        <td>${t.category}</td>
        <td>${t.note || ""}</td>
        <td class="${t.type === "income" ? "amount-income" : "amount-expense"}">${t.type === "income" ? "+" : "-"}${fmt(t.amount)}</td>
        <td><button class="icon-btn" data-id="${t.id}">✕</button></td>
      </tr>
    `).join("");
    body.querySelectorAll("button[data-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.transactions = state.transactions.filter((t) => t.id !== btn.dataset.id);
        save();
        renderTransactions();
        renderDashboard();
        renderBudget();
      });
    });
  }

  /* ---------- Dashboard ---------- */

  const dashMonth = document.getElementById("dashMonth");
  dashMonth.value = currentMonthDefault();
  dashMonth.addEventListener("change", renderDashboard);

  function renderDashboard() {
    const month = dashMonth.value;
    const list = txForMonth(month);
    const income = list.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = list.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const net = income - expense;
    const rate = income > 0 ? (net / income) * 100 : 0;

    document.getElementById("cardIncome").textContent = fmt(income);
    document.getElementById("cardExpense").textContent = fmt(expense);
    document.getElementById("cardNet").textContent = fmt(net);
    document.getElementById("cardNet").style.color = net >= 0 ? "var(--income)" : "var(--expense)";
    document.getElementById("cardRate").textContent = rate.toFixed(1) + "%";

    drawCategoryChart(list);
    drawTrendChart();
  }

  function drawCategoryChart(list) {
    const canvas = document.getElementById("categoryChart");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const byCat = {};
    list.filter((t) => t.type === "expense").forEach((t) => {
      byCat[t.category] = (byCat[t.category] || 0) + t.amount;
    });
    const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const legend = document.getElementById("categoryLegend");

    if (entries.length === 0) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "14px sans-serif";
      ctx.fillText("No expenses this month", 20, canvas.height / 2);
      legend.innerHTML = "";
      return;
    }

    const total = entries.reduce((s, [, v]) => s + v, 0);
    const cx = canvas.width / 2, cy = canvas.height / 2, r = Math.min(cx, cy) - 20;
    let start = -Math.PI / 2;

    legend.innerHTML = "";
    entries.forEach(([cat, val], i) => {
      const slice = (val / total) * Math.PI * 2;
      const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, start + slice);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      start += slice;

      const pct = ((val / total) * 100).toFixed(1);
      const li = document.createElement("span");
      li.innerHTML = `<span class="swatch" style="background:${color}"></span>${cat} (${pct}%)`;
      legend.appendChild(li);
    });
  }

  function drawTrendChart() {
    const canvas = document.getElementById("trendChart");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const months = [];
    const base = dashMonth.value ? new Date(dashMonth.value + "-01") : new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      months.push(d.toISOString().slice(0, 7));
    }

    const data = months.map((m) => {
      const list = txForMonth(m);
      return {
        month: m,
        income: list.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
        expense: list.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
      };
    });

    const maxVal = Math.max(1, ...data.map((d) => Math.max(d.income, d.expense)));
    const padding = 40;
    const chartW = canvas.width - padding * 2;
    const chartH = canvas.height - padding * 2;
    const groupW = chartW / months.length;
    const barW = groupW / 3.2;

    ctx.strokeStyle = "#334155";
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();

    ctx.font = "10px sans-serif";
    ctx.fillStyle = "#94a3b8";

    data.forEach((d, i) => {
      const x = padding + i * groupW + groupW / 2;
      const incH = (d.income / maxVal) * chartH;
      const expH = (d.expense / maxVal) * chartH;

      ctx.fillStyle = "#34d399";
      ctx.fillRect(x - barW - 2, canvas.height - padding - incH, barW, incH);

      ctx.fillStyle = "#f87171";
      ctx.fillRect(x + 2, canvas.height - padding - expH, barW, expH);

      ctx.fillStyle = "#94a3b8";
      ctx.textAlign = "center";
      ctx.fillText(d.month.slice(2), x, canvas.height - padding + 14);
    });
  }

  /* ---------- Budget ---------- */

  function renderBudget() {
    const container = document.getElementById("budgetGroups");
    const month = currentMonthDefault();
    const list = txForMonth(dashMonth.value || month);
    const income = list.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);

    const groups = ["Essentials", "Lifestyle", "Savings"];
    container.innerHTML = groups.map((g) => {
      const spent = list.filter((t) => t.type === "expense" && t.group === g).reduce((s, t) => s + t.amount, 0);
      const target = state.settings.budgetTargets[g] ?? 0;
      const targetAmount = income * (target / 100);
      const pct = targetAmount > 0 ? Math.min(150, (spent / targetAmount) * 100) : (spent > 0 ? 100 : 0);
      const over = targetAmount > 0 && spent > targetAmount;
      return `
        <div class="budget-group">
          <div class="budget-group-head">
            <strong style="color:${GROUP_COLORS[g]}">${g}</strong>
            <span class="target-input">
              Target <input type="number" min="0" max="100" data-group="${g}" class="targetPct" value="${target}"> % of income
            </span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width:${Math.min(100, pct)}%; background:${over ? "var(--expense)" : GROUP_COLORS[g]}"></div>
          </div>
          <div class="budget-meta">
            <span class="${over ? "over" : ""}">${fmt(spent)} spent</span>
            <span>Target: ${fmt(targetAmount)} (${target}% of ${fmt(income)} income)</span>
          </div>
        </div>
      `;
    }).join("");

    container.querySelectorAll(".targetPct").forEach((input) => {
      input.addEventListener("change", () => {
        const g = input.dataset.group;
        state.settings.budgetTargets[g] = Math.max(0, Math.min(100, parseFloat(input.value) || 0));
        save();
        renderBudget();
      });
    });
  }

  /* ---------- Accounts / Net worth ---------- */

  const acctForm = document.getElementById("acctForm");
  acctForm.addEventListener("submit", (e) => {
    e.preventDefault();
    state.accounts.push({
      id: uid(),
      name: document.getElementById("acctName").value.trim(),
      type: document.getElementById("acctType").value,
      balance: parseFloat(document.getElementById("acctBalance").value) || 0,
    });
    save();
    acctForm.reset();
    renderAccounts();
  });

  function netWorthTotal() {
    return state.accounts.reduce((s, a) => {
      const sign = (a.type === "Debt / Loan" || a.type === "Credit Card") ? -1 : 1;
      return s + sign * a.balance;
    }, 0);
  }

  function renderAccounts() {
    const body = document.getElementById("acctTableBody");
    if (state.accounts.length === 0) {
      body.innerHTML = `<tr><td colspan="4" style="color:var(--muted)">No accounts added yet.</td></tr>`;
    } else {
      body.innerHTML = state.accounts.map((a) => `
        <tr>
          <td>${a.name}</td>
          <td>${a.type}</td>
          <td>${(a.type === "Debt / Loan" || a.type === "Credit Card") ? "-" : ""}${fmt(a.balance)}</td>
          <td><button class="icon-btn" data-id="${a.id}">✕</button></td>
        </tr>
      `).join("");
      body.querySelectorAll("button[data-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
          state.accounts = state.accounts.filter((a) => a.id !== btn.dataset.id);
          save();
          renderAccounts();
        });
      });
    }
    document.getElementById("netWorthTotal").textContent = fmt(netWorthTotal());
    drawNetWorthChart();
  }

  document.getElementById("snapshotBtn").addEventListener("click", () => {
    const today = new Date().toISOString().slice(0, 10);
    const total = netWorthTotal();
    const existing = state.netWorthHistory.find((h) => h.date === today);
    if (existing) existing.total = total;
    else state.netWorthHistory.push({ date: today, total });
    state.netWorthHistory.sort((a, b) => a.date.localeCompare(b.date));
    save();
    drawNetWorthChart();
  });

  function drawNetWorthChart() {
    const canvas = document.getElementById("netWorthChart");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const history = state.netWorthHistory;
    if (history.length === 0) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "14px sans-serif";
      ctx.fillText("Record a snapshot to start tracking net worth over time.", 20, canvas.height / 2);
      return;
    }

    const padding = 40;
    const chartW = canvas.width - padding * 2;
    const chartH = canvas.height - padding * 2;
    const values = history.map((h) => h.total);
    const min = Math.min(0, ...values);
    const max = Math.max(1, ...values);

    ctx.strokeStyle = "#334155";
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = "#60a5fa";
    ctx.lineWidth = 2;
    history.forEach((h, i) => {
      const x = padding + (history.length === 1 ? chartW / 2 : (i / (history.length - 1)) * chartW);
      const y = canvas.height - padding - ((h.total - min) / (max - min || 1)) * chartH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = "#60a5fa";
    history.forEach((h, i) => {
      const x = padding + (history.length === 1 ? chartW / 2 : (i / (history.length - 1)) * chartW);
      const y = canvas.height - padding - ((h.total - min) / (max - min || 1)) * chartH;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px sans-serif";
    ctx.fillText(history[0].date, padding, canvas.height - padding + 14);
    ctx.textAlign = "right";
    ctx.fillText(history[history.length - 1].date, canvas.width - padding, canvas.height - padding + 14);
    ctx.textAlign = "left";
  }

  /* ---------- Settings ---------- */

  const currencyInput = document.getElementById("currencySymbol");
  currencyInput.value = state.settings.currency;
  currencyInput.addEventListener("change", () => {
    state.settings.currency = currencyInput.value || "$";
    save();
    renderTransactions();
    renderDashboard();
    renderBudget();
    renderAccounts();
  });

  document.getElementById("exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("importBtn").addEventListener("click", () => {
    document.getElementById("importFile").click();
  });
  document.getElementById("importFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        state = { ...defaultState(), ...parsed, settings: { ...defaultState().settings, ...(parsed.settings || {}) } };
        save();
        currencyInput.value = state.settings.currency;
        renderAll();
      } catch (err) {
        alert("Could not import file: invalid JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    if (confirm("This will permanently delete all transactions, accounts, and history. Continue?")) {
      state = defaultState();
      save();
      currencyInput.value = state.settings.currency;
      renderAll();
    }
  });

  /* ---------- Init ---------- */

  function renderAll() {
    renderTransactions();
    renderDashboard();
    renderBudget();
    renderAccounts();
  }

  renderAll();
})();
