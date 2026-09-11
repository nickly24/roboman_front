import React from 'react';
export default function DashIcon({ name, ...props }) {
  const paths = {
    arrow: <><path d="M5 12h14m-5-5 5 5-5 5" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-9h.01" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6.1 6a8 8 0 0 1 13 3M4.9 15a8 8 0 0 0 13 3" /></>,
    ruble: <path d="M8 21V3h5a5 5 0 0 1 0 10H5m0 4h11" />,
    trend: <path d="m3 17 6-6 4 4 8-10m-6 0h6v6" />,
    chevron: <path d="m9 5 7 7-7 7" />,
    bars: <path d="M5 19V9m7 10V4m7 15v-7" />,
  };
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
