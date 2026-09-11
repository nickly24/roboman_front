import React from 'react';
import CalIcon from '../Calendar/CalendarIcons';
const paths = {
  sheet: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></>,
  income: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4" /></>,
  expense: <><path d="M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4" /></>,
  salary: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M8 6V3h8v3M3 12h18M10 12v3h4v-3" /></>,
  transfer: <><path d="M3 7h17l-4-4m4 14H3l4 4M20 7l-4 4M3 17l4-4" /></>,
  wallet: <><path d="M20 8V5H5a2 2 0 0 0 0 4h15v11H5a2 2 0 0 1-2-2V7M20 13h-6v4h6" /></>,
  trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></>,
};
export default function AccountingIcon({ name, ...props }) { return paths[name] ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg> : <CalIcon name={name} {...props} />; }
