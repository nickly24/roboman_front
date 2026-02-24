// API конфигурация
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://nickly24-roboman-back-ca9a.twc1.net/api';
//export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:80/api';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',
  
  // Dashboard
  DASHBOARD_OWNER: '/dashboard/owner',
  DASHBOARD_TEACHER: '/dashboard/teacher',
  
  // Lessons
  LESSONS: '/lessons',
  LESSON: (id) => `/lessons/${id}`,
  LESSON_REPRICE: (id) => `/lessons/${id}/reprice`,
  LESSON_SALARY_FREE: (id) => `/lessons/${id}/salary-free`,
  LESSON_SALARY_PAID: (id) => `/lessons/${id}/salary-paid`,
  LESSONS_EXPORT: '/lessons/export.csv',
  
  // Branches
  BRANCHES: '/branches',
  BRANCH: (id) => `/branches/${id}`,
  BRANCH_ACTIVATE: (id) => `/branches/${id}/activate`,
  BRANCH_DEACTIVATE: (id) => `/branches/${id}/deactivate`,
  BRANCH_TEACHERS: (id) => `/branches/${id}/teachers`,
  BRANCH_TEACHER: (branchId, teacherId) => `/branches/${branchId}/teachers/${teacherId}`,
  
  // Teachers
  TEACHERS: '/teachers',
  TEACHER: (id) => `/teachers/${id}`,
  TEACHER_STATUS: (id) => `/teachers/${id}/status`,
  TEACHER_BRANCHES: (id) => `/teachers/${id}/branches`,
  TEACHER_ACCOUNTS: '/teacher-accounts',
  
  // Departments
  DEPARTMENTS: '/departments',
  DEPARTMENT: (id) => `/departments/${id}`,
  DEPARTMENT_OWNERS: (id) => `/departments/${id}/owners`,
  DEPARTMENT_OWNER: (depId, ownerId) => `/departments/${depId}/owners/${ownerId}`,
  DEPARTMENT_BRANCHES: (id) => `/departments/${id}/branches`,
  
  // Instructions
  INSTRUCTION_SECTIONS: '/instruction-sections',
  INSTRUCTION_SECTIONS_PUBLIC: '/instruction-sections/public',
  INSTRUCTION_SECTION: (id) => `/instruction-sections/${id}`,
  INSTRUCTIONS: '/instructions',
  INSTRUCTION: (id) => `/instructions/${id}`,
  INSTRUCTION_PDF: (id) => `/instructions/${id}/pdf`,
  INSTRUCTION_PHOTO: (id) => `/instructions/${id}/photo`,
  
  // Settings
  SETTINGS: '/settings',
  SETTING: (key) => `/settings/${key}`,
  SETTINGS_SALARY: '/settings/salary',
  
  // Lookup
  LOOKUP_BRANCHES: '/lookup/branches',
  LOOKUP_TEACHERS: '/lookup/teachers',

  // Schedule
  SCHEDULES: '/schedules',
  SCHEDULE: (id) => `/schedules/${id}`,

  // Teacher slots (свободные часы)
  SLOTS: '/slots',
  SLOT: (id) => `/slots/${id}`,

  // Salary by department
  SALARY_TEACHER_BY_DEPARTMENT: '/salary/teacher-by-department',
  SALARY_OWNER_BY_DEPARTMENT: '/salary/owner-by-department',

  // Reports (for analytics)
  REPORTS_REVENUE_BY_MONTH: '/reports/revenue-by-month',
  REPORTS_ATTENDANCE_BY_MONTH: '/reports/attendance-by-month',
  REPORTS_BRANCH_SUMMARY: (branchId) => `/reports/branch/${branchId}/summary`,
  REPORTS_TEACHER_SUMMARY: (teacherId) => `/reports/teacher/${teacherId}/summary`,

  // Accounting (Бухгалтерия)
  ACCOUNTING_SHEETS: '/accounting/sheets',
  ACCOUNTING_SHEET: (id) => `/accounting/sheets/${id}`,
  ACCOUNTING_INCOMES: (sheetId) => `/accounting/sheets/${sheetId}/incomes`,
  ACCOUNTING_INCOME: (id) => `/accounting/incomes/${id}`,
  ACCOUNTING_SALARIES: (sheetId) => `/accounting/sheets/${sheetId}/salaries`,
  ACCOUNTING_SALARY: (id) => `/accounting/salaries/${id}`,
  ACCOUNTING_EXPENSES: (sheetId) => `/accounting/sheets/${sheetId}/expenses`,
  ACCOUNTING_EXPENSE: (id) => `/accounting/expenses/${id}`,
  ACCOUNTING_TRANSFERS: (sheetId) => `/accounting/sheets/${sheetId}/transfers`,
  ACCOUNTING_TRANSFER: (id) => `/accounting/transfers/${id}`,

  // CRM (Telegram)
  CRM_BRANCHES: '/crm/branches',
  CRM_BRANCH: (branchId) => `/crm/branches/${branchId}`,
  CRM_BRANCH_CHATS: (branchId) => `/crm/branches/${branchId}/chats`,
  CRM_CHATS: '/crm/chats',
  CRM_CHAT: (chatId) => `/crm/chats/${chatId}`,
  CRM_CHAT_READ: (chatId) => `/crm/chats/${chatId}/read`,
  CRM_CHAT_MESSAGES: (chatId) => `/crm/chats/${chatId}/messages`,
  CRM_CHAT_SUMMARIZE: (chatId) => `/crm/chats/${chatId}/summarize`,
  CRM_CHAT_AI_CHAT: (chatId) => `/crm/chats/${chatId}/ai-chat`,
  CRM_NCHATS_AI_CHAT: '/crm/nchats/ai-chat',
  CRM_TRANSCRIBE_VOICE: '/crm/transcribe-voice',
  CRM_CHAT_COMMENTS: (chatId) => `/crm/chats/${chatId}/comments`,
  CRM_REGISTRATION_REQUESTS: '/crm/registration-requests',
  CRM_REGISTRATION_REQUEST_APPROVE: (id) => `/crm/registration-requests/${id}/approve`,
  CRM_REGISTRATION_REQUEST_REJECT: (id) => `/crm/registration-requests/${id}/reject`,
  CRM_NOTIFICATION_SUBSCRIBERS: '/crm/notification-subscribers',
  CRM_NOTIFICATION_SUBSCRIBER: (id) => `/crm/notification-subscribers/${id}`,
  CRM_SETTINGS: '/crm/settings',

  // CRM Поиск (детские сады без робототехники)
  CRM_SEARCH_PROSPECTS: '/crm/search-prospects',
  CRM_SEARCH_PROSPECT: (id) => `/crm/search-prospects/${id}`,
  CRM_SEARCH_PROSPECTS_STREAM: '/crm/search-prospects/stream',
  CRM_SEARCH_PROSPECTS_STOP: '/crm/search-prospects/stop',
  CRM_PROSPECT_TO_LEAD: (id) => `/crm/search-prospects/${id}/to-lead`,
  CRM_PROSPECT_HISTORY: (id) => `/crm/search-prospects/${id}/history`,
  CRM_PROSPECT_COMMENTS: (id) => `/crm/search-prospects/${id}/comments`,
  // CRM Лиды (канбан)
  CRM_LEAD_STATUSES: '/crm/lead-statuses',
  CRM_LEAD_STATUS: (id) => `/crm/lead-statuses/${id}`,
  CRM_LEADS: '/crm/leads',
  CRM_LEADS_MANUAL: '/crm/leads/manual',
  CRM_LEADS_ARCHIVE: '/crm/leads/archive',
  CRM_LEAD_ARCHIVE: (id) => `/crm/leads/${id}/archive`,
  CRM_LEAD_RESTORE: (id) => `/crm/leads/${id}/restore`,
  CRM_LEAD_CREATE_BRANCH: (id) => `/crm/leads/${id}/create-branch`,
};
