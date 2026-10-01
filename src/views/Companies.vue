<template>
  <div class="companies-page">
    <section class="company-filters" aria-label="公司筛选">
      <div class="company-container">
        <h1 class="company-sr-only">公司</h1>
        <form class="company-search" @submit.prevent="applySearch">
          <input v-model="keyword" placeholder="搜索职位、公司" aria-label="搜索职位、公司" type="search" />
          <button type="submit">搜索</button>
        </form>
        <div class="company-filter-line"><span class="company-filter-label">公司地点:</span><div class="company-options"><button v-for="item in cities" :key="item" :class="{ selected: city === item }" :aria-pressed="city === item" @click="city = item; reload()">{{ item }}</button><button :class="{ selected: customCityOpen }" @click="customCityOpen = !customCityOpen">全部城市</button><form v-if="customCityOpen" class="custom-city" @submit.prevent="city = customCity.trim() || '全国'; reload()"><input v-model="customCity" aria-label="其他城市" placeholder="输入城市" /><button type="submit">确定</button></form></div></div>
        <div class="company-filter-line"><span class="company-filter-label">行业类型:</span><div class="company-options"><button v-for="item in industries" :key="item" :class="{ selected: industry === item }" :aria-pressed="industry === item" @click="industry = item; reload()">{{ item }}</button></div></div>
        <div class="company-filter-line"><span class="company-filter-label">职位类型:</span><div class="company-options"><button v-for="item in ['', ...jobTypes]" :key="item" :class="{ selected: jobType === item }" :aria-pressed="jobType === item" @click="jobType = item; reload()">{{ item || '不限' }}</button></div><button class="company-clear" @click="clearFilters">清空筛选</button></div>
      </div>
    </section>
    <section class="company-results">
      <div class="company-container">
        <div class="company-results-head"><div class="company-recommend"><span class="company-star">★</span><span>发现心仪公司</span><button :class="{ active: sort === 'default' }" @click="sort = 'default'">默认排序</button><button :class="{ active: sort === 'count' }" @click="sort = 'count'">已加载职位数量</button></div><span class="company-count">当前已加载 {{ companies.length }} 家公司</span></div>
        <p class="muted">公司与关键词匹配结果来自已加载的公开职位，可继续加载查看更多。</p>
        <PageState :loading="loading" :error="error" :empty="!companies.length" empty-text="暂无匹配公司，试试其他关键词或筛选条件" @retry="reload">
          <div class="company-grid">
            <article v-for="company in companies" :key="company.key" class="company-card">
              <router-link class="company-card-body" :to="`/companies/job/${company.job.id}`"><div class="company-logo" aria-hidden="true">{{ company.name.slice(0, 1) }}</div><div class="company-info"><h2 :title="company.name">{{ company.name }}</h2><div class="company-tags"><span>{{ company.count }} 个已加载职位</span><span>{{ company.job.city || '地点未注明' }}</span></div></div></router-link>
              <router-link class="company-hot-job" :to="`/jobs/${company.job.id}`"><span>热招</span><i></i><strong :title="company.job.title">{{ company.job.title }}</strong><span class="company-salary">{{ salaryText(company.job.salaryMin, company.job.salaryMax) }}</span><span aria-hidden="true">›</span></router-link>
            </article>
          </div>
        </PageState>
        <div v-if="!loading && !error && jobs.length < total" class="company-load-more"><button :disabled="loadingMore" @click="loadMore">{{ loadingMore ? '加载中…' : '加载更多公司' }}</button><p v-if="moreError" role="alert">{{ moreError }}</p></div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { api } from '../api'
import { salary, jobTypes } from '../utils'
import { groupCompanies } from '../recruitment'
const cleanParams = params => Object.fromEntries(Object.entries(params).filter(([, value]) => value !== ''))
const salaryText = (salaryMin, salaryMax) => salary({ salaryMin, salaryMax })
import PageState from '../components/LoadState.vue'
const cities = ['全国', '贵阳', '北京', '上海', '广州', '深圳', '杭州', '天津', '西安', '苏州', '武汉', '厦门', '长沙', '成都', '郑州', '重庆']
const industries = ['不限', '电子商务', '游戏', '社交网络与媒体', '广告营销', '大数据', '医疗健康', '生活服务(O2O)', '旅游', '分类信息', '音乐/视频/阅读', '在线教育', '人力资源服务', '企业服务', '信息安全', '智能硬件', '移动互联网', '互联网', '计算机软件', '通信/网络设备', '广告/公关/会展', '互联网金融', '物流/仓储', '进出口贸易', '咨询', '工程施工', '汽车研发/制造', '其他行业']
const keyword = ref(''), appliedKeyword = ref(''), jobType = ref(''), city = ref('全国'), industry = ref('不限'), sort = ref('default')
const customCityOpen = ref(false), customCity = ref(''), jobs = ref([]), total = ref(0), page = ref(1), loading = ref(false), loadingMore = ref(false), error = ref(''), moreError = ref('')
let requestVersion = 0
const companies = computed(() => {
  const list = groupCompanies(jobs.value, appliedKeyword.value)
  return sort.value === 'count' ? list.sort((a, b) => b.count - a.count) : list
})
async function fetchPage(append = false) {
  const version = ++requestVersion
  const nextPage = append ? page.value + 1 : 1
  if (append) { loadingMore.value = true; moreError.value = '' } else { loading.value = true; loadingMore.value = false; error.value = '' }
  try {
    const data = await api.searchJobs(cleanParams({ city: city.value === '全国' ? '' : city.value, industry: industry.value === '不限' ? '' : industry.value, jobType: jobType.value, page: nextPage, size: 20 }))
    if (version !== requestVersion) return
    jobs.value = append ? [...jobs.value, ...(data?.list || [])] : data?.list || []
    total.value = Number(data?.total || 0)
    if (!(data?.list || []).length) total.value = jobs.value.length
    page.value = nextPage
  } catch (e) { if (version === requestVersion) { if (append) moreError.value = e.message; else error.value = e.message } }
  finally { if (version === requestVersion) { loading.value = false; loadingMore.value = false } }
}
function reload() { fetchPage() }
function loadMore() { if (!loadingMore.value) fetchPage(true) }
function applySearch() { appliedKeyword.value = keyword.value.trim(); reload() }
function clearFilters() { keyword.value = ''; appliedKeyword.value = ''; jobType.value = ''; city.value = '全国'; industry.value = '不限'; customCityOpen.value = false; customCity.value = ''; sort.value = 'default'; reload() }
onMounted(reload)
</script>

<style scoped>
.companies-page{--company-accent:#1677ff;color:#183054;background:#f4f7fc;min-height:calc(100vh - 140px)}
.company-container{max-width:1600px;margin:auto;padding:0 32px}.company-filters{background:#fff;padding:32px 0 24px}.company-sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
.company-search{display:flex;height:64px;border:2px solid var(--company-accent);border-radius:12px;overflow:hidden;max-width:1200px;margin-bottom:28px}.company-search input{min-width:0;flex:1;border:0;outline-offset:-4px;padding:0 24px;font-size:19px}.company-search input::placeholder{color:#a5a8af}.company-search button{width:150px;border:0;background:var(--company-accent);color:white;font-size:23px;font-weight:700;cursor:pointer}
.company-filter-line{display:flex;align-items:baseline;gap:20px;margin-top:17px;font-size:16px}.company-filter-label{flex:none;width:80px}.company-options{display:flex;flex-wrap:wrap;gap:8px 24px;align-items:center;flex:1}.company-options button,.company-clear{padding:3px 0;background:none;border:0;color:inherit;cursor:pointer;white-space:nowrap;line-height:1.65}.company-options button:hover,.company-options button.selected{color:#1677ff}.company-options button.selected{font-weight:700}.company-clear{color:#999fa5;font-size:14px;margin-left:auto}.custom-city{display:flex;gap:10px}.custom-city input{width:140px;border:1px solid #dce6f4;border-radius:4px;padding:5px 8px}
.company-results{padding:28px 0 64px;background:linear-gradient(#edf5ff,#f4f7fc);min-height:460px}.company-results-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:24px}.company-recommend{display:flex;align-items:center;gap:20px;background:#f8fbff;border-radius:11px;padding:7px 14px;font-size:16px}.company-star{display:grid;place-items:center;color:white;background:linear-gradient(135deg,#1677ff,#a8ceff);width:28px;height:28px;border-radius:7px;font-size:22px}.company-recommend button{padding:9px 13px;border:0;background:transparent;border-radius:8px;color:#7e858d;cursor:pointer}.company-recommend button.active{color:#fff;background:#1677ff;font-weight:600}.company-count{font-size:13px;color:#899399}.company-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}.company-card{min-width:0;background:white;border-radius:16px;overflow:hidden;transition:box-shadow .2s,transform .2s}.company-card:hover{box-shadow:0 8px 25px #20457015;transform:translateY(-3px)}.company-card-body{display:flex;align-items:center;gap:16px;padding:26px 22px;min-height:128px}.company-logo{width:62px;height:62px;border:1px solid #eaf0f6;border-radius:13px;display:grid;place-items:center;flex:none;background:#eef5ff;color:#1677ff;font-size:30px;font-weight:700}.company-card:nth-child(3n+2) .company-logo{background:#f1f4fe;color:#6d88bc}.company-card:nth-child(3n) .company-logo{background:#eef5ff;color:#4089e8}.company-info{min-width:0}.company-info h2{font-size:18px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:0 0 13px}.company-tags{display:flex;gap:8px;overflow:hidden}.company-tags span{background:#f7f8f9;color:#7a8087;padding:4px 8px;border-radius:5px;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.company-hot-job{display:flex;align-items:center;gap:8px;padding:19px 22px;background:linear-gradient(100deg,#f5f9ff,#fcfcfc);color:#858b91;font-size:14px;min-width:0}.company-hot-job>span:first-child{flex:none}.company-hot-job i{height:12px;width:1px;background:#dce2e5;flex:none}.company-hot-job strong{font-weight:400;color:#1677ff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}.company-salary{white-space:nowrap;font-size:12px}.company-load-more{text-align:center;margin-top:28px}.company-load-more button{padding:11px 30px;background:white;border:1px solid #d1e4ff;color:#1677ff;border-radius:8px;cursor:pointer}.company-load-more p{color:#ba5544}
@media(max-width:1200px){.company-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.company-options{gap:7px 18px}.company-card-body{padding:24px 18px}.company-hot-job{padding:18px}.company-count{display:none}}
@media(max-width:700px){.company-container{padding:0 16px}.company-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.company-search input{padding:0 10px;font-size:15px}.company-search button{width:80px}.company-recommend{gap:8px;font-size:13px}.company-filter-line{gap:10px;font-size:14px}.company-filter-label{width:65px}.company-logo{width:44px;height:44px}.company-card-body{padding:18px 12px;gap:10px}.company-info h2{font-size:15px}.company-salary{display:none}}
</style>



