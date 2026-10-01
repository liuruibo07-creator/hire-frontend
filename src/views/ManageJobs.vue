<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { api } from '../api'
import { session } from '../stores/session'
import { pick, salary, jobStates, jobTypes, experiences, educations } from '../utils'
import { useLoad } from '../composables/useLoad'
import LoadState from '../components/LoadState.vue'
const admin = session.user.role === 'admin',
  rows = ref([]),
  total = ref(0),
  categories = ref([]),
  busy = ref(false),
  dialog = ref(false),
  formRef = ref(),
  editId = ref(null),
  detail = ref(null),
  detailOpen = ref(false),
  stats = ref(null)
const filters = reactive({ page: 1, size: 10, keyword: '', status: undefined, city: '', employerId: '' })
const defaults = () => ({
  title: '',
  categoryId: undefined,
  description: '',
  jobType: '全职',
  industry: '',
  city: '',
  address: '',
  experienceReq: '不限',
  educationReq: '不限',
  salaryMin: undefined,
  salaryMax: undefined,
  salaryMonths: 12,
  skills: '',
  headcount: 1,
})
const form = reactive(defaults()),
  review = reactive({ decision: 'approve', remark: '' })
const rules = {
  salaryMonths: [{ required: true, message: '请确认薪资月数', trigger: 'change' }],
  title: [{ required: true, message: '请输入职位名称', trigger: 'blur' }],
  city: [{ required: true, message: '请输入工作城市', trigger: 'blur' }],
  jobType: [{ required: true, message: '请选择职位类型', trigger: 'change' }],
  salaryMax: [
    {
      validator: (_, value, callback) =>
        callback(
          value != null && form.salaryMin != null && value < form.salaryMin
            ? new Error('最高薪资不能低于最低薪资')
            : undefined,
        ),
      trigger: 'change',
    },
  ],
}
const { loading, error, run } = useLoad()
const load = () =>
  run(
    () => (admin ? api.adminJobs : api.myJobs)(filters),
    (data) => {
      rows.value = data.list
      total.value = data.total
    },
  )
async function edit(row) {
  // JobVO omits address and salaryMonths. The public detail only permits online jobs.
  // Do not invent an employer detail endpoint or submit missing fields as empty values.
  busy.value = true
  try {
    const data = row ? (row.status === 1 ? await api.job(row.id) : row) : {}
    editId.value = row?.id
    Object.assign(form, defaults(), pick(data, Object.keys(defaults())))
    if (row && row.status !== 1) {
      form.address = undefined
      form.salaryMonths = undefined
    }
    dialog.value = true
  } catch {
  } finally {
    busy.value = false
  }
}
async function save() {
  if (!(await formRef.value.validate().catch(() => false))) return
  busy.value = true
  try {
    await api.saveJob(
      editId.value,
      Object.fromEntries(Object.entries(form).filter(([, value]) => value !== undefined)),
    )
    ElMessage.success('职位已保存，请查看最新状态')
    dialog.value = false
    await load()
  } catch {
  } finally {
    busy.value = false
  }
}
async function status(row, value) {
  try {
    await ElMessageBox.confirm(
      value ? '申请上架后，职位将进入待审核状态。' : '确认下架此职位？',
      '职位状态',
      { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' },
    )
    busy.value = true
    if (admin) await api.offlineJob(row.id)
    else await api.jobStatus(row.id, value)
    ElMessage.success('职位状态已更新')
    await load()
  } catch {
  } finally {
    busy.value = false
  }
}
async function inspect(row) {
  busy.value = true
  stats.value = null
  try {
    detail.value = await api.adminJob(row.id)
    review.decision = 'approve'
    review.remark = ''
    detailOpen.value = true
  } catch {
  } finally {
    busy.value = false
  }
}
async function statistics() {
  busy.value = true
  try {
    stats.value = await api.jobStatistics(detail.value.id)
  } catch {
  } finally {
    busy.value = false
  }
}
async function submitReview() {
  if (review.decision === 'reject' && !review.remark.trim()) return ElMessage.warning('拒绝时请填写审核意见')
  busy.value = true
  try {
    await api.reviewJob(detail.value.id, { ...review })
    ElMessage.success('审核完成')
    detailOpen.value = false
    await load()
  } catch {
  } finally {
    busy.value = false
  }
}
async function loadCategories() {
  try {
    categories.value = await api.categories()
  } catch {}
}
onMounted(() => {
  load()
  if (!admin) loadCategories()
})
</script>
<template>
  <div class="section-heading">
    <h1>{{ admin ? '职位审核与管理' : '我的职位' }}</h1>
    <el-button v-if="!admin" type="primary" :icon="Plus" :disabled="busy" @click="edit()">发布职位</el-button>
  </div>
  <form
    class="filter-toolbar"
    @submit.prevent="
      () => {
        filters.page = 1
        load()
      }
    "
  >
    <el-input v-model="filters.keyword" placeholder="搜索职位" aria-label="搜索职位" clearable /><el-select
      v-model="filters.status"
      placeholder="全部状态"
      aria-label="职位状态"
      clearable
      ><el-option v-for="(label, value) in jobStates" :key="value" :value="value" :label="label" /></el-select
    ><template v-if="admin"
      ><el-input v-model="filters.city" placeholder="城市" aria-label="城市" clearable /><el-input
        v-model="filters.employerId"
        placeholder="企业 ID"
        aria-label="企业 ID"
        clearable /></template
    ><el-button type="primary" native-type="submit">查询</el-button>
  </form>
  <LoadState :loading="loading" :error="error" :empty="!rows.length" empty-text="暂无职位" @retry="load"
    ><el-table :data="rows" stripe
      ><el-table-column prop="title" label="职位名称" min-width="170" /><el-table-column
        v-if="admin"
        prop="employerName"
        label="企业"
        min-width="140"
      /><el-table-column prop="city" label="城市" min-width="80" /><el-table-column
        label="薪资"
        min-width="100"
        ><template #default="{ row }"
          ><span class="salary">{{ salary(row) }}</span></template
        ></el-table-column
      ><el-table-column label="状态" min-width="100"
        ><template #default="{ row }"
          ><el-tag :type="row.status === 1 ? 'success' : row.status === 3 ? 'warning' : 'info'">{{
            jobStates[row.status]
          }}</el-tag></template
        ></el-table-column
      ><el-table-column prop="applyCount" label="投递" width="70" /><el-table-column
        label="操作"
        min-width="160"
        fixed="right"
        ><template #default="{ row }"
          ><el-button v-if="admin" link type="primary" :disabled="busy" @click="inspect(row)"
            >详情 / 审核</el-button
          ><el-button v-else link type="primary" :disabled="busy || row.status === 2" @click="edit(row)"
            >编辑</el-button
          ><el-button v-if="row.status === 1" link type="danger" :disabled="busy" @click="status(row, 0)"
            >下架</el-button
          ><el-button
            v-if="!admin && [0, 4].includes(row.status)"
            link
            type="primary"
            :disabled="busy"
            @click="status(row, 1)"
            >申请上架</el-button
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
  <el-dialog
    v-model="dialog"
    :title="editId ? '编辑职位' : '发布职位'"
    width="740px"
    destroy-on-close
    :close-on-click-modal="!busy"
    ><el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="save"
      ><div class="form-grid">
        <el-form-item label="职位名称" prop="title"
          ><el-input v-model="form.title" maxlength="100" /></el-form-item
        ><el-form-item label="工作城市" prop="city"
          ><el-input v-model="form.city" maxlength="50" /></el-form-item
        ><el-form-item label="职位类别"
          ><el-tree-select
            v-model="form.categoryId"
            :data="categories"
            :props="{ label: 'name', value: 'id', children: 'children' }"
            node-key="id"
            check-strictly
            clearable
          /><el-button v-if="!categories.length" link @click="loadCategories"
            >重新加载类别</el-button
          ></el-form-item
        ><el-form-item
          v-for="[key, label, options] in [
            ['jobType', '职位类型', jobTypes],
            ['experienceReq', '工作经验', experiences],
            ['educationReq', '学历要求', educations],
          ]"
          :key="key"
          :label="label"
          :prop="key"
          ><el-select v-model="form[key]"
            ><el-option v-for="option in options" :key="option" :value="option" /></el-select></el-form-item
        ><el-form-item label="行业"><el-input v-model="form.industry" maxlength="100" /></el-form-item
        ><el-form-item label="招聘人数"
          ><el-input-number v-model="form.headcount" :min="1" :max="9999" /></el-form-item
        ><el-form-item label="最低薪资 (K/月)"
          ><el-input-number v-model="form.salaryMin" :min="0" :max="999" /></el-form-item
        ><el-form-item label="最高薪资 (K/月)" prop="salaryMax"
          ><el-input-number v-model="form.salaryMax" :min="0" :max="999" /></el-form-item
        ><el-form-item label="薪资月数" prop="salaryMonths"
          ><el-input-number v-model="form.salaryMonths" :min="1" :max="36" placeholder="请确认"
        /></el-form-item>
      </div>
      <el-form-item label="详细地址"
        ><el-input
          v-model="form.address"
          maxlength="255"
          :placeholder="form.address === undefined ? '留空保持原地址' : ''" /></el-form-item
      ><el-form-item label="技能要求（逗号分隔）"
        ><el-input v-model="form.skills" maxlength="500" /></el-form-item
      ><el-form-item label="职位描述"
        ><el-input v-model="form.description" type="textarea" :rows="7"
      /></el-form-item>
      <div class="dialog-actions">
        <el-button :disabled="busy" @click="dialog = false">取消</el-button
        ><el-button type="primary" native-type="submit" :loading="busy">提交审核</el-button>
      </div></el-form
    ></el-dialog
  >
  <el-dialog v-model="detailOpen" title="职位详情与审核" width="720px"
    ><template v-if="detail"
      ><h2>{{ detail.title }}</h2>
      <p>{{ detail.employerName }} · {{ detail.city }} · {{ salary(detail) }}</p>
      <p>{{ detail.educationReq }} · {{ detail.experienceReq }} · {{ detail.jobType }}</p>
      <p>工作地址：{{ detail.address || '未提供' }}</p>
      <p class="pre-wrap">{{ detail.description || '未填写职位描述' }}</p>
      <p>审核意见：{{ detail.reviewRemark || '暂无' }}</p>
      <el-button :loading="busy" @click="statistics">查看投递统计</el-button
      ><el-descriptions v-if="stats" :column="2" border class="space-top"
        ><el-descriptions-item
          v-for="[key, label] in [
            ['applicationTotal', '全部投递'],
            ['pendingCount', '待处理'],
            ['viewedCount', '已查看'],
            ['interviewCount', '面试邀请'],
            ['offeredCount', '已录用'],
            ['rejectedCount', '已拒绝'],
          ]"
          :key="key"
          :label="label"
          >{{ stats[key] }}</el-descriptions-item
        ></el-descriptions
      ><el-form
        v-if="detail.status === 3"
        label-position="top"
        class="space-top"
        @submit.prevent="submitReview"
        ><el-form-item label="审核结果"
          ><el-radio-group v-model="review.decision"
            ><el-radio value="approve">通过</el-radio><el-radio value="reject">拒绝</el-radio></el-radio-group
          ></el-form-item
        ><el-form-item label="审核意见" :required="review.decision === 'reject'"
          ><el-input
            v-model="review.remark"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit /></el-form-item
        ><el-button type="primary" native-type="submit" :loading="busy">确认审核</el-button></el-form
      ></template
    ></el-dialog
  >
</template>
