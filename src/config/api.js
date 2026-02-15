// API конфигурация
//export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://nickly24-roboman-back-ca9a.twc1.net/api';
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:80/api';

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

  // Salary by department
  SALARY_TEACHER_BY_DEPARTMENT: '/salary/teacher-by-department',
  SALARY_OWNER_BY_DEPARTMENT: '/salary/owner-by-department',
};
