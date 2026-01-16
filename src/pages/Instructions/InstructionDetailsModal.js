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
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [openError, setOpenError] = useState('');

  const title = instruction?.name ? `Инструкция: ${instruction.name}` : 'Инструкция';

  // чистим object URL при закрытии/смене
  useEffect(() => {
    if (!isOpen) {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      setPdfUrl('');
      setPdfError('');
      setPdfLoading(false);
      setPhotoUrl('');
      setPhotoError('');
      setPhotoLoading(false);
      setOpenError('');
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

  const loadPhoto = async () => {
    if (!instruction?.id || !instruction?.has_photo) return;
    setPhotoError('');
    setPhotoLoading(true);
    try {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      setPhotoUrl('');
      const resp = await apiClient.get(API_ENDPOINTS.INSTRUCTION_PHOTO(instruction.id), {
        responseType: 'blob',
        headers: { Accept: 'image/*' },
      });
      const blob = new Blob([resp.data], { type: resp.data?.type || 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      setPhotoUrl(url);
    } catch (e) {
      const msg = e?.response?.data?.error?.message || e?.response?.data?.message;
      setPhotoError(msg || 'Не удалось загрузить фото');
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setPhotoLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && instruction?.has_photo) {
      loadPhoto();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, instruction?.id]);

  const handleClose = () => onClose?.();
  const handleOpenInNewTab = () => {
    if (!pdfUrl) return;
    const win = window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    if (!win) {
      setOpenError('Не удалось открыть вкладку. Разрешите всплывающие окна.');
    } else {
      setOpenError('');
    }
  };

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
          <div className="instruction-meta-row">
            <span className="instruction-meta-label">Фото</span>
            <span className="instruction-meta-value">
              {photoLoading && 'Загрузка...'}
              {!photoLoading && photoUrl && (
                <img className="instruction-photo-preview" src={photoUrl} alt="Фото инструкции" />
              )}
              {!photoLoading && !photoUrl && instruction?.has_photo && photoError && (
                <span className="instruction-photo-error">{photoError}</span>
              )}
              {!photoLoading && !photoUrl && !instruction?.has_photo && '—'}
            </span>
          </div>
        </div>

        <div className="instruction-actions">
          <Button variant="primary" onClick={loadPdf} disabled={pdfLoading}>
            {pdfLoading ? 'Загрузка PDF…' : 'Смотреть инструкцию'}
          </Button>
          <Button
            variant="secondary"
            onClick={handleOpenInNewTab}
            disabled={!pdfUrl}
            title={!pdfUrl ? 'Сначала нажмите «Смотреть инструкцию»' : 'Открыть в новой вкладке'}
          >
            Открыть в новой вкладке
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
          {openError && <div className="instruction-pdf-error">{openError}</div>}
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
    </>
  );
};

export default InstructionDetailsModal;

