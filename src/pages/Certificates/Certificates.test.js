import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import certificateService from '../../services/certificateService';
import useMediaQuery from '../../hooks/useMediaQuery';
import PublicCertificate from './PublicCertificate';
import MyCertificate from './MyCertificate';
import TeacherCertificates from './TeacherCertificates';
import CertificateEditor from './CertificateEditor';
import { saveCertificateFile } from './certificateData';

jest.mock('../../services/certificateService', () => ({ __esModule: true, default: { public: jest.fn(), mine: jest.fn(), list: jest.fn(), teachers: jest.fn(), get: jest.fn(), create: jest.fn(), update: jest.fn(), photo: jest.fn(), removePhoto: jest.fn(), publish: jest.fn(), revoke: jest.fn(), pdf: jest.fn(), export: jest.fn(), media: jest.fn() } }));
jest.mock('../../components/Layout/Layout', () => ({ children }) => <main>{children}</main>);
jest.mock('../../hooks/useMediaQuery', () => jest.fn());
jest.mock('./certificateData', () => ({ ...jest.requireActual('./certificateData'), saveCertificateFile: jest.fn() }));

const teacher = { id: 3, full_name: 'Анна Сергеева', status: 'working' };
const certificate = { id: 1, teacher_id: 3, teacher_name: teacher.full_name, teacher_status: 'working', number: 'ITC-0001', status: 'published', effective_status: 'published', is_valid: true, revision: 4, university: 'Политех', study_program: 'Робототехника', description: 'Помогаю детям воплощать идеи.', has_photo: true, issued_at: '2026-10-08T15:00:00+03:00', branches: [{ name: 'Сад Солнышко', address: 'Москва, улица Мира, 1' }], public_url: 'http://localhost/certificates/public-token' };
const click = async element => act(async () => { fireEvent.click(element); });
const setupOwner = async (path = '/teacher-certificates') => {
  render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><TeacherCertificates /></MemoryRouter>);
  await screen.findByRole('button', { name: 'Открыть сертификат: Анна Сергеева' });
};
beforeEach(() => {
  jest.resetAllMocks();
  useMediaQuery.mockReturnValue(false);
  certificateService.public.mockResolvedValue(certificate);
  certificateService.mine.mockResolvedValue(certificate);
  certificateService.list.mockResolvedValue([certificate, { ...certificate, id: 2, teacher_id: 4, teacher_name: 'Иван', number: 'ITC-0002', status: 'draft', effective_status: 'draft', is_valid: false, has_photo: false, description: '' }]);
  certificateService.teachers.mockResolvedValue([teacher, { id: 4, full_name: 'Иван' }, { id: 5, full_name: 'Мария' }]);
  certificateService.get.mockResolvedValue(certificate);
  certificateService.media.mockResolvedValue(new Blob(['image'], { type: 'image/png' }));
  certificateService.pdf.mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
  certificateService.export.mockResolvedValue(new Blob(['ZIP'], { type: 'application/zip' }));
  URL.createObjectURL = jest.fn(() => 'blob:certificate-image');
  URL.revokeObjectURL = jest.fn();
});

test('public profile displays the current branches, education and QR without administrative actions', async () => {
  render(<MemoryRouter initialEntries={['/certificates/public-token']}><Routes><Route path="/certificates/:token" element={<PublicCertificate />} /></Routes></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'Анна Сергеева' })).toBeInTheDocument();
  expect(screen.getByText('Политех')).toBeInTheDocument();
  expect(screen.getByText('Сад Солнышко')).toBeInTheDocument();
  expect(screen.getByText('Москва, улица Мира, 1')).toBeInTheDocument();
  expect(await screen.findByRole('img', { name: 'QR-код для проверки сертификата' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Редактировать|Скачать PDF|Опубликовать/ })).not.toBeInTheDocument();
  expect(certificateService.media).toHaveBeenCalledWith(certificate, 'photo', 'public-token', expect.any(AbortSignal));
});

test('revoked public response renders only the invalid status and number even if other data is present', async () => {
  certificateService.public.mockRejectedValue({ response: { status: 410, data: { data: { ...certificate, status: 'revoked' } } } });
  render(<MemoryRouter initialEntries={['/certificates/revoked']}><Routes><Route path="/certificates/:token" element={<PublicCertificate />} /></Routes></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'Сертификат недействителен' })).toBeInTheDocument();
  expect(screen.getByText('№ ITC-0001')).toBeInTheDocument();
  expect(screen.queryByText(teacher.full_name)).not.toBeInTheDocument();
  expect(screen.queryByText(certificate.description)).not.toBeInTheDocument();
  expect(certificateService.media).not.toHaveBeenCalled();
});

test('unknown public URL gives a missing state; a network error can be retried', async () => {
  certificateService.public.mockRejectedValueOnce(new Error('Network Error')).mockRejectedValueOnce({ response: { status: 404 } });
  render(<MemoryRouter initialEntries={['/certificates/missing']}><Routes><Route path="/certificates/:token" element={<PublicCertificate />} /></Routes></MemoryRouter>);
  await click(await screen.findByRole('button', { name: 'Повторить загрузку' }));
  expect(await screen.findByRole('heading', { name: 'Сертификат не найден' })).toBeInTheDocument();
});

test('teacher receives own PDF and can copy the public link', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  render(<MyCertificate />);
  await click(await screen.findByRole('button', { name: 'Скачать PDF' }));
  expect(certificateService.pdf).toHaveBeenCalledWith();
  expect(saveCertificateFile).toHaveBeenCalledWith(expect.any(Blob), 'Сертификат-ITC-0001.pdf');
  await click(screen.getByRole('button', { name: 'Копировать ссылку' }));
  expect(writeText).toHaveBeenCalledWith(certificate.public_url);
  expect(screen.getByRole('status')).toHaveTextContent('Ссылка скопирована');
  expect(screen.queryByRole('button', { name: 'Редактировать' })).not.toBeInTheDocument();
});

test.each(['draft', 'revoked'])('teacher %s preview does not allow PDF or sharing', async status => {
  certificateService.mine.mockResolvedValue({ ...certificate, status, effective_status: status, is_valid: false });
  render(<MyCertificate />);
  expect(await screen.findByRole('heading', { name: teacher.full_name })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Скачать PDF' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Копировать ссылку' })).not.toBeInTheDocument();
  expect(certificateService.pdf).not.toHaveBeenCalled();
});

test('teacher without a certificate sees an empty state', async () => {
  certificateService.mine.mockResolvedValue(null);
  render(<MyCertificate />);
  expect(await screen.findByRole('heading', { name: 'Сертификат пока не создан' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Создать/ })).not.toBeInTheDocument();
});

test('missing canonical URL never guesses a link from the current frontend host', async () => {
  certificateService.mine.mockResolvedValue({ ...certificate, public_url: null, public_path: '/certificates/public-token' });
  render(<MyCertificate />);
  expect(await screen.findByText('Публичная ссылка временно недоступна. Обратитесь к администратору.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Копировать ссылку' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Открыть сертификат/ })).not.toBeInTheDocument();
});

test('bulk export includes selected valid documents and excludes drafts', async () => {
  await setupOwner();
  expect(screen.getByRole('button', { name: 'Скачать ZIP' })).toBeDisabled();
  expect(screen.getByRole('checkbox', { name: 'Выбрать сертификат: Иван' })).toBeDisabled();
  await click(screen.getByRole('checkbox', { name: 'Выбрать сертификат: Анна Сергеева' }));
  await click(screen.getByRole('button', { name: 'Скачать ZIP (1)' }));
  expect(certificateService.export).toHaveBeenCalledWith([1]);
  expect(saveCertificateFile).toHaveBeenCalledWith(expect.any(Blob), 'Сертификаты-IT-Club.zip');
});

test('mobile cards have one shared select-all checkbox and one checkbox per document', async () => {
  useMediaQuery.mockReturnValue(true);
  await setupOwner();
  expect(screen.getAllByRole('checkbox', { name: 'Выбрать все действующие сертификаты в списке' })).toHaveLength(1);
  expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  expect(screen.getByRole('checkbox', { name: 'Выбрать сертификат: Иван' })).toBeDisabled();
  await click(screen.getByRole('checkbox', { name: 'Выбрать все действующие сертификаты в списке' }));
  expect(screen.getByRole('checkbox', { name: 'Выбрать сертификат: Анна Сергеева' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Выбрать сертификат: Иван' })).not.toBeChecked();
  await click(screen.getByRole('button', { name: 'Скачать ZIP (1)' }));
  expect(certificateService.export).toHaveBeenCalledWith([1]);
});

test('owner search and status filters narrow the list without writing records', async () => {
  await setupOwner();
  fireEvent.change(screen.getByRole('textbox', { name: 'Поиск по ФИО или номеру сертификата' }), { target: { value: 'ITC-0002' } });
  expect(screen.queryByRole('button', { name: 'Открыть сертификат: Анна Сергеева' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Открыть сертификат: Иван' })).toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox', { name: 'Состояние сертификата' }), { target: { value: 'published' } });
  expect(screen.getByText('По вашим условиям сертификаты не найдены')).toBeInTheDocument();
  expect(certificateService.update).not.toHaveBeenCalled();
});

test('owner reviews the publication before submitting and revision conflicts cannot overwrite changes', async () => {
  const draft = { ...certificate, status: 'draft', effective_status: 'draft', is_valid: false };
  certificateService.get.mockResolvedValue(draft);
  certificateService.publish.mockRejectedValue({ response: { status: 409, data: { error: { code: 'REVISION_CONFLICT', message: 'Сертификат уже изменён' } } } });
  await setupOwner();
  await click(screen.getByRole('button', { name: 'Открыть сертификат: Анна Сергеева' }));
  await click(await screen.findByRole('button', { name: 'Опубликовать' }));
  const dialog = within(screen.getByRole('dialog', { name: 'Опубликовать сертификат?' }));
  expect(dialog.getByText(certificate.description)).toBeInTheDocument();
  expect(certificateService.publish).not.toHaveBeenCalled();
  await click(dialog.getByRole('button', { name: 'Подтвердить публикацию' }));
  expect(certificateService.publish).toHaveBeenCalledWith(1, 4);
  expect(dialog.getByRole('alert')).toHaveTextContent('Сертификат уже изменён');
  expect(dialog.getByRole('button', { name: 'Подтвердить публикацию' })).toBeDisabled();
  await click(dialog.getByRole('button', { name: 'Обновить данные' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('fired teacher profile is not downloadable even when its stored status is published', async () => {
  certificateService.get.mockResolvedValue({ ...certificate, teacher_status: 'fired', effective_status: 'revoked', is_valid: false });
  await setupOwner();
  await click(screen.getByRole('button', { name: 'Открыть сертификат: Анна Сергеева' }));
  expect(await screen.findByText(/Преподаватель в архиве/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Скачать PDF' })).not.toBeInTheDocument();
});

test('creation from teacher navigation opens the existing document without creating a duplicate', async () => {
  await setupOwner('/teacher-certificates?teacher=3');
  expect(await screen.findByRole('button', { name: 'Редактировать' })).toBeInTheDocument();
  expect(certificateService.get).toHaveBeenCalledWith(1);
  expect(certificateService.create).not.toHaveBeenCalled();
});

test('editor validates photos, preserves text on save failure and sends the expected revision', async () => {
  certificateService.update.mockRejectedValue({ response: { status: 409, data: { error: { code: 'REVISION_CONFLICT', message: 'Сертификат уже изменён' } } } });
  const saved = jest.fn();
  render(<CertificateEditor certificate={certificate} teachers={[teacher]} onSaved={saved} onCancel={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('Фотография преподавателя'), { target: { files: [new File(['bad'], 'photo.svg', { type: 'image/svg+xml' })] } });
  expect(screen.getByRole('alert')).toHaveTextContent('JPEG, PNG или WebP');
  fireEvent.change(screen.getByLabelText('Описание преподавателя*'), { target: { value: 'Новое описание' } });
  await click(screen.getByRole('button', { name: 'Сохранить изменения' }));
  expect(certificateService.update).toHaveBeenCalledWith(1, { university: 'Политех', study_program: 'Робототехника', description: 'Новое описание', revision: 4 });
  expect(screen.getByLabelText('Описание преподавателя*')).toHaveValue('Новое описание');
  expect(screen.getByRole('alert')).toHaveTextContent('Сертификат уже изменён');
  expect(saved).not.toHaveBeenCalled();
});

test('draft creation uploads the photo with the revision returned by creation', async () => {
  const draft = { ...certificate, status: 'draft', revision: 1, has_photo: false };
  const uploaded = { ...draft, revision: 2, has_photo: true };
  certificateService.create.mockResolvedValue(draft);
  certificateService.photo.mockResolvedValue(uploaded);
  const saved = jest.fn();
  const image = new File(['valid-image'], 'teacher.png', { type: 'image/png' });
  render(<CertificateEditor teachers={[teacher]} initialTeacherId={3} onSaved={saved} onCancel={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('Описание преподавателя'), { target: { value: 'Описание' } });
  fireEvent.change(screen.getByLabelText('Фотография преподавателя'), { target: { files: [image] } });
  await click(screen.getByRole('button', { name: 'Создать черновик' }));
  expect(certificateService.create).toHaveBeenCalledWith({ teacher_id: 3, description: 'Описание', university: '', study_program: '' });
  expect(certificateService.photo).toHaveBeenCalledWith(1, image, 1);
  expect(saved).toHaveBeenCalledWith(uploaded);
});

test('conflict refresh clears the native picker so the same photo can be selected and uploaded again', async () => {
  certificateService.photo.mockRejectedValueOnce({ response: { status: 409, data: { error: { code: 'REVISION_CONFLICT', message: 'Сертификат уже изменён' } } } }).mockResolvedValueOnce({ ...certificate, revision: 6 });
  certificateService.get.mockResolvedValue({ ...certificate, revision: 5 });
  const saved = jest.fn();
  const image = new File(['same-image'], 'teacher.png', { type: 'image/png' });
  render(<CertificateEditor certificate={certificate} teachers={[teacher]} onSaved={saved} onCancel={jest.fn()} />);
  let picker = screen.getByLabelText('Фотография преподавателя');
  userEvent.upload(picker, image);
  expect(picker.files).toHaveLength(1);
  await click(screen.getByRole('button', { name: 'Сохранить изменения' }));
  await click(screen.getByRole('button', { name: 'Обновить данные' }));
  const oldPicker = picker;
  picker = screen.getByLabelText('Фотография преподавателя');
  expect(picker).not.toBe(oldPicker);
  expect(picker.files).toHaveLength(0);
  expect(picker).toHaveValue('');
  expect(screen.queryByText('Выбрано:')).not.toBeInTheDocument();
  userEvent.upload(picker, image);
  await click(screen.getByRole('button', { name: 'Сохранить изменения' }));
  expect(certificateService.photo).toHaveBeenNthCalledWith(2, 1, image, 5);
  expect(saved).toHaveBeenCalledWith(expect.objectContaining({ revision: 6 }));
});

test('published editor blocks empty description and removing its mandatory photo', async () => {
  render(<CertificateEditor certificate={certificate} teachers={[teacher]} onSaved={jest.fn()} onCancel={jest.fn()} />);
  expect(screen.queryByRole('button', { name: 'Удалить фотографию' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Описание преподавателя*'), { target: { value: '  ' } });
  await click(screen.getByRole('button', { name: 'Сохранить изменения' }));
  expect(screen.getByRole('alert')).toHaveTextContent('должно оставаться описание');
  expect(certificateService.update).not.toHaveBeenCalled();
});

test('closing an unsaved editor through the modal close button requires an explicit discard', async () => {
  await setupOwner();
  await click(screen.getByRole('button', { name: 'Создать сертификат' }));
  let dialog = within(screen.getByRole('dialog'));
  fireEvent.change(dialog.getByLabelText('Описание преподавателя'), { target: { value: 'Несохранённый текст' } });
  await click(dialog.getByRole('button', { name: 'Закрыть окно' }));
  dialog = within(screen.getByRole('dialog'));
  expect(dialog.getByText('Закрыть форму и отменить несохранённые изменения?')).toBeInTheDocument();
  expect(certificateService.create).not.toHaveBeenCalled();
  await click(dialog.getByRole('button', { name: 'Закрыть без сохранения' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
