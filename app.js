const STORAGE_KEY = "daily-expenses-report:v1";
const BUDGET_KEY = "daily-expenses-report:budget";
const GROUPS_KEY = "expense-split:groups:v1";
const SUPABASE_REST_URL = "https://lmdjblewkuaraqrpgpws.supabase.co/rest/v1";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ux2-Xg0drJchEU0OTmAnQA_MKdcZ1gn";
const USE_SUPABASE_GROUPS = true;
const APP_VERSION = "v2.1-supabase-check";

const categories = {
  Food: "#177a5b",
  Travel: "#275fbd",
  Shopping: "#cb5a43",
  Bills: "#be8626",
  Health: "#7c3aed",
  Entertainment: "#0f766e",
  Education: "#b45309",
  Other: "#475569",
};

const demoExpenses = [
  { id: createId(), amount: 240, category: "Food", description: "Lunch", date: todayISO(), method: "UPI" },
  { id: createId(), amount: 780, category: "Travel", description: "Cab and metro", date: todayISO(), method: "UPI" },
  { id: createId(), amount: 1460, category: "Bills", description: "Mobile recharge", date: offsetISO(-2), method: "Card" },
  { id: createId(), amount: 620, category: "Shopping", description: "Home supplies", date: offsetISO(-4), method: "UPI" },
  { id: createId(), amount: 350, category: "Entertainment", description: "Movie snacks", date: offsetISO(-6), method: "Cash" },
];

const tabButtons = document.querySelectorAll(".tab-button");
const personalPanels = [document.querySelector("#personalEntryPanel"), document.querySelector("#budgetPanel")];
const groupPanels = [document.querySelector("#groupEntryPanel")];
const personalPage = document.querySelector("#personalPage");
const groupsPage = document.querySelector("#groupsPage");

const form = document.querySelector("#expenseForm");
const amountInput = document.querySelector("#amountInput");
const categoryInput = document.querySelector("#categoryInput");
const descriptionInput = document.querySelector("#descriptionInput");
const dateInput = document.querySelector("#dateInput");
const methodInput = document.querySelector("#methodInput");
const searchInput = document.querySelector("#searchInput");
const categoryFilter = document.querySelector("#categoryFilter");
const budgetInput = document.querySelector("#budgetInput");
const budgetOutput = document.querySelector("#budgetOutput");
const budgetFill = document.querySelector("#budgetFill");
const tableBody = document.querySelector("#expenseTable");
const emptyState = document.querySelector("#emptyState");
const canvas = document.querySelector("#categoryCanvas");
const ctx = canvas.getContext("2d");

const groupForm = document.querySelector("#groupForm");
const activeGroupSelect = document.querySelector("#activeGroupSelect");
const memberForm = document.querySelector("#memberForm");
const memberNameInput = document.querySelector("#memberNameInput");
const groupExpenseForm = document.querySelector("#groupExpenseForm");
const groupExpenseDescriptionInput = document.querySelector("#groupExpenseDescriptionInput");
const groupExpenseAmountInput = document.querySelector("#groupExpenseAmountInput");
const groupExpenseCategoryInput = document.querySelector("#groupExpenseCategoryInput");
const groupExpenseDateInput = document.querySelector("#groupExpenseDateInput");
const groupPaidByInput = document.querySelector("#groupPaidByInput");
const splitMembers = document.querySelector("#splitMembers");
const groupExpenseTable = document.querySelector("#groupExpenseTable");
const groupEmptyState = document.querySelector("#groupEmptyState");
const balancesList = document.querySelector("#balancesList");
const groupCanvas = document.querySelector("#groupCategoryCanvas");
const groupCtx = groupCanvas.getContext("2d");

let expenses = readJson(STORAGE_KEY, []);
let budget = Number(localStorage.getItem(BUDGET_KEY) || 25000);
let groups = readJson(GROUPS_KEY, []);
let activeGroupId = groups[0]?.id || "";

document.documentElement.dataset.appVersion = APP_VERSION;
document.body.insertAdjacentHTML("afterbegin", `<div class="version-badge">ExpenseSplit ${APP_VERSION}</div>`);
console.info(`ExpenseSplit ${APP_VERSION}`);

dateInput.value = todayISO();
groupExpenseDateInput.value = todayISO();
budgetInput.value = budget;

tabButtons.forEach((button) => {
  button.addEventListener("click", () => setActiveTab(button.dataset.tab));
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const expense = {
    id: createId(),
    amount: Number(amountInput.value),
    category: categoryInput.value,
    description: descriptionInput.value.trim(),
    date: dateInput.value,
    method: methodInput.value,
  };

  expenses = [expense, ...expenses];
  savePersonalExpenses();
  form.reset();
  dateInput.value = todayISO();
  categoryInput.value = expense.category;
  methodInput.value = expense.method;
  renderPersonal();
  amountInput.focus();
});

searchInput.addEventListener("input", renderPersonal);
categoryFilter.addEventListener("change", renderPersonal);

budgetInput.addEventListener("input", () => {
  budget = Number(budgetInput.value);
  localStorage.setItem(BUDGET_KEY, budget);
  renderPersonal();
});

document.querySelector("#clearButton").addEventListener("click", () => {
  if (!expenses.length) return;
  if (confirm("Clear all saved personal expenses?")) {
    expenses = [];
    savePersonalExpenses();
    renderPersonal();
  }
});

document.querySelector("#seedDemoButton").addEventListener("click", () => {
  expenses = [...demoExpenses, ...expenses];
  savePersonalExpenses();
  renderPersonal();
});

document.querySelector("#exportButton").addEventListener("click", () => {
  if (!expenses.length) return;
  downloadCsv(`expenses-${todayISO()}.csv`, toCsv(expenses));
});

tableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-id]");
  if (!button) return;
  expenses = expenses.filter((expense) => expense.id !== button.dataset.id);
  savePersonalExpenses();
  renderPersonal();
});

groupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = document.querySelector("#groupNameInput").value.trim();
  if (!name) return;

  try {
    if (USE_SUPABASE_GROUPS) {
      const group = await createCloudGroup(name);
      activeGroupId = group.id;
      groupForm.reset();
      await refreshGroupsFromCloud(group.id);
      return;
    }

    const group = { id: createId(), name, members: [], expenses: [] };
    groups = [group, ...groups];
    activeGroupId = group.id;
    groupForm.reset();
    saveGroups();
    renderGroups();
  } catch (error) {
    alert(`Could not create group: ${error.message}`);
  }
});

activeGroupSelect.addEventListener("change", () => {
  activeGroupId = activeGroupSelect.value;
  renderGroups();
});

memberForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const group = getActiveGroup();
  const name = memberNameInput.value.trim();
  if (!group || !name) return;

  try {
    if (USE_SUPABASE_GROUPS) {
      await createCloudMember(group.id, name);
      memberForm.reset();
      await refreshGroupsFromCloud(group.id);
      return;
    }

    group.members.push({ id: createId(), name });
    memberForm.reset();
    saveGroups();
    renderGroups();
  } catch (error) {
    alert(`Could not add person: ${error.message}`);
  }
});

groupExpenseForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const group = getActiveGroup();
  if (!group) return;

  const participantIds = [...splitMembers.querySelectorAll("input:checked")].map((input) => input.value);
  if (!groupPaidByInput.value || participantIds.length === 0) {
    alert("Add members and select who should split this expense.");
    return;
  }

  const expense = {
    id: createId(),
    description: groupExpenseDescriptionInput.value.trim(),
    amount: Number(groupExpenseAmountInput.value),
    category: groupExpenseCategoryInput.value,
    paidBy: groupPaidByInput.value,
    participantIds,
    date: groupExpenseDateInput.value,
  };

  try {
    if (USE_SUPABASE_GROUPS) {
      await createCloudGroupExpense(group.id, expense);
      groupExpenseForm.reset();
      groupExpenseDateInput.value = todayISO();
      groupExpenseCategoryInput.value = "Food";
      await refreshGroupsFromCloud(group.id);
      return;
    }

    group.expenses = [
      {
        ...expense,
        id: createId(),
      },
      ...group.expenses,
    ];

    groupExpenseForm.reset();
    groupExpenseDateInput.value = todayISO();
    groupExpenseCategoryInput.value = "Food";
    saveGroups();
    renderGroups();
  } catch (error) {
    alert(`Could not add group expense: ${error.message}`);
  }
});

groupExpenseTable.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-id]");
  const group = getActiveGroup();
  if (!button || !group) return;

  try {
    if (USE_SUPABASE_GROUPS) {
      await deleteCloudGroupExpense(button.dataset.id);
      await refreshGroupsFromCloud(group.id);
      return;
    }

    group.expenses = group.expenses.filter((expense) => expense.id !== button.dataset.id);
    saveGroups();
    renderGroups();
  } catch (error) {
    alert(`Could not delete expense: ${error.message}`);
  }
});

document.querySelector("#clearGroupExpensesButton").addEventListener("click", async () => {
  const group = getActiveGroup();
  if (!group || !group.expenses.length) return;

  if (confirm("Clear all expenses for this group after settlement?")) {
    try {
      if (USE_SUPABASE_GROUPS) {
        await clearCloudGroupExpenses(group.id);
        await refreshGroupsFromCloud(group.id);
        return;
      }

      group.expenses = [];
      saveGroups();
      renderGroups();
    } catch (error) {
      alert(`Could not settle group: ${error.message}`);
    }
  }
});

document.querySelector("#deleteGroupButton").addEventListener("click", async () => {
  const group = getActiveGroup();
  if (!group) return;

  if (confirm(`Delete "${group.name}" and all its members and expenses?`)) {
    try {
      if (USE_SUPABASE_GROUPS) {
        await deleteCloudGroup(group.id);
        await refreshGroupsFromCloud("");
        return;
      }

      groups = groups.filter((item) => item.id !== group.id);
      activeGroupId = groups[0]?.id || "";
      saveGroups();
      renderGroups();
    } catch (error) {
      alert(`Could not delete group: ${error.message}`);
    }
  }
});

document.querySelector("#seedGroupDemoButton").addEventListener("click", async () => {
  const anujay = { id: createId(), name: "Anujay" };
  const friend1 = { id: createId(), name: "Friend 1" };
  const friend2 = { id: createId(), name: "Friend 2" };
  const group = {
    id: createId(),
    name: "Weekend Trip",
    members: [anujay, friend1, friend2],
    expenses: [
      {
        id: createId(),
        description: "Dinner",
        amount: 1200,
        category: "Food",
        paidBy: anujay.id,
        participantIds: [anujay.id, friend1.id, friend2.id],
        date: todayISO(),
      },
      {
        id: createId(),
        description: "Cab",
        amount: 600,
        category: "Travel",
        paidBy: friend1.id,
        participantIds: [anujay.id, friend1.id, friend2.id],
        date: todayISO(),
      },
    ],
  };

  try {
    if (USE_SUPABASE_GROUPS) {
      const cloudGroup = await createCloudGroup(group.name);
      const cloudMembers = [];
      for (const member of group.members) {
        cloudMembers.push(await createCloudMember(cloudGroup.id, member.name));
      }

      const idByName = Object.fromEntries(cloudMembers.map((member) => [member.name, member.id]));
      await createCloudGroupExpense(cloudGroup.id, {
        description: "Dinner",
        amount: 1200,
        category: "Food",
        paidBy: idByName.Anujay,
        participantIds: [idByName.Anujay, idByName["Friend 1"], idByName["Friend 2"]],
        date: todayISO(),
      });
      await createCloudGroupExpense(cloudGroup.id, {
        description: "Cab",
        amount: 600,
        category: "Travel",
        paidBy: idByName["Friend 1"],
        participantIds: [idByName.Anujay, idByName["Friend 1"], idByName["Friend 2"]],
        date: todayISO(),
      });
      activeGroupId = cloudGroup.id;
      await refreshGroupsFromCloud(cloudGroup.id);
      return;
    }

    groups = [group, ...groups];
    activeGroupId = group.id;
    saveGroups();
    renderGroups();
  } catch (error) {
    alert(`Could not load group demo: ${error.message}`);
  }
});

function setActiveTab(tab) {
  const isPersonal = tab === "personal";
  tabButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.tab === tab));
  personalPanels.forEach((panel) => panel.classList.toggle("is-active", isPersonal));
  groupPanels.forEach((panel) => panel.classList.toggle("is-active", !isPersonal));
  personalPage.classList.toggle("is-active", isPersonal);
  groupsPage.classList.toggle("is-active", !isPersonal);
  if (isPersonal) drawChart(groupByCategory(getCurrentMonthExpenses(expenses)));
  if (!isPersonal) drawGroupChart(groupByCategory(getActiveGroup()?.expenses || []));
}

function renderPersonal() {
  const visibleExpenses = getVisibleExpenses();
  const monthExpenses = getCurrentMonthExpenses(expenses);
  const todayExpenses = expenses.filter((expense) => expense.date === todayISO());
  const monthTotal = sum(monthExpenses);
  const todayTotal = sum(todayExpenses);
  const grouped = groupByCategory(monthExpenses);
  const top = Object.entries(grouped).sort((a, b) => b[1] - a[1])[0];
  const progress = budget ? Math.min((monthTotal / budget) * 100, 100) : 0;
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate();
  const dailyAverage = monthTotal / Math.max(now.getDate(), 1);
  const remaining = Math.max(budget - monthTotal, 0);

  document.querySelector("#currentMonthLabel").textContent = now.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
  document.querySelector("#todayTotal").textContent = formatMoney(todayTotal);
  document.querySelector("#todayCount").textContent = `${todayExpenses.length} ${todayExpenses.length === 1 ? "entry" : "entries"}`;
  document.querySelector("#monthTotal").textContent = formatMoney(monthTotal);
  document.querySelector("#budgetStatus").textContent = `${Math.round(progress)}% of budget`;
  document.querySelector("#topCategory").textContent = top ? top[0] : "None";
  document.querySelector("#topCategoryAmount").textContent = top ? formatMoney(top[1]) : "₹0";
  document.querySelector("#dailyAverage").textContent = formatMoney(dailyAverage);
  document.querySelector("#remainingBudget").textContent = formatMoney(remaining);
  document.querySelector("#daysLeft").textContent = daysLeft;
  document.querySelector("#progressPercent").textContent = `${Math.round(progress)}%`;
  document.querySelector("#progressRing").style.background = `conic-gradient(var(--green) ${progress * 3.6}deg, #eadfce 0deg)`;
  document.querySelector("#paceMessage").textContent = getPaceMessage(progress, daysLeft);
  budgetOutput.textContent = formatMoney(budget);
  budgetFill.style.width = `${progress}%`;

  renderPersonalTable(visibleExpenses);
  drawChart(grouped);
}

function renderPersonalTable(rows) {
  tableBody.innerHTML = rows
    .map(
      (expense) => `
        <tr>
          <td>${formatDate(expense.date)}</td>
          <td>${escapeHtml(expense.description)}</td>
          <td><span class="pill" style="background:${hexToSoft(categories[expense.category])}">${expense.category}</span></td>
          <td>${expense.method}</td>
          <td class="amount-cell">${formatMoney(expense.amount)}</td>
          <td><button class="row-action" type="button" data-id="${expense.id}" title="Delete expense" aria-label="Delete expense">x</button></td>
        </tr>
      `,
    )
    .join("");

  emptyState.classList.toggle("is-visible", rows.length === 0);
}

function renderGroups() {
  renderGroupSelector();
  const group = getActiveGroup();

  if (!group) {
    document.querySelector("#groupTotal").textContent = "₹0";
    document.querySelector("#groupExpenseCount").textContent = "0 expenses";
    document.querySelector("#memberCount").textContent = "0";
    document.querySelector("#activeGroupName").textContent = "No group selected";
    document.querySelector("#highestPaidName").textContent = "None";
    document.querySelector("#highestPaidAmount").textContent = "₹0";
    document.querySelector("#splitPerPerson").textContent = "₹0";
    groupPaidByInput.innerHTML = "";
    splitMembers.innerHTML = "";
    groupExpenseTable.innerHTML = "";
    balancesList.innerHTML = '<p class="empty-state is-visible">Create a group to begin.</p>';
    groupEmptyState.classList.add("is-visible");
    drawGroupChart({});
    return;
  }

  const total = sum(group.expenses);
  const memberCount = group.members.length;
  const paidTotals = paidByMember(group);
  const topPaid = Object.entries(paidTotals).sort((a, b) => b[1] - a[1])[0];

  document.querySelector("#groupTotal").textContent = formatMoney(total);
  document.querySelector("#groupExpenseCount").textContent = `${group.expenses.length} ${group.expenses.length === 1 ? "expense" : "expenses"}`;
  document.querySelector("#memberCount").textContent = memberCount;
  document.querySelector("#activeGroupName").textContent = group.name;
  document.querySelector("#highestPaidName").textContent = topPaid ? getMemberName(group, topPaid[0]) : "None";
  document.querySelector("#highestPaidAmount").textContent = topPaid ? formatMoney(topPaid[1]) : "₹0";
  document.querySelector("#splitPerPerson").textContent = memberCount ? formatMoney(total / memberCount) : "₹0";

  groupPaidByInput.innerHTML = group.members.map((member) => `<option value="${member.id}">${escapeHtml(member.name)}</option>`).join("");
  splitMembers.innerHTML = group.members
    .map(
      (member) => `
        <label class="check-pill">
          <input type="checkbox" value="${member.id}" checked />
          <span>${escapeHtml(member.name)}</span>
        </label>
      `,
    )
    .join("");

  renderGroupExpenseTable(group);
  renderBalances(group);
  drawGroupChart(groupByCategory(group.expenses));
}

function renderGroupSelector() {
  activeGroupSelect.innerHTML =
    groups.length === 0
      ? '<option value="">No groups yet</option>'
      : groups.map((group) => `<option value="${group.id}">${escapeHtml(group.name)}</option>`).join("");
  activeGroupSelect.value = activeGroupId || groups[0]?.id || "";
}

function renderGroupExpenseTable(group) {
  groupExpenseTable.innerHTML = group.expenses
    .map((expense) => {
      const splitNames = expense.participantIds.map((id) => getMemberName(group, id)).join(", ");
      return `
        <tr>
          <td>${formatDate(expense.date)}</td>
          <td>${escapeHtml(expense.description)}</td>
          <td><span class="pill" style="background:${hexToSoft(categories[expense.category || "Other"] || categories.Other)}">${escapeHtml(expense.category || "Other")}</span></td>
          <td>${escapeHtml(getMemberName(group, expense.paidBy))}</td>
          <td>${escapeHtml(splitNames)}</td>
          <td class="amount-cell">${formatMoney(expense.amount)}</td>
          <td><button class="row-action" type="button" data-id="${expense.id}" title="Delete group expense" aria-label="Delete group expense">x</button></td>
        </tr>
      `;
    })
    .join("");

  groupEmptyState.classList.toggle("is-visible", group.expenses.length === 0);
}

function renderBalances(group) {
  const settlements = calculateSettlements(group);

  if (!group.members.length) {
    balancesList.innerHTML = '<p class="empty-state is-visible">Add people to this group.</p>';
    return;
  }

  if (!settlements.length) {
    balancesList.innerHTML = '<p class="settled-message">All settled. No one owes anything right now.</p>';
    return;
  }

  balancesList.innerHTML = settlements
    .map(
      (item) => `
        <div class="balance-item">
          <span>${escapeHtml(getMemberName(group, item.from))} owes ${escapeHtml(getMemberName(group, item.to))}</span>
          <strong>${formatMoney(item.amount)}</strong>
        </div>
      `,
    )
    .join("");
}

function calculateSettlements(group) {
  const balances = Object.fromEntries(group.members.map((member) => [member.id, 0]));

  group.expenses.forEach((expense) => {
    const participants = expense.participantIds.filter((id) => balances[id] !== undefined);
    if (!participants.length || balances[expense.paidBy] === undefined) return;

    balances[expense.paidBy] += expense.amount;
    const share = expense.amount / participants.length;
    participants.forEach((id) => {
      balances[id] -= share;
    });
  });

  const debtors = Object.entries(balances)
    .filter(([, amount]) => amount < -0.5)
    .map(([id, amount]) => ({ id, amount: Math.abs(amount) }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = Object.entries(balances)
    .filter(([, amount]) => amount > 0.5)
    .map(([id, amount]) => ({ id, amount }))
    .sort((a, b) => b.amount - a.amount);
  const settlements = [];

  while (debtors.length && creditors.length) {
    const debtor = debtors[0];
    const creditor = creditors[0];
    const amount = Math.min(debtor.amount, creditor.amount);
    settlements.push({ from: debtor.id, to: creditor.id, amount });
    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount <= 0.5) debtors.shift();
    if (creditor.amount <= 0.5) creditors.shift();
  }

  return settlements;
}

function drawGroupChart(grouped) {
  drawBarChart({
    context: groupCtx,
    targetCanvas: groupCanvas,
    grouped,
    emptyText: "Add group expenses with categories to build this dashboard.",
  });
}

function drawChart(grouped) {
  drawBarChart({
    context: ctx,
    targetCanvas: canvas,
    grouped,
    emptyText: "Add expenses to build your category chart.",
  });
}

function drawBarChart({ context, targetCanvas, grouped, emptyText }) {
  const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  const pixelRatio = window.devicePixelRatio || 1;
  const width = targetCanvas.clientWidth * pixelRatio;
  const height = targetCanvas.clientHeight * pixelRatio;
  targetCanvas.width = width;
  targetCanvas.height = height;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, targetCanvas.clientWidth, targetCanvas.clientHeight);

  if (!entries.length) {
    context.fillStyle = "#66706c";
    context.font = "700 16px Inter, sans-serif";
    context.fillText(emptyText, 24, 48);
    return;
  }

  const chartWidth = targetCanvas.clientWidth - 48;
  const barHeight = 30;
  const gap = 18;
  const max = Math.max(...entries.map(([, amount]) => amount));

  entries.forEach(([category, amount], index) => {
    const y = 32 + index * (barHeight + gap);
    const barWidth = Math.max((amount / max) * (chartWidth - 130), 8);

    context.fillStyle = "#efe7da";
    roundedRect(context, 24, y, chartWidth - 120, barHeight, 8);
    context.fill();

    context.fillStyle = categories[category] || categories.Other;
    roundedRect(context, 24, y, barWidth, barHeight, 8);
    context.fill();

    context.fillStyle = "#18211f";
    context.font = "800 13px Inter, sans-serif";
    context.fillText(category, 30, y - 8);
    context.textAlign = "right";
    context.fillText(formatMoney(amount), targetCanvas.clientWidth - 24, y + 21);
    context.textAlign = "left";
  });
}

function getVisibleExpenses() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedCategory = categoryFilter.value;

  return expenses.filter((expense) => {
    const matchesCategory = selectedCategory === "All" || expense.category === selectedCategory;
    const matchesQuery = [expense.description, expense.category, expense.method, expense.date]
      .join(" ")
      .toLowerCase()
      .includes(query);
    return matchesCategory && matchesQuery;
  });
}

function getCurrentMonthExpenses(rows) {
  const now = new Date();
  return rows.filter((expense) => {
    const date = new Date(`${expense.date}T00:00:00`);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
}

function groupByCategory(rows) {
  return rows.reduce((acc, expense) => {
    const category = expense.category || "Other";
    acc[category] = (acc[category] || 0) + expense.amount;
    return acc;
  }, {});
}

function paidByMember(group) {
  return group.expenses.reduce((acc, expense) => {
    acc[expense.paidBy] = (acc[expense.paidBy] || 0) + expense.amount;
    return acc;
  }, {});
}

function getActiveGroup() {
  return groups.find((group) => group.id === activeGroupId) || groups[0];
}

function getMemberName(group, memberId) {
  return group.members.find((member) => member.id === memberId)?.name || "Unknown";
}

async function refreshGroupsFromCloud(preferredGroupId = activeGroupId) {
  if (!USE_SUPABASE_GROUPS) return;

  groups = await fetchCloudGroups();
  activeGroupId = groups.some((group) => group.id === preferredGroupId) ? preferredGroupId : groups[0]?.id || "";
  saveGroups();
  renderGroups();
}

async function fetchCloudGroups() {
  const [groupRows, memberRows, expenseRows, participantRows] = await Promise.all([
    supabaseRequest("groups?select=*&order=created_at.desc"),
    supabaseRequest("group_members?select=*&order=created_at.asc"),
    supabaseRequest("group_expenses?select=*&order=created_at.desc"),
    supabaseRequest("group_expense_participants?select=*"),
  ]);

  const membersByGroup = memberRows.reduce((acc, row) => {
    acc[row.group_id] ||= [];
    acc[row.group_id].push({ id: row.id, name: row.name });
    return acc;
  }, {});

  const participantsByExpense = participantRows.reduce((acc, row) => {
    acc[row.expense_id] ||= [];
    acc[row.expense_id].push(row.member_id);
    return acc;
  }, {});

  const expensesByGroup = expenseRows.reduce((acc, row) => {
    acc[row.group_id] ||= [];
    acc[row.group_id].push({
      id: row.id,
      description: row.description,
      amount: Number(row.amount),
      category: row.category || "Other",
      paidBy: row.paid_by,
      participantIds: participantsByExpense[row.id] || [],
      date: row.expense_date,
    });
    return acc;
  }, {});

  return groupRows.map((row) => ({
    id: row.id,
    name: row.name,
    members: membersByGroup[row.id] || [],
    expenses: expensesByGroup[row.id] || [],
  }));
}

async function createCloudGroup(name) {
  const rows = await supabaseRequest("groups", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ name }),
  });
  return rows[0];
}

async function createCloudMember(groupId, name) {
  const rows = await supabaseRequest("group_members", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ group_id: groupId, name }),
  });
  return { id: rows[0].id, name: rows[0].name };
}

async function createCloudGroupExpense(groupId, expense) {
  const rows = await supabaseRequest("group_expenses", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      group_id: groupId,
      description: expense.description,
      category: expense.category || "Other",
      amount: expense.amount,
      paid_by: expense.paidBy,
      expense_date: expense.date,
    }),
  });
  const cloudExpense = rows[0];
  const participantRows = expense.participantIds.map((memberId) => ({
    expense_id: cloudExpense.id,
    member_id: memberId,
  }));

  await supabaseRequest("group_expense_participants", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(participantRows),
  });
}

async function deleteCloudGroupExpense(expenseId) {
  await supabaseRequest(`group_expenses?id=eq.${encodeURIComponent(expenseId)}`, {
    method: "DELETE",
  });
}

async function clearCloudGroupExpenses(groupId) {
  await supabaseRequest(`group_expenses?group_id=eq.${encodeURIComponent(groupId)}`, {
    method: "DELETE",
  });
}

async function deleteCloudGroup(groupId) {
  await supabaseRequest(`groups?id=eq.${encodeURIComponent(groupId)}`, {
    method: "DELETE",
  });
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${SUPABASE_REST_URL}/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Supabase request failed with ${response.status}`);
  }

  if (response.status === 204) return [];
  const text = await response.text();
  return text ? JSON.parse(text) : [];
}

function savePersonalExpenses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function saveGroups() {
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `expense-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toCsv(rows) {
  const header = ["Date", "Description", "Category", "Method", "Amount"];
  const body = rows.map((expense) =>
    [expense.date, expense.description, expense.category, expense.method, expense.amount]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(","),
  );
  return [header.join(","), ...body].join("\n");
}

function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function sum(rows) {
  return rows.reduce((total, expense) => total + Number(expense.amount), 0);
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function todayISO() {
  return dateToISO(new Date());
}

function offsetISO(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateToISO(date);
}

function dateToISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPaceMessage(progress, daysLeft) {
  if (progress === 0) return "Start adding expenses to see your monthly pace.";
  if (progress < 45) return "You are spending calmly this month. Nice and steady.";
  if (progress < 80) return "You are in the active zone. Keep an eye on bigger spends.";
  if (daysLeft > 5) return "Budget is getting tight. Small cuts now will help.";
  return "Month-end mode. Track only what truly matters.";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[char];
  });
}

function hexToSoft(hex) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0.14)`;
}

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

window.addEventListener("resize", () => {
  drawChart(groupByCategory(getCurrentMonthExpenses(expenses)));
  drawGroupChart(groupByCategory(getActiveGroup()?.expenses || []));
});

renderPersonal();
renderGroups();
refreshGroupsFromCloud().catch((error) => {
  console.error(error);
  alert("Could not load shared groups from Supabase. Check that you ran the SQL schema in Supabase.");
});
