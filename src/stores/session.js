import { reactive } from 'vue'

function cachedUser() {
  try {
    return JSON.parse(sessionStorage.getItem('zhimi_user') || 'null')
  } catch {
    return null
  }
}
export const session = reactive({
  token: sessionStorage.getItem('zhimi_token') || '',
  user: cachedUser(),
  verified: false,
})
export function saveSession(data) {
  session.token = data.token
  session.user = { id: data.userId, username: data.username, role: data.role, realName: data.realName }
  session.verified = false
  sessionStorage.setItem('zhimi_token', data.token)
  sessionStorage.setItem('zhimi_user', JSON.stringify(session.user))
}
export function updateSession(user) {
  session.user = user
  session.verified = true
  sessionStorage.setItem('zhimi_user', JSON.stringify(user))
}
export function clearSession() {
  session.token = ''
  session.user = null
  session.verified = false
  sessionStorage.removeItem('zhimi_token')
  sessionStorage.removeItem('zhimi_user')
}
