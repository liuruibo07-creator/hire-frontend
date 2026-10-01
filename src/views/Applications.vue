<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '../api'
import { session } from '../stores/session'
import { applicationStates, dateText } from '../utils'
import { useLoad } from '../composables/useLoad'
import LoadState from '../components/LoadState.vue'
import ResumePreview from '../components/ResumePreview.vue'
import ApplicationProgress from '../components/ApplicationProgress.vue'
import InterviewDialog from '../components/InterviewDialog.vue'
import { publicRemark, updatePublicRemark } from '../recruitment'
const router = useRouter(),
  role = session.user.role
const rows = ref([]),
  total = ref(0),
  detail = ref(null),
  dialog = ref(false),
  busy = ref(false)
const filters = reactive({
  page: 1,
  size: 10,
  status: undefined,
  jobId: '',
  employerId: '',
  userId: '',
  startDate: '',
  endDate: '',
})
const update = reactive({ status: 1, remark: '' })
const interviewOpen = ref(false), selectedRows = ref([]), batchStatus = ref(1), jobOptions = ref([]), jobsLoading = ref(false), jobsError = ref('')
let jobSearchVersion = 0
async function findJobs(keyword = '') {
  const version = ++jobSearchVersion
  jobsLoading.value = true; jobsError.value = ''
  try { const result = await api.myJobs({ page: 1, size: 20, keyword }); if (version === jobSearchVersion) jobOptions.value = result.list }
  catch (e) { if (version === jobSearchVersion) jobsError.value = e.message }
  finally { if (version === jobSearchVersion) jobsLoading.value = false }
}
function selectStatus(status) { filters.status = status; filters.page = 1; load() }
async function batchUpdate() {
  if (!selectedRows.value.length || busy.value) return
  try { await ElMessageBox.confirm(`将选中的 ${selectedRows.value.length} 位候选人更新为“${applicationStates[batchStatus.value]}”？`, '批量处理', { confirmButtonText: '确认更新', cancelButtonText: '取消' }) } catch { return }
  busy.value = true
  const results = await Promise.allSettled(selectedRows.value.map(row => api.applicationStatus(row.id, { status: batchStatus.value })))
  const failed = results.filter(result => result.status === 'rejected').length
  if (failed) ElMessage.warning(`${results.length - failed} 条更新成功，${failed} 条失败，请刷新后重试失败记录`)
  else ElMessage.success(`已更新 ${results.length} 位候选人`)
  selectedRows.value = []
  await load(); busy.value = false
}
const { loading, error, run } = useLoad()
const load = () =>
  run(
    () =>
      (role === 'admin'
        ? api.adminApplications
        : role === 'employer'
          ? api.receivedApplications
          : api.myApplications)(filters),
    (data) => {
      rows.value = data.list
      total.value = data.total
      selectedRows.value = []
    },
  )
async function view(row) {
  busy.value = true
  try {
    // Admin's list is the only admin-authorized application view; detail is owner-only.
    detail.value = role === 'admin' ? row : await api.application(row.id)
    update.status = detail.value.status || 1
    update.remark = publicRemark(detail.value.remark)
    dialog.value = true
  } catch {
  } finally {
    busy.value = false
  }
}
async function save() {
  let remark
  try { remark = updatePublicRemark(detail.value.remark, update.remark) }
  catch (e) { ElMessage.warning(e.message); return }
  busy.value = true
  try {
    await api.applicationStatus(detail.value.id, { status: update.status, remark })
    ElMessage.success('投递状态已更新')
    dialog.value = false
    await load()
  } catch {
  } finally {
    busy.value = false
  }
}
async function chat(row) {
  busy.value = true
  try {
    const data = await api.startConversation({ applicationId: row.id })
    router.push({ path: '/workspace/chat', query: { conversation: data.id } })
  } catch {
  } finally {
    busy.value = false
  }
}
onMounted(() => { load(); if (role === 'employer') findJobs() })
</script>
<template>
  <div class="section-heading"><div><span class="workspace-eyebrow">{{ role === 'employer' ? 'CANDIDATES' : role === 'admin' ? 'APPLICATION AUDIT' : 'MY APPLICATIONS' }}</span><h1>{{ role === 'seeker' ? '投递进度' : role === 'employer' ? '候选人管理' : '平台投递记录' }}</h1><p class="muted">{{ role === 'employer' ? '筛选简历、安排面试，推进每一位候选人' : role === 'seeker' ? '跟进每一次申请，把握下一步机会' : '查询平台投递状态与处理记录' }}</p></div><router-link v-if="role !== 'admin'" to="/workspace/interviews"><el-button>查看面试日程</el-button></router-link></div>
  <div v-if="role !== 'admin'" class="status-tabs"><button :class="{ active: filters.status == null }" @click="selectStatus(undefined)">全部</button><button v-for="(label, status) in applicationStates" :key="status" :class="{ active: filters.status === status }" @click="selectStatus(status)">{{ label }}</button></div>
  <form
    class="filter-toolbar"
    @submit.prevent="
      () => {
        filters.page = 1
        load()
      }
    "
  >
    <el-select v-model="filters.status" placeholder="全部状态" clearable aria-label="投递状态"
      ><el-option
        v-for="(label, value) in applicationStates"
        :key="value"
        :label="label"
        :value="value" /></el-select
    ><el-select v-if="role === 'employer'" v-model="filters.jobId" clearable filterable remote :remote-method="findJobs" :loading="jobsLoading" placeholder="输入职位名称查找" aria-label="按职位筛选"><el-option v-for="job in jobOptions" :key="job.id" :value="job.id" :label="job.title" /></el-select><el-input
      v-if="role === 'admin'"
      v-model="filters.jobId"
      placeholder="职位 ID"
      aria-label="职位 ID"
    /><template v-if="role === 'admin'"
      ><el-input v-model="filters.employerId" placeholder="企业 ID" aria-label="企业 ID" /><el-input
        v-model="filters.userId"
        placeholder="求职者 ID"
        aria-label="求职者 ID" /><el-date-picker
        v-model="filters.startDate"
        value-format="YYYY-MM-DD"
        placeholder="起始日期"
        aria-label="起始日期" /><el-date-picker
        v-model="filters.endDate"
        value-format="YYYY-MM-DD"
        placeholder="结束日期"
        aria-label="结束日期" /></template
    ><el-button type="primary" native-type="submit">查询</el-button>
  </form>
  <p v-if="jobsError" role="alert" class="muted">职位选项加载失败 <el-button link @click="findJobs()">重试</el-button></p>
  <div v-if="role === 'employer' && selectedRows.length" class="batch-toolbar"><span>已选 {{ selectedRows.length }} 人</span><el-select v-model="batchStatus" aria-label="批量更新状态"><el-option v-for="status in [1,3,4]" :key="status" :value="status" :label="applicationStates[status]" /></el-select><el-button type="primary" :loading="busy" @click="batchUpdate">批量更新</el-button></div>
  <LoadState :loading="loading" :error="error" :empty="!rows.length" empty-text="暂无投递记录" @retry="load"
    ><div v-if="role === 'seeker'" class="application-cards"><article v-for="row in rows" :key="row.id" class="application-card"><div class="grow"><router-link :to="`/jobs/${row.jobId}`"><h3>{{ row.jobTitle || '职位信息暂不可用' }}</h3></router-link><p class="muted">{{ row.jobCity }} · {{ row.resumeTitle }}</p><small class="muted">投递于 {{ dateText(row.createTime) }}</small></div><el-tag :type="row.status === 3 ? 'success' : row.status === 4 ? 'info' : 'primary'">{{ applicationStates[row.status] }}</el-tag><el-button :disabled="busy" @click="view(row)">查看进度</el-button></article></div><el-table v-else :data="rows" stripe row-key="id" @selection-change="selectedRows = $event"
      ><el-table-column v-if="role === 'employer'" type="selection" width="45" :selectable="() => !busy" /><el-table-column prop="jobTitle" label="职位" min-width="170" /><el-table-column
        v-if="role !== 'seeker'"
        prop="applicantName"
        label="求职者"
        min-width="100"
      /><el-table-column v-if="role === 'employer'" label="学历 / 期望职位" min-width="160"><template #default="{ row }"><span>{{ row.resume?.education || '未填写' }}</span><p class="muted">{{ row.resume?.expectedPosition || '未填写期望' }}</p></template></el-table-column><el-table-column prop="resumeTitle" label="投递简历" min-width="140" /><el-table-column
        label="状态"
        min-width="110"
        ><template #default="{ row }"
          ><el-tag :type="row.status === 3 ? 'success' : row.status === 4 ? 'info' : 'primary'">{{
            applicationStates[row.status]
          }}</el-tag></template
        ></el-table-column
      ><el-table-column label="投递时间" min-width="150"
        ><template #default="{ row }">{{ dateText(row.createTime) }}</template></el-table-column
      ><el-table-column label="操作" min-width="130" fixed="right"
        ><template #default="{ row }"
          ><el-button link type="primary" :disabled="busy" @click="view(row)">详情</el-button
          ><el-button v-if="role === 'employer'" link type="primary" :disabled="busy" @click="chat(row)"
            >沟通</el-button
          ></template
        ></el-table-column
      ></el-table
    ><el-pagination
      background
      layout="prev, pager, next"
      :pager-count="5"
      :total="total"
      :page-size="filters.size"
      v-model:current-page="filters.page"
      @current-change="load"
  /></LoadState>
  <el-dialog v-model="dialog" title="投递详情" width="720px"
    ><template v-if="detail"
      ><h2>{{ detail.jobTitle || '职位信息暂不可用' }}</h2>
      <ApplicationProgress v-if="role !== 'admin'" :application="detail" />
      <p v-else>当前状态：{{ applicationStates[detail.status] }}</p>
      <p class="pre-wrap">求职附言：{{ detail.coverLetter || '未填写' }}</p>
      <p v-if="role === 'admin'" class="pre-wrap">企业备注：{{ publicRemark(detail.remark) || '暂无' }}</p>
      <el-button v-if="role === 'employer'" type="primary" @click="interviewOpen = true">安排 / 调整面试</el-button>
      <template v-if="role !== 'admin'"
        ><h3>投递简历</h3>
        <ResumePreview :resume="detail.resume" /></template
      ><el-descriptions v-else :column="1" border
        ><el-descriptions-item label="职位 ID">{{ detail.jobId }}</el-descriptions-item
        ><el-descriptions-item label="企业 ID">{{ detail.employerId }}</el-descriptions-item
        ><el-descriptions-item label="求职者 ID">{{ detail.userId }}</el-descriptions-item
        ><el-descriptions-item label="简历标题">{{
          detail.resumeTitle
        }}</el-descriptions-item></el-descriptions
      ><el-form v-if="role === 'employer'" label-position="top" class="space-top" @submit.prevent="save"
        ><el-form-item label="更新状态"
          ><el-select v-model="update.status"
            ><el-option
              v-for="value in [1, 2, 3, 4]"
              :key="value"
              :value="value"
              :label="applicationStates[value]" /></el-select></el-form-item
        ><el-form-item label="给候选人的公开反馈（候选人可见）"
          ><el-input v-model="update.remark" type="textarea" :rows="3" maxlength="500" /></el-form-item
        ><el-button type="primary" native-type="submit" :loading="busy">保存处理结果</el-button></el-form
      ></template
    ></el-dialog
  >
  <InterviewDialog v-model="interviewOpen" :application="detail" @saved="dialog = false; load()" />
</template>
