import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { formatCurrency } from '../../utils/format';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import Input from '../../components/Input/Input';
import LoadingSpinner from '../../components/Loading/LoadingSpinner';
import DepartmentSelector from '../../components/DepartmentSelector/DepartmentSelector';
import CreateSheetModal from './CreateSheetModal';
import AccountingSheetView from './AccountingSheetView';
import './Accounting.css';

const MONTH_NAMES = ['', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

const Accounting = () => {
  const [activeTab, setActiveTab] = useState('list');
  const [sheets, setSheets] = useState([]);
  const [sheetData, setSheetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [departmentId, setDepartmentId] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const loadSheets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (year) params.set('year', year);
      if (month) params.set('month', month);
      if (departmentId) params.set('department_id', departmentId);
      const res = await apiClient.get(`${API_ENDPOINTS.ACCOUNTING_SHEETS}?${params}`);
      if (res.data?.ok) {
        setSheets(res.data.data?.items || []);
      }
    } catch (e) {
      console.error(e);
      setSheets([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSheet = async (sheetId) => {
    setLoading(true);
    try {
      const res = await apiClient.get(API_ENDPOINTS.ACCOUNTING_SHEET(sheetId));
      if (res.data?.ok) {
        setSheetData(res.data.data);
        setActiveTab('sheet');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSheets();
  }, [year, month, departmentId]);

  const handleCreateSheet = async (payload) => {
    const res = await apiClient.post(API_ENDPOINTS.ACCOUNTING_SHEETS, payload);
    if (res.data?.ok) {
      setCreateModalOpen(false);
      loadSheet(res.data.data.id);
    } else {
      const err = new Error(res.data?.error?.message || 'Ошибка создания листа');
      err.response = res;
      throw err;
    }
  };

  const handleBackToList = () => {
    setActiveTab('list');
    setSheetData(null);
    loadSheets();
  };

  const sheetLabel = sheetData?.sheet
    ? `${sheetData.sheet.department_name} — ${MONTH_NAMES[sheetData.sheet.month]} ${sheetData.sheet.year}`
    : '';

  return (
    <Layout>
      <div className="accounting-page">
        <div className="accounting-header">
          <h1 className="accounting-title">Бухгалтерия</h1>
          <p className="accounting-subtitle">Денежные листы и учёт операций по отделам</p>
        </div>

        <div className="accounting-tabs">
          <button
            type="button"
            className={`accounting-tab ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            Листы
          </button>
          {sheetData && (
            <button
              type="button"
              className={`accounting-tab ${activeTab === 'sheet' ? 'active' : ''}`}
              onClick={() => setActiveTab('sheet')}
            >
              {sheetLabel}
            </button>
          )}
        </div>

        {activeTab === 'list' && (
          <>
            <Card className="accounting-filters">
              <div className="accounting-filters-grid">
                <div className="form-group">
                  <label className="input-label">Год</label>
                  <select
                    className="select"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value, 10))}
                  >
                    {[2023, 2024, 2025, 2026].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="input-label">Месяц</label>
                  <select
                    className="select"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <option key={m} value={String(m)}>{MONTH_NAMES[m]}</option>
                    ))}
                  </select>
                </div>
                <DepartmentSelector
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  label="Отдел"
                  showAll
                />
                <div className="accounting-filters-actions">
                  <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
                    + Создать лист
                  </Button>
                </div>
              </div>
            </Card>

            {loading ? (
              <Card><LoadingSpinner size="medium" text="Загрузка листов..." /></Card>
            ) : sheets.length === 0 ? (
              <Card>
                <div className="accounting-empty">
                  <p>Нет денежных листов за выбранный период.</p>
                  <Button variant="primary" onClick={() => setCreateModalOpen(true)}>Создать первый лист</Button>
                </div>
              </Card>
            ) : (
              <Card title="Листы">
                <div className="accounting-sheets-list">
                  {sheets.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="accounting-sheet-item"
                      onClick={() => loadSheet(s.id)}
                    >
                      <span className="sheet-item-name">{s.department_name}</span>
                      <span className="sheet-item-period">{MONTH_NAMES[s.month]} {s.year}</span>
                    </button>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {activeTab === 'sheet' && sheetData && (
          <>
            <div className="accounting-sheet-toolbar">
              <Button variant="secondary" size="small" onClick={handleBackToList}>← Назад к списку</Button>
            </div>
            {loading ? (
              <Card><LoadingSpinner size="medium" text="Загрузка листа..." /></Card>
            ) : (
              <AccountingSheetView sheetData={sheetData} onReload={() => loadSheet(sheetData.sheet.id)} />
            )}
          </>
        )}

        {createModalOpen && (
          <CreateSheetModal
            isOpen
            onClose={() => setCreateModalOpen(false)}
            onSuccess={handleCreateSheet}
          />
        )}
      </div>
    </Layout>
  );
};

export default Accounting;
