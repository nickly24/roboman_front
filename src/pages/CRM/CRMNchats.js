import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTheme } from '../../context/ThemeContext';
import { API_BASE_URL, API_ENDPOINTS } from '../../config/api';
import apiClient from '../../services/api';
import { sendChatMessage } from '../../services/crmChat';
import CRMLayout from '../../components/CRMLayout/CRMLayout';
import LoadingSpinner from '../../components/Loading/LoadingSpinner';
import './CRM.css';

const NCHATS_STORAGE_KEY = 'crm_nchats_ai_chat';

const IconAI = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconVoice = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M12 1a3 3 0 0 1 3 3v8a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconExpand = ({ expanded }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    {expanded ? (
      <path d="M9 15l-5 5M4 20h4M4 20v-4M15 9l5-5M20 4h-4M20 4v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    ) : (
      <path d="M15 9l5-5M20 4h-4M20 4v4M9 15l-5 5M4 20h4M4 20v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    )}
  </svg>
);

/** Парсинг блоков [PREPARE_MESSAGE chat_id=X chat_name="Y"]...[/PREPARE_MESSAGE] */
function parseMessageProposals(content) {
  const blocks = [];
  const re = /\[PREPARE_MESSAGE chat_id=(\d+) chat_name="([^"]*)"\][\s\n]*([\s\S]*?)\[\/PREPARE_MESSAGE\]/gi;
  let m;
  while ((m = re.exec(content)) !== null) {
    blocks.push({
      chatId: parseInt(m[1], 10),
      chatName: m[2].trim() || `Чат ${m[1]}`,
      content: (m[3] || '').trim(),
    });
  }
  return blocks;
}

/** Убрать блоки PREPARE_MESSAGE из текста для отображения остатка */
function stripProposalBlocks(content) {
  return (content || '').replace(/\[PREPARE_MESSAGE[\s\S]*?\[\/PREPARE_MESSAGE\]/gi, '').trim();
}

const CRMNchats = () => {
  const { theme } = useTheme();
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [inputExpanded, setInputExpanded] = useState(false);
  const [sentProposals, setSentProposals] = useState(new Set()); // "msgIndex-proposalIndex"
  const [sendingKey, setSendingKey] = useState(null);
  const [editingProposal, setEditingProposal] = useState(null); // { msgIndex, proposalIndex, content }
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceTranscribing, setVoiceTranscribing] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const voiceStreamRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const messagesRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NCHATS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        } else if (parsed && Array.isArray(parsed.history)) {
          setHistory(parsed.history);
          if (Array.isArray(parsed.sentProposalKeys) && parsed.sentProposalKeys.length > 0) {
            setSentProposals(new Set(parsed.sentProposalKeys));
          }
        }
      }
    } catch (_) {}
  }, []);

  const saveToStorage = (h, sentKeys = null) => {
    try {
      const keys = sentKeys !== null ? Array.from(sentKeys) : Array.from(sentProposals);
      const payload = { history: h, sentProposalKeys: keys };
      localStorage.setItem(NCHATS_STORAGE_KEY, JSON.stringify(payload));
    } catch (_) {}
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const userMsg = { role: 'user', content: text };
    const newHistory = [...history, userMsg];
    setHistory(newHistory);
    setInput('');
    setSending(true);
    saveToStorage(newHistory);
    const token = localStorage.getItem('auth_token');
    let assistantText = '';
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CRM_NCHATS_AI_CHAT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text, history }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data?.t) {
                assistantText += data.t;
                setHistory([...newHistory, { role: 'assistant', content: assistantText }]);
              }
            } catch (_) {}
          }
        }
      }
      const finalHistory = [...newHistory, { role: 'assistant', content: assistantText }];
      setHistory(finalHistory);
      saveToStorage(finalHistory);
      messagesRef.current?.scrollTo(0, messagesRef.current.scrollHeight);
    } catch (err) {
      const errMsg = { role: 'assistant', content: `Ошибка: ${err.message || 'Не удалось получить ответ.'}` };
      const errHistory = [...newHistory, errMsg];
      setHistory(errHistory);
      saveToStorage(errHistory);
    } finally {
      setSending(false);
    }
  };

  const handleSendProposal = async (msgIndex, proposalIndex, content) => {
    const msg = history[msgIndex];
    if (msg?.role !== 'assistant') return;
    const proposals = parseMessageProposals(msg.content || '');
    const p = proposals[proposalIndex];
    if (!p) return;
    const text = (content || p.content).trim();
    if (!text) {
      alert('Введите текст сообщения');
      return;
    }
    const key = `${msgIndex}-${proposalIndex}`;
    setSendingKey(key);
    setEditingProposal(null);
    try {
      await sendChatMessage(p.chatId, text);
      const nextSent = new Set(sentProposals).add(key);
      setSentProposals(nextSent);
      saveToStorage(history, nextSent);
    } catch (err) {
      alert(err.message || 'Ошибка отправки');
    } finally {
      setSendingKey(null);
    }
  };

  const handleClearChat = () => {
    if (!window.confirm('Очистить чат с ассистентом?')) return;
    setHistory([]);
    setSentProposals(new Set());
    setEditingProposal(null);
    try {
      localStorage.removeItem(NCHATS_STORAGE_KEY);
    } catch (_) {}
  };

  useEffect(() => {
    if (!voiceRecording || !voiceStreamRef.current) return;
    const stream = voiceStreamRef.current;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.5;
    src.connect(analyser);
    analyserRef.current = analyser;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      if (!analyserRef.current) return;
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setVoiceVolume(Math.min(100, avg * 1.5));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      analyserRef.current = null;
      setVoiceVolume(0);
    };
  }, [voiceRecording]);

  const handleVoiceToggle = async () => {
    if (voiceTranscribing) return;
    const token = localStorage.getItem('auth_token');
    if (voiceRecording) {
      setVoiceRecording(false);
      voiceStreamRef.current = null;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceStreamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        voiceStreamRef.current = null;
        if (chunksRef.current.length === 0) return;
        setVoiceTranscribing(true);
        try {
          const blob = new Blob(chunksRef.current, { type: mime });
          const formData = new FormData();
          formData.append('file', blob, 'voice.webm');
          const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CRM_TRANSCRIBE_VOICE}`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.text) {
            setInput((prev) => (prev ? `${prev} ${data.text}` : data.text));
          } else {
            alert(data?.error?.message || 'Не удалось распознать голос');
          }
        } catch (err) {
          alert(err.message || 'Ошибка распознавания');
        } finally {
          setVoiceTranscribing(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setVoiceRecording(true);
    } catch (err) {
      alert('Нет доступа к микрофону: ' + (err.message || ''));
    }
  };

  return (
    <CRMLayout>
      <div className="crm-nchats">
        <div className="crm-nchats-header">
          <h2><IconAI /> ИИ-ассистент</h2>
          <p className="crm-nchats-desc">
            Ассистент с доступом ко всем чатам. Может получать контекст, слоты, занятия, расписание. Подготавливает сообщения — вы подтверждаете отправку.
          </p>
          <div className="crm-nchats-toolbar">
            <button
              type="button"
              className="crm-ai-clear-btn"
              onClick={handleClearChat}
              title="Очистить чат"
            >
              🗑 Очистить чат
            </button>
          </div>
        </div>
        <div className="crm-nchats-body">
          <div className="crm-nchats-messages" ref={messagesRef}>
            {history.length === 0 && (
              <div className="crm-nchats-welcome">
                <p>Напишите ассистенту. Например: «Покажи все чаты», «Составь напоминание об оплате для Tiny Tony», «Какие есть свободные слоты в понедельник?»</p>
              </div>
            )}
            {history.map((m, msgIndex) => (
              <div key={msgIndex} className={`crm-ai-chat-msg crm-ai-chat-msg-${m.role}`}>
                <span className="crm-ai-chat-role">{m.role === 'user' ? 'Вы' : 'ИИ'}</span>
                {m.role === 'assistant' ? (
                  <div className="crm-nchats-msg-content">
                    {(() => {
                      const proposals = parseMessageProposals(m.content || '');
                      const textWithoutBlocks = stripProposalBlocks(m.content || '');
                      return (
                        <>
                          {textWithoutBlocks && (
                            <div className="crm-ai-chat-msg-text">
                              <ReactMarkdown>{textWithoutBlocks}</ReactMarkdown>
                            </div>
                          )}
                          {proposals.map((p, pIdx) => {
                            const key = `${msgIndex}-${pIdx}`;
                            const isSent = sentProposals.has(key);
                            const isEditing = editingProposal?.msgIndex === msgIndex && editingProposal?.proposalIndex === pIdx;
                            const displayContent = isEditing ? editingProposal.content : p.content;
                            return (
                              <div
                                key={pIdx}
                                className={`crm-nchats-proposal-card ${isSent ? 'sent' : ''}`}
                              >
                                <div className="crm-nchats-proposal-header">
                                  <span className="crm-nchats-proposal-label">Продолжение следует…</span>
                                  <span className="crm-nchats-proposal-chat">→ {p.chatName}</span>
                                </div>
                                {isSent ? (
                                  <div className="crm-nchats-proposal-sent">
                                    <div className="crm-nchats-proposal-text">{p.content}</div>
                                    <span className="crm-ai-sent-badge">✓ Успешно отправлено в чат</span>
                                  </div>
                                ) : isEditing ? (
                                  <div className="crm-nchats-proposal-edit">
                                    <textarea
                                      value={displayContent}
                                      onChange={(e) => setEditingProposal((prev) => prev ? { ...prev, content: e.target.value } : null)}
                                      rows={4}
                                    />
                                    <div className="crm-nchats-proposal-actions">
                                      <button type="button" className="crm-ai-edit-msg-btn crm-nchats-edit-btn" onClick={() => setEditingProposal(null)}>
                                        Отмена
                                      </button>
                                      <button
                                        type="button"
                                        className="crm-ai-send-to-chat-btn crm-nchats-send-btn"
                                        onClick={() => handleSendProposal(msgIndex, pIdx, displayContent)}
                                        disabled={sendingKey !== null}
                                      >
                                        {sendingKey === key ? '…' : 'Отправить'}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="crm-nchats-proposal-text">{p.content}</div>
                                    <div className="crm-ai-chat-msg-actions">
                                      <button
                                        type="button"
                                        className="crm-ai-edit-msg-btn crm-nchats-edit-btn"
                                        onClick={() => setEditingProposal({ msgIndex, proposalIndex: pIdx, content: p.content })}
                                      >
                                        Редактировать
                                      </button>
                                      <button
                                        type="button"
                                        className="crm-ai-send-to-chat-btn crm-nchats-send-btn"
                                        onClick={() => handleSendProposal(msgIndex, pIdx, p.content)}
                                        disabled={sendingKey !== null}
                                      >
                                        {sendingKey === key ? '…' : 'Подтвердить и отправить'}
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="crm-ai-chat-msg-text">{m.content}</div>
                )}
              </div>
            ))}
            {sending && history.length > 0 && history[history.length - 1]?.role === 'user' && (
              <div className="crm-ai-chat-msg crm-ai-chat-msg-assistant">
                <span className="crm-ai-chat-role">ИИ</span>
                <div className="crm-ai-thinking">
                  <span className="crm-ai-thinking-spinner" />
                  <span>Думает</span>
                </div>
              </div>
            )}
          </div>
          <div className="crm-nchats-input-wrap">
            <div className="crm-ai-chat-input-row">
            <button
              type="button"
              className={`crm-ai-voice-btn ${voiceRecording ? 'recording' : ''} ${voiceTranscribing ? 'transcribing' : ''}`}
              onClick={handleVoiceToggle}
              disabled={voiceTranscribing}
              title={voiceTranscribing ? 'Распознавание…' : voiceRecording ? 'Остановить' : 'Голосовой ввод'}
              aria-label="Голосовой ввод"
            >
              <IconVoice />
            </button>
            {voiceRecording ? (
              <div className="crm-ai-voice-viz">
                {Array.from({ length: 12 }).map((_, i) => (
                  <span
                    key={i}
                    className="crm-ai-voice-bar"
                    style={{ height: `${8 + (voiceVolume / 100) * 24 * (0.6 + 0.4 * Math.sin((i / 12) * Math.PI))}px` }}
                  />
                ))}
              </div>
            ) : voiceTranscribing ? (
              <div className="crm-ai-voice-loading">
                <span className="crm-ai-thinking-spinner" />
                <span>Распознавание…</span>
              </div>
            ) : inputExpanded ? (
              <div className="crm-ai-chat-input-expanded">
                <textarea
                  className="crm-send-input crm-send-input-textarea"
                  placeholder="Напишите ассистенту..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                  rows={4}
                />
                <div className="crm-ai-chat-input-actions">
                  <button type="button" className="crm-ai-expand-btn" onClick={() => setInputExpanded(false)} title="Свернуть" aria-label="Свернуть">
                    <IconExpand expanded />
                  </button>
                  <button
                    type="button"
                    className="crm-ai-share-btn"
                    onClick={() => navigator.clipboard?.writeText(input) || null}
                    disabled={!input.trim()}
                    title="Поделиться (копировать)"
                  >
                    Поделиться
                  </button>
                  <button type="button" className="crm-send-btn" onClick={handleSend} disabled={!input.trim() || sending}>
                    Отправить
                  </button>
                </div>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  className="crm-send-input"
                  placeholder="Напишите ассистенту..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                />
                <button type="button" className="crm-ai-expand-btn" onClick={() => setInputExpanded(true)} title="Развернуть" aria-label="Развернуть">
                  <IconExpand expanded={false} />
                </button>
                <button type="button" className="crm-send-btn" onClick={handleSend} disabled={!input.trim() || sending}>
                  ▶
                </button>
              </>
            )}
            </div>
          </div>
        </div>
      </div>
    </CRMLayout>
  );
};

export default CRMNchats;
