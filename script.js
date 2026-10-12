const checklistStorageKey = "samina-home:checklists:v1";
const budgetStorageKey = "samina-home:budget:v1";
const taskInputs = [...document.querySelectorAll("[data-task]")];
const budgetInputs = [...document.querySelectorAll("[data-budget-field]")];
const statusMessage = document.querySelector("#save-status");
const shekelFormatter = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 0,
});

function showSaveStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("is-error", isError);
}

function readSavedJson(key) {
  const savedValue = localStorage.getItem(key);
  if (savedValue === null) {
    return null;
  }

  try {
    return JSON.parse(savedValue);
  } catch (error) {
    throw new Error(`הנתונים המקומיים אינם תקינים (${error.message}).`);
  }
}

function updateChecklistProgress() {
  const checkedTasks = taskInputs.filter((input) => input.checked).length;
  const percent = taskInputs.length === 0 ? 0 : Math.round((checkedTasks / taskInputs.length) * 100);
  document.querySelector("#completed-count").textContent = String(checkedTasks);
  document.querySelector("#total-count").textContent = String(taskInputs.length);
  document.querySelector("#checklist-progress").textContent = `${percent}%`;

  for (const checklist of document.querySelectorAll("[data-checklist]")) {
    const key = checklist.dataset.checklist;
    const inputs = [...checklist.querySelectorAll("[data-task]")];
    const completed = inputs.filter((input) => input.checked).length;
    const label = document.querySelector(`[data-progress-label="${key}"]`);
    const bar = document.querySelector(`[data-progress-bar="${key}"]`);
    label.textContent = `${completed} מתוך ${inputs.length} משימות`;
    bar.style.width = `${inputs.length === 0 ? 0 : (completed / inputs.length) * 100}%`;
  }
}

function saveChecklists() {
  const completedIds = taskInputs.filter((input) => input.checked).map((input) => input.dataset.task);
  try {
    localStorage.setItem(checklistStorageKey, JSON.stringify(completedIds));
    showSaveStatus("ההתקדמות נשמרה בדפדפן הזה.");
  } catch (error) {
    showSaveStatus(`לא ניתן לשמור את סימוני הצ׳קליסט בדפדפן. ${error.message}`, true);
  }
  updateChecklistProgress();
}

function restoreChecklists() {
  try {
    const completedIds = readSavedJson(checklistStorageKey);
    if (completedIds === null) {
      return;
    }
    if (!Array.isArray(completedIds) || completedIds.some((id) => typeof id !== "string")) {
      throw new Error("רשימת המשימות השמורה אינה בפורמט הצפוי.");
    }

    const completed = new Set(completedIds);
    for (const input of taskInputs) {
      input.checked = completed.has(input.dataset.task);
    }
  } catch (error) {
    showSaveStatus(`לא הצלחנו לטעון את הצ׳קליסט השמור. ${error.message}`, true);
  }
}

function renderBudget() {
  const values = Object.fromEntries(
    budgetInputs.map((input) => [input.dataset.budgetField, Math.max(0, Number(input.value) || 0)]),
  );
  const availableFunds = values.salePrice - values.mortgageBalance + values.savings;
  document.querySelector("#estimated-funds").textContent = shekelFormatter.format(availableFunds);

  const hint = document.querySelector("#budget-hint");
  if (values.targetPrice > 0 && (values.salePrice > 0 || values.savings > 0)) {
    const gap = values.targetPrice - availableFunds;
    hint.textContent = gap > 0
      ? `פער משוער מול מחיר היעד: ${shekelFormatter.format(gap)} — לפני מסים ועלויות עסקה.`
      : `המקורות שהזנתם מכסים את מחיר היעד — לפני מסים ועלויות עסקה.`;
  } else if (values.salePrice > 0 || values.savings > 0 || values.mortgageBalance > 0) {
    hint.textContent = "הערכה ראשונית בלבד. מלאו גם מחיר יעד כדי לראות את הפער.";
  } else {
    hint.textContent = "הוסיפו סכומים כדי לראות הערכה.";
  }
}

function saveBudget() {
  const values = Object.fromEntries(
    budgetInputs.map((input) => [input.dataset.budgetField, input.value]),
  );
  try {
    localStorage.setItem(budgetStorageKey, JSON.stringify(values));
    if (statusMessage.textContent === "" || !statusMessage.classList.contains("is-error")) {
      showSaveStatus("הנתונים נשמרו בדפדפן הזה.");
    }
  } catch (error) {
    showSaveStatus(`לא ניתן לשמור את נתוני התקציב בדפדפן. ${error.message}`, true);
  }
  renderBudget();
}

function restoreBudget() {
  try {
    const values = readSavedJson(budgetStorageKey);
    if (values === null) {
      return;
    }
    if (
      typeof values !== "object" ||
      Array.isArray(values) ||
      budgetInputs.some((input) => values[input.dataset.budgetField] !== undefined && !/^\d*(?:\.\d+)?$/.test(values[input.dataset.budgetField]))
    ) {
      throw new Error("נתוני התקציב השמורים אינם בפורמט הצפוי.");
    }

    for (const input of budgetInputs) {
      input.value = values[input.dataset.budgetField] ?? "";
    }
  } catch (error) {
    showSaveStatus(`לא הצלחנו לטעון את התקציב השמור. ${error.message}`, true);
  }
}

restoreChecklists();
restoreBudget();
updateChecklistProgress();
renderBudget();

for (const input of taskInputs) {
  input.addEventListener("change", saveChecklists);
}

for (const input of budgetInputs) {
  input.addEventListener("input", saveBudget);
}
