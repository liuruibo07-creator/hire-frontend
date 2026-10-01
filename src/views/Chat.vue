<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { Refresh, Promotion } from '@element-plus/icons-vue'
import { api } from '../api'
import { session } from '../stores/session'
import { dateText } from '../utils'
import { useLoad } from '../composables/useLoad'
import LoadState from '../components/LoadState.vue'
import { refreshInbox } from '../stores/inbox'
const route = useRoute(),
  rows = ref([]),
  total = ref(0),
  page = ref(1),
  selected = ref(null),
  messages = ref([]),
  draft = ref(''),
  sending = ref(false),
  messageLoading = ref(false),
  messageError = ref(''),
  hasMore = ref(false),
  historyBusy = ref(false),
  messageBox = ref(),
  polling = ref(false)
const conversationError = ref('')
const quickReplies = session.user?.role === 'employer'
  ? ['你好，感谢投递，方便介绍一下相关项目经历吗？', '请在面试日程中查看具体时间和地点，有疑问可以随时沟通。', '感谢沟通，处理结果会在投递进度中更新。']
  : ['你好，我对这个职位很感兴趣，希望进一步了解。', '请问这个岗位的主要工作内容和团队情况是怎样的？', '我已看到面试安排，想进一步确认时间和地点。']
const { loading, error, run } = useLoad()
let timer,
  generation = 0,
  disposed = false
const load = () =>
  run(
    () => api.conversations({ page: page.value, size: 20 }),
    (data) => {
      rows.value = data.list
      total.value = data.total
    },
  )
const scrollEnd = async () => {
  await nextTick()
  if (messageBox.value) messageBox.value.scrollTop = messageBox.value.scrollHeight
}
async function markRead(id, list) {
  if (list.length && !document.hidden) { await api.readConversation(id, list[list.length - 1].id); await refreshInbox() }
}
let listGeneration = 0
async function refreshConversations() {
  if (document.hidden || disposed) return
  const version = ++listGeneration, currentPage = page.value
  try {
    const data = await api.conversations({ page: currentPage, size: 20 }, { silent: true })
    if (disposed || currentPage !== page.value || version !== listGeneration) return
    rows.value = data.list; total.value = data.total; conversationError.value = ''
  } catch { if (!disposed) conversationError.value = '会话列表同步失败，请刷新重试' }
}
function resumePolling() { refreshMessages(); refreshConversations() }
async function select(row) {
  const version = ++generation
  selected.value = row
  messages.value = []
  draft.value = ''
  messageError.value = ''
  messageLoading.value = true
  try {
    const data = await api.messages(row.id, { size: 20 })
    if (version !== generation || disposed) return
    messages.value = data.list
    hasMore.value = data.hasMore
    await scrollEnd()
    await markRead(row.id, data.list)
    row.unreadCount = 0
  } catch (e) {
    if (version === generation) messageError.value = e.message
  } finally {
    if (version === generation) messageLoading.value = false
  }
}
async function older() {
  const version = generation,
    id = selected.value.id
  historyBusy.value = true
  try {
    const data = await api.messages(id, { beforeId: messages.value[0]?.id, size: 20 })
    if (version !== generation) return
    messages.value = [...data.list, ...messages.value]
    hasMore.value = data.hasMore
  } catch {
  } finally {
    historyBusy.value = false
  }
}
function merge(list) {
  const byId = new Map([...messages.value, ...list].map((message) => [message.id, message]))
  messages.value = [...byId.values()].sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1))
}
async function refreshMessages() {
  if (!selected.value || messageLoading.value || polling.value || document.hidden) return
  const version = generation,
    id = selected.value.id
  polling.value = true
  try {
    // REST cursor polling uses the implemented history contract; it also recovers missed messages.
    const data = await api.messages(
      id,
      { afterId: messages.value.at(-1)?.id || '0', size: 100 },
      { silent: true },
    )
    if (version !== generation || disposed) return
    const atBottom =
      !messageBox.value ||
      messageBox.value.scrollHeight - messageBox.value.scrollTop - messageBox.value.clientHeight < 80
    merge(data.list)
    messageError.value = ''
    if (data.list.length) {
      await markRead(id, data.list)
      if (atBottom) await scrollEnd()
    }
  } catch (e) {
    if (version === generation && !disposed) messageError.value = e.message
  } finally {
    polling.value = false
  }
}
async function send() {
  const content = draft.value.trim()
  if (!content || sending.value) return
  const id = selected.value.id,
    version = generation
  sending.value = true
  try {
    const message = await api.sendMessage(id, content)
    if (generation === version) {
      merge([message])
      draft.value = ''
      await markRead(id, [message])
      await scrollEnd()
    }
    await load()
  } catch {
  } finally {
    sending.value = false
  }
}
onMounted(async () => {
  await load()
  const id = route.query.conversation
  const initial = rows.value.find((row) => String(row.id) === String(id))
  if (initial) await select(initial)
  else if (id) await select({ id: String(id), jobTitle: '职位沟通' })
  if (disposed) return
  timer = setInterval(resumePolling, 5000)
  document.addEventListener('visibilitychange', resumePolling)
})
onUnmounted(() => {
  disposed = true
  generation++
  clearInterval(timer)
  document.removeEventListener('visibilitychange', resumePolling)
})
</script>
<template>
  <div class="section-heading">
    <h1>在线沟通</h1>
    <el-tooltip content="刷新会话"
      ><el-button
        :icon="Refresh"
        circle
        aria-label="刷新会话"
        @click="
          () => {
            load()
            refreshMessages()
          }
        "
    /></el-tooltip>
  </div>
  <div class="chat-layout">
    <aside class="conversation-list">
      <p v-if="conversationError" class="muted" role="alert">{{ conversationError }}</p>
      <LoadState :loading="loading" :error="error" :empty="!rows.length" empty-text="暂无会话" @retry="load"
        ><button
          v-for="row in rows"
          :key="row.id"
          class="conversation"
          :class="{ active: selected?.id === row.id }"
          @click="select(row)"
        >
          <strong>{{ row.jobTitle }}</strong
          ><el-badge v-if="row.unreadCount" :value="row.unreadCount" />
          <p>{{ row.lastMessageContent || '开始沟通' }}</p>
          <small>{{ dateText(row.updateTime) }}</small></button
        ><el-pagination
          small
          layout="prev, next"
          v-model:current-page="page"
          :total="total"
          :page-size="20"
          @current-change="load"
      /></LoadState>
    </aside>
    <section class="chat-main">
      <template v-if="selected"
        ><h3 class="chat-title">{{ selected.jobTitle }}</h3>
        <el-alert v-if="messageError" :title="messageError" type="warning" :closable="false"
          ><el-button link @click="messages.length ? refreshMessages() : select(selected)"
            >重试</el-button
          ></el-alert
        >
        <div ref="messageBox" class="message-history">
          <el-skeleton v-if="messageLoading" :rows="4" animated /><template v-else
            ><div class="center">
              <el-button v-if="hasMore" link :loading="historyBusy" @click="older">加载更早的消息</el-button>
            </div>
            <el-empty
              v-if="!messages.length && !messageError"
              description="还没有消息，打个招呼吧"
              :image-size="70"
            />
            <article
              v-for="message in messages"
              :key="message.id"
              class="message"
              :class="{ mine: String(message.senderId) === String(session.user.id) }"
            >
              <small>{{ dateText(message.createTime) }}</small>
              <p>{{ message.content }}</p>
            </article></template
          >
        </div>
        <form class="message-compose" @submit.prevent="send">
          <div class="quick-replies"><el-button v-for="(reply, index) in quickReplies" :key="reply" size="small" :disabled="sending || messageLoading" @click="draft = reply">{{ ['打招呼', '沟通详情', '后续跟进'][index] }}</el-button></div>
          <el-input
            v-model="draft"
            type="textarea"
            :rows="3"
            maxlength="2000"
            show-word-limit
            aria-label="消息内容"
            placeholder="输入消息"
            :disabled="messageLoading"
          /><el-button
            type="primary"
            native-type="submit"
            :icon="Promotion"
            :loading="sending"
            :disabled="!draft.trim() || messageLoading"
            >发送</el-button
          >
        </form></template
      ><el-empty v-else description="选择一个会话，开始沟通" />
    </section>
  </div>
</template>
