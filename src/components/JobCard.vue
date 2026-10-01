<script setup>
import { OfficeBuilding, Location } from '@element-plus/icons-vue'
import { salary, skills, dateText } from '../utils'
defineProps({ job: { type: Object, required: true }, compact: Boolean })
</script>
<template>
  <article class="job-card" :class="{ compact }">
    <el-icon class="company-icon"><OfficeBuilding /></el-icon>
    <div class="job-copy">
      <router-link :to="`/jobs/${job.id}`" class="job-title">{{ job.title }}</router-link>
      <p>
        {{ job.employerName || '企业名称暂未提供' }} <span class="muted"> · {{ job.jobType }}</span>
      </p>
      <p class="muted meta">
        <el-icon><Location /></el-icon>{{ job.city || '城市未提供' }} ·
        {{ job.experienceReq || '经验不限' }} · {{ job.educationReq || '学历不限' }}
      </p>
      <div class="tags">
        <el-tag v-for="tag in skills(job.skills).slice(0, 4)" :key="tag" size="small" effect="plain">{{
          tag
        }}</el-tag>
      </div>
    </div>
    <div class="job-actions">
      <strong class="salary">{{ salary(job) }}</strong
      ><router-link v-if="!compact" :to="`/jobs/${job.id}`"
        ><el-button type="primary">查看职位</el-button></router-link
      ><small v-if="!compact" class="muted">{{ dateText(job.createTime) }}</small>
    </div>
  </article>
</template>
