export const sameId = (a, b) => String(a) === String(b);
export const isUsed = item => item?.is_used === true || Number(item?.is_used) === 1;
export const moduleUsed = module => (module.lessons || []).some(isUsed);
export const sequence = plan => (plan?.modules || []).flatMap((module, mi) => (module.lessons || []).map((lesson, li) => ({ ...lesson, module_name: module.name, module_index: mi + 1, lesson_index: li + 1 })));
export const plural = (n, forms) => `${n} ${forms[n % 100 >= 11 && n % 100 <= 14 ? 2 : n % 10 === 1 ? 0 : n % 10 >= 2 && n % 10 <= 4 ? 1 : 2]}`;
export const lessonCount = n => plural(n, ['занятие', 'занятия', 'занятий']);
export const moduleCount = n => plural(n, ['модуль', 'модуля', 'модулей']);
export function canMove(items, index, delta, modules = false) {
  const target = index + delta, locked = modules ? moduleUsed : isUsed;
  return index >= 0 && target >= 0 && target < items.length && !locked(items[index]) && !locked(items[target]);
}
export function matchesLesson(lesson, { search = '', format = '', material = '' }) {
  const query = search.trim().toLocaleLowerCase('ru');
  return (!format || sameId(lesson.format_id, format)) && (!material || (material === 'with' ? !!lesson.instruction_id : !lesson.instruction_id)) && (!query || [lesson.name, lesson.instruction_name, lesson.format_name, lesson.internal_description, lesson.external_description].join(' ').toLocaleLowerCase('ru').includes(query));
}
const messages = {
  'Used curriculum plan cannot be deleted': 'План уже используется в филиалах. Удалить его нельзя.',
  'Module contains used lessons': 'В модуле есть проведённые занятия. Удалить его нельзя.',
  'Modules containing used lessons cannot be moved': 'Положение модуля с проведёнными занятиями зафиксировано.',
  'Lesson is already used and cannot be edited': 'Занятие уже использовалось в журнале. Его содержание зафиксировано.',
  'Used lesson cannot be deleted': 'Занятие уже использовалось в журнале. Удалить его нельзя.',
  'Used lessons cannot be moved': 'Положение использованного занятия зафиксировано.',
  'Used lesson cannot be edited': 'Материалы использованного занятия зафиксированы.',
  'Image is too large': 'Изображение должно быть не больше 5 МБ.',
};
export const errorText = error => { const message = error?.response?.data?.error?.message || error?.message; return messages[message] || message || 'Не удалось выполнить действие. Попробуйте ещё раз.'; };
export const unpack = response => { if (!response.data?.ok) throw new Error(response.data?.error?.message || 'Не удалось получить данные'); return response.data.data; };
