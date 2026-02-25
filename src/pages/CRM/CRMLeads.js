import React, { useState, useEffect, useCallback } from 'react';
import CRMLayout from '../../components/CRMLayout/CRMLayout';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import './CRM.css';

const CRMLeads = () => {
  const [leads, setLeads] = useState([]);
  const [archive, setArchive] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [viewMode, setViewMode] = useState('kanban');
  const [selectedLead, setSelectedLead] = useState(null);
  const [createLeadModal, setCreateLeadModal] = useState(false);
  const [createLeadForm, setCreateLeadForm] = useState({ name: '', address: '', phone: '', website: '', notes: '' });
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [archiveComment, setArchiveComment] = useState('');
  const [createBranchForm, setCreateBranchForm] = useState({ department_id: '', price_per_child: '' });
  const [statusModal, setStatusModal] = useState(null);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusOrder, setNewStatusOrder] = useState(50);
  const [isEditingContacts, setIsEditingContacts] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', address: '', phone: '', website: '', notes: '' });

  const loadLeads = useCallback(async () => {
    try {
      const [rLeads, rStatuses, rArchive] = await Promise.all([
        apiClient.get(API_ENDPOINTS.CRM_LEADS),
        apiClient.get(API_ENDPOINTS.CRM_LEAD_STATUSES),
        apiClient.get(API_ENDPOINTS.CRM_LEADS_ARCHIVE),
      ]);
      if (rLeads.data?.items) setLeads(rLeads.data.items);
      if (rStatuses.data?.items) setStatuses(rStatuses.data.items);
      if (rArchive.data?.items) setArchive(rArchive.data.items);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const loadDepartments = useCallback(async () => {
    try {
      const r = await apiClient.get(API_ENDPOINTS.DEPARTMENTS);
      setDepartments(r.data?.data?.items || r.data?.items || []);
    } catch (_) {}
  }, []);

  const openLead = (lead) => {
    setSelectedLead(lead);
    setCommentText('');
    setArchiveComment('');
    setCreateBranchForm({ department_id: '', price_per_child: '' });
    setIsEditingContacts(false);
    setEditForm({ name: '', address: '', phone: '', website: '', notes: '' });
    if (lead) {
      setEditForm({ name: lead.name || '', address: lead.address || '', phone: lead.phone || '', website: lead.website || '', notes: lead.notes || '' });
      apiClient.get(API_ENDPOINTS.CRM_PROSPECT_COMMENTS(lead.id)).then((r) => {
        if (r.data?.items) setComments(r.data.items);
      }).catch(() => setComments([]));
      apiClient.get(API_ENDPOINTS.CRM_PROSPECT_HISTORY(lead.id)).then((r) => {
        if (r.data?.items) setHistory(r.data.items);
      }).catch(() => setHistory([]));
      const coopStatus = statuses.find((s) => s.name === 'Сотрудничество');
      if (coopStatus && lead.lead_status_id === coopStatus.id) loadDepartments();
    } else {
      setComments([]);
      setHistory([]);
    }
  };

  const getStatusName = (id) => (id != null ? statuses.find((s) => s.id === id)?.name : null) || '—';

  const changeStatus = async (leadId, newStatusId) => {
    setError(null);
    try {
      const res = await apiClient.patch(API_ENDPOINTS.CRM_SEARCH_PROSPECT(leadId), { lead_status_id: newStatusId });
      if (res.data?.data) {
        setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, ...res.data.data } : l)));
        if (selectedLead?.id === leadId) setSelectedLead((l) => (l ? { ...l, lead_status_id: newStatusId } : null));
        apiClient.get(API_ENDPOINTS.CRM_PROSPECT_HISTORY(leadId)).then((r) => {
          if (r.data?.items) setHistory(r.data.items);
        });
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Ошибка');
    }
  };

  const saveLeadContacts = async () => {
    if (!selectedLead) return;
    setError(null);
    try {
      const res = await apiClient.patch(API_ENDPOINTS.CRM_SEARCH_PROSPECT(selectedLead.id), {
        name: editForm.name || undefined,
        address: editForm.address || undefined,
        phone: editForm.phone || undefined,
        website: editForm.website || undefined,
        notes: editForm.notes || undefined,
      });
      if (res.data?.data) {
        setLeads((prev) => prev.map((l) => (l.id === selectedLead.id ? { ...l, ...res.data.data } : l)));
        setSelectedLead((l) => (l && l.id === selectedLead.id ? { ...l, ...res.data.data } : l));
        setEditForm({ name: res.data.data.name || '', address: res.data.data.address || '', phone: res.data.data.phone || '', website: res.data.data.website || '', notes: res.data.data.notes || '' });
        setIsEditingContacts(false);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Ошибка');
    }
  };

  const sendComment = async () => {
    if (!selectedLead || !commentText.trim()) return;
    setError(null);
    try {
      const res = await apiClient.post(API_ENDPOINTS.CRM_PROSPECT_COMMENTS(selectedLead.id), { message: commentText.trim() });
      if (res.data?.data) setComments((prev) => [...prev, res.data.data]);
      setCommentText('');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Ошибка');
    }
  };

  const archiveLead = async () => {
    if (!selectedLead) return;
    setError(null);
    try {
      await apiClient.post(API_ENDPOINTS.CRM_LEAD_ARCHIVE(selectedLead.id), { comment: archiveComment });
      setLeads((prev) => prev.filter((l) => l.id !== selectedLead.id));
      setArchive((prev) => [{ ...selectedLead, archived_at: new Date().toISOString(), archive_comment: archiveComment }, ...prev]);
      openLead(null);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Ошибка');
    }
  };

  const restoreLead = async (lead) => {
    setError(null);
    try {
      await apiClient.post(API_ENDPOINTS.CRM_LEAD_RESTORE(lead.id));
      setArchive((prev) => prev.filter((l) => l.id !== lead.id));
      setLeads((prev) => [...prev, { ...lead, is_archived: 0, archived_at: null, archive_comment: null }]);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Ошибка');
    }
  };

  const createBranch = async () => {
    if (!selectedLead || !createBranchForm.department_id || !createBranchForm.price_per_child) return;
    setError(null);
    try {
      await apiClient.post(API_ENDPOINTS.CRM_LEAD_CREATE_BRANCH(selectedLead.id), {
        department_id: Number(createBranchForm.department_id),
        price_per_child: Number(createBranchForm.price_per_child),
        name: selectedLead.name,
        address: selectedLead.address,
      });
      const res = await apiClient.get(API_ENDPOINTS.CRM_LEADS);
      if (res.data?.items) {
        const updated = res.data.items.find((l) => l.id === selectedLead.id);
        if (updated) setSelectedLead(updated);
      }
      loadLeads();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Ошибка создания филиала');
    }
  };

  // В канбане не показываем колонку «Архив» — архив отдельной вкладкой
  const kanbanStatuses = (statuses || []).filter((s) => s.name !== 'Архив');
  const leadsByStatus = (statuses || []).reduce((acc, s) => {
    acc[s.id] = leads.filter((l) => l.lead_status_id === s.id);
    return acc;
  }, {});

  const cooperationStatusId = statuses.find((s) => s.name === 'Сотрудничество')?.id;
  const defaultInWorkStatusId = statuses.find((s) => s.name === 'Взят в работу')?.id;

  const getColumnColorClass = (status) => {
    if (!status?.name) return '';
    const n = status.name.trim();
    if (n === 'Отказ') return 'crm-leads-column--rejection';
    if (n === 'Взят в работу') return 'crm-leads-column--in-work';
    if (n === 'Сотрудничество') return 'crm-leads-column--cooperation';
    return '';
  };

  const handleCardDragStart = (e, lead) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ leadId: lead.id, statusId: lead.lead_status_id }));
    e.dataTransfer.effectAllowed = 'move';
    e.target.classList.add('crm-leads-card-dragging');
  };

  const handleCardDragEnd = (e) => {
    e.target.classList.remove('crm-leads-card-dragging');
  };

  const handleColumnDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('crm-leads-column-drop-target');
  };

  const handleColumnDragLeave = (e) => {
    e.currentTarget.classList.remove('crm-leads-column-drop-target');
  };

  const handleColumnDrop = (e, targetStatusId) => {
    e.preventDefault();
    e.currentTarget.classList.remove('crm-leads-column-drop-target');
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      const { leadId, statusId } = JSON.parse(raw);
      if (statusId === targetStatusId) return;
      changeStatus(leadId, targetStatusId);
    } catch (_) {}
  };

  const saveStatus = async () => {
    const name = (statusModal?.id ? statusModal.name : newStatusName)?.trim();
    const order = statusModal?.id ? Number(statusModal.sort_order) : Number(newStatusOrder);
    if (!name) return;
    setError(null);
    try {
      if (statusModal?.id) {
        await apiClient.patch(API_ENDPOINTS.CRM_LEAD_STATUS(statusModal.id), { name, sort_order: order });
      } else {
        await apiClient.post(API_ENDPOINTS.CRM_LEAD_STATUSES, { name, sort_order: order });
      }
      const r = await apiClient.get(API_ENDPOINTS.CRM_LEAD_STATUSES);
      if (r.data?.items) setStatuses(r.data.items);
      setStatusModal('list');
      setNewStatusName('');
      setNewStatusOrder(50);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Ошибка');
    }
  };

  const openCreateLead = () => {
    setCreateLeadForm({ name: '', address: '', phone: '', website: '', notes: '' });
    setCreateLeadModal(true);
  };

  const createLead = async () => {
    const name = (createLeadForm.name || '').trim();
    if (!name) {
      setError('Укажите название лида');
      return;
    }
    setError(null);
    try {
      await apiClient.post(API_ENDPOINTS.CRM_LEADS_MANUAL, {
        name,
        address: createLeadForm.address || undefined,
        phone: createLeadForm.phone || undefined,
        website: createLeadForm.website || undefined,
        notes: createLeadForm.notes || undefined,
        lead_status_id: defaultInWorkStatusId || undefined, // всегда «Взят в работу» по умолчанию
      });
      setCreateLeadModal(false);
      setCreateLeadForm({ name: '', address: '', phone: '', website: '', notes: '' });
      loadLeads();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Ошибка создания лида');
    }
  };

  const deleteStatus = async (id) => {
    setError(null);
    try {
      await apiClient.delete(API_ENDPOINTS.CRM_LEAD_STATUS(id));
      const r = await apiClient.get(API_ENDPOINTS.CRM_LEAD_STATUSES);
      if (r.data?.items) setStatuses(r.data.items);
      setStatusModal('list');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Ошибка');
    }
  };

  return (
    <CRMLayout>
      <div className="crm-page crm-leads-page">
        <div className="crm-leads-header">
          <h2>Лиды</h2>
          <p className="crm-leads-desc">Канбан по садикам из поиска. Перенести в лид можно со страницы «Поиск».</p>
        </div>

        <div className="crm-leads-tabs">
          <div className="crm-leads-tabs-left">
            <button type="button" className={viewMode === 'kanban' ? 'active' : ''} onClick={() => setViewMode('kanban')}>
              Канбан
            </button>
            <button type="button" className={viewMode === 'archive' ? 'active' : ''} onClick={() => setViewMode('archive')}>
              Архив ({archive.length})
            </button>
            <button type="button" className="crm-leads-btn-statuses" onClick={() => setStatusModal('list')}>
              Статусы
            </button>
          </div>
          <div className="crm-leads-tabs-right">
            <button type="button" className="crm-leads-btn-create-lead" onClick={openCreateLead}>
              + Создать лид
            </button>
          </div>
        </div>

        {error && <div className="crm-search-error">{error}</div>}

        {viewMode === 'archive' && (
          <div className="crm-leads-archive">
            {archive.length === 0 ? (
              <p className="crm-empty">В архиве пусто</p>
            ) : (
              <ul className="crm-leads-archive-list">
                {archive.map((l) => (
                  <li key={l.id} className="crm-leads-archive-card">
                    <div>
                      <strong>{l.name || '—'}</strong>
                      {l.archive_comment && <p className="crm-leads-archive-comment">{l.archive_comment}</p>}
                      {l.archived_at && <span className="crm-leads-archive-date">{new Date(l.archived_at).toLocaleString('ru')}</span>}
                    </div>
                    <button type="button" className="crm-leads-btn-restore" onClick={() => restoreLead(l)}>Восстановить</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {viewMode === 'kanban' && (
          <>
            {loading ? (
              <p className="crm-empty">Загрузка...</p>
            ) : (
              <div className="crm-leads-kanban">
                {kanbanStatuses.map((s) => (
                  <div
                    key={s.id}
                    className={`crm-leads-column ${getColumnColorClass(s)}`}
                  >
                    <h3 className="crm-leads-column-title">
                      {s.name} ({leadsByStatus[s.id]?.length || 0})
                      {s.is_system === 1 && <span className="crm-leads-status-system" title="Неудаляемый">🔒</span>}
                    </h3>
                    <div
                      className="crm-leads-column-cards"
                      onDragOver={handleColumnDragOver}
                      onDragLeave={handleColumnDragLeave}
                      onDrop={(e) => handleColumnDrop(e, s.id)}
                    >
                      {(leadsByStatus[s.id] || []).map((lead) => (
                        <div
                          key={lead.id}
                          className={`crm-leads-card ${selectedLead?.id === lead.id ? 'selected' : ''}`}
                          onClick={() => openLead(lead)}
                          draggable
                          onDragStart={(e) => handleCardDragStart(e, lead)}
                          onDragEnd={handleCardDragEnd}
                        >
                          <div className="crm-leads-card-name">{lead.name || '—'}</div>
                          {lead.address && <div className="crm-leads-card-address">{lead.address}</div>}
                          {lead.phone && <div className="crm-leads-card-phone">📞 {lead.phone}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {selectedLead && viewMode === 'kanban' && (
          <div className="crm-leads-card-modal-overlay" onClick={() => openLead(null)}>
            <div className="crm-leads-card-modal" onClick={(e) => e.stopPropagation()}>
              <div className="crm-leads-card-modal-header">
                <h2 className="crm-leads-card-modal-title">{selectedLead.name || '—'}</h2>
                <button type="button" className="crm-leads-card-modal-close" onClick={() => openLead(null)} aria-label="Закрыть">×</button>
              </div>
              <div className="crm-leads-card-modal-body">
                <section className="crm-leads-card-modal-block crm-leads-card-modal-block--contacts">
                  <div className="crm-leads-card-modal-block-head">
                    <h3 className="crm-leads-card-modal-block-title">Статус и контакты</h3>
                    {!isEditingContacts ? (
                      <button type="button" className="crm-leads-btn-edit-contacts" onClick={() => setIsEditingContacts(true)} title="Редактировать">✏️ Редактировать</button>
                    ) : (
                      <div className="crm-leads-card-modal-edit-actions">
                        <button type="button" className="crm-leads-btn-save-contacts" onClick={saveLeadContacts}>Сохранить</button>
                        <button type="button" className="crm-leads-btn-cancel-edit" onClick={() => { setIsEditingContacts(false); setEditForm({ name: selectedLead.name || '', address: selectedLead.address || '', phone: selectedLead.phone || '', website: selectedLead.website || '', notes: selectedLead.notes || '' }); }}>Отмена</button>
                      </div>
                    )}
                  </div>
                  {isEditingContacts ? (
                    <div className="crm-leads-card-modal-fields crm-leads-card-modal-fields--edit">
                      <div className="crm-leads-card-modal-field">
                        <label>Название</label>
                        <input type="text" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="crm-leads-card-modal-input" placeholder="Название" />
                      </div>
                      <div className="crm-leads-card-modal-field">
                        <label>Статус</label>
                        <select value={selectedLead.lead_status_id ?? ''} onChange={(e) => changeStatus(selectedLead.id, Number(e.target.value))} className="crm-leads-card-modal-select">
                          {statuses.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                        </select>
                      </div>
                      <div className="crm-leads-card-modal-field">
                        <label>Адрес</label>
                        <input type="text" value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} className="crm-leads-card-modal-input" placeholder="Адрес" />
                      </div>
                      <div className="crm-leads-card-modal-field">
                        <label>Телефон</label>
                        <input type="text" value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} className="crm-leads-card-modal-input" placeholder="+7..." />
                      </div>
                      <div className="crm-leads-card-modal-field">
                        <label>Сайт</label>
                        <input type="url" value={editForm.website} onChange={(e) => setEditForm((f) => ({ ...f, website: e.target.value }))} className="crm-leads-card-modal-input" placeholder="https://..." />
                      </div>
                      <div className="crm-leads-card-modal-field">
                        <label>Заметки</label>
                        <textarea value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} className="crm-leads-card-modal-textarea" rows={2} placeholder="Заметки" />
                      </div>
                    </div>
                  ) : (
                    <div className="crm-leads-card-modal-fields">
                      <div className="crm-leads-card-modal-field">
                        <label>Статус</label>
                        <select value={selectedLead.lead_status_id ?? ''} onChange={(e) => changeStatus(selectedLead.id, Number(e.target.value))} className="crm-leads-card-modal-select">
                          {statuses.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                        </select>
                      </div>
                      {(selectedLead.address || selectedLead.phone || selectedLead.website || selectedLead.map_2gis_url || selectedLead.notes) ? (
                        <>
                          {selectedLead.address && (
                            <div className="crm-leads-card-modal-field">
                              <label>Адрес</label>
                              <p className="crm-leads-card-modal-value">{selectedLead.address}</p>
                            </div>
                          )}
                          {selectedLead.phone && (
                            <div className="crm-leads-card-modal-field">
                              <label>Телефон</label>
                              <p className="crm-leads-card-modal-value"><a href={`tel:${selectedLead.phone}`} className="crm-leads-card-modal-link">{selectedLead.phone}</a></p>
                            </div>
                          )}
                          {(selectedLead.website || selectedLead.map_2gis_url) && (
                            <div className="crm-leads-card-modal-field">
                              <label>Сайт</label>
                              <p className="crm-leads-card-modal-value"><a href={selectedLead.website || selectedLead.map_2gis_url} target="_blank" rel="noopener noreferrer" className="crm-leads-card-modal-link">{selectedLead.website || selectedLead.map_2gis_url}</a></p>
                            </div>
                          )}
                          {selectedLead.notes && (
                            <div className="crm-leads-card-modal-field">
                              <label>Заметки</label>
                              <p className="crm-leads-card-modal-value crm-leads-card-modal-notes">{selectedLead.notes}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="crm-leads-card-modal-empty">Контактов нет</p>
                      )}
                    </div>
                  )}
                </section>

                <section className="crm-leads-card-modal-block crm-leads-card-modal-block--comments">
                  <h3 className="crm-leads-card-modal-block-title">Комментарии</h3>
                  <div className="crm-leads-comments-list crm-leads-comments-list--compact">
                    {comments.length === 0 ? (
                      <p className="crm-leads-card-modal-empty">Пока нет комментариев</p>
                    ) : (
                      comments.map((c) => (
                        <div key={c.id} className="crm-leads-comment">
                          <span className="crm-leads-comment-meta">{c.user_login || '—'} · {c.created_at ? new Date(c.created_at).toLocaleString('ru') : ''}</span>
                          <p className="crm-leads-comment-text">{c.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="crm-leads-comment-form crm-leads-comment-form--compact">
                    <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Добавить комментарий..." rows={2} className="crm-leads-card-modal-textarea crm-leads-card-modal-textarea--compact" />
                    <button type="button" className="crm-leads-btn-send-comment" onClick={sendComment}>Отправить</button>
                  </div>
                </section>

                <section className="crm-leads-card-modal-block">
                  <h3 className="crm-leads-card-modal-block-title">История статусов</h3>
                  {history.length === 0 ? (
                    <p className="crm-leads-card-modal-empty">История пуста</p>
                  ) : (
                    <ul className="crm-leads-history-list">
                      {history.map((h) => (
                        <li key={h.id} className="crm-leads-history-item">
                          <span className="crm-leads-history-status">{(h.from_status_name != null ? h.from_status_name : '—')} → {h.to_status_name || '—'}</span>
                          <span className="crm-leads-history-meta">{h.created_at ? new Date(h.created_at).toLocaleString('ru') : ''}{h.user_login ? ` · ${h.user_login}` : ''}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {cooperationStatusId != null && selectedLead.lead_status_id === cooperationStatusId && (
                  <section className="crm-leads-card-modal-block crm-leads-card-modal-block--highlight">
                    <h3 className="crm-leads-card-modal-block-title">Создать филиал</h3>
                    {selectedLead.branch_id ? (
                      <p className="crm-leads-branch-done">Филиал уже создан (id: {selectedLead.branch_id})</p>
                    ) : (
                      <div className="crm-leads-card-modal-fields">
                        <div className="crm-leads-card-modal-field">
                          <label>Отдел</label>
                          <select
                            value={createBranchForm.department_id}
                            onChange={(e) => setCreateBranchForm((f) => ({ ...f, department_id: e.target.value }))}
                            className="crm-leads-card-modal-select"
                          >
                            <option value="">Выберите отдел</option>
                            {departments.map((d) => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="crm-leads-card-modal-field">
                          <label>Цена за ребёнка (₽)</label>
                          <input
                            type="number"
                            value={createBranchForm.price_per_child}
                            onChange={(e) => setCreateBranchForm((f) => ({ ...f, price_per_child: e.target.value }))}
                            placeholder="0"
                            className="crm-leads-card-modal-input"
                          />
                        </div>
                        <button type="button" className="crm-leads-btn-create-branch" onClick={createBranch}>Создать филиал</button>
                      </div>
                    )}
                  </section>
                )}

                <section className="crm-leads-card-modal-block crm-leads-card-modal-block--archive">
                  <h3 className="crm-leads-card-modal-block-title">В архив</h3>
                  <textarea value={archiveComment} onChange={(e) => setArchiveComment(e.target.value)} placeholder="Комментарий к архивации (необязательно)" rows={2} className="crm-leads-card-modal-textarea" />
                  <button type="button" className="crm-leads-btn-archive" onClick={archiveLead}>В архив</button>
                </section>
              </div>
            </div>
          </div>
        )}

        {statusModal && (
          <div className="crm-leads-modal-overlay" onClick={() => setStatusModal(null)}>
            <div className="crm-leads-modal" onClick={(e) => e.stopPropagation()}>
              {statusModal === 'list' ? (
                <>
                  <h3>Колонки канбана (статусы)</h3>
                  <p className="crm-leads-status-help">Системные (🔒) нельзя удалить: Взят в работу, Отказ, Сотрудничество, Архив. Колонка «Архив» в канбане не показывается — архив только во вкладке «Архив». Остальные статусы можно менять и удалять.</p>
                  <ul className="crm-leads-status-list">
                    {statuses.map((s) => (
                      <li key={s.id} className="crm-leads-status-list-item">
                        <span>{s.name}</span>
                        {s.is_system === 1 ? <span className="crm-leads-status-system" title="Неудаляемый">🔒</span> : (
                          <span>
                            <button type="button" className="crm-leads-status-edit" onClick={() => setStatusModal({ id: s.id, name: s.name, sort_order: s.sort_order, is_system: s.is_system })}>Изменить</button>
                            <button type="button" className="crm-leads-status-delete" onClick={() => window.confirm('Удалить?') && deleteStatus(s.id)}>Удалить</button>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="crm-leads-modal-actions">
                    <button type="button" onClick={() => { setStatusModal({}); setNewStatusName(''); setNewStatusOrder(50); }}>Добавить статус</button>
                    <button type="button" onClick={() => setStatusModal(null)}>Закрыть</button>
                  </div>
                </>
              ) : (
                <>
                  <h3>{statusModal.id ? 'Редактировать статус' : 'Добавить статус'}</h3>
                  <div className="crm-leads-modal-body">
                    <label>Название</label>
                    <input
                      type="text"
                      value={statusModal.id ? (statusModal.name ?? '') : newStatusName}
                      onChange={(e) => (statusModal.id ? setStatusModal((m) => ({ ...m, name: e.target.value })) : setNewStatusName(e.target.value))}
                      placeholder="Название колонки"
                    />
                    <label>Порядок (sort_order)</label>
                    <input
                      type="number"
                      value={statusModal.id ? (statusModal.sort_order ?? 0) : newStatusOrder}
                      onChange={(e) => (statusModal.id ? setStatusModal((m) => ({ ...m, sort_order: Number(e.target.value) })) : setNewStatusOrder(Number(e.target.value)))}
                    />
                    {statusModal.is_system === 1 && <p className="crm-leads-status-system-note">Системный статус (нельзя удалить)</p>}
                  </div>
                  <div className="crm-leads-modal-actions">
                    <button type="button" onClick={saveStatus}>Сохранить</button>
                    {statusModal.id && statusModal.is_system !== 1 && (
                      <button type="button" className="crm-leads-btn-delete-status" onClick={() => window.confirm('Удалить статус?') && deleteStatus(statusModal.id)}>Удалить</button>
                    )}
                    <button type="button" onClick={() => setStatusModal('list')}>Назад</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {createLeadModal && (
          <div className="crm-leads-modal-overlay" onClick={() => setCreateLeadModal(false)}>
            <div className="crm-leads-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Создать лид вручную</h3>
              <div className="crm-leads-modal-body">
                <p className="crm-leads-create-lead-hint">Новый лид будет создан со статусом «Взят в работу»</p>
                <label>Название</label>
                <input
                  type="text"
                  value={createLeadForm.name}
                  onChange={(e) => setCreateLeadForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Частный детский сад..."
                />
                <label>Адрес</label>
                <input
                  type="text"
                  value={createLeadForm.address}
                  onChange={(e) => setCreateLeadForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Адрес"
                />
                <label>Телефон</label>
                <input
                  type="text"
                  value={createLeadForm.phone}
                  onChange={(e) => setCreateLeadForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+7..."
                />
                <label>Сайт</label>
                <input
                  type="url"
                  value={createLeadForm.website}
                  onChange={(e) => setCreateLeadForm((f) => ({ ...f, website: e.target.value }))}
                  placeholder="https://..."
                />
                <label>Заметки</label>
                <textarea
                  rows={3}
                  value={createLeadForm.notes}
                  onChange={(e) => setCreateLeadForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Комментарий по лиду (необязательно)"
                />
              </div>
              <div className="crm-leads-modal-actions">
                <button type="button" onClick={createLead}>Создать</button>
                <button type="button" onClick={() => setCreateLeadModal(false)}>Отмена</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </CRMLayout>
  );
};

export default CRMLeads;
