import React, { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/Card/Card';
import Table from '../../components/Table/Table';
import Button from '../../components/Button/Button';
import LoadingSpinner from '../../components/Loading/LoadingSpinner';
import Modal from '../../components/Modal/Modal';
import Input from '../../components/Input/Input';
import Select from '../../components/Select/Select';
import InstructionDetailsModal from './InstructionDetailsModal';
import InstructionCard from './InstructionCard';
import { useAuth } from '../../context/AuthContext';
import './Instructions.css';

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
const INSTRUCTIONS_PAGE_SIZE = 8;

const Instructions = () => {
  const { isOwner, isTeacher } = useAuth();
  const [tab, setTab] = useState('instructions'); // instructions | topics
  const [loading, setLoading] = useState(true);
  const [loadingSections, setLoadingSections] = useState(true);
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [instructions, setInstructions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [branches, setBranches] = useState([]);
  const [branchFilterIds, setBranchFilterIds] = useState([]); // массив строк id садиков
  const [builtFilter, setBuiltFilter] = useState(''); // '' | '0' = не было в саду | '1' = было в саду
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [viewingInstruction, setViewingInstruction] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState('instruction'); // instruction | topic
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState('');
  const [topicForm, setTopicForm] = useState({ name: '', description: '' });
  const [instrForm, setInstrForm] = useState({
    section_id: '',
    name: '',
    description: '',
    file: null,
    photo: null,
  });
  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState('');
  const [editingInstruction, setEditingInstruction] = useState(null);
  const [editForm, setEditForm] = useState({ section_id: '', name: '', description: '', photo: null });
  const [photoUrls, setPhotoUrls] = useState({});
  const photoUrlsRef = React.useRef(photoUrls);
  const photoRequestedRef = React.useRef(new Set());
  photoUrlsRef.current = photoUrls;

  useEffect(() => {
    loadSections();
  }, []);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const res = await apiClient.get(`${API_ENDPOINTS.BRANCHES}?limit=500`);
        if (res.data?.ok && res.data?.data?.items) {
          setBranches(res.data.data.items);
        } else {
          const data = res.data?.data;
          setBranches(Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []);
        }
      } catch (e) {
        setBranches([]);
      }
    };
    loadBranches();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [selectedSectionId, JSON.stringify(branchFilterIds), builtFilter]);

  useEffect(() => {
    loadInstructions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSectionId, page, JSON.stringify(branchFilterIds), builtFilter]);

  useEffect(() => {
    const currentIds = new Set(instructions.map((item) => String(item.id)));
    setPhotoUrls((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        if (!currentIds.has(id)) {
          URL.revokeObjectURL(next[id]);
          delete next[id];
          photoRequestedRef.current.delete(id);
        }
      });
      return next;
    });
  }, [instructions]);

  const requestPhoto = useCallback(async (instructionId) => {
    const id = String(instructionId);
    if (photoUrlsRef.current[id] || photoRequestedRef.current.has(id)) return;
    photoRequestedRef.current.add(id);
    try {
      const resp = await apiClient.get(API_ENDPOINTS.INSTRUCTION_PHOTO(instructionId), {
        responseType: 'blob',
        headers: { Accept: 'image/*' },
      });
      const blob = new Blob([resp.data], { type: resp.data?.type || 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      setPhotoUrls((prev) => (prev[id] ? prev : { ...prev, [id]: url }));
    } catch (err) {
      photoRequestedRef.current.delete(id);
      // eslint-disable-next-line no-console
      console.error('Ошибка загрузки фото инструкции:', err);
    }
  }, []);

  const loadSections = async () => {
    setLoadingSections(true);
    try {
      const response = await apiClient.get(
        isOwner ? API_ENDPOINTS.INSTRUCTION_SECTIONS : API_ENDPOINTS.INSTRUCTION_SECTIONS_PUBLIC
      );
      if (response.data.ok) {
        const data = response.data.data;
        setSections(Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []));
      }
    } catch (error) {
      console.error('Ошибка загрузки тем:', error);
      setSections([]);
    } finally {
      setLoadingSections(false);
    }
  };

  const loadInstructions = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.append('limit', String(INSTRUCTIONS_PAGE_SIZE));
      qs.append('offset', String((page - 1) * INSTRUCTIONS_PAGE_SIZE));
      if (selectedSectionId) qs.append('section_id', selectedSectionId);
      if (branchFilterIds.length > 0 && (builtFilter === '0' || builtFilter === '1')) {
        qs.append('branch_ids', branchFilterIds.join(','));
        qs.append('built', builtFilter);
      }
      const response = await apiClient.get(
        `${API_ENDPOINTS.INSTRUCTIONS}?${qs.toString()}`
      );
      if (response.data.ok) {
        const data = response.data.data;
        const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
        setInstructions(items);
        setTotal(typeof data?.total === 'number' ? data.total : items.length);
      }
    } catch (error) {
      console.error('Ошибка загрузки инструкций:', error);
      setInstructions([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const sectionNameById = useMemo(() => {
    const map = new Map();
    sections.forEach((s) => map.set(String(s.id), s.name));
    return map;
  }, [sections]);

  const openEdit = (row) => {
    setEditingInstruction(row);
    setEditForm({
      section_id: String(row.section_id || ''),
      name: row.name || '',
      description: row.description || '',
      photo: null,
    });
    setEditError('');
    setEditOpen(true);
  };

  const totalPages = Math.max(1, Math.ceil(total / INSTRUCTIONS_PAGE_SIZE));

  const topicsColumns = [
    { key: 'name', title: 'Тема' },
    { key: 'description', title: 'Описание' },
    {
      key: 'actions',
      title: 'Действия',
      render: (_, row) => (
        <div className="table-actions">
          <Button
            size="small"
            variant="primary"
            onClick={() => {
              setSelectedSectionId(String(row.id));
              setTab('instructions');
            }}
          >
            Открыть
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="instructions-page">
        <div className="instructions-header">
          <div>
            <h1 className="instructions-title">Инструкции</h1>
            <div className="instructions-subtitle">
              {selectedSectionId ? `Тема: ${sectionNameById.get(String(selectedSectionId)) || `#${selectedSectionId}`}` : 'Все темы'}
            </div>
          </div>
          <div className="instructions-header-actions">
            <Button variant={tab === 'instructions' ? 'primary' : 'secondary'} onClick={() => setTab('instructions')}>
              Инструкции
            </Button>
            <Button variant={tab === 'topics' ? 'primary' : 'secondary'} onClick={() => setTab('topics')}>
              Темы
            </Button>
            {isOwner && (
              <Button
                variant="primary"
                onClick={() => {
                  setCreateMode(tab === 'topics' ? 'topic' : 'instruction');
                  setCreateError('');
                  setCreateOpen(true);
                }}
              >
                Создать
              </Button>
            )}
          </div>
        </div>

        {tab === 'instructions' ? (
          <>
            <Card className="instructions-filters">
              <div className="instructions-chips">
                <button
                  className={`chip ${!selectedSectionId ? 'active' : ''}`}
                  onClick={() => setSelectedSectionId('')}
                >
                  Все
                </button>
                {loadingSections ? (
                  <div className="chip-loading">Загрузка тем…</div>
                ) : (
                  sections.map((s) => (
                    <button
                      key={s.id}
                      className={`chip ${String(s.id) === String(selectedSectionId) ? 'active' : ''}`}
                      onClick={() => setSelectedSectionId(String(s.id))}
                      title={s.description || s.name}
                    >
                      {s.name}
                    </button>
                  ))
                )}
              </div>
              <div className="instructions-branch-filters">
                <div className="instructions-branch-summary">
                  <div className="input-label">Садики</div>
                  <button
                    type="button"
                    className="instructions-branch-button"
                    onClick={() => setBranchModalOpen(true)}
                  >
                    {branchFilterIds.length === 0
                      ? 'Все садики'
                      : branchFilterIds.length === 1
                        ? (branches.find((b) => String(b.id) === branchFilterIds[0])?.name || '1 садик')
                        : `Выбрано садиков: ${branchFilterIds.length}`}
                  </button>
                </div>
                <div className="instructions-built-filter">
                  <Select
                    label="Показать"
                    value={builtFilter}
                    onChange={(e) => setBuiltFilter(e.target.value || '')}
                    options={[
                      { value: '', label: 'Все инструкции' },
                      { value: '0', label: 'Не было в выбранных садах' },
                      { value: '1', label: 'Было в выбранных садах' },
                    ]}
                    disabled={branches.length === 0 || branchFilterIds.length === 0}
                  />
                </div>
              </div>
            </Card>

            <Card className="instructions-list-card">
              {loading ? (
                <LoadingSpinner size="medium" text="Загрузка инструкций..." />
              ) : instructions.length === 0 ? (
                <div className="instructions-empty">Нет инструкций</div>
              ) : (
                <>
                  <div className="instructions-grid">
                    {instructions.map((item) => (
                      <InstructionCard
                        key={item.id}
                        instruction={item}
                        sectionName={item.section_name || sectionNameById.get(String(item.section_id))}
                        branchesBuiltAt={item.branches_built_at || []}
                        myBranches={isTeacher ? branches : []}
                        isTeacher={isTeacher}
                        photoUrl={photoUrls[String(item.id)]}
                        onRequestPhoto={requestPhoto}
                        onOpen={setViewingInstruction}
                        onEdit={openEdit}
                        isOwner={isOwner}
                      />
                    ))}
                  </div>
                  {totalPages > 1 && (
                    <div className="instructions-pagination">
                      <button
                        type="button"
                        className="instructions-pagination__btn instructions-pagination__btn--prev"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        aria-label="Предыдущая страница"
                      >
                        <span className="instructions-pagination__arrow">←</span>
                        Назад
                      </button>
                      <nav className="instructions-pagination__pages" aria-label="Номера страниц">
                        {(() => {
                          const start = Math.max(1, page - 2);
                          const end = Math.min(totalPages, page + 2);
                          const pages = [];
                          if (start > 1) {
                            pages.push(1);
                            if (start > 2) pages.push('…');
                          }
                          for (let i = start; i <= end; i++) pages.push(i);
                          if (end < totalPages) {
                            if (end < totalPages - 1) pages.push('…');
                            pages.push(totalPages);
                          }
                          return pages.map((p, idx) =>
                            p === '…' ? (
                              <span key={`ellipsis-${idx}`} className="instructions-pagination__ellipsis">
                                …
                              </span>
                            ) : (
                              <button
                                key={p}
                                type="button"
                                className={`instructions-pagination__page ${p === page ? 'instructions-pagination__page--current' : ''}`}
                                onClick={() => setPage(p)}
                                aria-label={`Страница ${p}`}
                                aria-current={p === page ? 'page' : undefined}
                              >
                                {p}
                              </button>
                            )
                          );
                        })()}
                      </nav>
                      <button
                        type="button"
                        className="instructions-pagination__btn instructions-pagination__btn--next"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        aria-label="Следующая страница"
                      >
                        Вперёд
                        <span className="instructions-pagination__arrow">→</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </Card>
          </>
        ) : (
          <Card>
            {loadingSections ? (
              <LoadingSpinner size="medium" text="Загрузка тем..." />
            ) : (
              <Table columns={topicsColumns} data={sections} loading={false} emptyMessage="Нет тем" />
            )}
          </Card>
        )}

        <InstructionDetailsModal
          isOpen={!!viewingInstruction}
          onClose={() => setViewingInstruction(null)}
          instruction={viewingInstruction}
          allBranches={branches}
        />

        <BranchesModal
          isOpen={branchModalOpen}
          onClose={() => setBranchModalOpen(false)}
          branches={branches}
          selectedIds={branchFilterIds}
          onChange={setBranchFilterIds}
        />

        {isOwner && (
          <Modal
            isOpen={createOpen}
            onClose={() => setCreateOpen(false)}
            title={createMode === 'topic' ? 'Создать тему' : 'Создать инструкцию'}
            size="medium"
          >
            {createMode === 'topic' ? (
              <form
                className="instructions-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSaving(true);
                  setCreateError('');
                  try {
                    await apiClient.post(API_ENDPOINTS.INSTRUCTION_SECTIONS, {
                      name: topicForm.name.trim(),
                      description: topicForm.description?.trim() || '',
                    });
                    setTopicForm({ name: '', description: '' });
                    setCreateOpen(false);
                    await loadSections();
                  } catch (err) {
                    const msg = err?.response?.data?.error?.message || err?.response?.data?.message;
                    setCreateError(msg || 'Не удалось создать тему');
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {createError && <div className="form-error">{createError}</div>}
                <Input
                  label="Название темы"
                  value={topicForm.name}
                  onChange={(e) => setTopicForm({ ...topicForm, name: e.target.value })}
                  required
                  disabled={saving}
                />
                <Input
                  label="Описание"
                  value={topicForm.description}
                  onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
                  disabled={saving}
                />
                <div className="form-actions">
                  <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>
                    Отмена
                  </Button>
                  <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? 'Создание...' : 'Создать'}
                  </Button>
                </div>
              </form>
            ) : (
              <form
                className="instructions-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSaving(true);
                  setCreateError('');
                  try {
                    if (!instrForm.section_id) {
                      setCreateError('Выберите тему');
                      setSaving(false);
                      return;
                    }
                    if (!instrForm.name.trim()) {
                      setCreateError('Название инструкции обязательно');
                      setSaving(false);
                      return;
                    }
                    if (!instrForm.file) {
                      setCreateError('Загрузите PDF файл');
                      setSaving(false);
                      return;
                    }
                    const file = instrForm.file;
                    if (file.type !== 'application/pdf') {
                      setCreateError('Поддерживается только PDF');
                      setSaving(false);
                      return;
                    }
                    if (file.size > MAX_PDF_BYTES) {
                      setCreateError('Файл слишком большой. Максимум 10 MB');
                      setSaving(false);
                      return;
                    }
                  if (instrForm.photo) {
                    const photo = instrForm.photo;
                    if (!photo.type.startsWith('image/')) {
                      setCreateError('Фото должно быть изображением');
                      setSaving(false);
                      return;
                    }
                    if (photo.size > MAX_PHOTO_BYTES) {
                      setCreateError('Фото слишком большое. Максимум 5 MB');
                      setSaving(false);
                      return;
                    }
                  }
                    const formData = new FormData();
                    formData.append('section_id', String(instrForm.section_id));
                    formData.append('name', instrForm.name.trim());
                    formData.append('description', instrForm.description?.trim() || '');
                    formData.append('file', file, file.name);
                  if (instrForm.photo) {
                    formData.append('photo', instrForm.photo, instrForm.photo.name);
                  }

                    await apiClient.post(API_ENDPOINTS.INSTRUCTIONS, formData);

                  setInstrForm({ section_id: '', name: '', description: '', file: null, photo: null });
                    setCreateOpen(false);
                    await loadInstructions();
                  } catch (err) {
                    const msg = err?.response?.data?.error?.message || err?.response?.data?.message;
                    setCreateError(msg || 'Не удалось создать инструкцию');
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {createError && <div className="form-error">{createError}</div>}
                <Select
                  label="Тема"
                  value={instrForm.section_id}
                  onChange={(e) => setInstrForm({ ...instrForm, section_id: e.target.value })}
                  options={sections.map((s) => ({ value: String(s.id), label: s.name }))}
                  required
                  disabled={saving || loadingSections}
                  placeholder={loadingSections ? 'Загрузка тем...' : 'Выберите тему'}
                />
                <Input
                  label="Название инструкции"
                  value={instrForm.name}
                  onChange={(e) => setInstrForm({ ...instrForm, name: e.target.value })}
                  required
                  disabled={saving}
                />
                <Input
                  label="Короткое описание"
                  value={instrForm.description}
                  onChange={(e) => setInstrForm({ ...instrForm, description: e.target.value })}
                  disabled={saving}
                />
                <div className="file-field">
                  <label className="input-label">
                    PDF файл <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 6 }}>
                    Файлы не больше 10 MB
                  </div>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setInstrForm({ ...instrForm, file: e.target.files?.[0] || null })}
                    disabled={saving}
                  />
                  {instrForm.file && (
                    <div className="file-hint">
                      Выбран файл: <strong>{instrForm.file.name}</strong>
                    </div>
                  )}
                </div>
              <div className="file-field">
                <label className="input-label">Фото (необязательно)</label>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginBottom: 6 }}>
                  Формат: изображение, размер до 5 MB
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setInstrForm({ ...instrForm, photo: e.target.files?.[0] || null })}
                  disabled={saving}
                />
                {instrForm.photo && (
                  <div className="file-hint">
                    Выбрано фото: <strong>{instrForm.photo.name}</strong>
                  </div>
                )}
              </div>
                <div className="form-actions">
                  <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>
                    Отмена
                  </Button>
                  <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? 'Загрузка...' : 'Создать'}
                  </Button>
                </div>
              </form>
            )}
          </Modal>
        )}

        {isOwner && (
          <Modal
            isOpen={editOpen}
            onClose={() => setEditOpen(false)}
            title="Редактировать инструкцию"
            size="medium"
          >
            <form
              className="instructions-form"
              onSubmit={async (e) => {
                e.preventDefault();
                setSaving(true);
                setEditError('');
                try {
                  if (!editForm.section_id) {
                    setEditError('Выберите тему');
                    setSaving(false);
                    return;
                  }
                  if (!editForm.name.trim()) {
                    setEditError('Название инструкции обязательно');
                    setSaving(false);
                    return;
                  }
                  await apiClient.put(API_ENDPOINTS.INSTRUCTION(editingInstruction.id), {
                    section_id: Number(editForm.section_id),
                    name: editForm.name.trim(),
                    description: editForm.description?.trim() || '',
                  });
                  if (editForm.photo) {
                    if (!editForm.photo.type.startsWith('image/')) {
                      setEditError('Фото должно быть изображением');
                      setSaving(false);
                      return;
                    }
                    if (editForm.photo.size > MAX_PHOTO_BYTES) {
                      setEditError('Фото слишком большое. Максимум 5 MB');
                      setSaving(false);
                      return;
                    }
                    const photoData = new FormData();
                    photoData.append('photo', editForm.photo, editForm.photo.name);
                    await apiClient.put(API_ENDPOINTS.INSTRUCTION_PHOTO(editingInstruction.id), photoData);
                  }
                  setEditOpen(false);
                  setEditingInstruction(null);
                  await loadInstructions();
                } catch (err) {
                  const msg = err?.response?.data?.error?.message || err?.response?.data?.message;
                  setEditError(msg || 'Не удалось обновить инструкцию');
                } finally {
                  setSaving(false);
                }
              }}
            >
              {editError && <div className="form-error">{editError}</div>}
              <Select
                label="Тема"
                value={editForm.section_id}
                onChange={(e) => setEditForm({ ...editForm, section_id: e.target.value })}
                options={sections.map((s) => ({ value: String(s.id), label: s.name }))}
                required
                disabled={saving || loadingSections}
                placeholder={loadingSections ? 'Загрузка тем...' : 'Выберите тему'}
              />
              <Input
                label="Название инструкции"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
                disabled={saving}
              />
              <Input
                label="Описание"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                disabled={saving}
              />
              <div className="file-field">
                <label className="input-label">Фото (необязательно)</label>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginBottom: 6 }}>
                  Формат: изображение, размер до 5 MB
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditForm({ ...editForm, photo: e.target.files?.[0] || null })}
                  disabled={saving}
                />
                {editForm.photo && (
                  <div className="file-hint">
                    Выбрано фото: <strong>{editForm.photo.name}</strong>
                  </div>
                )}
              </div>
              <div className="form-actions">
                <Button type="button" variant="secondary" onClick={() => setEditOpen(false)} disabled={saving}>
                  Отмена
                </Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </Layout>
  );
};

const BranchesModal = ({ isOpen, onClose, branches, selectedIds, onChange }) => {
  const toggleId = (id) => {
    const strId = String(id);
    if (selectedIds.includes(strId)) {
      onChange(selectedIds.filter((x) => x !== strId));
    } else {
      onChange([...selectedIds, strId]);
    }
  };

  const allSelected = branches.length > 0 && selectedIds.length === branches.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(branches.map((b) => String(b.id)));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Выбор садиков"
      size="medium"
    >
      <div className="instructions-branches-modal">
        <div className="instructions-branches-modal-header">
          <button
            type="button"
            className="instructions-branches-toggle-all"
            onClick={handleSelectAll}
          >
            {allSelected ? 'Снять выделение' : 'Выбрать все'}
          </button>
          <div className="instructions-branches-count">
            Выбрано: {selectedIds.length}
          </div>
        </div>
        <div className="instructions-branches-list">
          {branches.length === 0 ? (
            <div className="instructions-branches-empty">Нет доступных садиков</div>
          ) : (
            branches.map((b) => {
              const id = String(b.id);
              const checked = selectedIds.includes(id);
              return (
                <label key={id} className="instructions-branches-item">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleId(id)}
                  />
                  <span className="instructions-branches-name">
                    {b.name || `Садик #${b.id}`}
                  </span>
                </label>
              );
            })
          )}
        </div>
        <div className="instructions-branches-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Закрыть
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default Instructions;
