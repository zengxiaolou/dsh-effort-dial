// 契约预检：客户端模块的工厂 id、补丁里的 name，都必须等于包名。
//
// 为什么要有这条：宿主按「包名」这一行去认领客户端模块。工厂注册的 id 与包名不一致时，
// 这一行永远认领不到，宿主会把该行单独重下一遍 —— 同一个脚本执行两次，触发
// "client-modules: duplicate factory registration" 并让整个 web boot 失败。
// 2026-10-24 实测：改名成 @zengevent/dsh-effort-dial 之后这两处没跟上，启动直接崩。
//
// 用法：node test/contract.test.mjs
import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const patchText = readFileSync(join(root, 'cordis.patch.yml'), 'utf8')

const patchName = (patchText.match(/^\s*name:\s*['"]?([^'"\s]+)['"]?\s*$/m) ?? [])[1]

const registrations = []
const sandbox = { window: {}, console }
sandbox.window.__ModuleLoader__ = {
  load(registration) {
    if (registrations.some((r) => r.id === registration.id)) {
      throw new Error(
        `duplicate factory registration for "${registration.id}" (bundle executed twice without invalidate?)`,
      )
    }
    registrations.push(registration)
  },
}
runInContext(readFileSync(join(root, 'lib/client.js'), 'utf8'), createContext(sandbox))

const results = []
const check = (label, ok, detail) => results.push({ label, ok, detail })
const fail = (results) => results.filter((r) => !r.ok)

check('客户端只注册一次', registrations.length === 1, `实际 ${registrations.length} 次`)
check(
  '工厂 id 等于包名',
  registrations[0]?.id === pkg.name,
  `id=${JSON.stringify(registrations[0]?.id)} package=${JSON.stringify(pkg.name)}`,
)
check(
  '补丁 name 等于包名',
  patchName === pkg.name,
  `name=${JSON.stringify(patchName)} package=${JSON.stringify(pkg.name)}`,
)

for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.label}（${r.detail}）`)

const failed = fail(results)
if (failed.length > 0) {
  console.log(
    `\n${failed.length} 项不通过：宿主会认领不到这一行，重下后触发 duplicate registration，启动失败。`,
  )
  process.exitCode = 1
} else {
  console.log('\n契约预检通过。')
}
