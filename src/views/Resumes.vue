<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Star, Document, View } from '@element-plus/icons-vue'
import { api } from '../api'
import { pick, educations, dateText } from '../utils'
import { useLoad } from '../composables/useLoad'
import LoadState from '../components/LoadState.vue'
import ResumePreview from '../components/ResumePreview.vue'
const rows = ref([]),
  dialog = ref(false),
  preview = ref(null),
  previewOpen = ref(false),
  busy = ref(false),
  formRef = ref(),
  editId = ref(null)
const defaults = () => ({
  title: '',
  name: '',
  gender: null,
  birthYear: undefined,
  phone: '',
  email: '',
  education: '',
  university: '',
  major: '',
  graduationDate: '',
  workExperience: '',
  skills: '',
  expectedPosition: '',
  expectedSalary: '',
  expectedCity: '',
  selfEvaluation: '',
})
const form = reactive(defaults())
const rules = {
  title: [{ required: true, message: '请输入简历名称', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  email: [{ type: 'email', message: '请输入正确的邮箱', trigger: 'blur' }],
}
const { loading, error, run } = useLoad()
const load = () =>
  run(api.resumes, (data) => {
    rows.value = data
  })
async function edit(row) {
  busy.value = true
  try {
    const data = row ? await api.resume(row.id) : {}
    editId.value = row?.id
    Object.assign(form, defaults(), pick(data, Object.keys(defaults())))
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
    await api.saveResume(editId.value, { ...form, birthYear: form.birthYear ?? null })
    dialog.value = false
    ElMessage.success('简历保存成功')
    await load()
  } catch {
  } finally {
    busy.value = false
  }
}
async function remove(row) {
  try {
    await ElMessageBox.confirm(`删除“${row.title}”？此操作会移除该简历。`, '删除简历', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    busy.value = true
    await api.deleteResume(row.id)
    ElMessage.success('简历已删除')
    await load()
  } catch {
  } finally {
    busy.value = false
  }
}
async function setDefault(row) {
  busy.value = true
  try {
    await api.setDefaultResume(row.id)
    ElMessage.success('已设为默认简历')
    await load()
  } catch {
  } finally {
    busy.value = false
  }
}
async function view(row) {
  try {
    preview.value = await api.resume(row.id)
    previewOpen.value = true
  } catch {}
}
onMounted(load)
</script>
<template>
  <div class="section-heading">
    <div>
      <h1>我的简历</h1>
      <p class="muted">认真记录经历，让优势被看见</p>
    </div>
    <el-button type="primary" :icon="Plus" :disabled="busy" @click="edit()">创建简历</el-button>
  </div>
  <LoadState
    :loading="loading"
    :error="error"
    :empty="!rows.length"
    empty-text="还没有简历，创建第一份简历吧"
    @retry="load"
    ><div class="resume-list">
      <article v-for="row in rows" :key="row.id">
        <el-icon class="resource-icon"><Document /></el-icon>
        <div class="grow">
          <h3>{{ row.title }} <el-tag v-if="row.isDefault === 1" size="small">默认</el-tag></h3>
          <p class="muted">
            {{ row.expectedPosition || '未填写期望职位' }} · {{ row.expectedCity || '城市不限' }}
          </p>
        </div>
        <div class="actions">
          <el-tooltip content="预览简历"
            ><el-button :icon="View" circle aria-label="预览简历" @click="view(row)" /></el-tooltip
          ><el-tooltip content="编辑简历"
            ><el-button
              :icon="Edit"
              circle
              aria-label="编辑简历"
              :disabled="busy"
              @click="edit(row)" /></el-tooltip
          ><el-tooltip content="设为默认"
            ><el-button
              :icon="Star"
              circle
              aria-label="设为默认"
              :disabled="busy || row.isDefault === 1"
              @click="setDefault(row)" /></el-tooltip
          ><el-tooltip content="删除简历"
            ><el-button :icon="Delete" circle aria-label="删除简历" :disabled="busy" @click="remove(row)"
          /></el-tooltip>
        </div>
      </article></div
  ></LoadState>
  <el-dialog
    v-model="dialog"
    :title="editId ? '编辑简历' : '创建简历'"
    width="720px"
    :close-on-click-modal="!busy"
    destroy-on-close
    ><el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="save"
      ><div class="form-grid">
        <el-form-item
          v-for="[key, label] in [
            ['title', '简历名称'],
            ['name', '姓名'],
            ['phone', '联系电话'],
            ['email', '邮箱'],
            ['university', '毕业院校'],
            ['major', '专业'],
            ['expectedPosition', '期望职位'],
            ['expectedSalary', '期望薪资'],
            ['expectedCity', '期望城市'],
          ]"
          :key="key"
          :label="label"
          :prop="key"
          ><el-input v-model="form[key]" :maxlength="key === 'title' ? 100 : 100" /></el-form-item
        ><el-form-item label="性别"
          ><el-select v-model="form.gender" clearable
            ><el-option label="男" :value="1" /><el-option label="女" :value="0" /></el-select></el-form-item
        ><el-form-item label="出生年份"
          ><el-input-number
            v-model="form.birthYear"
            :min="1900"
            :max="new Date().getFullYear()" /></el-form-item
        ><el-form-item label="学历"
          ><el-select v-model="form.education" clearable
            ><el-option
              v-for="item in educations.filter((x) => x !== '不限')"
              :key="item"
              :value="item" /></el-select></el-form-item
        ><el-form-item label="毕业日期"
          ><el-date-picker v-model="form.graduationDate" type="date" value-format="YYYY-MM-DD"
        /></el-form-item>
      </div>
      <el-form-item
        v-for="[key, label] in [
          ['workExperience', '工作经历'],
          ['skills', '专业技能'],
          ['selfEvaluation', '自我评价'],
        ]"
        :key="key"
        :label="label"
        ><el-input v-model="form[key]" type="textarea" :rows="3"
      /></el-form-item>
      <div class="dialog-actions">
        <el-button :disabled="busy" @click="dialog = false">取消</el-button
        ><el-button type="primary" native-type="submit" :loading="busy">保存简历</el-button>
      </div></el-form
    ></el-dialog
  ><el-dialog v-model="previewOpen" title="简历预览" width="680px"
    ><ResumePreview :resume="preview"
  /></el-dialog>
</template>
