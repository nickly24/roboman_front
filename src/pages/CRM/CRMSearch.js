import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import CRMLayout from '../../components/CRMLayout/CRMLayout';
import apiClient from '../../services/api';
import { authService } from '../../services/authService';
import { API_BASE_URL, API_ENDPOINTS } from '../../config/api';
import './CRM.css';

const CRMSearch = () => {
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [counts, setCounts] = useState({ suitable: 0, medium: 0, unsuitable: 0 });
  const [error, setError] = useState(null);
  const [abortController, setAbortController] = useState(null);
  const [currentStep, setCurrentStep] = useState({ phase: '', phase_index: -1, message: '', detail: '' });
  const [journal, setJournal] = useState([]);
  const [streamText, setStreamText] = useState('');
  const journalEndRef = useRef(null);
  const streamEndRef = useRef(null);

  useEffect(() => {
    journalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [journal]);

  useEffect(() => {
    streamEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [streamText]);

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

  const addJournal = (entry) => {
    setJournal((prev) => [...prev, { ...entry, ts: Date.now() }]);
  };

  const STEPPER_LABELS = ['Инициализация', 'Поиск в интернете', 'Парсинг JSON', 'Фильтрация', 'Проверка садиков', 'Готово'];
  const phaseToStepper = (phase) => {
    if (!phase) return -1;
    const m = { init: 0, search: 1, search_done: 1, parse: 2, dedup: 3, filter_done: 3, check: 4, done: 5, no_results: 5, nothing_new: 5 };
    return m[phase] ?? -1;
  };
  const activeStepper = phaseToStepper(currentStep.phase);

  const startSearch = async () => {
    setSearching(true);
    setCounts({ suitable: 0, medium: 0, unsuitable: 0 });
    setError(null);
    setCurrentStep({ phase: 'init', phase_index: 0, message: 'Подготовка...', detail: '' });
    setJournal([]);
    setStreamText('');
    addJournal({ type: 'step', message: 'Запуск поиска', level: 'info' });
    const ac = new AbortController();
    setAbortController(ac);
    const token = authService.getToken();
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CRM_SEARCH_PROSPECTS_STREAM}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: ac.signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || `Ошибка ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let s = 0, m = 0, u = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() || '';
        for (const block of blocks) {
          const line = block.split('\n').find((l) => l.startsWith('data: '));
          if (line) {
            try {
              const ev = JSON.parse(line.slice(6));
              if (ev.type === 'step') {
                setCurrentStep({
                  phase: ev.phase || '',
                  phase_index: typeof ev.phase_index === 'number' ? ev.phase_index : -1,
                  message: ev.message || '',
                  detail: ev.detail || '',
                });
                addJournal({ type: 'step', phase: ev.phase, message: ev.message, detail: ev.detail, level: 'step' });
              } else if (ev.type === 'stream_token') {
                setStreamText((t) => t + (ev.chunk || ''));
              } else if (ev.type === 'log') {
                addJournal({ type: 'log', level: ev.level || 'info', message: ev.message });
              } else if (ev.type === 'suitable') {
                s += 1;
                setCounts((c) => ({ ...c, suitable: s }));
                setProspects((prev) => [ev.data, ...prev]);
                addJournal({ type: 'saved', message: `Подходящий: ${ev.data?.name || ''}`, level: 'saved' });
              } else if (ev.type === 'medium') {
                m += 1;
                setCounts((c) => ({ ...c, medium: m }));
                if (ev.data) setProspects((prev) => [ev.data, ...prev]);
                addJournal({ type: 'saved', message: `Сохранён (без контакта): ${ev.data?.name || ev.name || ''}`, level: 'saved' });
              } else if (ev.type === 'unsuitable') {
                u += 1;
                setCounts((c) => ({ ...c, unsuitable: u }));
                addJournal({ type: 'unsuitable', message: `Неподходящий: ${ev.name || ''} — робототехника/LEGO`, level: 'unsuitable' });
              } else if (ev.type === 'done' || ev.type === 'stopped') {
                setCurrentStep({ phase: 'done', phase_index: 5, message: 'Поиск завершён', detail: '' });
                setCounts({ suitable: ev.suitable ?? s, medium: ev.medium ?? m, unsuitable: ev.unsuitable ?? u });
                addJournal({ type: 'done', message: `Итого: подходящих ${ev.suitable ?? s}, без контакта ${ev.medium ?? m}, неподходящих ${ev.unsuitable ?? u}` });
                await loadProspects();
              } else if (ev.type === 'error') {
                setError(ev.message || 'Ошибка');
                addJournal({ type: 'error', message: ev.message, level: 'error' });
                break;
              }
            } catch (_) {}
          }
        }
      }
      if (buffer) {
        const line = buffer.split('\n').find((l) => l.startsWith('data: '));
        if (line) {
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === 'done') {
              setCounts({ suitable: ev.suitable ?? 0, medium: ev.medium ?? 0, unsuitable: ev.unsuitable ?? 0 });
              await loadProspects();
            } else if (ev.type === 'error') setError(ev.message || 'Ошибка');
          } catch (_) {}
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Ошибка');
        addJournal({ type: 'error', message: err.message, level: 'error' });
      }
    } finally {
      setSearching(false);
      setAbortController(null);
    }
  };

  const stopSearch = async () => {
    if (abortController) abortController.abort();
    try {
      await fetch(`${API_BASE_URL}${API_ENDPOINTS.CRM_SEARCH_PROSPECTS_STOP}`, {
        method: 'POST',
        headers: authService.getToken() ? { Authorization: `Bearer ${authService.getToken()}` } : {},
      });
    } catch (_) {}
  };

  return (
    <CRMLayout>
      <div className="crm-page crm-search-page">
        <div className="crm-search-header">
          <h2>Поиск детских садов</h2>
          <p className="crm-search-desc">gpt-4o-mini-search-preview ищет в интернете частные детские сады Москвы без робототехники и LEGO</p>
        </div>

        <div className="crm-search-layout">
          <aside className="crm-search-sidebar">
            <div className="crm-search-panel crm-search-panel-control">
              <h3>Управление</h3>
              <div className="crm-search-controls">
                <button
                  type="button"
                  className="crm-search-btn crm-search-btn-start"
                  onClick={startSearch}
                  disabled={searching}
                >
                  {searching ? (
                    <>
                      <span className="crm-search-spinner" aria-hidden />
                      Поиск...
                    </>
                  ) : (
                    'Запустить поиск'
                  )}
                </button>
                {searching && (
                  <button type="button" className="crm-search-btn crm-search-btn-stop" onClick={stopSearch}>
                    Стоп
                  </button>
                )}
              </div>
            </div>
            <div className="crm-search-panel crm-search-panel-counts">
              <h3>Итоги</h3>
              <div className="crm-search-counts">
                <div className="crm-search-count-item crm-search-count-suitable">
                  <span className="crm-search-count-label">Подходящие</span>
                  <span className="crm-search-count-value">{counts.suitable}</span>
                </div>
                <div className="crm-search-count-item crm-search-count-medium">
                  <span className="crm-search-count-label">Без контакта</span>
                  <span className="crm-search-count-value">{counts.medium}</span>
                </div>
                <div className="crm-search-count-item crm-search-count-unsuitable">
                  <span className="crm-search-count-label">Неподходящие</span>
                  <span className="crm-search-count-value">{counts.unsuitable}</span>
                </div>
              </div>
            </div>
            <div className="crm-search-panel crm-search-panel-view">
              <Link to="/crm/prospects" className="crm-search-link-cold-base">
                Холодная база ({prospects.length}) →
              </Link>
            </div>
          </aside>

          <main className="crm-search-main">
            <div className="crm-search-dashboard">
                <div className="crm-search-stepper-wrap">
                  <h3 className="crm-search-stepper-title">Этапы поиска</h3>
                  <div className="crm-search-stepper">
                    {STEPPER_LABELS.map((label, i) => (
                      <div
                        key={i}
                        className={`crm-search-stepper-item ${i <= activeStepper ? 'done' : ''} ${i === activeStepper ? 'active' : ''}`}
                        title={label}
                      >
                        <span className="crm-search-stepper-num">{i + 1}</span>
                        <span className="crm-search-stepper-label">{label}</span>
                        {i < STEPPER_LABELS.length - 1 && <span className="crm-search-stepper-connector" />}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="crm-search-panel crm-search-panel-step crm-search-panel-highlight">
                  <h3>Текущий шаг</h3>
                  <div className="crm-search-step-content">
                    <div className="crm-search-step-message">{currentStep.message || (searching ? 'Ожидание...' : '—')}</div>
                    {currentStep.detail && <div className="crm-search-step-detail">{currentStep.detail}</div>}
                    {searching && activeStepper >= 0 && (
                      <div className="crm-search-step-phase">{STEPPER_LABELS[activeStepper]}</div>
                    )}
                  </div>
                </div>

                <div className="crm-search-panel crm-search-panel-journal">
                  <h3>Журнал событий</h3>
                  <div className="crm-search-journal-scroll">
                    {journal.length === 0 ? (
                      <div className="crm-search-journal-empty">События появятся при запуске поиска</div>
                    ) : (
                      journal.map((j, i) => (
                        <div key={i} className={`crm-search-journal-entry crm-search-journal-${j.level || 'info'}`}>
                          <span className="crm-search-journal-time">{new Date(j.ts).toLocaleTimeString('ru')}</span>
                          <span className="crm-search-journal-icon">
                            {j.level === 'saved' && '✓'}
                            {j.level === 'skip' && '○'}
                            {j.level === 'unsuitable' && '✕'}
                            {j.level === 'error' && '⊗'}
                            {j.level === 'done' && '●'}
                            {j.level === 'step' && '▸'}
                            {j.level === 'fetch' && '⬇'}
                            {(j.level === 'info' || !['saved','skip','unsuitable','error','done','step','fetch'].includes(j.level)) && '·'}
                          </span>
                          <span className="crm-search-journal-msg">{j.message}{j.detail ? ` — ${j.detail}` : ''}</span>
                        </div>
                      ))
                    )}
                    <div ref={journalEndRef} />
                  </div>
                </div>

                <div className={`crm-search-panel crm-search-panel-stream ${streamText ? '' : 'crm-search-panel-stream-empty'}`}>
                  <h3>Ответ модели (gpt-4o-mini-search-preview)</h3>
                  <div className="crm-search-stream-scroll">
                    {streamText ? (
                      <>
                        <pre className="crm-search-stream-text">{streamText}</pre>
                        <div ref={streamEndRef} />
                      </>
                    ) : (
                      <div className="crm-search-stream-empty">
                        {searching ? 'Ответ модели появится при получении первых данных...' : '—'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
          </main>
        </div>

        {error && <div className="crm-search-error">{error}</div>}
      </div>
    </CRMLayout>
  );
};

export default CRMSearch;
