(() => {
  'use strict';

  const STORAGE_KEY = 'moneyflow-v3';

  const readState = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (_) {
      return {};
    }
  };

  const saveState = (state) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      // Ignore storage failures.
    }
  };

  const num = (value) => Number(String(value ?? '').replace(/,/g, '')) || 0;

  const injectSettingsStyles = () => {
    if (document.getElementById('settings-live-fixes')) return;

    const style = document.createElement('style');
    style.id = 'settings-live-fixes';
    style.textContent = `
      #settings select,
      #settings input,
      #settings textarea,
      #settings .stack-form input,
      #settings .stack-form select {
        width: 100%;
        min-height: 42px;
        padding: 0 12px;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: var(--surface-solid);
        color: var(--text);
        color-scheme: inherit;
        outline: none;
      }

      body.dark #settings select,
      body.dark #settings input,
      body.dark #settings textarea,
      body.dark #settings .stack-form input,
      body.dark #settings .stack-form select {
        background: rgba(7, 11, 22, 0.72);
        color: var(--text);
      }

      #settings select option {
        background: var(--surface-solid);
        color: var(--text);
      }

      body.dark #settings select option {
        background: #0d1424;
        color: #f2f6ff;
      }

      .settings-action-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
      }

      .settings-action-row button,
      .settings-inline-action {
        appearance: none;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: rgba(148, 163, 184, 0.08);
        color: var(--text);
        padding: 0 12px;
        min-height: 36px;
        cursor: pointer;
        transition: border-color 0.18s ease, transform 0.12s ease;
      }

      .settings-action-row button:hover,
      .settings-inline-action:hover {
        border-color: rgba(79, 140, 255, 0.5);
      }

      .settings-action-row button:active,
      .settings-inline-action:active {
        transform: translateY(1px);
      }
    `;
    document.head.appendChild(style);
  };

  const updateSelectedBudget = (selectedValue) => {
    const state = readState();
    const budgets = Array.isArray(state.budgets) ? state.budgets : [];
    const item = budgets.find((row) => String(row.id) === String(selectedValue));
    if (!item) return;

    const nextCategory = window.prompt('Edit budget category', item.category || '');
    if (nextCategory === null) return;

    const nextMonth = window.prompt('Edit budget month (YYYY-MM)', item.month || '');
    if (nextMonth === null) return;

    const nextAmount = window.prompt('Edit budget amount', String(item.amount ?? 0));
    if (nextAmount === null) return;

    const cleanCategory = String(nextCategory).trim();
    const cleanMonth = String(nextMonth).trim();
    const cleanAmount = num(nextAmount);

    if (!cleanCategory || !/^\\d{4}-\\d{2}$/.test(cleanMonth) || cleanAmount <= 0) {
      return;
    }

    item.category = cleanCategory;
    item.month = cleanMonth;
    item.amount = cleanAmount;

    saveState(state);
    window.location.reload();
  };

  const updateSelectedCategory = (selectedValue) => {
    const state = readState();
    const categories = Array.isArray(state.categories) ? state.categories : [];
    const item = categories.find((row) => String(row.id) === String(selectedValue));
    if (!item) return;

    const nextName = window.prompt('Edit category name', item.name || '');
    if (nextName === null) return;

    const nextType = window.prompt('Edit category type (income or expense)', item.type || 'expense');
    if (nextType === null) return;

    const cleanName = String(nextName).trim();
    const cleanType = String(nextType).trim().toLowerCase();

    if (!cleanName || !['income', 'expense'].includes(cleanType)) return;

    item.name = cleanName;
    item.type = cleanType;

    saveState(state);
    window.location.reload();
  };

  const attachSettingsActions = () => {
    const settingsPage = document.getElementById('settings');
    if (!settingsPage) return;

    injectSettingsStyles();

    const budgetForm = document.getElementById('budgetForm');
    if (budgetForm && !budgetForm.dataset.runtimeHooked) {
      budgetForm.dataset.runtimeHooked = 'true';

      const activeValue = budgetForm.querySelector('#budgetCategory')?.value || '';
      const buttonRow = document.createElement('div');
      buttonRow.className = 'settings-action-row';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.textContent = 'Edit selected budget';
      editBtn.addEventListener('click', () => {
        const selected = budgetForm.querySelector('#budgetCategory')?.value || '';
        if (selected) updateSelectedBudget(selected);
      });

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.textContent = 'Delete selected budget';
      removeBtn.addEventListener('click', () => {
        const state = readState();
        const budgets = Array.isArray(state.budgets) ? state.budgets : [];
        const selected = budgetForm.querySelector('#budgetCategory')?.value || '';
        const target = budgets.find((row) => String(row.id) === String(selected));
        if (!target) return;

        const confirmDelete = window.confirm(`Delete budget "${target.category || 'this item'}"?`);
        if (!confirmDelete) return;

        state.budgets = budgets.filter((row) => String(row.id) !== String(selected));
        saveState(state);
        window.location.reload();
      });

      buttonRow.appendChild(editBtn);
      buttonRow.appendChild(removeBtn);
      budgetForm.appendChild(buttonRow);
    }

    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm && !categoryForm.dataset.runtimeHooked) {
      categoryForm.dataset.runtimeHooked = 'true';

      const buttonRow = document.createElement('div');
      buttonRow.className = 'settings-action-row';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.textContent = 'Edit selected category';
      editBtn.addEventListener('click', () => {
        const selected = categoryForm.querySelector('input[name="categoryName"]')?.value || '';
        const state = readState();
        const categories = Array.isArray(state.categories) ? state.categories : [];
        const item = categories.find((row) => String(row.name).toLowerCase() === String(selected).trim().toLowerCase());
        if (item) {
          updateSelectedCategory(item.id);
        }
      });

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.textContent = 'Delete selected category';
      removeBtn.addEventListener('click', () => {
        const state = readState();
        const selected = categoryForm.querySelector('input[name="categoryName"]')?.value || '';
        const categories = Array.isArray(state.categories) ? state.categories : [];
        const target = categories.find((row) => String(row.name).toLowerCase() === String(selected).trim().toLowerCase());

        if (!target) return;

        const confirmDelete = window.confirm(`Delete category "${target.name || 'this item'}"?`);
        if (!confirmDelete) return;

        state.categories = categories.filter((row) => String(row.id) !== String(target.id));
        saveState(state);
        window.location.reload();
      });

      buttonRow.appendChild(editBtn);
      buttonRow.appendChild(removeBtn);
      categoryForm.appendChild(buttonRow);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachSettingsActions, { once: true });
  } else {
    attachSettingsActions();
  }
})();
