import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import CRMLayout from '../../components/CRMLayout/CRMLayout';
import Button from '../../components/Button/Button';
import Modal from '../../components/Modal/Modal';
import LoadingSpinner from '../../components/Loading/LoadingSpinner';
import './CRM.css';

const POLL_INTERVAL_MS = 3000;

const CRMChatView = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendText, setSendText] = useState('');
  const [sending, setSending] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const loadChat = async () => {
    try {
      const res = await apiClient.get(API_ENDPOINTS.CRM_CHAT(chatId));
      if (res.data?.ok) setChat(res.data.data);
      else setChat(null);
    } catch (e) {
      console.error(e);
      setChat(null);
    }
  };

  const loadMessages = async (markRead = false) => {
    try {
      const res = await apiClient.get(`${API_ENDPOINTS.CRM_CHAT_MESSAGES(chatId)}?limit=200&offset=0`);
      if (res.data?.ok && res.data?.data?.items) {
        const list = res.data.data.items;
        setMessages([...list].reverse());
        if (markRead && list.length > 0) {
          const maxId = Math.max(...list.map((m) => m.id));
          try {
            await apiClient.post(API_ENDPOINTS.CRM_CHAT_READ(chatId), { last_message_id: maxId });
          } catch (_) {}
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadComments = async () => {
    try {
      const res = await apiClient.get(API_ENDPOINTS.CRM_CHAT_COMMENTS(chatId));
      if (res.data?.ok && res.data?.data?.items) setComments(res.data.data.items);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setLoading(true);
    setChat(null);
    loadChat().then(() => setLoading(false));
  }, [chatId]);

  useEffect(() => {
    if (!chat) return;
    setMessagesLoading(true);
    loadMessages(true).finally(() => setMessagesLoading(false));
    loadComments();
  }, [chat, chatId]);

  useEffect(() => {
    if (!chat) return;
    const t = setInterval(() => {
      loadMessages();
      loadComments();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [chat, chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    const text = sendText.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await apiClient.post(API_ENDPOINTS.CRM_CHAT_MESSAGES(chatId), { content: text });
      setSendText('');
      loadMessages();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Ошибка отправки');
    } finally {
      setSending(false);
    }
  };

  const handleAddComment = async () => {
    const text = commentText.trim();
    if (!text || commentSending) return;
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

  if (loading && !chat) {
    return (
      <CRMLayout>
        <div className="crm-page"><LoadingSpinner /></div>
      </CRMLayout>
    );
  }

  if (!loading && !chat) {
    return (
      <CRMLayout>
        <div className="crm-page">
          <p>Чат не найден.</p>
          <Button variant="secondary" onClick={() => navigate('/crm')}>К филиалам</Button>
        </div>
      </CRMLayout>
    );
  }

  const title = chat ? (chat.display_name || `Chat ${chat.telegram_chat_id}`) : '';
  const branchName = chat ? chat.branch_name : '';
  const chatInitial = title ? title.trim()[0].toUpperCase() : '?';

  return (
    <CRMLayout>
      <div className="crm-page crm-chat-page">
        <div className="crm-chat-view-header">
          <Button variant="secondary" className="crm-chat-back-btn" onClick={() => navigate(chat ? `/crm/branches/${chat.branch_id}/chats` : '/crm')}>
            ← Чаты
          </Button>
          {chat && (
            <div className="crm-chat-view-header-main">
              <div className="crm-chat-view-avatar" aria-hidden>{chatInitial}</div>
              <div className="crm-chat-view-title-wrap">
                <h2 className="crm-chat-view-title">{title} {branchName ? `— ${branchName}` : ''}</h2>
                <span className="crm-chat-view-status">Чат с клиентом</span>
              </div>
              <div className="crm-chat-header-actions">
                <button
                  type="button"
                  className="crm-comments-btn"
                  onClick={() => { setCommentsModalOpen(true); loadComments(); }}
                >
                  <span className="crm-comments-btn-icon" aria-hidden>💬</span>
                  Комментарии
                  {comments.length > 0 && (
                    <span className="crm-comments-btn-count">({comments.length})</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {chat && (
          <div className="crm-chat-fullwidth">
            <div className="crm-chat-body">
              <div className="crm-messages-list">
                {messagesLoading ? (
                  <div className="crm-messages-loading">
                    <LoadingSpinner />
                    <p>Загрузка сообщений…</p>
                  </div>
                ) : messages.length === 0 ? (
                  <p className="crm-messages-empty">Пока нет сообщений.</p>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`crm-msg ${m.direction}`}>
                      <div className="crm-msg-meta">
                        {m.direction === 'out' ? `Вы${m.sent_by_login ? ` (${m.sent_by_login})` : ''}` : 'Контакт'}
                        {' · '}
                        {m.created_at ? new Date(m.created_at).toLocaleString('ru') : ''}
                        {m.updated_at && m.updated_at !== m.created_at && ' (ред.)'}
                        {m.direction === 'out' && (
                          <span className="crm-msg-read" title={m.read_by_me ? 'Прочитано' : 'Отправлено'}>
                            {m.read_by_me ? ' ✓✓' : ' ✓'}
                          </span>
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
                  title="Отправить"
                  aria-label="Отправить"
                >
                  <span className="crm-send-btn-icon" aria-hidden>▶</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <Modal
          isOpen={commentsModalOpen}
          onClose={() => setCommentsModalOpen(false)}
          title="Комментарии к чату"
        >
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
                {commentSending ? '…' : 'Добавить'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </CRMLayout>
  );
};

export default CRMChatView;
