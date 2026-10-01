<script setup>
import { computed } from 'vue'
import {
  User,
  Document,
  Tickets,
  Bell,
  ChatDotRound,
  Setting,
  OfficeBuilding,
  DataAnalysis,
  Calendar,
} from '@element-plus/icons-vue'
import { session } from '../stores/session'
import { roles } from '../utils'
const navigation = computed(() => {
  const role = session.user?.role
  if (role === 'admin') {
    return [
      { path: '', name: '工作概览', icon: DataAnalysis },
      { path: '/admin/jobs', name: '职位审核', icon: OfficeBuilding, exact: false },
      { path: '/admin/users', name: '用户管理', icon: User, exact: false },
      { path: '/admin/applications', name: '投递巡检', icon: Tickets, exact: false },
      { path: '/notifications', name: '消息通知', icon: Bell },
      { path: '/settings', name: '账号设置', icon: Setting },
    ]
  }
  return [
    { path: '', name: role === 'employer' ? '招聘概览' : '求职概览', icon: DataAnalysis },
    ...(role === 'seeker'
      ? [{ path: '/resumes', name: '我的简历', icon: Document }]
      : [{ path: '/jobs', name: '职位管理', icon: OfficeBuilding }]),
    { path: '/applications', name: role === 'seeker' ? '投递进度' : '候选人管理', icon: Tickets },
    { path: '/interviews', name: role === 'seeker' ? '我的面试' : '面试管理', icon: Calendar },
    { path: '/chat', name: '在线沟通', icon: ChatDotRound },
    { path: '/notifications', name: '消息通知', icon: Bell },
    { path: '/settings', name: '账号设置', icon: Setting },
  ]
})
</script>
<template>
  <div class="container page workspace">
    <aside class="workspace-sidebar">
      <div class="sidebar-user">
        <el-avatar :size="48" :src="session.user?.avatar" :icon="User" /><strong>{{
          session.user?.realName || session.user?.username
        }}</strong
        ><el-tag size="small">{{ roles[session.user?.role] }}</el-tag>
      </div>
      <nav aria-label="工作台导航">
        <router-link
          v-for="item in navigation"
          :key="item.path"
          :to="'/workspace' + item.path"
          :exact-active-class="item.exact === false ? '' : 'active'"
          :active-class="item.exact === false ? 'active' : ''"
          ><el-icon><component :is="item.icon" /></el-icon>{{ item.name }}</router-link
        >
      </nav>
    </aside>
    <section class="workspace-content"><router-view /></section>
  </div>
</template>
