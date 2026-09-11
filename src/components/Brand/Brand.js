import React from 'react';
import './Brand.css';
export default function Brand({ compact = false }) {
  return <span className={`brand ${compact ? 'brand-compact' : ''}`} aria-label="АЙТИ КЛУБ">
    <svg className="brand-mark" width="34" height="36" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 33-3-7m3-8 6-7m8-1 6 5" strokeWidth="5" />
        <circle cx="8" cy="22" r="4" strokeWidth="3" />
        <circle cx="22" cy="8" r="4" strokeWidth="3" />
        <path d="M26 24v-6h11v6" strokeWidth="2.5" />
      </g>
      <rect x="2" y="33" width="18" height="5" rx="2" fill="currentColor" />
      <path d="M28 25v-3h3v3h2v-3h3v3h1a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H26a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h2Z" fill="currentColor" />
    </svg>
    {!compact && <span className="brand-name">АЙТИ <span>КЛУБ</span></span>}
  </span>;
}
