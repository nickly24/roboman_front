import React, { useEffect, useRef, useState } from 'react';
import { ErrorNotice, Icon } from './CurriculumUI';

export default function CurriculumPdf({ url, name }) {
  const container = useRef(null), canvas = useRef(null);
  const [document, setDocument] = useState(null), [page, setPage] = useState(1), [draft, setDraft] = useState('1'), [width, setWidth] = useState(700), [zoom, setZoom] = useState(1), [loading, setLoading] = useState(true), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true, task; setDocument(null); setPage(1); setDraft('1'); setError(''); setLoading(true);
    import('pdfjs-dist/build/pdf.mjs').then(pdfjs => {
      if (!active) return;
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
      task = pdfjs.getDocument({ url });
      return task.promise.then(pdf => { if (active) setDocument(pdf); });
    }).catch(() => { if (active) { setError('Не удалось прочитать PDF. Можно повторить или открыть оригинал кнопкой выше.'); setLoading(false); } });
    return () => { active = false; task?.destroy(); };
  }, [url, retry]);
  useEffect(() => {
    const element = container.current;
    const resize = () => setWidth(Math.max(180, element.clientWidth - 24));
    resize(); const observer = new ResizeObserver(resize); observer.observe(element); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!document) return;
    let active = true, render; setLoading(true); setError('');
    document.getPage(page).then(pdfPage => {
      if (!active) return;
      const base = pdfPage.getViewport({ scale: 1 }), viewport = pdfPage.getViewport({ scale: width / base.width * zoom }), ratio = Math.min(window.devicePixelRatio || 1, 2), element = canvas.current;
      element.width = Math.floor(viewport.width * ratio); element.height = Math.floor(viewport.height * ratio);
      element.style.width = `${viewport.width}px`; element.style.height = `${viewport.height}px`;
      render = pdfPage.render({ canvasContext: element.getContext('2d'), viewport, transform: ratio === 1 ? null : [ratio, 0, 0, ratio, 0, 0] });
      return render.promise;
    }).then(() => { if (active) setLoading(false); }).catch(e => { if (active && e.name !== 'RenderingCancelledException') { setError('Не удалось показать страницу.'); setLoading(false); } });
    return () => { active = false; render?.cancel(); };
  }, [document, page, width, zoom]);
  const go = value => { const next = Math.min(document?.numPages || 1, Math.max(1, Math.trunc(Number(value)) || page)); setPage(next); setDraft(String(next)); if (container.current) { container.current.scrollTop = 0; container.current.scrollLeft = 0; } };
  return <div className="cp-pdf-reader"><div className="cp-pdf-controls"><button className="od-icon-btn" aria-label="Предыдущая страница PDF" disabled={!document || page <= 1} onClick={() => go(page - 1)}><Icon name="left" /></button><label><span className="cp-pdf-page-label">Страница</span><input aria-label="Номер страницы PDF" type="number" min="1" max={document?.numPages || 1} value={draft} disabled={!document} onChange={e => setDraft(e.target.value)} onBlur={() => go(draft)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); go(draft); } }} /><span>/ {document?.numPages || '…'}</span></label><button className="od-icon-btn" aria-label="Следующая страница PDF" disabled={!document || page >= document.numPages} onClick={() => go(page + 1)}><Icon name="right" /></button><div className="cp-pdf-zoom"><button className="od-control" aria-label="Уменьшить PDF" disabled={zoom <= 1} onClick={() => setZoom(z => Math.max(1, z - .25))}>−</button><button className="od-text-btn" onClick={() => setZoom(1)} title="По ширине окна">{zoom === 1 ? 'По ширине' : `${Math.round(zoom * 100)}%`}</button><button className="od-control" aria-label="Увеличить PDF" disabled={zoom >= 2} onClick={() => setZoom(z => Math.min(2, z + .25))}>+</button></div></div>{error && <ErrorNotice onRetry={() => setRetry(n => n + 1)}>{error}</ErrorNotice>}<div className="cp-pdf-canvas-area" ref={container} aria-busy={loading}>{loading && <div className="cp-pdf-render-status" role="status">Загружаем страницу…</div>}<canvas ref={canvas} role="img" aria-label={`${name}: страница ${page}`} style={{ visibility: loading || error ? 'hidden' : 'visible' }} /></div></div>;
}
