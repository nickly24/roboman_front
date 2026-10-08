import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Brand from '../../components/Brand/Brand';
import certificateService from '../../services/certificateService';
import CertificateProfile, { CertificateIcon } from './CertificateProfile';
import './Certificates.css';

export default function PublicCertificate() {
  const { token } = useParams();
  const [certificate, setCertificate] = useState(null);
  const [state, setState] = useState('loading');
  const [invalidNumber, setInvalidNumber] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setState('loading');
    setCertificate(null);
    setInvalidNumber('');
    certificateService.public(token, controller.signal).then(data => { if (active) { setCertificate(data); setState('ready'); } }).catch(error => {
      if (!active || error?.code === 'ERR_CANCELED') return;
      const status = error?.response?.status;
      if (status === 410) { setInvalidNumber(error.response.data?.data?.number || ''); setState('invalid'); }
      else setState(status === 404 ? 'missing' : 'error');
    });
    return () => { active = false; controller.abort(); };
  }, [token, attempt]);
  useEffect(() => {
    const previous = document.title;
    document.title = certificate ? `${certificate.teacher_name} — сертификат IT Club` : 'Сертификат преподавателя — IT Club';
    return () => { document.title = previous; };
  }, [certificate]);
  return <main className="tc-public-page">
    {state === 'ready' && certificate ? <CertificateProfile certificate={certificate} token={token} /> : <div className="tc-public-state"><Brand /><div className={`tc-state-symbol ${state === 'invalid' ? 'tc-state-invalid' : ''}`}><CertificateIcon /></div>{state === 'loading' ? <p role="status">Загрузка сертификата…</p> : <><h1>{state === 'invalid' ? 'Сертификат недействителен' : state === 'missing' ? 'Сертификат не найден' : 'Не удалось загрузить сертификат'}</h1>{invalidNumber && <p className="tc-state-number">№ {invalidNumber}</p>}<p>{state === 'invalid' ? 'Этот документ больше не подтверждает действующий профиль преподавателя IT Club.' : state === 'missing' ? 'Проверьте ссылку или обратитесь к администратору IT Club.' : 'Проверьте подключение к интернету и попробуйте ещё раз.'}</p>{state === 'error' && <button type="button" className="btn btn-primary" onClick={() => setAttempt(value => value + 1)}>Повторить загрузку</button>}</> }</div>}
    <p className="tc-public-caption">Цифровой профиль преподавателя IT Club</p>
  </main>;
}
