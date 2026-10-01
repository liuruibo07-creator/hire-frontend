import { createRouter, createWebHistory } from 'vue-router'
import { session, updateSession } from '../stores/session'
import { api } from '../api'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', component: () => import('../views/Home.vue'), meta: { title: '首页' } },
    { path: '/jobs', component: () => import('../views/Jobs.vue'), meta: { title: '职位搜索' } },
    {
      path: '/companies',
      component: () => import('../views/Companies.vue'),
      meta: { title: '公司' },
    },
    {
      path: '/campus',
      redirect: '/jobs?jobType=实习',
      meta: { title: '校园招聘' },
    },
    { path: '/jobs/:id', component: () => import('../views/JobDetail.vue'), meta: { title: '职位详情' } },
    { path: '/companies/job/:jobId', component: () => import('../views/CompanyDetail.vue'), meta: { title: '公司招聘概览' } },
    { path: '/login', component: () => import('../views/Auth.vue'), meta: { title: '登录注册' } },
    {
      path: '/workspace',
      component: () => import('../views/Workspace.vue'),
      meta: { auth: true },
      children: [
        { path: 'interviews', component: () => import('../views/Interviews.vue'), meta: { title: '面试日程', roles: ['seeker', 'employer'] } },
        { path: '', component: () => import('../views/Overview.vue'), meta: { title: '个人中心' } },
        {
          path: 'resumes',
          component: () => import('../views/Resumes.vue'),
          meta: { title: '我的简历', roles: ['seeker'] },
        },
        {
          path: 'applications',
          component: () => import('../views/Applications.vue'),
          meta: { title: '投递管理', roles: ['seeker', 'employer'] },
        },
        {
          path: 'jobs',
          component: () => import('../views/ManageJobs.vue'),
          meta: { title: '职位管理', roles: ['employer'] },
        },
        {
          path: 'admin',
          component: () => import('../views/AdminConsole.vue'),
          meta: { title: '后台管理', roles: ['admin'] },
          redirect: '/workspace/admin/jobs',
          children: [
            {
              path: 'jobs',
              component: () => import('../views/ManageJobs.vue'),
              meta: { title: '职位管理' },
            },
            {
              path: 'applications',
              component: () => import('../views/Applications.vue'),
              meta: { title: '投递管理' },
            },
            {
              path: 'users',
              component: () => import('../views/Users.vue'),
              meta: { title: '用户管理' },
            },
          ],
        },
        {
          path: 'notifications',
          component: () => import('../views/Notifications.vue'),
          meta: { title: '消息通知' },
        },
        {
          path: 'chat',
          component: () => import('../views/Chat.vue'),
          meta: { title: '在线沟通', roles: ['seeker', 'employer'] },
        },
        { path: 'settings', component: () => import('../views/Settings.vue'), meta: { title: '账号设置' } },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      component: () => import('../views/NotFound.vue'),
      meta: { title: '页面不存在' },
    },
  ],
})
router.beforeEach(async (to) => {
  document.title = `${to.meta.title || '工作台'} · 智聘招聘平台`
  if (!to.meta.auth) return true
  if (!session.token) return { path: '/login', query: { redirect: to.fullPath } }
  if (!session.verified) {
    try {
      updateSession(await api.me())
    } catch {
      return { path: '/login', query: { redirect: to.fullPath } }
    }
  }
  if (to.meta.roles && !to.meta.roles.includes(session.user?.role)) return '/workspace'
  return true
})
window.addEventListener('session-expired', () => {
  if (router.currentRoute.value.meta.auth)
    router.replace({ path: '/login', query: { redirect: router.currentRoute.value.fullPath } })
})
export default router

