<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Bell } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { api } from '../api'
import { dateText } from '../utils'
import { useLoad } from '../composables/useLoad'
import LoadState from '../components/LoadState.vue'
import { refreshInbox } from '../stores/inbox'
const rows = ref([]),
  total = ref(0),
  busy = ref(false)
const filters = reactive({ page: 1, size: 10, isRead: undefined })
const { loading, error, run } = useLoad()
const load = () =>
  run(
    () => api.notices(filters),
    (data) => {
      rows.value = data.list
      total.value = data.total
    },
  )
async function mark(id) {
  busy.value = true
  try {
    if (id) await api.readNotice(id)
    else await api.readAllNotices()
    ElMessage.success('已标记为已读')
    await load()
    await refreshInbox()
  } catch {
  } finally {
    busy.value = false
  }
}
onMounted(load)
</script>
<template>
  <div class="section-heading">
    <h1>消息通知</h1>
    <el-button :loading="busy" @click="mark()">全部标为已读</el-button>
  </div>
  <div class="filter-toolbar">
    <el-select
      v-model="filters.isRead"
      placeholder="全部通知"
      clearable
      @change="
        () => {
          filters.page = 1
          load()
        }
      "
      ><el-option label="未读" :value="0" /><el-option label="已读" :value="1"
    /></el-select>
  </div>
  <LoadState :loading="loading" :error="error" :empty="!rows.length" empty-text="暂无通知" @retry="load"
    ><div class="notice-list">
      <article v-for="row in rows" :key="row.id" :class="{ read: row.isRead === 1 }">
        <el-icon class="resource-icon"><Bell /></el-icon>
        <div class="grow">
          <h3>{{ row.title }} <el-tag v-if="!row.isRead" size="small">未读</el-tag></h3>
          <p class="pre-wrap">{{ row.content }}</p>
          <small class="muted">{{ dateText(row.createTime) }}</small>
        </div>
        <el-button v-if="!row.isRead" link type="primary" :disabled="busy" @click="mark(row.id)"
          >标为已读</el-button
        >
      </article>
    </div>
    <el-pagination
      background
      layout="prev, pager, next"
      :pager-count="5"
      v-model:current-page="filters.page"
      :page-size="filters.size"
      :total="total"
      @current-change="load"
  /></LoadState>
</template>
