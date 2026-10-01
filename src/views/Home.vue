<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, ArrowRight, Document, ChatDotRound, Briefcase } from '@element-plus/icons-vue'
import { api } from '../api'
import { cities, jobTypes } from '../utils'
import { useLoad } from '../composables/useLoad'
import LoadState from '../components/LoadState.vue'
import JobCard from '../components/JobCard.vue'
const router = useRouter()
const keyword = ref(''),
  city = ref(''),
  jobType = ref(''),
  jobs = ref([])
const { loading, error, run } = useLoad()
const load = () =>
  run(
    () => api.searchJobs({ page: 1, size: 8, sort: 'latest' }),
    (data) => {
      jobs.value = data.list
    },
  )
const search = () =>
  router.push({ path: '/jobs', query: { keyword: keyword.value, city: city.value, jobType: jobType.value } })
onMounted(load)
</script>
<template>
  <section class="hero">
    <div class="container hero-inner">
      <p class="eyebrow">每一种热爱，都值得一个好机会</p>
      <h1><span>发现更适合你的</span><br />工作机会</h1>
      <p class="hero-subtitle">连接优秀的人才与卓越的企业<br />让每一份才华都有合适的舞台</p>
      <form class="search-bar hero-search" @submit.prevent="search">
        <el-input
          v-model="keyword"
          :prefix-icon="Search"
          placeholder="搜索职位、公司或关键词"
          aria-label="职位关键词"
          clearable
        /><el-select v-model="city" placeholder="选择城市" aria-label="选择城市" clearable
          ><el-option v-for="item in cities" :key="item" :value="item" /></el-select
        ><el-select v-model="jobType" placeholder="职位类型" aria-label="职位类型" clearable
          ><el-option v-for="item in jobTypes" :key="item" :value="item" /></el-select
        ><el-button type="primary" native-type="submit" size="large">搜索职位</el-button>
      </form>
      <div class="hot-search">
        <span>热门搜索：</span
        ><el-button
          v-for="item in ['前端开发', '产品经理', 'Java', '实习生', '运营', 'UI设计', '数据分析']"
          :key="item"
          size="small"
          @click="
            () => {
              keyword = item
              search()
            }
          "
          >{{ item }}</el-button
        >
      </div>
    </div>
  </section>
  <section class="container home-section">
    <div class="section-heading">
      <div>
        <h2>最新职位</h2>
        <p class="muted">新的机会，从这里开始</p>
      </div>
      <router-link to="/jobs"
        >查看更多职位 <el-icon><ArrowRight /></el-icon
      ></router-link>
    </div>
    <LoadState
      :loading="loading"
      :error="error"
      :empty="!jobs.length"
      empty-text="暂时没有在招职位"
      @retry="load"
      ><div class="featured-grid"><JobCard v-for="job in jobs" :key="job.id" :job="job" compact /></div
    ></LoadState>
  </section>
  <section class="service-band">
    <div class="container service-grid">
      <router-link to="/jobs"
        ><el-icon><Briefcase /></el-icon>
        <div>
          <h3>发现理想职位</h3>
          <p>找到与你的专业与热爱相契合的机会</p>
        </div>
        <el-icon><ArrowRight /></el-icon></router-link
      ><router-link to="/workspace/resumes"
        ><el-icon><Document /></el-icon>
        <div>
          <h3>展现你的优势</h3>
          <p>完善个人简历，让经历被看见</p>
        </div>
        <el-icon><ArrowRight /></el-icon></router-link
      ><router-link to="/workspace/chat"
        ><el-icon><ChatDotRound /></el-icon>
        <div>
          <h3>开启一场对话</h3>
          <p>与招聘方沟通，了解下一步机会</p>
        </div>
        <el-icon><ArrowRight /></el-icon
      ></router-link>
    </div>
  </section>
</template>
