const checklistStorageKey = "samina-home:checklists:v1";
const budgetStorageKey = "samina-home:budget:v1";
const brokerSettingsStorageKey = "samina-home:broker-settings:v1";
const taskInputs = [...document.querySelectorAll("[data-task]")];
const budgetInputs = [...document.querySelectorAll("[data-budget-field]")];
const brokerFeeRateInput = document.querySelector("#broker-fee-rate");
const brokerVatRateInput = document.querySelector("#broker-vat-rate");
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

  renderBrokerFees(values);
}

function renderBrokerFees(budgetValues = getBudgetValues()) {
  const feeRate = Math.min(100, Math.max(0, Number(brokerFeeRateInput.value) || 0)) / 100;
  const vatRate = Math.min(100, Math.max(0, Number(brokerVatRateInput.value) || 0)) / 100;
  const saleFee = budgetValues.salePrice * feeRate * (1 + vatRate);
  const purchaseFee = budgetValues.targetPrice * feeRate * (1 + vatRate);
  document.querySelector("#sale-broker-fee").textContent = shekelFormatter.format(saleFee);
  document.querySelector("#purchase-broker-fee").textContent = shekelFormatter.format(purchaseFee);
  document.querySelector("#total-broker-fee").textContent = shekelFormatter.format(saleFee + purchaseFee);
}

function getBudgetValues() {
  return Object.fromEntries(
    budgetInputs.map((input) => [input.dataset.budgetField, Math.max(0, Number(input.value) || 0)]),
  );
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

function restoreBrokerSettings() {
  try {
    const settings = readSavedJson(brokerSettingsStorageKey);
    if (settings === null) {
      return;
    }
    for (const [input, key] of [[brokerFeeRateInput, "feeRate"], [brokerVatRateInput, "vatRate"]]) {
      if (settings[key] !== undefined) {
        const value = Number(settings[key]);
        if (!Number.isFinite(value) || value < 0 || value > 100) {
          throw new Error("הגדרות המחשבון השמורות מחוץ לטווח.");
        }
        input.value = String(value);
      }
    }
  } catch (error) {
    showSaveStatus(`לא הצלחנו לטעון את הגדרות מחשבון התיווך. ${error.message}`, true);
  }
}

function saveBrokerSettings() {
  const settings = {
    feeRate: brokerFeeRateInput.value,
    vatRate: brokerVatRateInput.value,
  };
  try {
    localStorage.setItem(brokerSettingsStorageKey, JSON.stringify(settings));
  } catch (error) {
    showSaveStatus(`לא ניתן לשמור את הגדרות מחשבון התיווך בדפדפן. ${error.message}`, true);
  }
  renderBrokerFees();
}

restoreChecklists();
restoreBudget();
restoreBrokerSettings();
updateChecklistProgress();
renderBudget();

for (const input of taskInputs) {
  input.addEventListener("change", saveChecklists);
}

for (const input of budgetInputs) {
  input.addEventListener("input", saveBudget);
}

for (const input of [brokerFeeRateInput, brokerVatRateInput]) {
  input.addEventListener("input", saveBrokerSettings);
}
