import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import Modal from '../../components/Modal/Modal';
import Button from '../../components/Button/Button';
import LoadingSpinner from '../../components/Loading/LoadingSpinner';
import './InstructionDetailsModal.css';

const InstructionDetailsModal = ({ isOpen, onClose, instruction }) => {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const title = instruction?.name ? `Инструкция: ${instruction.name}` : 'Инструкция';

  // чистим object URL при закрытии/смене
  useEffect(() => {
    if (!isOpen) {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl('');
      setPdfError('');
      setPdfLoading(false);
      setIsFullscreen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const meta = useMemo(() => {
    if (!instruction) return null;
    return {
      section: instruction.section_name || `Тема #${instruction.section_id}`,
      description: instruction.description || '—',
      filename: instruction.pdf_filename || 'instruction.pdf',
      mime: instruction.pdf_mime || 'application/pdf',
    };
  }, [instruction]);

  const loadPdf = async () => {
    if (!instruction?.id) return;
    setPdfError('');
    setPdfLoading(true);
    try {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl('');

      const resp = await apiClient.get(API_ENDPOINTS.INSTRUCTION_PDF(instruction.id), {
        responseType: 'blob',
        headers: { Accept: 'application/pdf' },
      });
      const blob = new Blob([resp.data], { type: meta?.mime || 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (e) {
      const msg = e?.response?.data?.error?.message || e?.response?.data?.message;
      setPdfError(msg || 'Не удалось загрузить PDF');
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleClose = () => onClose?.();

  if (!isOpen || !instruction) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title={title} size="large">
      <div className="instruction-details">
        <div className="instruction-meta">
          <div className="instruction-meta-row">
            <span className="instruction-meta-label">Тема</span>
            <span className="instruction-meta-value">{meta?.section}</span>
          </div>
          <div className="instruction-meta-row">
            <span className="instruction-meta-label">Описание</span>
            <span className="instruction-meta-value">{meta?.description}</span>
          </div>
        </div>

        <div className="instruction-actions">
          <Button variant="primary" onClick={loadPdf} disabled={pdfLoading}>
            {pdfLoading ? 'Загрузка PDF…' : 'Смотреть инструкцию'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setIsFullscreen(true)}
            disabled={!pdfUrl}
            title={!pdfUrl ? 'Сначала нажмите «Смотреть инструкцию»' : 'Открыть на весь экран'}
          >
            Развернуть
          </Button>
          <Button variant="secondary" onClick={handleClose}>
            Закрыть
          </Button>
        </div>

        <div className="instruction-pdf">
          {!pdfUrl && !pdfLoading && (
            <div className="instruction-pdf-placeholder">
              Нажмите «Смотреть инструкцию», чтобы открыть PDF ниже.
            </div>
          )}
          {pdfLoading && <LoadingSpinner size="medium" text="Загрузка PDF..." />}
          {pdfError && <div className="instruction-pdf-error">{pdfError}</div>}
          {pdfUrl && (
            <iframe
              title="instruction-pdf"
              className="instruction-pdf-frame"
              src={pdfUrl}
            />
          )}
        </div>
      </div>
      </Modal>

      <Modal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={title}
        size="fullscreen"
      >
        <div className="instruction-fullscreen">
          {pdfUrl ? (
            <iframe title="instruction-pdf-fullscreen" className="instruction-pdf-frame-full" src={pdfUrl} />
          ) : (
            <div style={{ padding: 24 }}>
              <LoadingSpinner size="medium" text="PDF ещё не загружен..." />
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default InstructionDetailsModal;

