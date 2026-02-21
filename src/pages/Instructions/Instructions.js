import React, { useEffect, useMemo, useState } from 'react';
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
import { useAuth } from '../../context/AuthContext';
import './Instructions.css';

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB

const Instructions = () => {
  const { isOwner } = useAuth();
  const [tab, setTab] = useState('instructions'); // instructions | topics
  const [loading, setLoading] = useState(true);
  const [loadingSections, setLoadingSections] = useState(true);
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [instructions, setInstructions] = useState([]);
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

  useEffect(() => {
    loadSections();
  }, []);

  useEffect(() => {
    loadInstructions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSectionId]);

  useEffect(() => {
    const currentIds = new Set(instructions.map((item) => String(item.id)));
    setPhotoUrls((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        if (!currentIds.has(id)) {
          URL.revokeObjectURL(next[id]);
          delete next[id];
        }
      });
      return next;
    });
  }, [instructions]);

  useEffect(() => {
    let cancelled = false;
    const loadPhotos = async () => {
      const toLoad = instructions.filter(
        (item) => item.has_photo && !photoUrls[String(item.id)]
      );
      if (!toLoad.length) return;
      await Promise.all(
        toLoad.map(async (item) => {
          try {
            const resp = await apiClient.get(API_ENDPOINTS.INSTRUCTION_PHOTO(item.id), {
              responseType: 'blob',
              headers: { Accept: 'image/*' },
            });
            if (cancelled) return;
            const blob = new Blob([resp.data], { type: resp.data?.type || 'image/jpeg' });
            const url = URL.createObjectURL(blob);
            setPhotoUrls((prev) => ({ ...prev, [String(item.id)]: url }));
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Ошибка загрузки фото инструкции:', err);
          }
        })
      );
    };
    loadPhotos();
    return () => {
      cancelled = true;
    };
  }, [instructions, photoUrls]);

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
      if (selectedSectionId) qs.append('section_id', selectedSectionId);
      const response = await apiClient.get(
        `${API_ENDPOINTS.INSTRUCTIONS}${qs.toString() ? `?${qs}` : ''}`
      );
      if (response.data.ok) {
        const data = response.data.data;
        setInstructions(Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []));
      }
    } catch (error) {
      console.error('Ошибка загрузки инструкций:', error);
      setInstructions([]);
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

  const columns = [
    {
      key: 'photo',
      title: 'Фото',
      width: 90,
      render: (_, row) => {
        const url = photoUrls[String(row.id)];
        if (!row.has_photo) return <span style={{ color: '#9ca3af' }}>—</span>;
        if (!url) return <span style={{ color: '#9ca3af' }}>…</span>;
        return <img className="instruction-photo-thumb" src={url} alt="Фото" />;
      },
    },
    { key: 'name', title: 'Название' },
    {
      key: 'section_name',
      title: 'Тема',
      render: (value, row) => value || sectionNameById.get(String(row.section_id)) || '—',
    },
    { key: 'description', title: 'Описание' },
    {
      key: 'actions',
      title: 'Действия',
      render: (_, row) => (
        <div className="table-actions">
          <Button size="small" variant="primary" onClick={() => setViewingInstruction(row)}>
            Открыть
          </Button>
          {isOwner && (
            <Button size="small" variant="secondary" onClick={() => openEdit(row)}>
              Редактировать
            </Button>
          )}
        </div>
      ),
    },
  ];

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
            </Card>

            <Card>
              {loading ? (
                <LoadingSpinner size="medium" text="Загрузка инструкций..." />
              ) : (
                <Table columns={columns} data={instructions} loading={false} emptyMessage="Нет инструкций" />
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

export default Instructions;
