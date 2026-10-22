// 纯函数单测：不依赖宿主，直接跑 pickBandLevel / normalizeTier / loadState
import { strict as assert } from 'node:assert'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pickBandLevel, normalizeTier, loadState, saveState, DEFAULT_BAND, TIERS } from '../lib/index.js'

let pass = 0
const ok = (cond, name) => { if (!cond) { console.log('FAIL', name); process.exitCode = 1 } else pass += 1; console.log((cond ? 'PASS' : 'FAIL') + '  ' + name) }

ok(TIERS.join(',') === 'minimal,low,medium,high,xhigh,max', '合法档位顺序固定')
ok(normalizeTier('ultra', 'max') === 'max', '非法档位回退到 fallback')
ok(normalizeTier('medium', 'max') === 'medium', '合法档位原样保留')

ok(pickBandLevel({ min: 'high', max: 'max' }, { errors: 0 }) === 'high', 'High→Max 无错误时停在 high')
ok(pickBandLevel({ min: 'high', max: 'max' }, { errors: 1 }) === 'xhigh', 'High→Max 一次错误升到 xhigh')
ok(pickBandLevel({ min: 'high', max: 'max' }, { errors: 2 }) === 'max', 'High→Max 两次错误升到 max')
ok(pickBandLevel({ min: 'high', max: 'max' }, { errors: 9 }) === 'max', 'High→Max 多次错误封顶 max')

ok(pickBandLevel({ min: 'medium', max: 'max' }, { errors: 0 }) === 'medium', 'Medium→Max 无错误停在 medium')
ok(pickBandLevel({ min: 'medium', max: 'max' }, { errors: 1 }) === 'high', 'Medium→Max 一次错误到 high')
ok(pickBandLevel({ min: 'medium', max: 'max' }, { errors: 2 }) === 'xhigh', 'Medium→Max 两次错误到 xhigh')

ok(pickBandLevel({ min: 'low', max: 'low' }, { errors: 5 }) === 'low', '区间退化为单档时不被错误抬升')
ok(pickBandLevel({ min: 'bogus', max: 'also-bogus' }, { errors: 0 }) === DEFAULT_BAND.min, '非法区间回退到默认下限')
ok(pickBandLevel(null, { errors: 0 }) === DEFAULT_BAND.min, '缺省区间不炸')

// 状态读写
const dir = mkdtempSync(join(tmpdir(), 'dial-'))
const file = join(dir, 'state.json')
ok(loadState(file).global.enabled === false, '缺失状态文件时给默认值')
saveState(file, { version: 1, global: { enabled: true, min: 'medium', max: 'max' }, sessions: {} })
const back = loadState(file)
ok(back.global.enabled === true && back.global.min === 'medium' && back.global.max === 'max', '状态可写可读')

console.log(pass > 0 && !process.exitCode ? '\nALL PASS (' + pass + ')' : '\nFAILURES')

// ── 分类 + 模型路由 ────────────────────────────────────────────────
import { classifyBrief, decideBandTier, clampToModel, resolveRoute } from '../lib/policy.js'
ok(classifyBrief('把这个模块重构成可测试的').bucket === 'deep', '重构类任务归入 deep')
ok(classifyBrief('帮我跑一下测试并列出失败项').bucket === 'routine', '跑测试/列出归入 routine')
ok(classifyBrief('').bucket === 'routine', '空输入不炸，归 routine')
ok(classifyBrief('x'.repeat(500)).bucket === 'deep', '长文本归入 deep')

const band = { min: 'medium', max: 'max' }
ok(decideBandTier(band, { errors: 0, calmSteps: 0 }) === 'medium', '无错误停在下限')
ok(decideBandTier(band, { errors: 1, calmSteps: 0 }) === 'high', '一次错误升到 high')
ok(decideBandTier(band, { errors: 2, calmSteps: 0 }) === 'xhigh', '两次错误升到 xhigh')
ok(decideBandTier(band, { errors: 0, calmSteps: 5 }) === 'medium', '连续无错回落下限')

ok(clampToModel('medium', ['high', 'max']) === 'high', '目标模型没有 medium 时取最近档 high')
ok(clampToModel('max', ['low', 'high']) === 'high', '目标模型封顶 high 时收敛到 high')
ok(clampToModel('medium', []) === undefined, '模型无档位声明时返回 undefined')

const routes = { routine: { provider: 'topen', model: 'flash', min: 'low', max: 'high' }, deep: { provider: 'topen', model: 'pro', min: 'high', max: 'max' } }
ok(resolveRoute(routes, 'deep').model === 'pro', 'deep 桶解析到 pro 模型')
ok(resolveRoute(routes, 'routine').band.max === 'high', 'routine 桶区间上限 high')
ok(resolveRoute({}, 'deep') === null, '缺路由配置时返回 null')

// ── 用户消息提取（多种事件形状）──────────────────────────────────
import { lastUserText, collectText } from '../lib/index.js'
const mk = (events) => ({ session: { events } })
ok(lastUserText(mk([{ kind: 'user/message', data: { text: '把退款流程重构一下' } }])) === '把退款流程重构一下', '形状1: data.text')
ok(lastUserText(mk([{ kind: 'user/message', data: { content: [{ type: 'text', text: '排查并发丢单的根因' }] } }])) === '排查并发丢单的根因', '形状2: data.content[].text')
ok(lastUserText(mk([{ kind: 'user/message', data: { message: { content: [{ text: '帮我跑一下测试' }] } } }])) === '帮我跑一下测试', '形状3: data.message.content[].text')
ok(lastUserText(mk([
  { kind: 'user/message', data: { text: '第一条消息' } },
  { kind: 'tool/call', data: { name: 'bash' } },
  { kind: 'user/message', data: { text: '最后一条：请重构核心模块' } },
])) === '最后一条：请重构核心模块', '取最新一条用户消息')
ok(lastUserText(mk([{ kind: 'user/message', data: { source: { kind: 'agent-instructions' }, text: '系统注入的规则文件内容很长很长' } }])) === '', '跳过 agent-instructions 注入')
ok(lastUserText(mk([{ kind: 'user/message', data: { source: { kind: 'agent-instructions' }, text: '注入' }, content: [{ text: '真正的用户任务：迁移数据库' }] }])) === '', '带 source 的消息整条跳过')
ok(classifyBrief(lastUserText(mk([{ kind: 'user/message', data: { content: [{ text: '排查并发丢单的根因' }] } }]))).bucket === 'deep', '提取后能分出 deep')
