// Константы приложения

export const ROLES = {
  OWNER: 'OWNER',
  TEACHER: 'TEACHER',
};

export const TEACHER_STATUS = {
  WORKING: 'working',
  VACATION: 'vacation',
  FIRED: 'fired',
};

export const TEACHER_STATUS_LABELS = {
  [TEACHER_STATUS.WORKING]: 'Работает',
  [TEACHER_STATUS.VACATION]: 'В отпуске',
  [TEACHER_STATUS.FIRED]: 'Уволен',
};

export const LESSON_TYPES = {
  CREATIVE: 'creative',
  INSTRUCTION: 'instruction',
};

export const LESSON_TYPE_LABELS = {
  [LESSON_TYPES.CREATIVE]: 'Творческое',
  [LESSON_TYPES.INSTRUCTION]: 'По инструкции',
};
