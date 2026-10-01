export const cities = ['北京', '上海', '深圳', '杭州', '广州', '成都', '南京', '武汉', '西安']
export const experiences = ['不限', '应届生', '1-3年', '3-5年', '5-10年', '10年以上']
export const educations = ['不限', '高中', '中专', '大专', '本科', '硕士', '博士']
export const jobTypes = ['全职', '兼职', '实习', '合同制']
export const applicationStates = ['待处理', '已查看', '面试邀请', '已录用', '已拒绝']
export const jobStates = ['已下架', '招聘中', '平台下架', '待审核', '审核拒绝']
export const roles = { seeker: '求职者', employer: '企业', admin: '管理员' }
export const salary = (job) =>
  job.salaryMin != null && job.salaryMax != null ? `${job.salaryMin}-${job.salaryMax}K` : '薪资面议'
export const dateText = (value) => (value ? String(value).replace('T', ' ').slice(0, 16) : '--')
export const skills = (value) =>
  (value || '')
    .split(/[,，、]/)
    .map((x) => x.trim())
    .filter(Boolean)
export const pick = (data, keys) =>
  Object.fromEntries(
    keys.filter((key) => data[key] !== undefined && data[key] !== '').map((key) => [key, data[key]]),
  )
