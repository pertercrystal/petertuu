(() => {
  'use strict';

  const KEY = 'moneyflow-v3';
  const LOAN_CATEGORY = 'Loan';
  const REPAYMENT_CATEGORY = 'Loan repayment';

  const readState = () => {
    try {
      const state = JSON.parse(localStorage.getItem(KEY) || '{}');
      state.transactions = Array.isArray(state.transactions) ? state.transactions : [];
      state.categories = Array.isArray(state.categories) ? state.categories : [];
      state.loans = Array.isArray(state.loans) ? state.loans : [];
      state.settings = state.settings || {};
      return state;
    } catch (_) {
      return { transactions: [], categories: [], loans: [], settings: {} };
    }
  };

  const saveState = (state) => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
  };
  const number = (value) => Number(String(value ?? '').replace(/,/g, '')) || 0;
  const id = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const normalizeCategory = (value) => String(value || '').trim().toLowerCase();
  const isLoanCategory = (value) => normalizeCategory(value) === 'loan';
  const isRepaymentCategory = (value) => ['loan repayment', 'loan payback'].includes(normalizeCategory(value));
  const remaining = (loan) => Math.max(0, number(loan.remaining ?? loan.balance));

  const addLoanCategoryOption = () => {
    const select = document.querySelector('#categoryForm select[name="categoryType"]');
    if (!select || [...select.options].some((option) => option.value === 'loan')) return;
    const option = document.createElement('option');
    option.value = 'loan';
    option.textContent = 'Loan';
    select.appendChild(option);
  };

  const syncLoanCategoryType = (form) => {
    const category = form?.querySelector('select[name="category"]');
    const type = form?.querySelector('select[name="type"]');
    if (category && type && isLoanCategory(category.value)) type.value = 'income';
  };

  const populateRepaymentLoans = (form) => {
    const select = form?.querySelector('select[name="loanId"]');
    if (!select) return;
    const loans = readState().loans.filter((loan) => remaining(loan) > 0);
    select.innerHTML = loans.length
      ? loans.map((loan) => `<option value="${String(loan.id).replace(/"/g, '&quot;')}">${String(loan.name || 'Loan').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))} · ${Math.round(remaining(loan)).toLocaleString()} MMK</option>`).join('')
      : '<option value="">No active loans</option>';
  };

  const saveLoanReceipt = (form) => {
    const state = readState();
    const category = form.querySelector('select[name="category"]')?.value || LOAN_CATEGORY;
    const amount = number(form.querySelector('input[name="amount"]')?.value);
    const date = form.querySelector('input[name="date"]')?.value || new Date().toISOString().slice(0, 10);
    const note = form.querySelector('input[name="note"]')?.value?.trim() || 'Loan';
    if (amount <= 0) return false;

    const loanId = id('loan');
    state.loans.push({
      id: loanId,
      name: note,
      principal: amount,
      remaining: amount,
      balance: amount,
      paid: 0,
      date,
      note,
      createdAt: new Date().toISOString()
    });
    state.transactions.push({
      id: id('tx'),
      type: 'income',
      category,
      amount,
      date,
      note,
      loanId,
      loanType: 'loan',
      createdAt: new Date().toISOString()
    });
    saveState(state);
    window.location.reload();
    return true;
  };

  const saveRepayment = (form) => {
    const state = readState();
    const loanId = form.querySelector('select[name="loanId"]')?.value || '';
    const amount = number(form.querySelector('input[name="repaymentAmount"]')?.value || form.querySelector('input[name="amount"]')?.value);
    const loan = state.loans.find((item) => String(item.id) === String(loanId));
    if (!loan || amount <= 0 || amount > remaining(loan)) return false;

    const date = form.querySelector('input[name="date"]')?.value || new Date().toISOString().slice(0, 10);
    const note = form.querySelector('input[name="note"]')?.value?.trim() || `Repayment - ${loan.name || 'Loan'}`;
    const nextRemaining = Math.max(0, remaining(loan) - amount);
    loan.remaining = nextRemaining;
    loan.balance = nextRemaining;
    loan.paid = number(loan.paid) + amount;

    state.transactions.push({
      id: id('tx'),
      type: 'expense',
      category: REPAYMENT_CATEGORY,
      amount,
      date,
      note,
      loanId: loan.id,
      loanType: 'payback',
      createdAt: new Date().toISOString()
    });
    saveState(state);
    window.location.reload();
    return true;
  };

  const bindDynamicForm = (form) => {
    if (!form || form.dataset.loanLogicBound === 'true') return;
    form.dataset.loanLogicBound = 'true';
    populateRepaymentLoans(form);
    form.addEventListener('change', () => syncLoanCategoryType(form));
  };

  const init = () => {
    addLoanCategoryOption();
    document.querySelectorAll('#transactionForm').forEach(bindDynamicForm);

    document.addEventListener('click', (event) => {
      const repaymentTab = event.target.closest('.transaction-tab[data-mode="repayment"]');
      if (repaymentTab) {
        const form = document.getElementById('transactionForm');
        bindDynamicForm(form);
        populateRepaymentLoans(form);
      }
    });

    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (!form || form.id !== 'transactionForm') return;
      bindDynamicForm(form);
      const activeMode = form.querySelector('.transaction-tab.active')?.dataset.mode || 'standard';
      const category = form.querySelector('select[name="category"]')?.value || '';

      if (activeMode === 'repayment') {
        event.preventDefault();
        event.stopImmediatePropagation();
        saveRepayment(form);
        return;
      }

      if (isLoanCategory(category)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        saveLoanReceipt(form);
      }
    }, true);

    window.addEventListener('moneyflow:state-updated', () => {
      populateRepaymentLoans(document.getElementById('transactionForm'));
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
