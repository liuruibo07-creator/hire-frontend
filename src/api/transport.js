import JSONbig from 'json-bigint'

// Snowflake IDs in non-chat services are JSON numbers beyond Number.MAX_SAFE_INTEGER.
const losslessJSON = JSONbig({ storeAsString: true })

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.status = status
  }
}

export function queryString(params = {}) {
  return new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null),
  ).toString()
}

export function createTransport({
  baseURL = '',
  getToken = () => null,
  onUnauthorized = () => {},
  onError = () => {},
  fetchImpl = fetch,
  timeout = 15000,
} = {}) {
  return async function request(path, { method = 'GET', params, data, silent = false, auth = true } = {}) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    try {
      const query = queryString(params)
      const token = auth && getToken()
      const response = await fetchImpl(`${baseURL.replace(/\/$/, '')}${path}${query ? `?${query}` : ''}`, {
        method,
        signal: controller.signal,
        headers: {
          ...(data !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
      })
      let body
      try {
        body = losslessJSON.parse(await response.text())
      } catch {
        throw new ApiError(`服务响应异常 (${response.status})`, response.status)
      }
      if (!response.ok || body.code !== 200) {
        const status = body.code || response.status
        if ((status === 401 || response.status === 401) && token) onUnauthorized()
        throw new ApiError(body.message || `请求失败 (${response.status})`, status)
      }
      return body.data
    } catch (cause) {
      const error =
        cause instanceof ApiError
          ? cause
          : new ApiError(cause.name === 'AbortError' ? '请求超时，请稍后重试' : '无法连接服务，请稍后重试')
      if (!silent) onError(error.message)
      throw error
    } finally {
      clearTimeout(timer)
    }
  }
}
