import React from 'react';
import Modal from '../Modal/Modal';
import Button from '../Button/Button';
import { formatDate, formatCurrency } from '../../utils/format';
import './InvoiceModal.css';

const InvoiceModal = ({ isOpen, onClose, branchName, lessons, month }) => {
  if (!isOpen || !lessons || lessons.length === 0) return null;

  // Группируем занятия по датам и считаем итоги
  const totalPaid = lessons.reduce((sum, l) => sum + (l.paid_children || 0), 0);
  const totalTrial = lessons.reduce((sum, l) => sum + (l.trial_children || 0), 0);
  const totalRevenue = lessons.reduce((sum, l) => sum + (l.revenue || 0), 0);

  // Форматируем месяц
  const monthDate = month ? new Date(month + '-01') : new Date();
  const monthName = monthDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

  // Формируем текст счета
  const invoiceText = `Уважаемые коллеги!

Предоставляем счёт за проведённые занятия по робототехнике в ${branchName} за ${monthName}.

Детализация занятий:

${lessons.map((lesson, index) => {
  const date = new Date(lesson.starts_at);
  const dateStr = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const paid = lesson.paid_children || 0;
  const trial = lesson.trial_children || 0;
  const revenue = lesson.revenue || 0;
  
  return `${index + 1}. ${dateStr} в ${timeStr}
   - Платных детей: ${paid}
   - Пробных детей: ${trial}
   - Сумма: ${formatCurrency(revenue)}`;
}).join('\n\n')}

Итого за период:
- Платных детей: ${totalPaid}
- Пробных детей: ${totalTrial}
- Итоговая сумма: ${formatCurrency(totalRevenue)}

С уважением,
IT Клуб`;

  const handleCopy = () => {
    navigator.clipboard.writeText(invoiceText).then(() => {
      alert('Текст счёта скопирован в буфер обмена');
    }).catch(() => {
      alert('Не удалось скопировать текст');
    });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Счёт - ${branchName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
            h1 { color: #1f2937; }
            .invoice-header { margin-bottom: 30px; }
            .invoice-details { margin: 20px 0; }
            .invoice-item { margin: 15px 0; padding: 10px; background: #f9fafb; border-radius: 4px; }
            .invoice-total { margin-top: 30px; padding: 20px; background: #f0f9ff; border-radius: 4px; font-weight: bold; }
            .invoice-signature { margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <h1>Счёт за занятия по робототехнике</h1>
            <p><strong>Филиал:</strong> ${branchName}</p>
            <p><strong>Период:</strong> ${monthName}</p>
          </div>
          
          <div class="invoice-details">
            <p>Уважаемые коллеги!</p>
            <p>Предоставляем счёт за проведённые занятия по робототехнике в ${branchName} за ${monthName}.</p>
            
            <h2>Детализация занятий:</h2>
            ${lessons.map((lesson, index) => {
              const date = new Date(lesson.starts_at);
              const dateStr = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
              const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
              const paid = lesson.paid_children || 0;
              const trial = lesson.trial_children || 0;
              const revenue = lesson.revenue || 0;
              
              return `
                <div class="invoice-item">
                  <strong>${index + 1}. ${dateStr} в ${timeStr}</strong><br>
                  - Платных детей: ${paid}<br>
                  - Пробных детей: ${trial}<br>
                  - Сумма: ${formatCurrency(revenue)}
                </div>
              `;
            }).join('')}
          </div>
          
          <div class="invoice-total">
            <h2>Итого за период:</h2>
            <p>Платных детей: ${totalPaid}</p>
            <p>Пробных детей: ${totalTrial}</p>
            <p>Итоговая сумма: ${formatCurrency(totalRevenue)}</p>
          </div>
          
          <div class="invoice-signature">
            <p>С уважением,<br><strong>IT Клуб</strong></p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Счёт для ${branchName}`}
      size="large"
    >
      <div className="invoice-modal">
        <div className="invoice-content">
          <div className="invoice-header">
            <p><strong>Филиал:</strong> {branchName}</p>
            <p><strong>Период:</strong> {monthName}</p>
          </div>

          <div className="invoice-text">
            <p>Уважаемые коллеги!</p>
            <p>Предоставляем счёт за проведённые занятия по робототехнике в <strong>{branchName}</strong> за <strong>{monthName}</strong>.</p>

            <h3>Детализация занятий:</h3>
            <div className="invoice-lessons">
              {lessons.map((lesson, index) => {
                const date = new Date(lesson.starts_at);
                const dateStr = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                const paid = lesson.paid_children || 0;
                const trial = lesson.trial_children || 0;
                const revenue = lesson.revenue || 0;

                return (
                  <div key={lesson.id || index} className="invoice-lesson-item">
                    <div className="invoice-lesson-header">
                      <strong>{index + 1}. {dateStr} в {timeStr}</strong>
                    </div>
                    <div className="invoice-lesson-details">
                      <span>Платных детей: <strong>{paid}</strong></span>
                      <span>Пробных детей: <strong>{trial}</strong></span>
                      <span>Сумма: <strong>{formatCurrency(revenue)}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="invoice-total">
              <h3>Итого за период:</h3>
              <div className="invoice-total-items">
                <div className="invoice-total-item">
                  <span>Платных детей:</span>
                  <strong>{totalPaid}</strong>
                </div>
                <div className="invoice-total-item">
                  <span>Пробных детей:</span>
                  <strong>{totalTrial}</strong>
                </div>
                <div className="invoice-total-item invoice-total-sum">
                  <span>Итоговая сумма:</span>
                  <strong>{formatCurrency(totalRevenue)}</strong>
                </div>
              </div>
            </div>

            <div className="invoice-signature">
              <p>С уважением,<br /><strong>IT Клуб</strong></p>
            </div>
          </div>
        </div>

        <div className="invoice-actions">
          <Button variant="secondary" onClick={handleCopy}>
            📋 Копировать текст
          </Button>
          <Button variant="primary" onClick={handlePrint}>
            🖨️ Печать
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default InvoiceModal;
