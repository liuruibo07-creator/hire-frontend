<script setup>
import { reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { api } from '../api'
import { saveSession } from '../stores/session'
const route = useRoute(),
  router = useRouter(),
  formRef = ref(),
  busy = ref(false),
  error = ref('')
const mode = ref(route.query.mode === 'register' ? 'register' : 'login')
const form = reactive({ username: '', password: '', email: '', phone: '', realName: '', role: 'seeker' })
const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名为 3-50 个字符', trigger: 'blur' },
  ],
  password: [{ required: true, min: 6, max: 20, message: '密码为 6-20 个字符', trigger: 'blur' }],
  email: [{ required: true, type: 'email', message: '请输入有效邮箱', trigger: 'blur' }],
}
watch(mode, () => {
  error.value = ''
  formRef.value?.clearValidate()
})
watch(
  () => route.query.mode,
  (value) => {
    mode.value = value === 'register' ? 'register' : 'login'
  },
)
async function submit() {
  if (!(await formRef.value.validate().catch(() => false))) return
  busy.value = true
  error.value = ''
  try {
    if (mode.value === 'register') {
      await api.register({ ...form })
      ElMessage.success('注册成功，请登录')
      mode.value = 'login'
    } else {
      saveSession(await api.login({ username: form.username, password: form.password }))
      const target = String(route.query.redirect || '/workspace')
      await router.replace(target.startsWith('/') && !target.startsWith('//') ? target : '/workspace')
    }
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <section class="auth-page">
    <div class="auth-visual">
      <h1>好工作，从这里开始</h1>
      <p>每一份努力，都值得被看见。</p>
    </div>
    <section class="auth-form">
      <h2>欢迎来到智聘</h2>
      <el-tabs v-model="mode"
        ><el-tab-pane label="账号登录" name="login" /><el-tab-pane
          label="注册账号"
          name="register" /></el-tabs
      ><el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="submit"
        ><el-form-item label="用户名" prop="username"
          ><el-input v-model="form.username" autocomplete="username" maxlength="50" /></el-form-item
        ><el-form-item label="密码" prop="password"
          ><el-input
            v-model="form.password"
            type="password"
            show-password
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            maxlength="20" /></el-form-item
        ><template v-if="mode === 'register'"
          ><el-form-item label="邮箱" prop="email"
            ><el-input v-model="form.email" type="email" maxlength="100" /></el-form-item
          ><el-form-item label="姓名 / 企业名称"
            ><el-input v-model="form.realName" maxlength="50" /></el-form-item
          ><el-form-item label="联系电话"><el-input v-model="form.phone" maxlength="20" /></el-form-item
          ><el-form-item label="注册身份"
            ><el-radio-group v-model="form.role"
              ><el-radio-button value="seeker">求职者</el-radio-button
              ><el-radio-button value="employer">企业招聘</el-radio-button></el-radio-group
            ></el-form-item
          ></template
        ><el-alert v-if="error" :title="error" type="error" :closable="false" show-icon /><el-button
          class="full"
          type="primary"
          native-type="submit"
          size="large"
          :loading="busy"
          >{{ mode === 'login' ? '登录' : '创建账号' }}</el-button
        ></el-form
      >
    </section>
  </section>
</template>
