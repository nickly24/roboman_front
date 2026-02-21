import React from 'react';
import Modal from '../../components/Modal/Modal';
import Button from '../../components/Button/Button';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { calcReferralAmount, calcIncomeNet } from '../../utils/incomeCalc';

const OperationDetailModal = ({ isOpen, onClose, operation, type, onDelete }) => {
  if (!operation) return null;

  const renderContent = () => {
    if (type === 'income') {
      const tax = parseFloat(operation.tax_amount) || 0;
      const referral = calcReferralAmount(operation);
      const costs = tax + referral;
      const profit = calcIncomeNet(operation);
      return (
        <div className="operation-detail">
          <dl>
            <dt>Филиал</dt>
            <dd>{operation.branch_name}</dd>
            <dt>Владелец</dt>
            <dd>{operation.owner_name}</dd>
            <dt>Сумма</dt>
            <dd className="amount-positive">{formatCurrency(operation.amount)}</dd>
            <dt>Издержки (налог + реф.)</dt>
            <dd className="amount-negative">{formatCurrency(costs)}</dd>
            <dt>Налог</dt>
            <dd>{formatCurrency(operation.tax_amount)}</dd>
            {operation.referral_percent != null && operation.referral_percent > 0 && (
              <>
                <dt>Рефералка</dt>
                <dd>
                  {operation.referral_percent}% = {formatCurrency(referral)}
                  {operation.referral_comment ? ` — ${operation.referral_comment}` : ''}
                </dd>
              </>
            )}
            <dt>Прибыль</dt>
            <dd className="amount-positive">{formatCurrency(profit)}</dd>
            <dt>Создано</dt>
            <dd>{formatDateTime(operation.created_at)}</dd>
          </dl>
        </div>
      );
    }
    if (type === 'salary') {
      return (
        <div className="operation-detail">
          <dl>
            <dt>Кто платит</dt>
            <dd>{operation.owner_name}</dd>
            <dt>Преподаватель</dt>
            <dd>{operation.teacher_name}</dd>
            <dt>Период</dt>
            <dd>{operation.period_type === '1_15' ? '1–15 число' : operation.period_type === '16_end' ? '16–конец' : 'Весь месяц'}</dd>
            <dt>Сумма</dt>
            <dd className="amount-negative">{formatCurrency(operation.amount)}</dd>
            <dt>Создано</dt>
            <dd>{formatDateTime(operation.created_at)}</dd>
          </dl>
        </div>
      );
    }
    if (type === 'expense') {
      return (
        <div className="operation-detail">
          <dl>
            <dt>Кто потратил</dt>
            <dd>{operation.owner_name}</dd>
            <dt>Описание</dt>
            <dd>{operation.name}</dd>
            <dt>Сумма</dt>
            <dd className="amount-negative">{formatCurrency(operation.amount)}</dd>
            <dt>Создано</dt>
            <dd>{formatDateTime(operation.created_at)}</dd>
          </dl>
        </div>
      );
    }
    if (type === 'transfer') {
      return (
        <div className="operation-detail">
          <dl>
            <dt>От кого</dt>
            <dd>{operation.from_owner_name}</dd>
            <dt>Кому</dt>
            <dd>{operation.to_owner_name}</dd>
            <dt>Сумма</dt>
            <dd>{formatCurrency(operation.amount)}</dd>
            <dt>Создано</dt>
            <dd>{formatDateTime(operation.created_at)}</dd>
          </dl>
        </div>
      );
    }
    return null;
  };

  const titles = { income: 'Поступление', salary: 'Зарплата', expense: 'Прочий расход', transfer: 'Перевод' };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={titles[type] || 'Операция'} size="small">
      {renderContent()}
      <div className="modal-actions">
        {onDelete && (
          <Button variant="danger" onClick={() => { onDelete(operation); onClose(); }}>Удалить</Button>
        )}
        <Button variant="secondary" onClick={onClose}>Закрыть</Button>
      </div>
    </Modal>
  );
};

export default OperationDetailModal;
