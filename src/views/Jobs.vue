<script setup>
import { reactive, ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, Refresh } from '@element-plus/icons-vue'
import { api } from '../api'
import { cities, experiences, educations, jobTypes } from '../utils'
import { useLoad } from '../composables/useLoad'
import LoadState from '../components/LoadState.vue'
import JobCard from '../components/JobCard.vue'
const route = useRoute(),
  router = useRouter()
const filters = reactive({
  keyword: '',
  city: '',
  jobType: '',
  experienceReq: '',
  educationReq: '',
  categoryId: '',
  industry: '',
  salaryMin: undefined,
  salaryMax: undefined,
  sort: 'relevance',
  page: 1,
  size: 10,
})
const categories = ref([]),
  categoryError = ref(''),
  jobs = ref([]),
  total = ref(0)
const { loading, error, run } = useLoad()
function readQuery() {
  for (const key of Object.keys(filters)) {
    const value = route.query[key]
    filters[key] = ['page', 'size', 'salaryMin', 'salaryMax'].includes(key)
      ? value
        ? Number(value)
        : key === 'page'
          ? 1
          : key === 'size'
            ? 10
            : undefined
      : value || (key === 'sort' ? 'relevance' : '')
  }
  run(
    () => api.searchJobs(filters),
    (data) => {
      jobs.value = data.list
      total.value = data.total
    },
  )
}
function search(page = 1) {
  filters.page = page
  const query = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v !== undefined))
  if (JSON.stringify(route.query) === JSON.stringify(query)) readQuery()
  else router.push({ path: route.path, query })
}
function reset() {
  router.push({ path: route.path, query: {} })
  if (!Object.keys(route.query).length) readQuery()
}
async function loadCategories() {
  try {
    categories.value = await api.categories()
    categoryError.value = ''
  } catch (e) {
    categoryError.value = e.message
  }
}
watch(() => route.fullPath, readQuery, { immediate: true })
onMounted(loadCategories)
</script>
<template>
  <div class="container page">
    <div class="page-heading">
      <h1>发现好职位</h1>
      <p class="muted">每一次选择，都向理想的工作更近一步</p>
    </div>
    <div class="listing-layout">
      <aside class="filters">
        <div class="section-heading">
          <h3>筛选条件</h3>
          <el-button link :icon="Refresh" @click="reset">清空筛选</el-button>
        </div>
        <el-form label-position="top" @submit.prevent="search()"
          ><el-form-item label="工作城市"
            ><el-select
              v-model="filters.city"
              clearable
              filterable
              allow-create
              default-first-option
              @change="search()"
              ><el-option v-for="city in cities" :key="city" :value="city" /></el-select
          ></el-form-item>
          <el-form-item label="薪资范围 (K/月)"
            ><div class="salary-filter">
              <el-input-number
                v-model="filters.salaryMin"
                :min="0"
                :max="999"
                :controls="false"
                placeholder="最低"
                aria-label="最低薪资"
              /><span>—</span
              ><el-input-number
                v-model="filters.salaryMax"
                :min="filters.salaryMin || 0"
                :max="999"
                :controls="false"
                placeholder="最高"
                aria-label="最高薪资"
              /></div
          ></el-form-item>
          <el-form-item
            v-for="group in [
              { key: 'experienceReq', label: '工作经验', items: experiences },
              { key: 'educationReq', label: '学历要求', items: educations },
              { key: 'jobType', label: '职位类型', items: jobTypes },
            ]"
            :key="group.key"
            :label="group.label"
            ><el-select
              v-model="filters[group.key]"
              clearable
              @change="search()"
              ><el-option v-for="item in group.items" :key="item" :value="item" /></el-select
          ></el-form-item>
          <el-form-item label="职位类别"
            ><el-tree-select
              v-model="filters.categoryId"
              :data="categories"
              :props="{ label: 'name', value: 'id', children: 'children' }"
              node-key="id"
              check-strictly
              clearable
              @change="search()"
            /><el-button v-if="categoryError" link type="danger" @click="loadCategories"
              >类别加载失败，重试</el-button
            ></el-form-item
          >
          <el-form-item label="行业"
            ><el-input v-model="filters.industry" clearable placeholder="如：互联网" /></el-form-item
          ><el-button type="primary" native-type="submit" class="full">应用筛选</el-button></el-form
        >
      </aside>
      <section class="results">
        <form class="search-bar" @submit.prevent="search()">
          <el-input
            v-model="filters.keyword"
            :prefix-icon="Search"
            placeholder="搜索职位关键词，例如：前端、产品经理、Java"
            aria-label="职位关键词"
            clearable
          /><el-button native-type="submit" type="primary">搜索</el-button>
        </form>
        <div class="results-toolbar">
          <span class="muted">{{ error ? '职位列表暂不可用' : `共找到 ${total} 个职位` }}</span
          ><el-select v-model="filters.sort" aria-label="排序" @change="search()"
            ><el-option label="综合排序" value="relevance" /><el-option
              label="最新发布"
              value="latest" /><el-option label="薪资从高到低" value="salary_desc" /><el-option
              label="薪资从低到高"
              value="salary_asc"
          /></el-select>
        </div>
        <LoadState
          :loading="loading"
          :error="error"
          :empty="!jobs.length"
          empty-text="暂无匹配职位，试试调整筛选条件"
          @retry="readQuery"
          ><div class="job-list"><JobCard v-for="job in jobs" :key="job.id" :job="job" /></div>
          <el-pagination
            v-if="total > filters.size"
            background
            layout="prev, pager, next"
            :pager-count="5"
            :total="total"
            :page-size="filters.size"
            :current-page="filters.page"
            @current-change="search"
        /></LoadState>
      </section>
    </div>
  </div>
</template>
