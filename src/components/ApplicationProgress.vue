<script setup>
import { computed } from 'vue'
import { applicationProgress, readInterview, publicRemark } from '../recruitment'
import { dateText } from '../utils'
const props = defineProps({ application: { type: Object, required: true } })
const events = computed(() => applicationProgress(props.application))
const interview = computed(() => readInterview(props.application.remark))
</script>
<template>
  <section class="application-progress">
    <h3>申请进度</h3>
    <el-timeline><el-timeline-item v-for="(event, index) in events" :key="index" :timestamp="dateText(event.time) === '--' ? '' : dateText(event.time)" :type="index ? 'primary' : 'success'"><strong>{{ event.title }}</strong><p class="muted">{{ event.description }}</p></el-timeline-item></el-timeline>
    <div v-if="interview" class="interview-summary"><h3>{{ application.status === 2 ? '面试安排' : '最近一次面试安排' }}</h3><p>{{ dateText(interview.time) }}（北京时间） · {{ interview.mode }}</p><p class="pre-wrap">{{ interview.location }}</p><p v-if="interview.contact">联系：{{ interview.contact }}</p></div>
    <p v-if="publicRemark(application.remark)" class="pre-wrap">企业反馈：{{ publicRemark(application.remark) }}</p>
  </section>
</template>
