import { ref } from 'vue'

export function useLoad() {
  const loading = ref(false)
  const error = ref('')
  let version = 0
  async function run(task, accept) {
    const current = ++version
    loading.value = true
    error.value = ''
    try {
      const result = await task()
      // A slower previous search must not overwrite the latest filters.
      if (current === version) accept?.(result)
      return result
    } catch (cause) {
      if (current === version) error.value = cause.message
    } finally {
      if (current === version) loading.value = false
    }
  }
  return { loading, error, run }
}
