import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import useMediaQuery from '../../hooks/useMediaQuery';
import apiClient from '../../services/api';
import { sendChatMessage } from '../../services/crmChat';
import { API_BASE_URL, API_ENDPOINTS } from '../../config/api';
import CRMLayout from '../../components/CRMLayout/CRMLayout';
import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import Modal from '../../components/Modal/Modal';
import Input from '../../components/Input/Input';
import Select from '../../components/Select/Select';
import LoadingSpinner from '../../components/Loading/LoadingSpinner';
import './CRM.css';

const POLL_INTERVAL_MS = 3000;      // сообщения и комментарии
const CHAT_LIST_POLL_MS = 10000;    // список чатов (реже, экономнее)
const MESSAGES_PAGE_SIZE = 20;
const CHAT_LIST_WIDTH = 280;
const AI_PANEL_MIN = 200;
const AI_PANEL_MAX = 480;
const AI_PANEL_DEFAULT = 480;
const AI_CHAT_STORAGE_PREFIX = 'crm_ai_chat_';
const AI_SUMMARY_STORAGE_PREFIX = 'crm_ai_summary_';

const BG_DARK = `${process.env.PUBLIC_URL || ''}/bg/dark-bg.jpg`;
const BG_LIGHT = `${process.env.PUBLIC_URL || ''}/bg/light-bg.jpg`;

const IconOpenAI = () => (
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

const CRMChatsMessenger = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [searchParams] = useSearchParams();
  const { theme } = useTheme();
  const branchIdFromUrl = searchParams.get('branch_id') || '';

  const [chats, setChats] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState(branchIdFromUrl);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesHasMore, setMessagesHasMore] = useState(true);
  const [messagesLoadingMore, setMessagesLoadingMore] = useState(false);
  const [comments, setComments] = useState([]);
  const [sendText, setSendText] = useState('');
  const [sending, setSending] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiPanelWidth, setAiPanelWidth] = useState(AI_PANEL_DEFAULT);
  const [isResizing, setIsResizing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [branchInfo, setBranchInfo] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [aiSummarizing, setAiSummarizing] = useState(false);
  const [aiContextReady, setAiContextReady] = useState(false);
  const [aiChatHistory, setAiChatHistory] = useState([]);
  const [aiChatInput, setAiChatInput] = useState('');
  const [aiInputExpanded, setAiInputExpanded] = useState(false);
  const [aiChatSending, setAiChatSending] = useState(false);
  const [aiSendingToChatIndex, setAiSendingToChatIndex] = useState(null);
  const [aiSentToChatIndices, setAiSentToChatIndices] = useState(new Set());
  const [aiVoiceRecording, setAiVoiceRecording] = useState(false);
  const [aiVoiceTranscribing, setAiVoiceTranscribing] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const voiceStreamRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const aiChatMessagesRef = useRef(null);
  const messagesRef = useRef(messages);
  const scrollAdjustRef = useRef(null);
  const scrollSourceRef = useRef(null); // 'initial' | 'append' | 'poll' | null
  messagesRef.current = messages;

  const scrollToBottom = () => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };
  const isBranchContext = Boolean(branchIdFromUrl || branchFilter);

  const loadBranches = async () => {
    try {
      const res = await apiClient.get(API_ENDPOINTS.CRM_BRANCHES);
      if (res.data?.ok && res.data?.data?.items) {
        setBranches(res.data.data.items);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadChats = async (showLoading = true) => {
    if (showLoading) setChatsLoading(true);
    try {
      const bid = branchFilter || branchIdFromUrl;
      const url = bid ? `${API_ENDPOINTS.CRM_CHATS}?branch_id=${bid}` : API_ENDPOINTS.CRM_CHATS;
      const res = await apiClient.get(url);
      if (res.data?.ok && res.data?.data?.items) {
        setChats(res.data.data.items);
      } else {
        setChats([]);
      }
    } catch (e) {
      console.error(e);
      setChats([]);
    } finally {
      if (showLoading) setChatsLoading(false);
    }
  };

  const loadChat = async () => {
    if (!chatId) return;
    try {
      const res = await apiClient.get(API_ENDPOINTS.CRM_CHAT(chatId));
      if (res.data?.ok) setChat(res.data.data);
      else setChat(null);
    } catch (e) {
      console.error(e);
      setChat(null);
    }
  };

  const loadMessages = async (markRead = false, append = false, forPoll = false) => {
    if (!chatId) return;
    const currentMessages = forPoll ? messagesRef.current : messages;
    const offset = append ? currentMessages.length : 0;
    if (append) {
      setMessagesLoadingMore(true);
    } else if (markRead) {
      setMessagesLoading(true);
    }
    try {
      const limit = forPoll ? Math.max(50, currentMessages.length + 10) : MESSAGES_PAGE_SIZE;
      const res = await apiClient.get(
        `${API_ENDPOINTS.CRM_CHAT_MESSAGES(chatId)}?limit=${limit}&offset=${offset}`
      );
      if (res.data?.ok && res.data?.data?.items) {
        const list = res.data.data.items;
        if (forPoll && currentMessages.length > 0) {
          const el = messagesContainerRef.current;
          const atBottom = el && (el.scrollHeight - el.scrollTop - el.clientHeight) < 80;
          scrollSourceRef.current = atBottom ? 'poll-at-bottom' : 'poll';
          const minFetchedId = Math.min(...list.map((m) => m.id));
          const older = currentMessages.filter((m) => m.id < minFetchedId);
          const merged = [...older, ...[...list].reverse()];
          setMessages(merged);
        } else if (append) {
          scrollSourceRef.current = 'append';
          setMessagesHasMore(list.length >= MESSAGES_PAGE_SIZE);
          const el = messagesContainerRef.current;
          scrollAdjustRef.current = el ? { prevHeight: el.scrollHeight, prevTop: el.scrollTop } : null;
          setMessages((prev) => [...list].reverse().concat(prev));
        } else {
          scrollSourceRef.current = 'initial';
          setMessagesHasMore(list.length >= MESSAGES_PAGE_SIZE);
          setMessages([...list].reverse());
        }
        if (list.length > 0 && (markRead || forPoll)) {
          const maxId = Math.max(...list.map((m) => m.id));
          try {
            await apiClient.post(API_ENDPOINTS.CRM_CHAT_READ(chatId), { last_message_id: maxId });
          } catch (_) {}
        }
      } else {
        if (!append) setMessagesHasMore(false);
      }
    } catch (e) {
      console.error(e);
      if (!append) setMessagesHasMore(false);
    } finally {
      if (append) setMessagesLoadingMore(false);
      if (markRead && !append) setMessagesLoading(false);
    }
  };

  const loadComments = async () => {
    if (!chatId) return;
    try {
      const res = await apiClient.get(API_ENDPOINTS.CRM_CHAT_COMMENTS(chatId));
      if (res.data?.ok && res.data?.data?.items) setComments(res.data.data.items);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setBranchFilter(branchIdFromUrl || '');
  }, [branchIdFromUrl]);

  useEffect(() => {
    loadBranches();
    if (branchIdFromUrl) {
      apiClient.get(API_ENDPOINTS.CRM_BRANCHES).then((res) => {
        if (res.data?.ok && res.data?.data?.items) {
          const b = res.data.data.items.find((i) => i.branch_id === Number(branchIdFromUrl));
          setBranchInfo(b || null);
        }
      }).catch(() => setBranchInfo(null));
    } else {
      setBranchInfo(null);
    }
  }, [branchIdFromUrl]);

  useEffect(() => {
    loadChats();
  }, [branchFilter, branchIdFromUrl]);

  useEffect(() => {
    if (!chatId) {
      setChat(null);
      setMessages([]);
      setMessagesHasMore(true);
      setAiSummary('');
      setAiChatHistory([]);
      setAiContextReady(false);
      setAiSentToChatIndices(new Set());
      return;
    }
    setChat(null);
    setMessages([]);
    setMessagesHasMore(true);
    try {
      const rawChat = localStorage.getItem(AI_CHAT_STORAGE_PREFIX + chatId);
      const rawSummary = localStorage.getItem(AI_SUMMARY_STORAGE_PREFIX + chatId);
      const arr = rawChat ? JSON.parse(rawChat) : [];
      const savedSummary = rawSummary || '';
      setAiChatHistory(Array.isArray(arr) ? arr : []);
      setAiSummary(savedSummary);
      setAiContextReady(Boolean(savedSummary));
      setAiSentToChatIndices(new Set());
    } catch {
      setAiChatHistory([]);
      setAiSummary('');
      setAiContextReady(false);
      setAiSentToChatIndices(new Set());
    }
    loadChat();
  }, [chatId]);

  useEffect(() => {
    if (!chat || !chatId) return;
    setMessagesLoading(true);
    loadMessages(true).finally(() => setMessagesLoading(false));
    loadComments();
  }, [chat, chatId]);

  useEffect(() => {
    if (!chat || !chatId) return;
    const t = setInterval(() => {
      loadMessages(false, false, true);
      loadComments();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [chat, chatId]);

  useEffect(() => {
    const t = setInterval(() => {
      loadChats(false);
    }, CHAT_LIST_POLL_MS);
    return () => clearInterval(t);
  }, [branchFilter, branchIdFromUrl]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el || messages.length === 0) return;
    const src = scrollSourceRef.current;
    scrollSourceRef.current = null;
    if (scrollAdjustRef.current) {
      const { prevHeight, prevTop } = scrollAdjustRef.current;
      scrollAdjustRef.current = null;
      const apply = () => {
        const c = messagesContainerRef.current;
        if (c) c.scrollTop = prevTop + (c.scrollHeight - prevHeight);
      };
      requestAnimationFrame(() => requestAnimationFrame(apply));
    } else if (src === 'poll') {
      // poll, пользователь был выше — не трогаем скролл
    } else {
      // initial, poll-at-bottom, send — обязательно скролл вниз (последние сообщения)
      const goBottom = () => {
        const c = messagesContainerRef.current;
        if (c) c.scrollTop = c.scrollHeight;
      };
      goBottom();
      requestAnimationFrame(() => {
        goBottom();
        setTimeout(goBottom, 50);
        setTimeout(goBottom, 150);
      });
    }
  }, [messages]);

  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e) => {
      const main = document.querySelector('.crm-messenger');
      if (!main) return;
      const rect = main.getBoundingClientRect();
      const x = rect.right - e.clientX;
      const w = Math.min(AI_PANEL_MAX, Math.max(AI_PANEL_MIN, x));
      setAiPanelWidth(w);
    };
    const onUp = () => setIsResizing(false);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleMessagesScroll = (e) => {
    const el = e.target;
    if (el.scrollTop < 100 && messagesHasMore && !messagesLoadingMore && messages.length > 0) {
      loadMessages(false, true);
    }
  };

  const handleSend = async () => {
    const text = sendText.trim();
    if (!text || sending || !chatId) return;
    setSending(true);
    try {
      await sendChatMessage(chatId, text);
      setSendText('');
      loadMessages();
    } catch (err) {
      alert(err.message || 'Ошибка отправки');
    } finally {
      setSending(false);
    }
  };

  const markdownToPlain = (s) => (s || '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/`([^`]+)`/g, '$1').trim();

  /** Извлечь только текст сообщения для клиента (из блока ``` или между ---), без комментариев ИИ */
  const extractDraftForClient = (s) => {
    const raw = (s || '').trim();
    const codeBlock = raw.match(/```(?:[a-z]*)\n?([\s\S]*?)```/);
    if (codeBlock) return codeBlock[1].trim();
    const betweenDashes = raw.match(/---\s*\n([\s\S]*?)\n\s*---/);
    if (betweenDashes) return betweenDashes[1].trim();
    const afterFirstDash = raw.split(/\n---\s*\n/);
    if (afterFirstDash.length >= 2) return afterFirstDash[1].split(/\n---/)[0].trim();
    return null;
  };

  const handleSendAiMessageToChat = async (content, index) => {
    const draft = extractDraftForClient(content);
    if (!chatId || !draft) {
      alert('Не удалось выделить текст сообщения. Нажмите «Редактировать» и оставьте только текст для клиента.');
      return;
    }
    setAiSendingToChatIndex(index);
    try {
      await sendChatMessage(chatId, draft);
      loadMessages();
      setAiSentToChatIndices((prev) => new Set(prev).add(index));
      return true;
    } catch (err) {
      alert(err.message || 'Ошибка отправки');
      return false;
    } finally {
      setAiSendingToChatIndex(null);
    }
  };

  const handleEditAiMessage = (content) => {
    setAiChatInput(markdownToPlain(content));
  };

  const handleClearAiChat = () => {
    if (!chatId) return;
    if (!window.confirm('Очистить переписку с ИИ? Контекст (обобщение) тоже будет сброшен.')) return;
    setAiChatHistory([]);
    setAiSummary('');
    setAiContextReady(false);
    setAiSentToChatIndices(new Set());
    try {
      localStorage.removeItem(AI_CHAT_STORAGE_PREFIX + chatId);
      localStorage.removeItem(AI_SUMMARY_STORAGE_PREFIX + chatId);
    } catch (_) {}
  };

  const handleSummarize = async () => {
    if (!chatId || aiSummarizing) return;
    setAiSummarizing(true);
    setAiSummary('');
    setAiChatHistory([]);
    try {
      localStorage.removeItem(AI_CHAT_STORAGE_PREFIX + chatId);
    } catch (_) {}
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CRM_CHAT_SUMMARIZE(chatId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = '';
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
                text += data.t;
                setAiSummary(text);
              }
            } catch (_) {}
          }
        }
      }
      if (chatId && text) {
        try {
          localStorage.setItem(AI_SUMMARY_STORAGE_PREFIX + chatId, text);
        } catch (_) {}
      }
    } catch (err) {
      setAiSummary(`Ошибка: ${err.message || 'Не удалось получить обобщение.'}`);
    } finally {
      setAiSummarizing(false);
      setAiContextReady(true);
    }
  };

  const saveAiChatToStorage = (chatIdVal, history) => {
    if (!chatIdVal) return;
    try {
      localStorage.setItem(AI_CHAT_STORAGE_PREFIX + chatIdVal, JSON.stringify(history));
    } catch (_) {}
  };

  useEffect(() => {
    if (!aiVoiceRecording || !voiceStreamRef.current) return;
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
  }, [aiVoiceRecording]);

  const handleVoiceToggle = async () => {
    if (aiVoiceTranscribing) return;
    const token = localStorage.getItem('auth_token');
    if (aiVoiceRecording) {
      setAiVoiceRecording(false);
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
        setAiVoiceTranscribing(true);
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
            setAiChatInput((prev) => (prev ? `${prev} ${data.text}` : data.text));
          } else {
            alert(data?.error?.message || 'Не удалось распознать голос');
          }
        } catch (err) {
          alert(err.message || 'Ошибка распознавания');
        } finally {
          setAiVoiceTranscribing(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setAiVoiceRecording(true);
    } catch (err) {
      alert('Нет доступа к микрофону: ' + (err.message || ''));
    }
  };

  const handleAiChatSend = async () => {
    const text = aiChatInput.trim();
    if (!text || aiChatSending || !chatId) return;
    const userMsg = { role: 'user', content: text };
    const newHistory = [...aiChatHistory, userMsg];
    setAiChatHistory(newHistory);
    setAiChatInput('');
    setAiChatSending(true);
    saveAiChatToStorage(chatId, newHistory);
    const token = localStorage.getItem('auth_token');
    let assistantText = '';
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CRM_CHAT_AI_CHAT(chatId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text, history: aiChatHistory }),
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
                setAiChatHistory([...newHistory, { role: 'assistant', content: assistantText }]);
              }
            } catch (_) {}
          }
        }
      }
      const finalHistory = [...newHistory, { role: 'assistant', content: assistantText }];
      setAiChatHistory(finalHistory);
      saveAiChatToStorage(chatId, finalHistory);
      aiChatMessagesRef.current?.scrollTo(0, aiChatMessagesRef.current.scrollHeight);
    } catch (err) {
      const errMsg = { role: 'assistant', content: `Ошибка: ${err.message || 'Не удалось получить ответ.'}` };
      const errHistory = [...newHistory, errMsg];
      setAiChatHistory(errHistory);
      saveAiChatToStorage(chatId, errHistory);
    } finally {
      setAiChatSending(false);
    }
  };

  const handleAddComment = async () => {
    const text = commentText.trim();
    if (!text || commentSending || !chatId) return;
    setCommentSending(true);
    try {
      await apiClient.post(API_ENDPOINTS.CRM_CHAT_COMMENTS(chatId), { comment_text: text });
      setCommentText('');
      loadComments();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Ошибка');
    } finally {
      setCommentSending(false);
    }
  };

  const handleAddChat = async () => {
    const tid = telegramChatId.trim();
    const bid = branchFilter || branchIdFromUrl;
    if (!tid || !bid) return;
    const num = parseInt(tid, 10);
    if (Number.isNaN(num)) {
      alert('Chat ID должен быть числом');
      return;
    }
    setAddSaving(true);
    try {
      await apiClient.post(API_ENDPOINTS.CRM_CHATS, {
        branch_id: Number(bid),
        telegram_chat_id: num,
        display_name: displayName.trim() || undefined,
      });
      setIsAddModalOpen(false);
      setTelegramChatId('');
      setDisplayName('');
      loadChats();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Ошибка добавления чата');
    } finally {
      setAddSaving(false);
    }
  };

  const handleDeleteChat = async (cId, e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (!window.confirm('Удалить чат? История сообщений будет удалена.')) return;
    try {
      await apiClient.delete(API_ENDPOINTS.CRM_CHAT(cId));
      if (chatId === String(cId)) navigate(isBranchContext ? `/crm/chats?branch_id=${branchFilter || branchIdFromUrl}` : '/crm/chats');
      loadChats();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Ошибка');
    }
  };

  const goToChat = (id) => {
    const q = isBranchContext ? `?branch_id=${branchFilter || branchIdFromUrl}` : '';
    navigate(`/crm/chats/${id}${q}`);
  };

  const goToChatList = () => {
    const q = isBranchContext ? `?branch_id=${branchFilter || branchIdFromUrl}` : '';
    navigate(`/crm/chats${q}`);
  };

  const formatPreview = (msg) => {
    if (!msg || !msg.content_preview) return '—';
    const t = (msg.content_preview || '').replace(/\s+/g, ' ').trim();
    return t.length > 50 ? t.slice(0, 50) + '…' : t;
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('ru', { day: '2-digit', month: '2-digit' });
  };

  const getInitial = (name) => {
    if (!name || String(name).startsWith('Chat ')) return '?';
    const n = String(name).trim();
    return n[0]?.toUpperCase() || '?';
  };

  const unreadCount = (c) => (Number(c.unread_from_client) || 0) + (Number(c.unread_from_team) || 0);

  const branchOptions = [
    { value: '', label: 'Все филиалы' },
    ...branches.map((b) => ({ value: String(b.branch_id), label: b.name })),
  ];

  const title = chat ? (chat.display_name || `Chat ${chat.telegram_chat_id}`) : '';
  const chatInitial = title ? title.trim()[0]?.toUpperCase() : '?';

  const bgImage = theme === 'dark' ? BG_DARK : BG_LIGHT;

  return (
    <CRMLayout>
      <div
        className="crm-messenger"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        {/* Левая панель — список чатов */}
        <aside
          className={`crm-messenger-left ${chatId ? 'crm-messenger-left-hidden' : ''}`}
          style={{ width: CHAT_LIST_WIDTH }}
        >
          <div className="crm-messenger-left-header">
            {isBranchContext && branchInfo && (
              <Link to="/crm" className="crm-messenger-back-link">← Филиалы</Link>
            )}
            <h2 className="crm-messenger-left-title">
              {isBranchContext && branchInfo ? `${branchInfo.name} — Чаты` : 'Чаты'}
            </h2>
            {!isBranchContext && (
              <Select
                label=""
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                options={branchOptions}
                placeholder="Филиал"
              />
            )}
            {isBranchContext && (
              <Button variant="primary" onClick={() => setIsAddModalOpen(true)} className="crm-messenger-add-btn">
                Добавить чат
              </Button>
            )}
          </div>
          <div className="crm-messenger-left-list">
            {chatsLoading && chats.length === 0 ? (
              <div className="crm-messenger-loading"><LoadingSpinner /></div>
            ) : chats.length === 0 ? (
              <div className="crm-messenger-empty">
                <p>{isBranchContext ? 'Нет чатов. Добавьте чат или зайдите в Заявки.' : 'Нет чатов.'}</p>
              </div>
            ) : (
              <ul className="crm-messenger-chat-list">
                {chats.map((c) => (
                  <li
                    key={c.id}
                    className={`crm-messenger-chat-item ${chatId === String(c.id) ? 'active' : ''} ${unreadCount(c) > 0 ? 'has-unread' : ''}`}
                    onClick={() => goToChat(c.id)}
                  >
                    <div className="crm-messenger-chat-item-avatar">{getInitial(c.display_name)}</div>
                    <div className="crm-messenger-chat-item-body">
                      <div className="crm-messenger-chat-item-top">
                        <span className="crm-messenger-chat-name">{c.display_name || `Chat ${c.telegram_chat_id}`}</span>
                        <span className="crm-messenger-chat-item-right">
                          <span className="crm-messenger-chat-time">{formatTime(c.last_message?.created_at)}</span>
                          {unreadCount(c) > 0 && (
                            <span className="crm-messenger-chat-unread">{unreadCount(c)}</span>
                          )}
                        </span>
                      </div>
                      <div className="crm-messenger-chat-meta">{c.branch_name}</div>
                      <p className="crm-messenger-chat-preview">{formatPreview(c.last_message)}</p>
                    </div>
                    {isBranchContext && (
                      <Button variant="secondary" size="small" onClick={(e) => handleDeleteChat(c.id, e)} title="Удалить">×</Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Центр — чат (фон как в основном приложении) */}
        <main
          className="crm-messenger-center crm-messenger-center-with-bg"
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
          }}
        >
          {chatId ? (
            chat ? (
              <>
                <div className="crm-messenger-center-header">
                  <button type="button" className="crm-messenger-back-btn" onClick={goToChatList} aria-label="Назад">
                    ←
                  </button>
                  <div className="crm-messenger-center-header-main">
                    <div className="crm-messenger-center-avatar">{chatInitial}</div>
                    <div>
                      <h2 className="crm-messenger-center-title">{title}</h2>
                      <span className="crm-messenger-center-branch">{chat.branch_name}</span>
                    </div>
                  </div>
                  <div className="crm-messenger-center-actions">
                    <button
                      type="button"
                      className="crm-comments-btn"
                      onClick={() => { setCommentsModalOpen(true); loadComments(); }}
                      title="Комментарии"
                    >
                      <span className="crm-comments-btn-icon" aria-hidden>💬</span>
                      <span className="crm-comments-btn-text">Комментарии</span>
                      {comments.length > 0 && <span className="crm-comments-btn-count">({comments.length})</span>}
                    </button>
                    <button
                      type="button"
                      className={`crm-ai-toggle-btn ${aiPanelOpen ? 'open' : ''}`}
                      onClick={() => setAiPanelOpen(!aiPanelOpen)}
                      title={aiPanelOpen ? 'Закрыть ИИ-панель' : 'ИИ-помощник'}
                      aria-label="ИИ-помощник"
                    >
                      <IconOpenAI />
                    </button>
                  </div>
                </div>
                <div className="crm-messenger-center-body">
                  <div
                    className="crm-messenger-messages"
                    ref={messagesContainerRef}
                    onScroll={handleMessagesScroll}
                  >
                    {messagesLoadingMore && (
                      <div className="crm-messages-load-more"><LoadingSpinner /><span>Загрузка…</span></div>
                    )}
                    {messagesLoading ? (
                      <div className="crm-messages-loading"><LoadingSpinner /><p>Загрузка…</p></div>
                    ) : messages.length === 0 ? (
                      <p className="crm-messages-empty">Пока нет сообщений.</p>
                    ) : (
                      messages.map((m) => (
                        <div key={m.id} className={`crm-msg ${m.direction}`}>
                          <div className="crm-msg-meta">
                            {m.direction === 'out' ? `Вы` : 'Контакт'}
                            {' · '}
                            {m.created_at ? new Date(m.created_at).toLocaleString('ru') : ''}
                            {m.direction === 'out' && (
                              <span className="crm-msg-read">{m.read_by_me ? ' ✓✓' : ' ✓'}</span>
                            )}
                          </div>
                          <div className="crm-msg-text">{m.content || '—'}</div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  <div className="crm-send-row">
                    <input
                      type="text"
                      className="crm-send-input"
                      placeholder="Введите сообщение..."
                      value={sendText}
                      onChange={(e) => setSendText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                    />
                    <button
                      type="button"
                      className="crm-send-btn"
                      onClick={handleSend}
                      disabled={!sendText.trim() || sending}
                      aria-label="Отправить"
                    >
                      ▶
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="crm-messenger-loading"><LoadingSpinner /><p>Загрузка чата…</p></div>
            )
          ) : (
            <div className="crm-messenger-welcome">
              <div className="crm-messenger-welcome-header">
                <p>Выберите чат слева или перейдите из раздела Филиалы.</p>
                <button
                  type="button"
                  className={`crm-ai-toggle-btn ${aiPanelOpen ? 'open' : ''}`}
                  onClick={() => setAiPanelOpen(!aiPanelOpen)}
                  title={aiPanelOpen ? 'Закрыть ИИ-панель' : 'ИИ-помощник'}
                  aria-label="ИИ-помощник"
                >
                  <IconOpenAI />
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Делитель (ресайз) и правая панель ИИ */}
        {aiPanelOpen && (
          <div
            className={`crm-messenger-resizer ${isResizing ? 'active' : ''}`}
            onMouseDown={handleResizeStart}
            role="separator"
            aria-orientation="vertical"
          />
        )}
        <aside
          className={`crm-messenger-right ${aiPanelOpen ? 'open' : ''}`}
          style={aiPanelOpen && !isMobile ? { width: aiPanelWidth, minWidth: aiPanelWidth } : undefined}
        >
          <div className="crm-messenger-right-inner" style={aiPanelOpen && !isMobile ? { width: aiPanelWidth } : undefined}>
            <div className="crm-messenger-right-header">
              <span className="crm-messenger-right-title">
                <IconOpenAI /> ИИ-помощник
              </span>
              <button
                type="button"
                className="crm-messenger-right-close"
                onClick={() => setAiPanelOpen(false)}
                aria-label="Назад в чат"
              >
                ← Назад
              </button>
            </div>
            <div className="crm-messenger-right-content">
              {!chatId ? (
                <p className="crm-ai-placeholder">Выберите чат.</p>
              ) : !aiContextReady ? (
                <div className="crm-ai-init">
                  <p className="crm-ai-init-hint">
                    Сначала обобщите контекст — ИИ получит историю переписки, информацию о филиале и сможет помогать с ответами клиенту.
                  </p>
                  {aiSummarizing && !aiSummary && (
                    <div className="crm-ai-thinking">
                      <span className="crm-ai-thinking-spinner" />
                      <span>Думает</span>
                    </div>
                  )}
                  <button
                    type="button"
                    className="crm-ai-summarize-btn"
                    onClick={handleSummarize}
                    disabled={aiSummarizing}
                  >
                    {aiSummarizing ? 'Обобщаю…' : 'Обобщить контекст'}
                  </button>
                </div>
              ) : (
                <div className="crm-ai-chat">
                  <div className="crm-ai-chat-toolbar">
                    <button
                      type="button"
                      className="crm-ai-clear-btn"
                      onClick={handleClearAiChat}
                      title="Очистить переписку с ИИ"
                    >
                      🗑 Очистить чат
                    </button>
                  </div>
                  <div className="crm-ai-chat-messages" ref={aiChatMessagesRef}>
                    {aiSummary && (
                      <div className="crm-ai-chat-msg crm-ai-chat-msg-assistant">
                        <span className="crm-ai-chat-role">О чём чат</span>
                        <div className="crm-ai-summary">
                          <ReactMarkdown>{aiSummary}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                    {aiChatHistory.map((m, i) => (
                      <div key={i} className={`crm-ai-chat-msg crm-ai-chat-msg-${m.role}`}>
                        <span className="crm-ai-chat-role">{m.role === 'user' ? 'Вы' : 'ИИ'}</span>
                        <div className="crm-ai-chat-msg-text">
                          {m.role === 'assistant' ? (
                            <ReactMarkdown>{m.content || ''}</ReactMarkdown>
                          ) : (
                            m.content
                          )}
                        </div>
                        {m.role === 'assistant' && (m.content || '').trim() && (
                          <div className="crm-ai-chat-msg-actions">
                            {aiSentToChatIndices.has(i) ? (
                              <span className="crm-ai-sent-badge">✓ Отправлено в чат</span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="crm-ai-send-to-chat-btn"
                                  onClick={() => handleSendAiMessageToChat(m.content, i)}
                                  disabled={aiSendingToChatIndex !== null}
                                  title="Отправить в чат клиенту"
                                >
                                  {aiSendingToChatIndex === i ? '…' : 'Отправить в чат'}
                                </button>
                                <button
                                  type="button"
                                  className="crm-ai-edit-msg-btn"
                                  onClick={() => handleEditAiMessage(m.content)}
                                  title="Редактировать и отправить ИИ"
                                >
                                  Редактировать
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {aiChatSending && aiChatHistory.length > 0 && aiChatHistory[aiChatHistory.length - 1]?.role === 'user' && (
                      <div className="crm-ai-chat-msg crm-ai-chat-msg-assistant">
                        <span className="crm-ai-chat-role">ИИ</span>
                        <div className="crm-ai-thinking">
                          <span className="crm-ai-thinking-spinner" />
                          <span>Думает</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="crm-ai-chat-input-row">
                    <button
                      type="button"
                      className={`crm-ai-voice-btn ${aiVoiceRecording ? 'recording' : ''} ${aiVoiceTranscribing ? 'transcribing' : ''}`}
                      onClick={handleVoiceToggle}
                      disabled={aiVoiceTranscribing}
                      title={aiVoiceTranscribing ? 'Распознавание…' : aiVoiceRecording ? 'Остановить запись' : 'Голосовой ввод'}
                      aria-label="Голосовой ввод"
                    >
                      <IconVoice />
                    </button>
                    {aiVoiceRecording ? (
                      <div className="crm-ai-voice-viz">
                        {Array.from({ length: 12 }).map((_, i) => (
                          <span
                            key={i}
                            className="crm-ai-voice-bar"
                            style={{ height: `${8 + (voiceVolume / 100) * 24 * (0.6 + 0.4 * Math.sin((i / 12) * Math.PI))}px` }}
                          />
                        ))}
                      </div>
                    ) : aiVoiceTranscribing ? (
                      <div className="crm-ai-voice-loading">
                        <span className="crm-ai-thinking-spinner" />
                        <span>Распознавание…</span>
                      </div>
                    ) : aiInputExpanded ? (
                      <div className="crm-ai-chat-input-expanded">
                        <textarea
                          className="crm-send-input crm-send-input-textarea"
                          placeholder="Напишите ИИ..."
                          value={aiChatInput}
                          onChange={(e) => setAiChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAiChatSend())}
                          rows={4}
                          autoFocus
                        />
                        <div className="crm-ai-chat-input-actions">
                          <button
                            type="button"
                            className="crm-ai-expand-btn"
                            onClick={() => setAiInputExpanded(false)}
                            title="Свернуть"
                            aria-label="Свернуть"
                          >
                            <IconExpand expanded />
                          </button>
                          <button
                            type="button"
                            className="crm-ai-share-btn"
                            onClick={() => navigator.clipboard?.writeText(aiChatInput) || null}
                            disabled={!aiChatInput.trim()}
                            title="Поделиться (копировать)"
                            aria-label="Поделиться"
                          >
                            Поделиться
                          </button>
                          <button
                            type="button"
                            className="crm-send-btn"
                            onClick={handleAiChatSend}
                            disabled={!aiChatInput.trim() || aiChatSending}
                            aria-label="Отправить"
                          >
                            Отправить
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          className="crm-send-input"
                          placeholder="Напишите ИИ..."
                          value={aiChatInput}
                          onChange={(e) => setAiChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAiChatSend())}
                        />
                        <button
                          type="button"
                          className="crm-ai-expand-btn"
                          onClick={() => setAiInputExpanded(true)}
                          title="Развернуть"
                          aria-label="Развернуть"
                        >
                          <IconExpand expanded={false} />
                        </button>
                        <button
                          type="button"
                          className="crm-send-btn"
                          onClick={handleAiChatSend}
                          disabled={!aiChatInput.trim() || aiChatSending}
                          aria-label="Отправить"
                        >
                          ▶
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      <Modal isOpen={commentsModalOpen} onClose={() => setCommentsModalOpen(false)} title="Комментарии к чату">
        <div className="crm-comments-modal">
          <div className="crm-comments-list">
            {comments.length === 0 ? (
              <p className="crm-comments-empty">Нет комментариев.</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="crm-comment">
                  <div className="crm-comment-meta">{c.user_login} · {c.created_at ? new Date(c.created_at).toLocaleString('ru') : ''}</div>
                  <div className="crm-comment-text">{c.comment_text}</div>
                </div>
              ))
            )}
          </div>
          <div className="crm-comment-form">
            <input
              type="text"
              className="crm-send-input"
              placeholder="Новый комментарий..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddComment())}
            />
            <Button variant="primary" onClick={handleAddComment} disabled={!commentText.trim() || commentSending}>
              Добавить
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setTelegramChatId(''); setDisplayName(''); }}
        title="Добавить чат"
      >
        <Input
          label="Telegram Chat ID"
          value={telegramChatId}
          onChange={(e) => setTelegramChatId(e.target.value)}
          placeholder="Например: 123456789"
        />
        <Input
          label="Имя контакта (необязательно)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Для отображения в CRM"
        />
        <div className="crm-modal-actions">
          <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>Отмена</Button>
          <Button variant="primary" onClick={handleAddChat} disabled={!telegramChatId.trim() || addSaving}>
            {addSaving ? 'Сохранение…' : 'Добавить'}
          </Button>
        </div>
      </Modal>
    </CRMLayout>
  );
};

export default CRMChatsMessenger;
