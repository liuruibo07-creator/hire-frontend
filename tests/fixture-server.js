// Isolated browser-test fixture. Never imported by the application or production build.
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'

const root = resolve('dist')
const job = {
  id: '101',
  employerId: '200',
  title: '前端开发工程师',
  employerName: '示例科技（测试）',
  categoryId: 1,
  categoryName: '技术',
  description:
    '负责招聘平台前端开发与体验优化。\n与产品、设计及后端团队协作，持续完善产品体验。\n熟悉 Vue 3、JavaScript 与浏览器基础。',
  city: '北京',
  address: '海淀区科技园',
  jobType: '全职',
  industry: '互联网',
  experienceReq: '1-3年',
  educationReq: '本科',
  salaryMin: 20,
  salaryMax: 35,
  salaryMonths: 14,
  skills: 'Vue 3,JavaScript,前端工程化',
  headcount: 2,
  status: 1,
  viewCount: 128,
  applyCount: 12,
  createTime: '2026-09-28 09:00:00',
}
const jobs = [
  job,
  {
    ...job,
    id: '102',
    title: '产品经理',
    salaryMin: 18,
    salaryMax: 30,
    city: '深圳',
    skills: '产品设计,数据分析,需求管理',
  },
  {
    ...job,
    id: '103',
    title: 'Java开发工程师',
    salaryMin: 15,
    salaryMax: 25,
    city: '杭州',
    skills: 'Java,Spring Boot,微服务',
  },
  {
    ...job,
    id: '104',
    title: 'UI设计师',
    salaryMin: 12,
    salaryMax: 20,
    city: '上海',
    skills: 'UI设计,交互设计,Figma',
  },
]
let resumes = [
  {
    id: '301',
    title: '前端开发简历',
    name: '测试求职者',
    gender: 0,
    email: 'qa@example.test',
    phone: '13800000000',
    education: '本科',
    university: '示例大学',
    major: '软件工程',
    expectedPosition: '前端开发',
    expectedCity: '北京',
    expectedSalary: '20-30K',
    skills: 'Vue 3,JavaScript',
    isDefault: 1,
  },
]
let applications = [
  {
    id: '401',
    jobId: '101',
    jobTitle: job.title,
    jobCity: '北京',
    resumeId: '301',
    resumeTitle: resumes[0].title,
    applicantId: '100',
    userId: '100',
    employerId: '200',
    applicantName: resumes[0].name,
    status: 0,
    coverLetter: '希望有机会参与团队。',
    createTime: '2026-09-28 10:00:00',
  },
]
let messages = [
  {
    id: '90071992547409930',
    conversationId: '501',
    senderId: '200',
    content: '你好，欢迎了解这个职位。',
    createTime: '2026-09-28 10:30:00',
  },
]
let read = false
const notices = [
  {
    id: '601',
    title: '欢迎加入智聘',
    content: '欢迎开启新的求职旅程。',
    isRead: 0,
    createTime: '2026-09-28 10:00:00',
  },
]
const paged = (list, query) => ({
  total: list.length,
  list: list.slice(
    (Number(query.get('page') || 1) - 1) * Number(query.get('size') || 10),
    Number(query.get('page') || 1) * Number(query.get('size') || 10),
  ),
})

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost'),
    path = url.pathname,
    query = url.searchParams
  function send(data, code = 200, message = '操作成功') {
    res.writeHead(code >= 400 ? code : 200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ code, message, data }))
  }
  try {
    if (!path.startsWith('/api/')) {
      const target = resolve(root, '.' + decodeURIComponent(path === '/' ? '/index.html' : path))
      if (!target.startsWith(root + sep)) {
        res.writeHead(403)
        res.end()
        return
      }
      let file
      try {
        file = await readFile(target)
      } catch {
        file = await readFile(resolve(root, 'index.html'))
      }
      const types = {
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
      }
      res.writeHead(200, { 'Content-Type': types[extname(target)] || 'text/html; charset=utf-8' })
      res.end(file)
      return
    }
    let raw = ''
    for await (const chunk of req) raw += chunk
    const body = raw ? JSON.parse(raw) : {}
    const role = (req.headers.authorization || '').replace('Bearer fixture-', '')
    const actor = {
      id: role === 'employer' ? '200' : role === 'admin' ? '900' : '100',
      username: role,
      realName: role === 'seeker' ? '测试求职者' : role === 'employer' ? '示例科技（测试）' : '测试管理员',
      role,
      status: 1,
      email: 'qa@example.test',
    }
    if (path === '/api/user/users/login') {
      if (!['seeker', 'employer', 'admin'].includes(body.username) || body.password !== 'test123')
        return send(null, 401, '用户名或密码错误')
      return send({
        token: `fixture-${body.username}`,
        userId: body.username === 'employer' ? '200' : body.username === 'admin' ? '900' : '100',
        username: body.username,
        role: body.username,
        realName: '测试账号',
      })
    }
    if (path === '/api/job/jobs/search') {
      if (query.get('keyword') === 'error') return send(null, 503, '测试：职位服务不可用')
      let list = jobs.filter(
        (row) => !query.get('keyword') || (row.title + row.employerName).includes(query.get('keyword')),
      )
      for (const field of ['city', 'jobType', 'educationReq', 'experienceReq'])
        if (query.get(field)) list = list.filter((row) => row[field] === query.get(field))
      return send(paged(list, query))
    }
    if (path === '/api/job/categories')
      return send([
        { id: 1, name: '技术', children: [{ id: 2, name: '前端开发' }] },
        { id: 3, name: '产品' },
        { id: 4, name: '设计' },
      ])
    if (/^\/api\/job\/jobs\/\d+$/.test(path) && req.method === 'GET')
      return send(jobs.find((row) => row.id === path.split('/').at(-1)) || job)
    if (!['seeker', 'employer', 'admin'].includes(role)) return send(null, 401, '请先登录')
    if (path === '/api/user/users/me') return send(req.method === 'GET' ? actor : null)
    if (path === '/api/application/resumes/my') return send(resumes)
    if (path === '/api/application/resumes' && req.method === 'POST') {
      resumes.push({ ...body, id: String(302 + resumes.length), isDefault: 0 })
      return send(null)
    }
    if (/^\/api\/application\/resumes\/\d+/.test(path)) {
      const id = path.split('/')[4]
      if (req.method === 'DELETE') resumes = resumes.filter((row) => row.id !== id)
      else if (path.endsWith('/default'))
        resumes.forEach((row) => {
          row.isDefault = row.id === id ? 1 : 0
        })
      else if (req.method === 'PUT')
        Object.assign(
          resumes.find((row) => row.id === id),
          body,
        )
      return send(req.method === 'GET' ? resumes.find((row) => row.id === id) : null)
    }
    if (
      path.endsWith('/applications/my') ||
      path.endsWith('/applications/received') ||
      path === '/api/application/admin/applications'
    )
      return send(
        paged(
          applications.filter((row) => !query.has('status') || row.status === Number(query.get('status'))),
          query,
        ),
      )
    if (path === '/api/application/applications' && req.method === 'POST') {
      applications.push({ ...applications[0], ...body, id: String(402 + applications.length) })
      return send('402')
    }
    if (/^\/api\/application\/applications\/\d+/.test(path)) {
      const row = applications.find((row) => row.id === path.split('/')[4])
      if (req.method === 'PUT') Object.assign(row, body)
      return send({ ...row, resume: resumes.find((resume) => resume.id === row.resumeId) })
    }
    if (path === '/api/notification/notifications/unread-count')
      return send(notices.filter((row) => !row.isRead).length)
    if (path.startsWith('/api/notification/notifications')) {
      if (req.method === 'PUT')
        notices.forEach((row) => {
          row.isRead = 1
        })
      return send(
        req.method === 'GET'
          ? paged(
              notices.filter((row) => !query.has('isRead') || row.isRead === Number(query.get('isRead'))),
              query,
            )
          : null,
      )
    }
    const conversation = {
      id: '501',
      jobTitle: job.title,
      seekerId: '100',
      employerId: '200',
      lastMessageContent: messages.at(-1)?.content,
      unreadCount: read ? 0 : 1,
      updateTime: '2026-09-28 10:30:00',
    }
    if (path === '/api/chat/conversations')
      return send(req.method === 'POST' ? conversation : { total: 1, list: [conversation] })
    if (path === '/api/chat/unread-count') return send(read ? 0 : 1)
    if (path.endsWith('/read') && path.startsWith('/api/chat')) {
      read = true
      return send({ userId: actor.id, throughMessageId: body.throughMessageId })
    }
    if (path.endsWith('/messages')) {
      if (req.method === 'POST') {
        const message = {
          id: String(BigInt(messages.at(-1).id) + 1n),
          senderId: actor.id,
          conversationId: '501',
          content: body.content,
          createTime: '2026-09-28 11:00:00',
        }
        messages.push(message)
        return send(message)
      }
      const list = messages.filter(
        (row) =>
          (!query.has('afterId') || BigInt(row.id) > BigInt(query.get('afterId'))) &&
          (!query.has('beforeId') || BigInt(row.id) < BigInt(query.get('beforeId'))),
      )
      return send({ list, hasMore: false, nextBeforeId: list[0]?.id, nextAfterId: list.at(-1)?.id })
    }
    if (path === '/api/job/jobs/my' || path === '/api/job/admin/jobs')
      return send(
        paged(
          jobs.filter((row) => !query.has('status') || row.status === Number(query.get('status'))),
          query,
        ),
      )
    if (path === '/api/job/jobs' && req.method === 'POST') {
      jobs.push({ ...job, ...body, id: String(105 + jobs.length), status: 3 })
      return send(jobs.at(-1).id)
    }
    if (/^\/api\/job\/(admin\/)?jobs\/\d+/.test(path)) {
      const parts = path.split('/'),
        index = parts.indexOf('jobs'),
        row = jobs.find((item) => item.id === parts[index + 1]) || job
      if (path.endsWith('/review')) {
        row.status = body.decision === 'approve' ? 1 : 4
        row.reviewRemark = body.remark
      } else if (path.endsWith('/offline')) row.status = 2
      else if (path.endsWith('/status')) row.status = body.status === 1 ? 3 : 0
      else if (req.method === 'PUT') {
        Object.assign(row, body)
        row.status = 3
      }
      return send(req.method === 'GET' ? row : null)
    }
    if (path === '/api/user/admin/users')
      return send({ total: 1, list: [{ ...actor, id: '100', username: 'seeker', role: 'seeker' }] })
    if (path.startsWith('/api/user/admin/users/'))
      return send({ ...actor, id: '100', username: 'seeker', role: 'seeker' })
    if (path === '/api/user/admin/statistics')
      return send({
        overview: {
          registeredUserTotal: 3,
          enterpriseTotal: 1,
          jobTotal: jobs.length,
          applicationTotal: applications.length,
        },
        dailyTrend: [
          {
            date: '2026-09-28',
            newRegisteredUsers: 3,
            newEnterprises: 1,
            newJobs: jobs.length,
            newApplications: applications.length,
          },
        ],
      })
    if (path.startsWith('/api/application/admin/jobs/'))
      return send({
        jobId: '101',
        jobTitle: job.title,
        applicationTotal: 1,
        pendingCount: 1,
        viewedCount: 0,
        interviewCount: 0,
        offeredCount: 0,
        rejectedCount: 0,
      })
    send(null, 404, '测试夹具未定义该接口')
  } catch (error) {
    send(null, 500, error.message)
  }
})
server.listen(4174, '127.0.0.1', () =>
  console.log('Isolated QA fixture: http://localhost:4174 (test data only)'),
)
