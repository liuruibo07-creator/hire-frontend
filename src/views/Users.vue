<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '../api'
import { roles, dateText } from '../utils'
import { useLoad } from '../composables/useLoad'
import LoadState from '../components/LoadState.vue'
const rows = ref([]),
  total = ref(0),
  busy = ref(false),
  detail = ref(null),
  dialog = ref(false)
const filters = reactive({ page: 1, size: 10, keyword: '', role: '', status: undefined })
const { loading, error, run } = useLoad()
const load = () =>
  run(
    () => api.adminUsers(filters),
    (data) => {
      rows.value = data.list
      total.value = data.total
    },
  )
async function view(row) {
  try {
    detail.value = await api.adminUser(row.id)
    dialog.value = true
  } catch {}
}
async function status(row) {
  try {
    await ElMessageBox.confirm(
      `确认${row.status === 1 ? '禁用' : '启用'}账号“${row.username}”？`,
      '更新账号状态',
      { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' },
    )
    busy.value = true
    await api.userStatus(row.id, row.status === 1 ? 0 : 1)
    ElMessage.success('账号状态已更新')
    await load()
  } catch {
  } finally {
    busy.value = false
  }
}
onMounted(load)
</script>
<template>
  <h1>用户管理</h1>
  <form
    class="filter-toolbar"
    @submit.prevent="
      () => {
        filters.page = 1
        load()
      }
    "
  >
    <el-input
      v-model="filters.keyword"
      placeholder="搜索账号或姓名"
      aria-label="搜索用户"
      clearable
    /><el-select v-model="filters.role" placeholder="全部角色" aria-label="用户角色" clearable
      ><el-option v-for="(label, value) in roles" :key="value" :label="label" :value="value" /></el-select
    ><el-select v-model="filters.status" placeholder="全部状态" aria-label="用户状态" clearable
      ><el-option label="正常" :value="1" /><el-option label="禁用" :value="0" /></el-select
    ><el-button type="primary" native-type="submit">查询</el-button>
  </form>
  <LoadState :loading="loading" :error="error" :empty="!rows.length" @retry="load"
    ><el-table :data="rows" stripe
      ><el-table-column prop="username" label="用户名" min-width="130" /><el-table-column
        prop="realName"
        label="姓名 / 企业"
        min-width="140"
      /><el-table-column label="角色" min-width="90"
        ><template #default="{ row }">{{ roles[row.role] }}</template></el-table-column
      ><el-table-column label="状态" min-width="80"
        ><template #default="{ row }"
          ><el-tag :type="row.status === 1 ? 'success' : 'danger'">{{
            row.status === 1 ? '正常' : '禁用'
          }}</el-tag></template
        ></el-table-column
      ><el-table-column label="操作" min-width="130" fixed="right"
        ><template #default="{ row }"
          ><el-button link type="primary" @click="view(row)">详情</el-button
          ><el-button
            link
            :type="row.status === 1 ? 'danger' : 'primary'"
            :disabled="busy"
            @click="status(row)"
            >{{ row.status === 1 ? '禁用' : '启用' }}</el-button
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
      @current-change="load" /></LoadState
  ><el-dialog v-model="dialog" title="用户详情" width="560px"
    ><el-descriptions v-if="detail" :column="1" border
      ><el-descriptions-item
        v-for="[key, label] in [
          ['id', '用户 ID'],
          ['username', '用户名'],
          ['realName', '姓名 / 企业'],
          ['email', '邮箱'],
          ['phone', '联系电话'],
        ]"
        :key="key"
        :label="label"
        >{{ detail[key] || '未填写' }}</el-descriptions-item
      ><el-descriptions-item label="角色">{{ roles[detail.role] }}</el-descriptions-item
      ><el-descriptions-item label="注册时间">{{ dateText(detail.createTime) }}</el-descriptions-item
      ><el-descriptions-item label="最后登录">{{
        dateText(detail.lastLoginTime)
      }}</el-descriptions-item></el-descriptions
    ></el-dialog
  >
</template>
