<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { api } from '../api'
import { updateSession, clearSession } from '../stores/session'
import { useLoad } from '../composables/useLoad'
import LoadState from '../components/LoadState.vue'
const router = useRouter(),
  tab = ref('profile'),
  busy = ref(false),
  profileRef = ref(),
  passwordRef = ref()
const profile = reactive({ realName: '', email: '', phone: '', avatar: '' }),
  password = reactive({ oldPassword: '', newPassword: '', confirm: '' })
const profileRules = {
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
  avatar: [
    {
      validator: (_, value, callback) =>
        callback(
          !value || /^https?:\/\//i.test(value)
            ? undefined
            : new Error('头像地址须以 http:// 或 https:// 开头'),
        ),
      trigger: 'blur',
    },
  ],
}
const passwordRules = {
  oldPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [{ required: true, min: 6, max: 20, message: '新密码须为 6-20 个字符', trigger: 'blur' }],
  confirm: [
    {
      validator: (_, value, callback) =>
        callback(value === password.newPassword && value ? undefined : new Error('两次输入的密码不一致')),
      trigger: 'blur',
    },
  ],
}
const { loading, error, run } = useLoad()
const load = () =>
  run(api.me, (data) => {
    updateSession(data)
    for (const key of Object.keys(profile)) profile[key] = data[key] || ''
  })
async function save() {
  const isProfile = tab.value === 'profile'
  if (!(await (isProfile ? profileRef : passwordRef).value.validate().catch(() => false))) return
  busy.value = true
  try {
    if (isProfile) {
      await api.updateMe({ ...profile })
      await load()
      ElMessage.success('资料已更新')
    } else {
      await api.password({ oldPassword: password.oldPassword, newPassword: password.newPassword })
      ElMessage.success('密码修改成功，请重新登录')
      clearSession()
      router.replace('/login')
    }
  } catch {
  } finally {
    busy.value = false
  }
}
onMounted(load)
</script>
<template>
  <h1>账号设置</h1>
  <LoadState :loading="loading" :error="error" @retry="load"
    ><el-tabs v-model="tab"
      ><el-tab-pane label="个人资料" name="profile"
        ><el-form
          ref="profileRef"
          :model="profile"
          :rules="profileRules"
          label-position="top"
          class="settings-form"
          @submit.prevent="save"
          ><el-form-item
            v-for="[key, label, max] in [
              ['realName', '姓名 / 企业名称', 50],
              ['email', '邮箱', 100],
              ['phone', '联系电话', 20],
              ['avatar', '头像地址', 500],
            ]"
            :key="key"
            :label="label"
            :prop="key"
            ><el-input v-model="profile[key]" :maxlength="max" /></el-form-item
          ><el-button type="primary" native-type="submit" :loading="busy">保存资料</el-button></el-form
        ></el-tab-pane
      ><el-tab-pane label="修改密码" name="password"
        ><el-form
          ref="passwordRef"
          :model="password"
          :rules="passwordRules"
          label-position="top"
          class="settings-form"
          @submit.prevent="save"
          ><el-form-item
            v-for="[key, label] in [
              ['oldPassword', '当前密码'],
              ['newPassword', '新密码'],
              ['confirm', '确认新密码'],
            ]"
            :key="key"
            :label="label"
            :prop="key"
            ><el-input
              v-model="password[key]"
              type="password"
              show-password
              :autocomplete="key === 'oldPassword' ? 'current-password' : 'new-password'"
              maxlength="20" /></el-form-item
          ><el-button type="primary" native-type="submit" :loading="busy">更新密码</el-button></el-form
        ></el-tab-pane
      ></el-tabs
    ></LoadState
  >
</template>
