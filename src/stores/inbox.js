import { reactive } from 'vue'
import { api } from '../api'
import { session } from './session'

export const inbox = reactive({ notices: 0, chats: 0 })
let generation = 0
export function resetInbox() {
  generation++
  inbox.notices = 0
  inbox.chats = 0
}
export async function refreshInbox() {
  const token = session.token
  if (!token || document.hidden) return
  const current = ++generation
  const results = await Promise.allSettled([
    api.unreadNotices({ silent: true }),
    session.user?.role === 'admin' ? Promise.resolve(0) : api.unreadChats({ silent: true }),
  ])
  if (current !== generation || token !== session.token) return
  if (results[0].status === 'fulfilled') inbox.notices = Number(results[0].value || 0)
  if (results[1].status === 'fulfilled') inbox.chats = Number(results[1].value || 0)
}
