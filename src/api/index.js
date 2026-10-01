import { ElMessage } from 'element-plus'
import { createTransport } from './transport'
import { session, clearSession } from '../stores/session'

export const request = createTransport({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  getToken: () => session.token,
  onError: (message) => ElMessage.error({ message, grouping: true }),
  onUnauthorized: () => {
    clearSession()
    window.dispatchEvent(new Event('session-expired'))
  },
})
const user = '/api/user/users'
const job = '/api/job'
const application = '/api/application'
const notice = '/api/notification/notifications'
const chat = '/api/chat'
const get = (path, params, options) => request(path, { params, ...options })
const post = (path, data) => request(path, { method: 'POST', data })
const put = (path, data) => request(path, { method: 'PUT', data })

export const api = {
  login: (data) => request(`${user}/login`, { method: 'POST', data, auth: false }),
  register: (data) => request(`${user}/register`, { method: 'POST', data, auth: false }),
  me: () => get(`${user}/me`),
  updateMe: (data) => put(`${user}/me`, data),
  password: (data) => put(`${user}/me/password`, data),
  userInfo: (id) => get(`${user}/${id}/info`),
  searchJobs: (params) => get(`${job}/jobs/search`, params),
  categories: () => get(`${job}/categories`),
  job: (id) => get(`${job}/jobs/${id}`),
  myJobs: (params) => get(`${job}/jobs/my`, params),
  saveJob: (id, data) => (id ? put(`${job}/jobs/${id}`, data) : post(`${job}/jobs`, data)),
  jobStatus: (id, status) => put(`${job}/jobs/${id}/status`, { status }),
  resumes: () => get(`${application}/resumes/my`),
  resume: (id) => get(`${application}/resumes/${id}`),
  defaultResume: () => get(`${application}/resumes/default`),
  saveResume: (id, data) =>
    id ? put(`${application}/resumes/${id}`, data) : post(`${application}/resumes`, data),
  deleteResume: (id) => request(`${application}/resumes/${id}`, { method: 'DELETE' }),
  setDefaultResume: (id) => put(`${application}/resumes/${id}/default`),
  apply: (data) => post(`${application}/applications`, data),
  myApplications: (params) => get(`${application}/applications/my`, params),
  receivedApplications: (params) => get(`${application}/applications/received`, params),
  application: (id) => get(`${application}/applications/${id}`),
  applicationStatus: (id, data) => put(`${application}/applications/${id}/status`, data),
  notices: (params) => get(notice, params),
  unreadNotices: (options) => get(`${notice}/unread-count`, undefined, options),
  readNotice: (id) => put(`${notice}/${id}/read`),
  readAllNotices: () => put(`${notice}/read-all`),
  conversations: (params, options) => get(`${chat}/conversations`, params, options),
  startConversation: (data) => post(`${chat}/conversations`, data),
  messages: (id, params, options) => get(`${chat}/conversations/${id}/messages`, params, options),
  sendMessage: (id, content) => post(`${chat}/conversations/${id}/messages`, { content }),
  readConversation: (id, throughMessageId) => put(`${chat}/conversations/${id}/read`, { throughMessageId }),
  unreadChats: (options) => get(`${chat}/unread-count`, undefined, options),
  adminJobs: (params) => get(`${job}/admin/jobs`, params),
  adminJob: (id) => get(`${job}/admin/jobs/${id}`),
  reviewJob: (id, data) => put(`${job}/admin/jobs/${id}/review`, data),
  offlineJob: (id) => put(`${job}/admin/jobs/${id}/offline`),
  adminUsers: (params) => get('/api/user/admin/users', params),
  adminUser: (id) => get(`/api/user/admin/users/${id}`),
  userStatus: (id, status) => put(`/api/user/admin/users/${id}/status`, { status }),
  statistics: (days) => get('/api/user/admin/statistics', { days }),
  adminApplications: (params) => get(`${application}/admin/applications`, params),
  jobStatistics: (id) => get(`${application}/admin/jobs/${id}/statistics`),
}
