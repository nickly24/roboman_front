export const isHelp = lesson => lesson?.lesson_type === 'HELP';
export const lessonRevenue = lesson => isHelp(lesson) ? 0 : lesson.revenue != null
  ? Number(lesson.revenue) || 0
  : (Number(lesson.price_snapshot) || 0) * (Number(lesson.paid_children) || 0);
export const lessonChildren = (lesson, field = 'total_children') => isHelp(lesson) ? 0
  : Number(lesson[field] ?? (field === 'total_children' ? (Number(lesson.paid_children) || 0) + (Number(lesson.trial_children) || 0) : 0)) || 0;
