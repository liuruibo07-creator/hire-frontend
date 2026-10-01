import test from 'node:test'
import assert from 'node:assert/strict'
import { createTransport, queryString } from '../src/api/transport.js'

test('query retains zero and omits empty filters', () => {
  assert.equal(queryString({ status: 0, keyword: '', city: undefined, page: 1 }), 'status=0&page=1')
})
test('request carries bearer token and JSON body, preserves snowflake IDs', async () => {
  let captured
  const request = createTransport({
    baseURL: 'https://example.test/',
    getToken: () => 'test-token',
    fetchImpl: async (url, options) => {
      captured = { url, options }
      return new Response('{"code":200,"data":{"id":1972269923456789012,"total":5}}')
    },
  })
  const result = await request('/api/application/applications', {
    method: 'POST',
    data: { jobId: '1972269923456789012', resumeId: 1 },
  })
  assert.equal(result.id, '1972269923456789012')
  assert.equal(result.total, 5)
  assert.equal(captured.url, 'https://example.test/api/application/applications')
  assert.equal(captured.options.headers.Authorization, 'Bearer test-token')
  assert.equal(JSON.parse(captured.options.body).jobId, result.id)
})
test('business 401 expires authenticated session once', async () => {
  let expired = 0,
    errors = []
  const request = createTransport({
    getToken: () => 'token',
    onUnauthorized: () => expired++,
    onError: (message) => errors.push(message),
    fetchImpl: async () => new Response('{"code":401,"message":"expired"}'),
  })
  await assert.rejects(request('/api/user/users/me'), { status: 401 })
  assert.equal(expired, 1)
  assert.deepEqual(errors, ['expired'])
})
test('login failure does not expire an existing session or send its token', async () => {
  let expired = false
  const request = createTransport({
    getToken: () => 'token',
    onUnauthorized: () => {
      expired = true
    },
    fetchImpl: async (_, options) => {
      assert.equal(options.headers.Authorization, undefined)
      return new Response('{"code":401,"message":"wrong password"}', { status: 401 })
    },
  })
  await assert.rejects(request('/api/user/users/login', { auth: false }), { status: 401 })
  assert.equal(expired, false)
})
test('unexpected legacy success code is rejected for public contracts', async () => {
  const request = createTransport({ fetchImpl: async () => new Response('{"code":1,"data":null}') })
  await assert.rejects(request('/api/job/jobs/search'), { status: 1 })
})
test('network, invalid JSON and HTTP failures are surfaced without fake data', async () => {
  for (const fetchImpl of [
    async () => {
      throw new TypeError('failed')
    },
    async () => new Response('<html>bad gateway</html>', { status: 502 }),
    async () => new Response('{"code":403,"message":"forbidden"}', { status: 403 }),
  ]) {
    const request = createTransport({ fetchImpl })
    await assert.rejects(request('/api/job/jobs/search'))
  }
})
test('timeout aborts pending requests', async () => {
  const request = createTransport({
    timeout: 10,
    fetchImpl: (_, { signal }) =>
      new Promise((_, reject) =>
        signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))),
      ),
  })
  await assert.rejects(request('/api/job/jobs/search'), /请求超时/)
})
