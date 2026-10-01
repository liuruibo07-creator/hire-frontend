import test from 'node:test'
import assert from 'node:assert/strict'
import { writeInterview, readInterview, updatePublicRemark, applicationProgress, groupCompanies } from '../src/recruitment.js'

test('interview arrangement survives status remark round-trip and feedback edits', () => {
  const remark = writeInterview({ time: '2099-10-01T10:00:00+08:00', mode: '线上', location: '会议号 123', contact: '张经理', note: '请准备项目介绍' })
  assert.equal(readInterview(remark).location, '会议号 123')
  const edited = readInterview(updatePublicRemark(remark, '欢迎参加面试'))
  assert.equal(edited.time, '2099-10-01T10:00:00+08:00')
  assert.equal(edited.note, '欢迎参加面试')
  assert.equal(readInterview('普通企业反馈'), null)
  assert.equal(readInterview('[面试安排/v1]{broken'), null)
})
test('interview validation rejects past time, missing location and oversized payload', () => {
  const form = { time: '2099-10-01T10:00:00+08:00', mode: '线下', location: '办公室' }
  assert.throws(() => writeInterview({ ...form, time: '2000-01-01' }), /未来/)
  assert.throws(() => writeInterview({ ...form, location: ' ' }), /地址/)
  assert.throws(() => writeInterview({ ...form, note: '字'.repeat(501) }), /过长/)
})
test('progress never fabricates intermediate events or timestamps', () => {
  const events = applicationProgress({ createTime: '2026-09-29T09:00:00', status: 3 })
  assert.equal(events.length, 2)
  assert.equal(events[1].title, '已录用')
  assert.equal(events[1].time, '')
  assert.equal(events.some(event => event.title === '已邀请面试'), false)
})
test('company grouping preserves distinct employer IDs and deduplicates repeated jobs', () => {
  const job = { id: '90071992547409931', employerId: '90071992547409932', employerName: '同名公司', title: 'Java 工程师' }
  const groups = groupCompanies([job, job, { ...job, id: '2', employerId: '90071992547409933' }], 'JAVA')
  assert.equal(groups.length, 2)
  assert.equal(groups[0].count, 1)
  assert.equal(groupCompanies([job], '不存在').length, 0)
})
