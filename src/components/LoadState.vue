<script setup>
defineProps({
  loading: Boolean,
  error: String,
  empty: Boolean,
  emptyText: { type: String, default: '暂无数据' },
})
defineEmits(['retry'])
</script>
<template>
  <el-skeleton v-if="loading" :rows="5" animated class="skeleton" />
  <el-result v-else-if="error" icon="warning" title="暂时无法加载" :sub-title="error"
    ><template #extra><el-button @click="$emit('retry')">重新加载</el-button></template></el-result
  >
  <el-empty v-else-if="empty" :description="emptyText" :image-size="90" />
  <slot v-else />
</template>
