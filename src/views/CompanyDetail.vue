<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api'
import JobCard from '../components/JobCard.vue'
import LoadState from '../components/LoadState.vue'
const route = useRoute(), companyJob = ref(null), jobs = ref([]), loading = ref(false), scanning = ref(false), error = ref(''), scanError = ref(''), hasMore = ref(true)
let generation = 0, page = 0, scanned = 0
const cities = computed(() => [...new Set(jobs.value.map(job => job.city).filter(Boolean))])
const types = computed(() => [...new Set(jobs.value.map(job => job.jobType).filter(Boolean))])
const name = computed(() => companyJob.value?.employerName || '公司招聘')
async function more(version = generation) {
  if (scanning.value || !hasMore.value) return
  scanning.value = true; scanError.value = ''
  try {
    // The public search has no employer filter. Scan small pages and explicitly show partial counts.
    for (let batch = 0; batch < 5 && hasMore.value; batch++) {
      const data = await api.searchJobs({ page: page + 1, size: 20, sort: 'latest' })
      if (version !== generation) return
      page++; scanned += data.list.length
      const matches = data.list.filter(job => job.employerId != null && companyJob.value.employerId != null ? String(job.employerId) === String(companyJob.value.employerId) : job.employerName === name.value)
      jobs.value = [...new Map([...jobs.value, ...matches].map(job => [String(job.id), job])).values()]
      hasMore.value = data.list.length > 0 && scanned < Number(data.total)
    }
  } catch (e) { if (version === generation) scanError.value = e.message }
  finally { if (version === generation) scanning.value = false }
}
async function load() {
  const version = ++generation
  page = 0; scanned = 0; hasMore.value = true; scanning.value = false; loading.value = true; error.value = ''; scanError.value = ''; jobs.value = []
  try {
    const job = await api.job(route.params.jobId)
    if (version !== generation) return
    companyJob.value = job; jobs.value = [job]
    await more(version)
  } catch (e) { if (version === generation) error.value = e.message }
  finally { if (version === generation) loading.value = false }
}
watch(() => route.params.jobId, load, { immediate: true })
onUnmounted(() => generation++)
</script>
<template>
  <div class="container page company-detail-page">
    <el-breadcrumb separator="/"><el-breadcrumb-item :to="{ path: '/companies' }">公司</el-breadcrumb-item><el-breadcrumb-item>公司招聘概览</el-breadcrumb-item></el-breadcrumb>
    <LoadState :loading="loading" :error="error" @retry="load"><template v-if="companyJob">
      <section class="company-profile-banner"><div class="company-monogram">{{ name.slice(0,1) }}</div><div class="grow"><span class="workspace-eyebrow">COMPANY</span><h1>{{ name }}</h1><p>{{ companyJob.industry || '行业未注明' }} · {{ cities.join(' / ') || '地点未注明' }}</p><div class="tags"><el-tag v-for="type in types" :key="type">{{ type }}</el-tag></div></div><div class="company-job-count"><strong>{{ jobs.length }}</strong><span>{{ hasMore ? '已找到的职位' : '在招职位' }}</span></div></section>
      <div class="detail-layout"><section><div class="section-heading"><h2>正在招聘</h2><span class="muted">{{ hasMore ? '继续加载可查找更多职位' : '已完成当前公开职位查询' }}</span></div><div class="job-list"><JobCard v-for="job in jobs" :key="job.id" :job="job" /></div><div class="center space-top"><el-button v-if="hasMore" :loading="scanning" @click="more()">继续查找该公司职位</el-button><p v-if="scanError" role="alert">{{ scanError }}</p></div></section><aside class="detail-aside"><h3>招聘信息</h3><p>招聘城市：{{ cities.join('、') }}</p><p>职位类型：{{ types.join('、') }}</p><p class="muted">以上信息来自公开招聘职位。未提供公司简介、规模及认证信息。</p><router-link to="/companies">查看其他公司 →</router-link></aside></div>
    </template></LoadState>
  </div>
</template>
