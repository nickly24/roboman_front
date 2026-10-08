import apiClient from './api';
import certificateService, { publicCertificateClient } from './certificateService';

jest.mock('./api', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() }));
// CRA's Jest runtime loads dependencies as CommonJS; use Axios's official CJS build.
jest.mock('axios', () => jest.requireActual('axios/dist/node/axios.cjs'));
const ok = data => ({ data: { ok: true, data } });

beforeEach(() => { jest.clearAllMocks(); localStorage.clear(); });
afterEach(() => { localStorage.clear(); });

test('public reads and media never attach a saved bearer token or use the authenticated client', async () => {
  localStorage.setItem('auth_token', 'expired-private-token');
  const requests = [];
  publicCertificateClient.defaults.adapter = async config => {
    requests.push(config);
    return { data: config.responseType === 'blob' ? new Blob(['image']) : { ok: true, data: { number: 'ITC-0001' } }, status: 200, statusText: 'OK', config, headers: {} };
  };
  await certificateService.public('public-token');
  await certificateService.media({ id: 1 }, 'photo', 'public-token');
  expect(requests.map(request => request.url)).toEqual(['/public/teacher-certificates/public-token', '/public/teacher-certificates/public-token/photo']);
  requests.forEach(request => expect(request.headers.get('Authorization')).toBeUndefined());
  expect(apiClient.get).not.toHaveBeenCalled();
  expect(localStorage.getItem('auth_token')).toBe('expired-private-token');
});

test('public errors preserve the saved session and remain available to the public page', async () => {
  localStorage.setItem('auth_token', 'expired-private-token');
  publicCertificateClient.defaults.adapter = async () => { throw { response: { status: 410, data: { data: { number: 'ITC-0001' } } } }; };
  await expect(certificateService.public('revoked')).rejects.toMatchObject({ response: { status: 410 } });
  expect(localStorage.getItem('auth_token')).toBe('expired-private-token');
  expect(apiClient.get).not.toHaveBeenCalled();
});

test('owner list includes all server pages', async () => {
  const first = Array.from({ length: 200 }, (_, index) => ({ id: index + 1 }));
  apiClient.get.mockResolvedValueOnce(ok({ items: first, total: 201 })).mockResolvedValueOnce(ok({ items: [{ id: 201 }], total: 201 }));
  expect(await certificateService.list()).toHaveLength(201);
  expect(apiClient.get.mock.calls.map(([, config]) => config.params.offset)).toEqual([0, 200]);
});

test('photo upload and all state mutations carry the latest revision', async () => {
  apiClient.put.mockResolvedValue(ok({ id: 1, revision: 8 }));
  apiClient.delete.mockResolvedValue(ok({ id: 1, revision: 9 }));
  apiClient.post.mockResolvedValue(ok({ id: 1, revision: 10 }));
  const photo = new File(['image'], 'teacher.png', { type: 'image/png' });
  await certificateService.photo(1, photo, 7);
  expect(apiClient.put.mock.calls[0][0]).toBe('/teacher-certificates/1/photo');
  expect(apiClient.put.mock.calls[0][1].get('photo').name).toBe(photo.name);
  expect(apiClient.put.mock.calls[0][1].get('photo').type).toBe(photo.type);
  expect(apiClient.put.mock.calls[0][1].get('photo').size).toBe(photo.size);
  expect(apiClient.put.mock.calls[0][1].get('revision')).toBe('7');
  await certificateService.removePhoto(1, 8);
  expect(apiClient.delete).toHaveBeenCalledWith('/teacher-certificates/1/photo', { data: { revision: 8 } });
  await certificateService.publish(1, 9);
  await certificateService.revoke(1, 10);
  expect(apiClient.post).toHaveBeenCalledWith('/teacher-certificates/1/publish', { revision: 9 });
  expect(apiClient.post).toHaveBeenCalledWith('/teacher-certificates/1/revoke', { revision: 10 });
});

test('teacher PDF uses the own-document route and bulk export sends selected ids', async () => {
  const blob = new Blob(['%PDF-demo'], { type: 'application/pdf' });
  apiClient.get.mockResolvedValue({ data: blob });
  apiClient.post.mockResolvedValue({ data: blob });
  expect(await certificateService.pdf()).toBe(blob);
  expect(apiClient.get).toHaveBeenCalledWith('/teacher-certificates/me/pdf', { responseType: 'blob' });
  await certificateService.export([1, 7]);
  expect(apiClient.post).toHaveBeenCalledWith('/teacher-certificates/export', { certificate_ids: [1, 7] }, { responseType: 'blob' });
});
