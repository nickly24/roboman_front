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
import './Instructions.css';

const Instructions = () => {
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
  });

  useEffect(() => {
    loadSections();
  }, []);

  useEffect(() => {
    loadInstructions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSectionId]);

  const loadSections = async () => {
    setLoadingSections(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.INSTRUCTION_SECTIONS);
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

  const columns = [
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
                  const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                      const res = reader.result;
                      if (!res || typeof res !== 'string') return reject(new Error('read error'));
                      // data:application/pdf;base64,....
                      const idx = res.indexOf('base64,');
                      resolve(idx >= 0 ? res.slice(idx + 7) : res);
                    };
                    reader.onerror = () => reject(reader.error || new Error('read error'));
                    reader.readAsDataURL(file);
                  });

                  await apiClient.post(API_ENDPOINTS.INSTRUCTIONS, {
                    section_id: Number(instrForm.section_id),
                    name: instrForm.name.trim(),
                    description: instrForm.description?.trim() || '',
                    pdf_base64: base64,
                    pdf_filename: file.name,
                    pdf_mime: file.type,
                  });

                  setInstrForm({ section_id: '', name: '', description: '', file: null });
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
      </div>
    </Layout>
  );
};

export default Instructions;
