export const INTERVIEW_PREFIX = '[面试安排/v1]'
export function readInterview(remark) {
  if (!String(remark || '').startsWith(INTERVIEW_PREFIX)) return null
  try {
    const value = JSON.parse(remark.slice(INTERVIEW_PREFIX.length))
    return value.time && ['线上', '线下'].includes(value.mode) && value.location ? value : null
  } catch { return null }
}
export function writeInterview(form, now = Date.now()) {
  const time = new Date(form.time).getTime()
  if (!Number.isFinite(time) || time <= now) throw new Error('请选择未来的面试时间')
  if (!['线上', '线下'].includes(form.mode)) throw new Error('请选择面试方式')
  if (!String(form.location || '').trim()) throw new Error('请填写面试地址或会议链接')
  const result = INTERVIEW_PREFIX + JSON.stringify({
    time: form.time, mode: form.mode, location: form.location.trim(),
    contact: String(form.contact || '').trim(), note: String(form.note || '').trim(),
  })
  if (result.length > 500) throw new Error('面试安排内容过长，请缩短地点或备注')
  return result
}
export function publicRemark(remark) { return readInterview(remark)?.note ?? remark ?? '' }
export function updatePublicRemark(remark, note) {
  const interview = readInterview(remark)
  const result = interview ? INTERVIEW_PREFIX + JSON.stringify({ ...interview, note }) : note
  if (result.length > 500) throw new Error('备注与面试安排合计不能超过 500 字')
  return result
}
export function applicationProgress(application) {
  const events = [{ title: '已提交申请', time: application.createTime || '', description: '简历已投递至招聘方' }]
  const labels = ['等待企业处理', '企业已查看', '已邀请面试', '已录用', '未通过筛选']
  events.push({ title: labels[application.status] || '状态待确认', time: '', description: '当前状态 · 未提供此状态的发生时间' })
  return events
}
export function groupCompanies(jobs, keyword = '') {
  const groups = new Map()
  for (const job of jobs) {
    if (!job.employerName) continue
    const key = job.employerId != null ? `id:${job.employerId}` : `name:${job.employerName}`
    if (!groups.has(key)) groups.set(key, { key, name: job.employerName, job, jobs: [], count: 0 })
    const company = groups.get(key)
    if (!company.jobs.some(item => String(item.id) === String(job.id))) { company.jobs.push(job); company.count++ }
  }
  const term = keyword.trim().toLowerCase()
  return [...groups.values()].filter(company => !term || company.name.toLowerCase().includes(term) || company.jobs.some(job => String(job.title || '').toLowerCase().includes(term)))
}
