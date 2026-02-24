import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import CRMLayout from '../../components/CRMLayout/CRMLayout';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import './CRM.css';

const CRMProspects = () => {
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [listSearch, setListSearch] = useState('');
  const [listFilterSource, setListFilterSource] = useState('');
  const [listFilterContact, setListFilterContact] = useState('');
  const [listFilterLead, setListFilterLead] = useState('');
  const [listSort, setListSort] = useState('created_desc');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', address: '', phone: '', website: '', notes: '' });

  const loadProspects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(API_ENDPOINTS.CRM_SEARCH_PROSPECTS);
      if (res.data?.items) setProspects(res.data.items);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProspects();
  }, [loadProspects]);

  const filteredProspects = useMemo(() => {
    let list = [...prospects];
    const q = (listSearch || '').trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.address || '').toLowerCase().includes(q) ||
          (p.phone || '').toLowerCase().includes(q) ||
          (p.website || '').toLowerCase().includes(q) ||
          (p.notes || '').toLowerCase().includes(q)
      );
    }
    if (listFilterSource) {
      list = list.filter((p) => (p.source || '').toLowerCase() === listFilterSource.toLowerCase());
    }
    if (listFilterContact === 'has_phone') list = list.filter((p) => !!p.phone);
    if (listFilterContact === 'has_website') list = list.filter((p) => !!p.website || !!p.map_2gis_url);
    if (listFilterContact === 'no_contact') list = list.filter((p) => !p.phone && !p.website && !p.map_2gis_url);
    if (listFilterLead === 'in_leads') list = list.filter((p) => p.lead_status_id != null);
    if (listFilterLead === 'not_in_leads') list = list.filter((p) => p.lead_status_id == null);
    if (listSort === 'name_asc') list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (listSort === 'name_desc') list.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    if (listSort === 'created_desc') list.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
    if (listSort === 'created_asc') list.sort((a, b) => (a.created_at || 0) - (b.created_at || 0));
    return list;
  }, [prospects, listSearch, listFilterSource, listFilterContact, listFilterLead, listSort]);

  const openEdit = (p) => {
    setEditingId(p.id);
    setEditForm({ name: p.name || '', address: p.address || '', phone: p.phone || '', website: p.website || '', notes: p.notes || '' });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      const res = await apiClient.patch(API_ENDPOINTS.CRM_SEARCH_PROSPECT(editingId), editForm);
      if (res.data?.data) {
        setProspects((prev) => prev.map((x) => (x.id === editingId ? { ...x, ...res.data.data } : x)));
        setEditingId(null);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Ошибка');
    }
  };

  const deleteProspect = async (id) => {
    if (!window.confirm('Удалить?')) return;
    try {
      await apiClient.delete(API_ENDPOINTS.CRM_SEARCH_PROSPECT(id));
      setProspects((prev) => prev.filter((x) => x.id !== id));
      if (editingId === id) setEditingId(null);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Ошибка');
    }
  };

  const toLead = async (p) => {
    if (p.lead_status_id != null) return;
    setError(null);
    try {
      const res = await apiClient.post(API_ENDPOINTS.CRM_PROSPECT_TO_LEAD(p.id));
      if (res.data?.data) {
        setProspects((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...res.data.data } : x)));
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Ошибка');
    }
  };

  return (
    <CRMLayout>
      <div className="crm-page crm-prospects-page">
        <div className="crm-prospects-header">
          <h2>Холодная база</h2>
          <p className="crm-prospects-desc">Садики, найденные поиском. Фильтруйте, переносите в лиды.</p>
        </div>

        <div className="crm-prospect-list-toolbar">
          <div className="crm-prospect-list-search">
            <input
              type="search"
              placeholder="Поиск по названию, адресу, телефону..."
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              className="crm-prospect-list-search-input"
            />
          </div>
          <div className="crm-prospect-list-filters">
            <select
              value={listFilterSource}
              onChange={(e) => setListFilterSource(e.target.value)}
              className="crm-prospect-list-filter-select"
              title="Источник"
            >
              <option value="">Все источники</option>
              <option value="web_search">Web Search</option>
              <option value="spravker">Spravker</option>
            </select>
            <select
              value={listFilterContact}
              onChange={(e) => setListFilterContact(e.target.value)}
              className="crm-prospect-list-filter-select"
              title="Контакты"
            >
              <option value="">Любой контакт</option>
              <option value="has_phone">Есть телефон</option>
              <option value="has_website">Есть сайт</option>
              <option value="no_contact">Нет контакта</option>
            </select>
            <select
              value={listFilterLead}
              onChange={(e) => setListFilterLead(e.target.value)}
              className="crm-prospect-list-filter-select"
              title="Лид"
            >
              <option value="">Все</option>
              <option value="in_leads">В лидах</option>
              <option value="not_in_leads">Не в лидах</option>
            </select>
            <select
              value={listSort}
              onChange={(e) => setListSort(e.target.value)}
              className="crm-prospect-list-filter-select"
              title="Сортировка"
            >
              <option value="created_desc">Сначала новые</option>
              <option value="created_asc">Сначала старые</option>
              <option value="name_asc">По названию А–Я</option>
              <option value="name_desc">По названию Я–А</option>
            </select>
          </div>
          <div className="crm-prospect-list-stats">
            Показано {filteredProspects.length} из {prospects.length}
          </div>
        </div>

        {loading ? (
          <p className="crm-empty">Загрузка...</p>
        ) : prospects.length === 0 ? (
          <p className="crm-empty">Нет записей. Запустите поиск на странице «Поиск».</p>
        ) : filteredProspects.length === 0 ? (
          <p className="crm-empty">Ничего не найдено по заданным фильтрам.</p>
        ) : (
          <ul className="crm-prospect-list">
            {filteredProspects.map((p) => (
              <li key={p.id} className="crm-prospect-card">
                <div className="crm-prospect-card-body">
                  <div className="crm-prospect-card-main">
                    <h3 className="crm-prospect-card-name">{p.name || '—'}</h3>
                    {p.address && <p className="crm-prospect-card-address">{p.address}</p>}
                    {p.notes && <p className="crm-prospect-card-notes">{p.notes}</p>}
                  </div>
                  <div className="crm-prospect-card-actions">
                    {p.phone && (
                      <a href={`tel:${p.phone}`} className="crm-prospect-action crm-prospect-action-phone" title="Позвонить">
                        📞 {p.phone}
                      </a>
                    )}
                    {(p.website || p.map_2gis_url) && (
                      <a
                        href={p.website || p.map_2gis_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="crm-prospect-action"
                        title="Сайт"
                      >
                        🌐 Сайт
                      </a>
                    )}
                    {p.lead_status_id == null && (
                      <button type="button" className="crm-prospect-btn-to-lead" onClick={() => toLead(p)} title="Перенести в лид">
                        📋 В лид
                      </button>
                    )}
                    {p.lead_status_id != null && (
                      <Link to="/crm/leads" className="crm-prospect-action crm-prospect-in-leads" title="Открыть в канбане лидов">
                        В лидах
                      </Link>
                    )}
                    <button type="button" className="crm-prospect-btn-edit" onClick={() => openEdit(p)} title="Редактировать">
                      ✏️
                    </button>
                    <button type="button" className="crm-prospect-btn-delete" onClick={() => deleteProspect(p.id)} title="Удалить">
                      🗑
                    </button>
                  </div>
                </div>
                {!p.phone && !p.website && <div className="crm-prospect-card-badge crm-prospect-badge-nocontact">Нет контакта</div>}
              </li>
            ))}
          </ul>
        )}

        {error && <div className="crm-search-error">{error}</div>}
      </div>

      {editingId && (
        <div className="crm-prospect-modal-overlay" onClick={() => setEditingId(null)}>
          <div className="crm-prospect-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Редактирование</h3>
            <div className="crm-prospect-modal-fields">
              <label>Название</label>
              <input type="text" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} placeholder="Название" />
              <label>Адрес</label>
              <input type="text" value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} placeholder="Адрес" />
              <label>Телефон</label>
              <input type="text" value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+7..." />
              <label>Сайт</label>
              <input type="url" value={editForm.website} onChange={(e) => setEditForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://..." />
              <label>Заметки</label>
              <textarea value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Заметки" rows={3} />
            </div>
            <div className="crm-prospect-modal-buttons">
              <button type="button" className="crm-prospect-modal-btn-save" onClick={saveEdit}>Сохранить</button>
              <button type="button" className="crm-prospect-modal-btn-cancel" onClick={() => setEditingId(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </CRMLayout>
  );
};

export default CRMProspects;
