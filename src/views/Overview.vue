<script setup>
import { ref, onMounted } from 'vue'
import { User, ArrowRight } from '@element-plus/icons-vue'
import { session } from '../stores/session'
import { api } from '../api'
import { useLoad } from '../composables/useLoad'
import LoadState from '../components/LoadState.vue'
const { loading, error, run } = useLoad()
const metrics = ref([]), pending = ref(0), interviewCount = ref(0),
  trend = ref([]),
  days = ref(7)
async function load() {
  await run(
    async () => {
      if (session.user.role === 'admin') {
        const data = await api.statistics(days.value)
        return {
          metrics: [
            ['注册用户', data.overview.registeredUserTotal, '/workspace/admin/users'],
            ['招聘企业', data.overview.enterpriseTotal, '/workspace/admin/users'],
            ['平台职位', data.overview.jobTotal, '/workspace/admin/jobs'],
            ['全部投递', data.overview.applicationTotal, '/workspace/admin/applications'],
          ],
          trend: data.dailyTrend,
        }
      }
      const [applications, notices, chats, resource, pendingApplications, interviews] = await Promise.all([
        session.user.role === 'seeker'
          ? api.myApplications({ page: 1, size: 1 })
          : api.receivedApplications({ page: 1, size: 1 }),
        api.unreadNotices(),
        api.unreadChats(),
        session.user.role === 'seeker' ? api.resumes() : api.myJobs({ page: 1, size: 1 }),
        (session.user.role === 'seeker' ? api.myApplications : api.receivedApplications)({ page: 1, size: 1, status: 0 }),
        (session.user.role === 'seeker' ? api.myApplications : api.receivedApplications)({ page: 1, size: 1, status: 2 }),
      ])
      return {
        metrics: [
          [
            session.user.role === 'seeker' ? '已投递职位' : '收到的投递',
            applications.total,
            '/workspace/applications',
          ],
          ['未读通知', notices, '/workspace/notifications'],
          ['未读消息', chats, '/workspace/chat'],
          [
            session.user.role === 'seeker' ? '我的简历' : '我的职位',
            Array.isArray(resource) ? resource.length : resource.total,
            session.user.role === 'seeker' ? '/workspace/resumes' : '/workspace/jobs',
          ],
        ],
        trend: [],
        pending: pendingApplications.total,
        interviews: interviews.total,
      }
    },
    (data) => {
      metrics.value = data.metrics
      trend.value = data.trend
      pending.value = data.pending || 0
      interviewCount.value = data.interviews || 0
    },
  )
}
onMounted(load)
</script>
<template>
  <section class="welcome">
    <el-avatar :size="64" :icon="User" :src="session.user?.avatar" />
    <div>
      <span class="workspace-eyebrow">{{ session.user?.role === 'admin' ? 'PLATFORM OVERVIEW' : session.user?.role === 'employer' ? 'RECRUITING WORKSPACE' : 'MY CAREER' }}</span>
      <h1>{{ session.user?.role === 'admin' ? '平台运营概览' : `${session.user?.realName || session.user?.username}，你好` }}</h1>
      <p class="muted">
        {{ session.user?.role === 'seeker' ? '管理简历、跟进投递，准备下一次面试。' : session.user?.role === 'employer' ? '集中处理候选人，让招聘每一步更清晰。' : '关注平台数据，及时处理审核与用户问题。' }}
      </p>
    </div>
    <router-link to="/workspace/settings"><el-button>编辑资料</el-button></router-link>
  </section>
  <div class="section-heading">
    <h2>工作概览</h2>
    <el-select v-if="session.user?.role === 'admin'" v-model="days" class="small-select" @change="load"
      ><el-option v-for="day in [7, 30, 90]" :key="day" :value="day" :label="`最近 ${day} 天`"
    /></el-select>
  </div>
  <LoadState :loading="loading" :error="error" @retry="load"
    ><div v-if="session.user?.role !== 'admin'" class="workspace-todos"><router-link to="/workspace/applications"><span>{{ session.user?.role === 'employer' ? '待处理候选人' : '等待企业处理' }}</span><strong>{{ pending }}</strong><small>查看投递 →</small></router-link><router-link to="/workspace/interviews"><span>面试邀请</span><strong>{{ interviewCount }}</strong><small>查看日程 →</small></router-link></div><div class="metrics">
      <router-link v-for="[name, value, path] in metrics" :key="name" :to="path"
        ><strong>{{ value ?? '--' }}</strong
        ><span>{{ name }}</span></router-link
      >
    </div>
    <el-table v-if="session.user?.role === 'admin'" :data="trend" stripe
      ><el-table-column prop="date" label="日期" min-width="120" /><el-table-column
        prop="newRegisteredUsers"
        label="新增用户" /><el-table-column prop="newEnterprises" label="新增企业" /><el-table-column
        prop="newJobs"
        label="新增职位" /><el-table-column prop="newApplications" label="新增投递" /></el-table
  ></LoadState>
  <section class="quick-actions">
    <h2>{{ session.user?.role === 'seeker' ? '继续探索机会' : '常用操作' }}</h2>
    <router-link :to="session.user?.role === 'admin' ? '/workspace/admin/jobs' : session.user?.role === 'employer' ? '/workspace/jobs' : '/jobs'"
      >{{ session.user?.role === 'admin' ? '处理职位审核' : session.user?.role === 'employer' ? '发布与管理招聘职位' : '浏览最新招聘职位' }} <el-icon><ArrowRight /></el-icon></router-link
    ><router-link
      :to="session.user?.role === 'admin' ? '/workspace/admin/applications' : '/workspace/applications'"
      >查看投递进展 <el-icon><ArrowRight /></el-icon></router-link
    ><router-link to="/workspace/notifications"
      >查看最新通知 <el-icon><ArrowRight /></el-icon
    ></router-link>
  </section>
</template>
