import axios from 'axios';
import apiClient from './api';
import { API_BASE_URL } from '../config/api';

// Public certificates must remain readable even when a saved session has expired.
// This client deliberately has no bearer token or authentication interceptors.
export const publicCertificateClient = axios.create({ baseURL: API_BASE_URL });
const root = '/teacher-certificates';
const publicRoot = '/public/teacher-certificates';

const unpack = response => {
  if (response.data?.ok !== true) throw new Error(response.data?.error?.message || 'Не удалось получить сертификат');
  return response.data.data;
};

export const certificateService = {
  list: async signal => {
    const items = [];
    for (let offset = 0; ; offset += 200) {
      const page = unpack(await apiClient.get(root, { params: { limit: 200, offset }, signal }));
      if (!Array.isArray(page?.items)) throw new Error('Не удалось получить список сертификатов');
      items.push(...page.items);
      if (page.items.length < 200 || (Number.isFinite(page.total) && items.length >= page.total)) return items;
    }
  },
  teachers: async signal => {
    const items = [];
    for (let offset = 0; ; offset += 500) {
      const page = unpack(await apiClient.get('/teachers', { params: { limit: 500, offset }, signal }));
      const list = Array.isArray(page) ? page : page?.items;
      if (!Array.isArray(list)) throw new Error('Не удалось получить преподавателей');
      items.push(...list);
      if (list.length < 500 || (Number.isFinite(page.total) && items.length >= page.total)) return items;
    }
  },
  get: async (id, signal) => unpack(await apiClient.get(`${root}/${id}`, { signal })),
  mine: async signal => unpack(await apiClient.get(`${root}/me`, { signal })),
  create: async payload => unpack(await apiClient.post(root, payload)),
  update: async (id, payload) => unpack(await apiClient.put(`${root}/${id}`, payload)),
  photo: async (id, photo, revision) => {
    const payload = new FormData();
    payload.append('photo', photo, photo.name);
    payload.append('revision', String(revision));
    return unpack(await apiClient.put(`${root}/${id}/photo`, payload));
  },
  removePhoto: async (id, revision) => unpack(await apiClient.delete(`${root}/${id}/photo`, { data: { revision } })),
  publish: async (id, revision) => unpack(await apiClient.post(`${root}/${id}/publish`, { revision })),
  revoke: async (id, revision) => unpack(await apiClient.post(`${root}/${id}/revoke`, { revision })),
  public: async (token, signal) => unpack(await publicCertificateClient.get(`${publicRoot}/${encodeURIComponent(token)}`, { signal })),
  media: async (certificate, kind, token, signal) => {
    const client = token ? publicCertificateClient : apiClient;
    const path = token ? `${publicRoot}/${encodeURIComponent(token)}/${kind}` : `${root}/${certificate.id}/${kind}`;
    return (await client.get(path, { responseType: 'blob', signal })).data;
  },
  pdf: async id => (await apiClient.get(id ? `${root}/${id}/pdf` : `${root}/me/pdf`, { responseType: 'blob' })).data,
  export: async certificateIds => (await apiClient.post(`${root}/export`, { certificate_ids: certificateIds }, { responseType: 'blob' })).data,
};

export default certificateService;
