<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api'
import { session } from '../stores/session'
import { readInterview } from '../recruitment'
import { dateText } from '../utils'
import LoadState from '../components/LoadState.vue'
import InterviewDialog from '../components/InterviewDialog.vue'
const employer = session.user?.role === 'employer'
const router = useRouter(), rows = ref([]), page = ref(1), total = ref(0), loading = ref(false), error = ref(''), partialError = ref('')
const selected = ref(null), dialog = ref(false), now = ref(Date.now()), view = ref('all')
let generation = 0, timer
const visible = computed(() => rows.value.filter(row => view.value !== 'upcoming' || (row.interview && new Date(row.interview.time).getTime() >= now.value)))
const upcoming = computed(() => rows.value.filter(row => row.interview && new Date(row.interview.time).getTime() >= now.value).sort((a,b) => new Date(a.interview.time) - new Date(b.interview.time))[0])
async function load() {
  const version = ++generation
  loading.value = true; error.value = ''; partialError.value = ''
  try {
    const result = await (employer ? api.receivedApplications : api.myApplications)({ page: page.value, size: 20, status: 2 })
    const details = await Promise.allSettled(result.list.map(row => api.application(row.id)))
    if (version !== generation) return
    total.value = result.total
    rows.value = result.list.map((row, index) => {
      const detail = details[index].status === 'fulfilled' ? details[index].value : row
      return { ...row, ...detail, interview: readInterview(detail.remark), detailFailed: details[index].status === 'rejected' }
    })
    if (details.some(item => item.status === 'rejected')) partialError.value = '部分面试详情加载失败，请重试。'
  } catch (e) { if (version === generation) error.value = e.message }
  finally { if (version === generation) loading.value = false }
}
async function chat(row) {
  try {
    const conversation = await api.startConversation(employer ? { applicationId: row.id } : { jobId: row.jobId })
    router.push({ path: '/workspace/chat', query: { conversation: conversation.id } })
  } catch {}
}
onMounted(() => { load(); timer = setInterval(() => { now.value = Date.now() }, 60000) })
onUnmounted(() => { generation++; clearInterval(timer) })
</script>
<template>
  <div class="section-heading"><div><span class="workspace-eyebrow">INTERVIEWS</span><h1>{{ employer ? '面试管理' : '我的面试' }}</h1><p class="muted">{{ employer ? '集中查看邀请，与候选人确认下一步安排' : '提前安排时间，为每一次面试做好准备' }}</p></div><el-button @click="load">刷新日程</el-button></div>
  <el-alert v-if="upcoming && !loading" :title="`本页最近面试：${upcoming.jobTitle} · ${dateText(upcoming.interview.time)}（北京时间）`" type="info" :closable="false" show-icon class="space-bottom" />
  <div class="filter-toolbar"><el-radio-group v-model="view"><el-radio-button value="all">全部邀请</el-radio-button><el-radio-button value="upcoming">本页待面试</el-radio-button></el-radio-group><span class="muted">共 {{ total }} 条有效面试邀请</span></div>
  <el-alert v-if="partialError" :title="partialError" type="warning" :closable="false"><el-button link @click="load">重试</el-button></el-alert>
  <LoadState :loading="loading" :error="error" :empty="!visible.length" empty-text="暂无面试安排" @retry="load">
    <div class="interview-list"><article v-for="row in visible" :key="row.id" class="interview-card">
      <div class="interview-date"><strong>{{ row.interview ? dateText(row.interview.time).slice(5,10) : '待定' }}</strong><span>{{ row.interview ? dateText(row.interview.time).slice(11,16) : '等待确认' }}</span></div>
      <div class="grow"><h3>{{ row.jobTitle || '职位信息暂不可用' }}</h3><p class="muted">{{ employer ? row.applicantName : row.jobCity }} <span v-if="row.interview"> · {{ row.interview.mode }} · 北京时间</span></p><template v-if="row.interview"><p class="pre-wrap">{{ row.interview.location }}</p><p v-if="row.interview.contact" class="muted">联系：{{ row.interview.contact }}</p><p v-if="row.interview.note" class="pre-wrap muted">{{ row.interview.note }}</p></template><p v-else class="muted">{{ row.detailFailed ? '面试详情加载失败' : '招聘方尚未填写具体时间与地点，请通过在线沟通确认。' }}</p></div>
      <div class="actions"><el-button v-if="employer" type="primary" :disabled="row.detailFailed" @click="selected = row; dialog = true">{{ row.interview ? '调整安排' : '补充安排' }}</el-button><el-button @click="chat(row)">沟通确认</el-button></div>
    </article></div>
  </LoadState>
  <el-pagination v-if="total > 20" v-model:current-page="page" :total="total" :page-size="20" layout="prev, pager, next" @current-change="load" />
  <InterviewDialog v-model="dialog" :application="selected" @saved="load" />
</template>
