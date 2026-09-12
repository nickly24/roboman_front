import apiClient from './api';
import { unpack } from '../pages/Accounting/accountingData';

const get = async (url, params = {}, signal) => unpack(await apiClient.get(url, { params, signal }));
const post = async (url, payload) => unpack(await apiClient.post(url, payload));
const put = async (url, payload) => unpack(await apiClient.put(url, payload));
const root = admin => admin ? '/accounting/invoices' : '/portal/invoices';

export const branchPortalService = {
  overview: (month, signal) => get('/portal/overview', { month }, signal),
  lessons: (month, signal) => get('/portal/lessons', { month }, signal),
  pricing: (month, payload) => put(`/portal/pricing?month=${encodeURIComponent(month)}`, payload),
  invoices: (admin, params, signal) => get(root(admin), params, signal),
  invoice: (admin, id, signal) => get(`${root(admin)}/${id}`, {}, signal),
  report: (branch_id, month, signal) => get('/accounting/invoices/report', { branch_id, month }, signal),
  create: payload => post('/accounting/invoices', payload),
  update: (id, payload) => put(`/accounting/invoices/${id}`, payload),
  action: (admin, id, action, payload) => post(`${root(admin)}/${id}/${action}`, payload),
  branches: signal => get('/branches', { include_inactive: true, limit: 500 }, signal),
  document: async (admin, id) => {
    const response = await apiClient.get(`${root(admin)}/${id}/document`, { responseType: 'blob' });
    return response.data;
  },
};
export default branchPortalService;
