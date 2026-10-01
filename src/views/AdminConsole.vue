<script setup>
import { OfficeBuilding, Tickets, User } from '@element-plus/icons-vue'
const tabs = [
  { path: '/workspace/admin/jobs', name: '职位管理', icon: OfficeBuilding },
  { path: '/workspace/admin/applications', name: '投递管理', icon: Tickets },
  { path: '/workspace/admin/users', name: '用户管理', icon: User },
]
</script>
<template>
  <div class="admin-console">
    <nav class="admin-console-nav" aria-label="后台管理导航">
      <router-link v-for="tab in tabs" :key="tab.path" :to="tab.path" active-class="active"
        ><el-icon><component :is="tab.icon" /></el-icon>{{ tab.name }}</router-link
      >
    </nav>
    <router-view />
  </div>
</template>
