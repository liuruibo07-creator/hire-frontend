<script setup>
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '../api'
import { readInterview, writeInterview } from '../recruitment'
const props = defineProps({ modelValue: Boolean, application: Object })
const emit = defineEmits(['update:modelValue', 'saved'])
const busy = ref(false)
const form = reactive({ time: '', mode: '线下', location: '', contact: '', note: '' })
watch(() => props.modelValue, open => {
  if (open) Object.assign(form, { time: '', mode: '线下', location: '', contact: '', note: props.application?.remark || '' }, readInterview(props.application?.remark) || {})
})
async function save() {
  if (busy.value || !props.application?.id) return
  try {
    const remark = writeInterview(form)
    busy.value = true
    await api.applicationStatus(props.application.id, { status: 2, remark })
    ElMessage.success('面试安排已保存，候选人可在面试日程中查看')
    emit('update:modelValue', false)
    emit('saved')
  } catch (error) { if (!busy.value) ElMessage.warning(error.message) }
  finally { busy.value = false }
}
</script>
<template>
  <el-dialog :model-value="modelValue" title="安排面试" width="560px" :close-on-click-modal="!busy" :show-close="!busy" @update:model-value="!busy && emit('update:modelValue', $event)">
    <p class="muted">{{ application?.applicantName || '候选人' }} · {{ application?.jobTitle }}</p>
    <el-form label-position="top" @submit.prevent="save">
      <el-form-item label="面试时间（北京时间）" required><el-date-picker v-model="form.time" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss+08:00" placeholder="选择面试时间" class="full" /></el-form-item>
      <el-form-item label="面试方式"><el-radio-group v-model="form.mode"><el-radio-button value="线下">线下面试</el-radio-button><el-radio-button value="线上">线上面试</el-radio-button></el-radio-group></el-form-item>
      <el-form-item :label="form.mode === '线上' ? '会议链接 / 会议号' : '面试地址'" required><el-input v-model="form.location" maxlength="160" /></el-form-item>
      <el-form-item label="联系人 / 联系方式"><el-input v-model="form.contact" maxlength="80" /></el-form-item>
      <el-form-item label="给候选人的备注"><el-input v-model="form.note" type="textarea" :rows="3" maxlength="150" show-word-limit /></el-form-item>
      <p class="muted">时间、地点和备注对候选人可见。保存后投递状态将更新为“面试邀请”。</p>
      <div class="dialog-actions"><el-button :disabled="busy" @click="emit('update:modelValue', false)">取消</el-button><el-button type="primary" native-type="submit" :loading="busy">保存面试安排</el-button></div>
    </el-form>
  </el-dialog>
</template>
