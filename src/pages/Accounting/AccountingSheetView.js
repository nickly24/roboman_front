import React, { useState } from 'react';
import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import { formatCurrency } from '../../utils/format';
import { calcReferralAmount, calcIncomeNet } from '../../utils/incomeCalc';
import AddIncomeModal from './AddIncomeModal';
import AddSalaryModal from './AddSalaryModal';
import AddExpenseModal from './AddExpenseModal';
import AddTransferModal from './AddTransferModal';
import OperationDetailModal from './OperationDetailModal';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';

const MONTH_NAMES = ['', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

const OperationCard = ({ op, type, onSelect, isTransferIn }) => {
  const labels = {
    income: { short: 'Поступление', cls: 'op-income', sign: '+' },
    salary: { short: 'Зарплата', cls: 'op-salary', sign: '−' },
    expense: { short: 'Расход', cls: 'op-expense', sign: '−' },
    transfer: { short: 'Перевод', cls: 'op-transfer', sign: '' },
  };
  const l = labels[type] || {};
  let title = l.short;
  let sub = '';
  let extra = null;
  if (type === 'income') {
    title = op.branch_name || 'Поступление';
    sub = op.owner_name;
    const tax = parseFloat(op.tax_amount) || 0;
    const referral = calcReferralAmount(op);
    const costs = tax + referral;
    const profit = calcIncomeNet(op);
    extra = (
      <span className="op-card-extra">
        издержки {formatCurrency(costs)} · прибыль {formatCurrency(profit)}
      </span>
    );
  } else if (type === 'salary') {
    title = `${op.owner_name} → ${op.teacher_name}`;
    sub = op.period_type === '1_15' ? '1–15' : op.period_type === '16_end' ? '16–конец' : 'месяц';
  } else if (type === 'expense') {
    title = op.name;
    sub = op.owner_name;
  } else if (type === 'transfer') {
    title = isTransferIn ? `← ${op.from_owner_name}` : `${op.from_owner_name} → ${op.to_owner_name}`;
  }
  const isNegative = type === 'salary' || type === 'expense' || (type === 'transfer' && !isTransferIn);
  return (
    <button
      type="button"
      className={`accounting-op-card ${l.cls}`}
      onClick={() => onSelect(op, type)}
    >
      <span className="op-card-title">{title}</span>
      {sub && <span className="op-card-sub">{sub}</span>}
      {extra}
      <span className={`op-card-amount ${isNegative ? 'negative' : 'positive'}`}>
        {isNegative ? '−' : '+'}{formatCurrency(op.amount)}
      </span>
    </button>
  );
};

const AccountingSheetView = ({ sheetData, onReload }) => {
  const [addType, setAddType] = useState(null);
  const [detailOp, setDetailOp] = useState(null);
  const [detailType, setDetailType] = useState(null);

  const { sheet, owners, branches, teachers, incomes, salaries, expenses, transfers, summary } = sheetData || {};
  if (!sheet) return null;

  const monthLabel = `${MONTH_NAMES[sheet.month]} ${sheet.year}`;

  const handleAdd = async (payload, type) => {
    const url = type === 'income' ? API_ENDPOINTS.ACCOUNTING_INCOMES(sheet.id)
      : type === 'salary' ? API_ENDPOINTS.ACCOUNTING_SALARIES(sheet.id)
      : type === 'expense' ? API_ENDPOINTS.ACCOUNTING_EXPENSES(sheet.id)
      : API_ENDPOINTS.ACCOUNTING_TRANSFERS(sheet.id);
    await apiClient.post(url, payload);
    setAddType(null);
    onReload();
  };

  const handleDelete = async (op, type) => {
    if (!window.confirm('Удалить запись?')) return;
    const url = type === 'income' ? API_ENDPOINTS.ACCOUNTING_INCOME(op.id)
      : type === 'salary' ? API_ENDPOINTS.ACCOUNTING_SALARY(op.id)
      : type === 'expense' ? API_ENDPOINTS.ACCOUNTING_EXPENSE(op.id)
      : API_ENDPOINTS.ACCOUNTING_TRANSFER(op.id);
    await apiClient.delete(url);
    setDetailOp(null);
    setDetailType(null);
    onReload();
  };

  const ownerBalances = summary?.owner_balances || [];

  return (
    <div className="accounting-sheet-view">
      <div className="sheet-view-header">
        <h2 className="sheet-view-title">
          {sheet.department_name} — {monthLabel}
        </h2>
        <div className="sheet-view-actions">
          <Button size="small" variant="secondary" onClick={() => setAddType('income')}>+ Поступление</Button>
          <Button size="small" variant="secondary" onClick={() => setAddType('salary')}>+ Зарплата</Button>
          <Button size="small" variant="secondary" onClick={() => setAddType('expense')}>+ Расход</Button>
          <Button size="small" variant="secondary" onClick={() => setAddType('transfer')}>+ Перевод</Button>
        </div>
      </div>

      <div className="sheet-timeline-scroll">
        <div className="sheet-timeline">
          {ownerBalances.map((ob) => {
            const ownerIncomes = (incomes || []).filter((i) => String(i.owner_id) === String(ob.owner_id));
            const ownerSalaries = (salaries || []).filter((s) => String(s.owner_id) === String(ob.owner_id));
            const ownerExpenses = (expenses || []).filter((e) => String(e.owner_id) === String(ob.owner_id));
            const ownerTransfersOut = (transfers || []).filter((t) => String(t.from_owner_id) === String(ob.owner_id));
            const ownerTransfersIn = (transfers || []).filter((t) => String(t.to_owner_id) === String(ob.owner_id));

            return (
              <div key={ob.owner_id} className="owner-row">
                <div className="owner-row-label">
                  <span className="owner-name">{ob.owner_name}</span>
                  <span className="owner-balance">{formatCurrency(ob.balance)}</span>
                </div>
                <div className="owner-row-ops">
                  {ownerIncomes.map((op) => (
                    <OperationCard key={`i-${op.id}`} op={op} type="income" onSelect={(o, t) => { setDetailOp(o); setDetailType(t); }} />
                  ))}
                  {ownerSalaries.map((op) => (
                    <OperationCard key={`s-${op.id}`} op={op} type="salary" onSelect={(o, t) => { setDetailOp(o); setDetailType(t); }} />
                  ))}
                  {ownerExpenses.map((op) => (
                    <OperationCard key={`e-${op.id}`} op={op} type="expense" onSelect={(o, t) => { setDetailOp(o); setDetailType(t); }} />
                  ))}
                  {ownerTransfersOut.map((op) => (
                    <OperationCard key={`to-${op.id}`} op={op} type="transfer" onSelect={(o, t) => { setDetailOp(o); setDetailType(t); }} />
                  ))}
                  {ownerTransfersIn.map((op) => (
                    <OperationCard key={`ti-${op.id}`} op={op} type="transfer" isTransferIn onSelect={(o, t) => { setDetailOp(o); setDetailType(t); }} />
                  ))}
                  {ownerIncomes.length === 0 && ownerSalaries.length === 0 && ownerExpenses.length === 0 && ownerTransfersOut.length === 0 && ownerTransfersIn.length === 0 && (
                    <span className="owner-row-empty">Нет операций</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {summary && (
        <Card className="sheet-summary-card" title="Сводка">
          <div className="sheet-summary-grid">
            <div className="summary-item">
              <span className="summary-label">Выручка</span>
              <span className="summary-value">{formatCurrency(summary.revenue)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Издержки (налог + реф.)</span>
              <span className="summary-value summary-costs">{formatCurrency(summary.costs)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Расходы</span>
              <span className="summary-value summary-expenses">{formatCurrency(summary.expenses)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Прибыль</span>
              <span className={`summary-value ${summary.profit >= 0 ? 'summary-profit' : 'summary-loss'}`}>
                {formatCurrency(summary.profit)}
              </span>
            </div>
            {!summary.balances_equal && summary.discrepancy > 0 && (
              <div className="summary-item summary-discrepancy">
                <span className="summary-label">Расхождение (к переводу)</span>
                <span className="summary-value">{formatCurrency(summary.discrepancy)}</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {addType === 'income' && (
        <AddIncomeModal
          isOpen
          onClose={() => setAddType(null)}
          onSuccess={(p) => handleAdd(p, 'income')}
          sheet={sheet}
          branches={branches}
          owners={owners}
        />
      )}
      {addType === 'salary' && (
        <AddSalaryModal
          isOpen
          onClose={() => setAddType(null)}
          onSuccess={(p) => handleAdd(p, 'salary')}
          sheet={sheet}
          owners={owners}
          teachers={teachers}
        />
      )}
      {addType === 'expense' && (
        <AddExpenseModal
          isOpen
          onClose={() => setAddType(null)}
          onSuccess={(p) => handleAdd(p, 'expense')}
          owners={owners}
        />
      )}
      {addType === 'transfer' && (
        <AddTransferModal
          isOpen
          onClose={() => setAddType(null)}
          onSuccess={(p) => handleAdd(p, 'transfer')}
          owners={owners}
        />
      )}

      {detailOp && detailType && (
        <OperationDetailModal
          isOpen
          onClose={() => { setDetailOp(null); setDetailType(null); }}
          operation={detailOp}
          type={detailType}
          onDelete={(op) => handleDelete(op, detailType)}
        />
      )}
    </div>
  );
};

export default AccountingSheetView;
