import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout/Layout';
import Button from '../../components/Button/Button';
import Card from '../../components/Card/Card';
import LoadingSpinner from '../../components/Loading/LoadingSpinner';
import certificateService from '../../services/certificateService';
import CertificateProfile, { CertificateIcon } from './CertificateProfile';
import { certificateDownloadError, certificateError, certificateLink, certificateStatus, isCertificateValid, saveCertificateFile } from './certificateData';
import './Certificates.css';

export function CertificateShareActions({ certificate, onDownload, busy, onError, onCopied }) {
  const link = certificateLink(certificate);
  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Копирование недоступно в этом браузере. Выделите ссылку и скопируйте её вручную.');
      await navigator.clipboard.writeText(link);
      onCopied?.('Ссылка скопирована');
    } catch (error) { onError?.(certificateError(error)); }
  };
  return <div className="tc-share-actions">{link && <><a href={link} target="_blank" rel="noreferrer" className="btn btn-secondary">Открыть сертификат <span aria-hidden="true">↗</span></a><Button variant="secondary" onClick={copy}><CertificateIcon kind="link" />Копировать ссылку</Button></>}<Button onClick={onDownload} disabled={busy}><CertificateIcon kind="download" />{busy ? 'Готовим PDF…' : 'Скачать PDF'}</Button></div>;
}

export default function MyCertificate() {
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError('');
    certificateService.mine(controller.signal).then(data => { if (active) setCertificate(data); }).catch(e => { if (active && e?.code !== 'ERR_CANCELED') setError(certificateError(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [attempt]);
  const download = async () => {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { saveCertificateFile(await certificateService.pdf(), `Сертификат-${certificate.number}.pdf`); }
    catch (e) { setError(await certificateDownloadError(e)); }
    finally { setBusy(false); }
  };
  const valid = isCertificateValid(certificate);
  return <Layout><div className="tc-workspace"><div className="tc-page-heading"><div><h1>Мой сертификат</h1><p className="page-description">Ваш профиль преподавателя, ссылка для родителей и документ в PDF</p></div>{valid && <CertificateShareActions certificate={certificate} onDownload={download} busy={busy} onError={setError} onCopied={setNotice} />}</div>
    {error && <div role="alert" className="tc-alert tc-alert-error">{error}{!certificate && <Button size="small" variant="secondary" onClick={() => setAttempt(value => value + 1)}>Повторить загрузку</Button>}</div>}{notice && <div role="status" className="tc-alert tc-alert-success">{notice}</div>}
    {loading ? <LoadingSpinner text="Загрузка сертификата…" /> : certificate ? <>{!valid && <div className="tc-alert tc-alert-info">{certificateStatus(certificate) === 'draft' ? 'Сертификат ещё не опубликован. Администратор оформит профиль и откроет доступ к PDF и публичной ссылке.' : 'Сертификат недействителен. Публичный профиль и скачивание PDF недоступны. Обратитесь к администратору.'}</div>}{valid && (certificateLink(certificate) ? <div className="tc-share-link"><span>Ваша публичная ссылка</span><a href={certificateLink(certificate)} target="_blank" rel="noreferrer">{certificateLink(certificate)}</a></div> : <div className="tc-alert tc-alert-info">Публичная ссылка временно недоступна. Обратитесь к администратору.</div>)}<CertificateProfile certificate={certificate} preview /></> : !error && <Card><div className="tc-empty-state"><CertificateIcon /><h2>Сертификат пока не создан</h2><p>Администратор подготовит вашу карточку преподавателя. После публикации здесь появятся QR-код, ссылка и PDF.</p></div></Card>}
  </div></Layout>;
}
