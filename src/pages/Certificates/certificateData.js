export const CERTIFICATE_STATUS_LABELS = { draft: 'Черновик', published: 'Опубликован', revoked: 'Отозван' };
export const MAX_CERTIFICATE_PHOTO_BYTES = 5 * 1024 * 1024;

export const certificateStatus = certificate => certificate?.effective_status || certificate?.status || 'draft';
export const isCertificateValid = certificate => certificateStatus(certificate) === 'published' && certificate?.is_valid !== false;
export const certificateLink = certificate => certificate?.public_url || '';
export const certificateDate = value => {
  if (!value) return 'После публикации';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Moscow' });
};
export const certificateError = error => error?.response?.data?.error?.message || error?.message || 'Не удалось выполнить действие. Попробуйте ещё раз.';
export const isRevisionConflict = error => error?.response?.status === 409 && error?.response?.data?.error?.code === 'REVISION_CONFLICT';
export const photoError = file => {
  if (!file) return '';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Выберите фотографию JPEG, PNG или WebP.';
  if (file.size > MAX_CERTIFICATE_PHOTO_BYTES) return 'Фотография должна быть не больше 5 МБ.';
  return '';
};
export async function certificateDownloadError(error) {
  const body = error?.response?.data;
  if (body instanceof Blob) {
    try { return certificateError({ response: { data: JSON.parse(await body.text()) } }); } catch (_) { /* Use the generic request message. */ }
  }
  return certificateError(error);
}
export function saveCertificateFile(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Leave enough time for the browser to start reading the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
