<script setup>
import { onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { OfficeBuilding, Location, ChatDotRound } from '@element-plus/icons-vue'
import { api } from '../api'
import { session } from '../stores/session'
import { salary, skills, dateText } from '../utils'
import { useLoad } from '../composables/useLoad'
import LoadState from '../components/LoadState.vue'
const route = useRoute(),
  router = useRouter(),
  job = ref(null),
  resumes = ref([]),
  dialog = ref(false),
  resumeId = ref(''),
  coverLetter = ref(''),
  busy = ref(false),
  resumeError = ref(''),
  resumeLoading = ref(false),
  submitted = ref(false)
const applicationCheckBusy = ref(false), applicationCheckError = ref('')
let applicationGeneration = 0
async function checkApplication() {
  const version = ++applicationGeneration
  const jobId = String(route.params.id)
  submitted.value = false; applicationCheckError.value = ''
  if (!session.token || session.user?.role !== 'seeker') { applicationCheckBusy.value = false; return }
  applicationCheckBusy.value = true
  try {
    let scanned = 0, page = 1
    while (true) {
      const result = await api.myApplications({ page, size: 20 })
      if (version !== applicationGeneration) return
      if (result.list.some(item => String(item.jobId) === jobId)) { submitted.value = true; break }
      scanned += result.list.length
      if (!result.list.length || scanned >= result.total) break
      page++
    }
  } catch (e) { if (version === applicationGeneration) applicationCheckError.value = '投递状态暂未同步，可重试查询' }
  finally { if (version === applicationGeneration) applicationCheckBusy.value = false }
}
watch([() => route.params.id, () => session.token], checkApplication, { immediate: true })
onUnmounted(() => applicationGeneration++)
const { loading, error, run } = useLoad()
const load = () =>
  run(
    () => api.job(route.params.id),
    (value) => {
      job.value = value
    },
  )
watch(
  () => route.params.id,
  () => {
    load()
  },
  { immediate: true },
)
function ensureLogin() {
  if (session.token) return true
  router.push({ path: '/login', query: { redirect: route.fullPath } })
  return false
}
async function loadResumes() {
  resumeLoading.value = true
  resumeError.value = ''
  try {
    resumes.value = await api.resumes()
    resumeId.value = resumes.value.find((r) => r.isDefault === 1)?.id || resumes.value[0]?.id || ''
  } catch (e) {
    resumeError.value = e.message
  } finally {
    resumeLoading.value = false
  }
}
async function openApply() {
  if (!ensureLogin()) return
  dialog.value = true
  await loadResumes()
}
async function submit() {
  if (!resumeId.value) return ElMessage.warning('请选择投递简历')
  busy.value = true
  try {
    await api.apply({ jobId: job.value.id, resumeId: resumeId.value, coverLetter: coverLetter.value })
    submitted.value = true
    dialog.value = false
    ElMessage.success('投递成功，可在我的投递中查看进度')
  } catch {
  } finally {
    busy.value = false
  }
}
async function chat() {
  if (!ensureLogin()) return
  busy.value = true
  try {
    const conversation = await api.startConversation({ jobId: job.value.id })
    router.push({ path: '/workspace/chat', query: { conversation: conversation.id } })
  } catch {
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <div class="container page">
    <el-breadcrumb separator="/"
      ><el-breadcrumb-item :to="{ path: '/jobs' }">职位列表</el-breadcrumb-item
      ><el-breadcrumb-item>职位详情</el-breadcrumb-item></el-breadcrumb
    ><LoadState :loading="loading" :error="error" @retry="load"
      ><div v-if="job" class="detail-layout">
        <div>
          <section class="detail-intro">
            <div class="section-heading">
              <h1>{{ job.title }}</h1>
              <strong class="salary"
                >{{ salary(job) }}<small v-if="job.salaryMonths"> · {{ job.salaryMonths }}薪</small></strong
              >
            </div>
            <p>{{ job.employerName || '企业名称暂未提供' }} · {{ job.industry || '行业未提供' }}</p>
            <p class="muted">
              {{ job.city }} · {{ job.experienceReq || '经验不限' }} · {{ job.educationReq || '学历不限' }} ·
              {{ job.jobType }}
            </p>
            <div class="tags">
              <el-tag v-for="tag in skills(job.skills)" :key="tag">{{ tag }}</el-tag>
            </div>
            <div class="actions" v-if="!session.token || session.user?.role === 'seeker'">
              <el-button type="primary" size="large" :disabled="submitted || applicationCheckBusy" @click="openApply">{{
                submitted ? '已投递' : '立即投递'
              }}</el-button
              ><el-button :icon="ChatDotRound" size="large" :loading="busy" @click="chat">立即沟通</el-button>
            </div>
            <p v-if="applicationCheckError" class="muted">{{ applicationCheckError }} <el-button link @click="checkApplication">重试</el-button></p>
            <p class="muted">发布于 {{ dateText(job.createTime) }} · 招聘 {{ job.headcount || '若干' }} 人</p>
          </section>
          <section class="detail-body">
            <h2>职位描述</h2>
            <p class="pre-wrap">{{ job.description || '企业暂未填写职位描述' }}</p>
            <h2>工作地点</h2>
            <p>
              <el-icon><Location /></el-icon> {{ job.city }} {{ job.address || '' }}
            </p>
          </section>
        </div>
        <aside class="detail-aside">
          <el-icon class="company-icon"><OfficeBuilding /></el-icon>
          <h2>{{ job.employerName || '招聘企业' }}</h2>
          <p class="muted">{{ job.industry || '行业未提供' }}</p>
          <router-link :to="`/companies/job/${job.id}`">查看公司招聘 →</router-link>
          <el-divider />
          <h3>职位信息</h3>
          <p>类别：{{ job.categoryName || '未提供' }}</p>
          <p>类型：{{ job.jobType }}</p>
          <p>浏览：{{ job.viewCount ?? '--' }}</p>
          <p>投递：{{ job.applyCount ?? '--' }}</p>
        </aside>
      </div></LoadState
    >
    <el-dialog v-model="dialog" title="投递简历" width="500px" :close-on-click-modal="!busy"
      ><LoadState :loading="resumeLoading" :error="resumeError" @retry="loadResumes"
        ><template v-if="resumes.length"
          ><el-form label-position="top" @submit.prevent="submit"
            ><el-form-item label="选择简历" required
              ><el-select v-model="resumeId"
                ><el-option
                  v-for="resume in resumes"
                  :key="resume.id"
                  :value="resume.id"
                  :label="resume.title + (resume.isDefault ? '（默认）' : '')" /></el-select></el-form-item
            ><el-form-item label="求职附言"
              ><el-input
                v-model="coverLetter"
                type="textarea"
                :rows="4"
                maxlength="1000"
                show-word-limit /></el-form-item
            ><el-button type="primary" native-type="submit" :loading="busy">确认投递</el-button></el-form
          ></template
        ><el-empty v-else description="还没有简历"
          ><el-button type="primary" @click="router.push('/workspace/resumes')">创建简历</el-button></el-empty
        ></LoadState
      ></el-dialog
    >
  </div>
</template>
