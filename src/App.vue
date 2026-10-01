<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Briefcase, Menu, Search, User, SwitchButton, Bell, ChatDotRound } from '@element-plus/icons-vue'
import { session, clearSession } from './stores/session'
import { inbox, refreshInbox, resetInbox } from './stores/inbox'
const router = useRouter()
const menu = ref(false)
const role = computed(() => session.token ? session.user?.role || 'seeker' : 'seeker')
const portalName = computed(() => ({ seeker: '智聘', employer: '智聘 · 招聘工作台', admin: '智聘 · 管理中心' })[role.value])
const links = computed(() => ({
  seeker: [['/', '首页'], ['/jobs', '职位'], ['/companies', '公司'], ['/workspace', '我的求职']],
  employer: [['/workspace', '招聘概览'], ['/workspace/jobs', '职位管理'], ['/workspace/applications', '候选人'], ['/workspace/interviews', '面试']],
  admin: [['/workspace', '数据概览'], ['/workspace/admin/jobs', '职位审核'], ['/workspace/admin/users', '用户管理']],
})[role.value])
let inboxTimer
watch(() => session.token, () => { resetInbox(); refreshInbox() })
onMounted(() => { refreshInbox(); inboxTimer = setInterval(refreshInbox, 15000); document.addEventListener('visibilitychange', refreshInbox) })
onUnmounted(() => { clearInterval(inboxTimer); resetInbox(); document.removeEventListener('visibilitychange', refreshInbox) })
function logout() {
  clearSession()
  router.push('/')
}
</script>
<template>
  <div class="portal-shell" :class="`portal-${role}`">
  <header class="site-header">
    <div class="container header-inner">
      <router-link :to="role === 'seeker' ? '/' : '/workspace'" class="brand"
        ><el-icon><Briefcase /></el-icon><span>{{ portalName }}</span></router-link
      >
      <nav :class="{ open: menu }" @click="menu = false" aria-label="主导航">
        <router-link v-for="[path, label] in links" :key="path" :to="path" exact-active-class="active">{{ label }}</router-link>
      </nav>
      <div class="header-actions">
        <el-button v-if="role === 'seeker'" :icon="Search" circle aria-label="搜索职位" @click="router.push('/jobs')" />
        <template v-if="session.token">
          <el-badge :value="inbox.notices" :hidden="!inbox.notices" :max="99"><el-button :icon="Bell" circle aria-label="消息通知" @click="router.push('/workspace/notifications')" /></el-badge>
          <el-badge v-if="role !== 'admin'" :value="inbox.chats" :hidden="!inbox.chats" :max="99"><el-button :icon="ChatDotRound" circle aria-label="在线沟通" @click="router.push('/workspace/chat')" /></el-badge>
        </template>
        <template v-if="session.token"
          ><router-link to="/workspace" class="user-link"
            ><el-avatar :size="30" :icon="User" /><span>{{
              session.user?.realName || session.user?.username
            }}</span></router-link
          ><el-tooltip content="退出登录"
            ><el-button :icon="SwitchButton" circle aria-label="退出登录" @click="logout" /></el-tooltip
        ></template>
        <template v-else
          ><el-button @click="router.push('/login')">登录</el-button
          ><el-button type="primary" @click="router.push('/login?mode=register')">注册</el-button></template
        >
        <el-button class="mobile-menu" :icon="Menu" circle aria-label="展开导航" @click="menu = !menu" />
      </div>
    </div>
  </header>
  <main><router-view /></main>
  <footer v-if="role === 'seeker'" class="footer">
    <div class="container footer-grid">
      <div>
        <router-link to="/" class="brand"
          ><el-icon><Briefcase /></el-icon>智聘招聘平台</router-link
        >
        <p>让人才更有价值，让招聘更简单。</p>
      </div>
      <div>
        <strong>探索机会</strong><router-link to="/jobs">职位搜索</router-link
        ><router-link to="/companies">公司</router-link>
      </div>
      <div>
        <strong>个人服务</strong><router-link to="/workspace/resumes">简历管理</router-link
        ><router-link to="/workspace/applications">投递进度</router-link>
      </div>
      <div>
        <strong>工作空间</strong><router-link to="/workspace">进入工作台</router-link
        ><router-link to="/workspace/notifications">消息通知</router-link>
      </div>
    </div>
    <div class="container footer-bottom">智聘招聘平台 · 连接人才与机会</div>
  </footer>
  </div>
</template>


