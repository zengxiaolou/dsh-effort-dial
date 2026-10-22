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
