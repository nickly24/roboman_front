import React, { useEffect, useState } from 'react';
import Brand from '../../components/Brand/Brand';
import certificateService from '../../services/certificateService';
import { certificateDate, certificateLink, certificateStatus, CERTIFICATE_STATUS_LABELS } from './certificateData';
import './Certificates.css';

export function CertificateIcon({ kind = 'certificate', ...props }) {
  const paths = {
    certificate: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h5" /><circle cx="15" cy="16" r="2" /><path d="m13 18-1 3 3-1 3 1-1-3" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
    study: <><path d="m2 9 10-5 10 5-10 5-10-5ZM6 11v6c4 3 8 3 12 0v-6M22 9v7" /></>,
    branch: <><path d="m3 10 9-7 9 7v10H3V10Z" /><path d="M9 20v-6h6v6M7 10h1M16 10h1" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></>,
    link: <><path d="m10 13 4-4M8 15l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m-1 3 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0" transform="translate(2 0)" /></>,
  };
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[kind] || paths.certificate}</svg>;
}

function CertificateMedia({ certificate, token, kind }) {
  const [url, setUrl] = useState('');
  const [state, setState] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl;
    let active = true;
    setState('loading');
    setUrl('');
    certificateService.media(certificate, kind, token, controller.signal).then(blob => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
      setState('ready');
    }).catch(error => {
      if (active && error?.code !== 'ERR_CANCELED') setState('error');
    });
    return () => { active = false; controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [certificate, token, kind, attempt]);
  return <div className={`tc-media tc-media-${kind}`}>
    {url ? <img src={url} alt={kind === 'photo' ? `Фотография преподавателя: ${certificate.teacher_name}` : 'QR-код для проверки сертификата'} onError={() => { setUrl(''); setState('error'); }} /> : state === 'error' ? <button type="button" className="tc-media-retry" onClick={() => setAttempt(value => value + 1)}>{kind === 'photo' ? 'Загрузить фотографию повторно' : 'Загрузить QR-код повторно'}</button> : <span role="status">{kind === 'photo' ? 'Загрузка фото…' : 'Загрузка QR…'}</span>}
  </div>;
}

export function CertificateStatus({ certificate }) {
  const status = certificateStatus(certificate);
  return <span className={`tc-status tc-status-${status}`}><span aria-hidden="true" />{status === 'revoked' && certificate.status === 'published' ? 'Недействителен' : CERTIFICATE_STATUS_LABELS[status]}</span>;
}

export default function CertificateProfile({ certificate, token, preview = false }) {
  const status = certificateStatus(certificate);
  const valid = status === 'published' && certificate.is_valid !== false;
  const branches = Array.isArray(certificate.branches) ? certificate.branches : [];
  const link = certificateLink(certificate);
  const name = certificate.teacher_name || 'Преподаватель';
  return <article className={`tc-profile ${preview ? 'tc-profile-preview' : ''}`} aria-label={`Сертификат преподавателя ${name}`}>
    <header className="tc-profile-header"><Brand /><span className="tc-document-label">Профиль преподавателя</span></header>
    <div className="tc-profile-content">
      <div className="tc-profile-main">
        <div className="tc-profile-person">
          {certificate.has_photo ? <CertificateMedia certificate={certificate} token={token} kind="photo" /> : <div className="tc-photo-placeholder" aria-label="Фотография не загружена"><CertificateIcon /><span>Фотография<br />преподавателя</span></div>}
          <div className="tc-person-details">
            <div className="tc-eyebrow"><CertificateIcon kind={valid ? 'check' : 'certificate'} />{valid ? 'Преподаватель IT Club' : 'Предварительный просмотр'}</div>
            <h1 className="tc-person-name">{name}</h1>
            <p className="tc-person-role">Робототехника и творческое мышление</p>
            <div className="tc-document-meta"><span>Сертификат <strong>№ {certificate.number}</strong></span><span>Выдан: {certificateDate(certificate.issued_at)}</span></div>
            {preview ? <CertificateStatus certificate={certificate} /> : <span className="tc-verified"><CertificateIcon kind="check" />Действующий сертификат</span>}
          </div>
        </div>
        <section className="tc-about"><h2>О преподавателе</h2><p className="tc-prose">{certificate.description || 'Описание ещё не заполнено.'}</p></section>
        {(certificate.university || certificate.study_program) && <section className="tc-education"><div className="tc-section-icon"><CertificateIcon kind="study" /></div><div><h2>Образование</h2>{certificate.university && <p className="tc-university">{certificate.university}</p>}{certificate.study_program && <p className="tc-study-program">{certificate.study_program}</p>}</div></section>}
        <section className="tc-branches"><div className="tc-section-heading"><div><h2>Закреплённые сады</h2><p>Преподаватель ведёт занятия в этих филиалах</p></div><span className="tc-count">{branches.length}</span></div>
          {branches.length ? <ul>{branches.map((branch, index) => <li key={`${branch.name}-${index}`}><span className="tc-section-icon"><CertificateIcon kind="branch" /></span><div><h3>{branch.name}</h3>{branch.address && <p>{branch.address}</p>}</div></li>)}</ul> : <p className="tc-empty-branches">Сады пока не закреплены за преподавателем.</p>}
        </section>
      </div>
      <aside className="tc-verification"><div className="tc-verification-top"><CertificateIcon kind="certificate" /><span>Цифровой сертификат</span></div><h2>Проверить<br />по QR-коду</h2><p>Откройте актуальный профиль преподавателя на платформе IT Club.</p>
        {valid ? <CertificateMedia certificate={certificate} token={token} kind="qr" /> : <div className="tc-qr-placeholder"><CertificateIcon /><span>QR-код станет доступен<br />после публикации</span></div>}
        <strong className="tc-verification-number">№ {certificate.number}</strong>{link && valid && <a className="tc-verification-link" href={link} target="_blank" rel="noreferrer">Открыть сертификат <span aria-hidden="true">↗</span></a>}
        <div className="tc-verification-note">PDF отражает сведения на дату скачивания. Актуальность сертификата можно проверить по этой ссылке.</div>
      </aside>
    </div>
    <footer className="tc-profile-footer"><span>IT Club · Учим создавать будущее</span><span>Сертификат подтверждает профиль преподавателя в клубе</span></footer>
  </article>;
}
