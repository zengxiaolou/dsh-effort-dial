/**
 * 任务分类与派档策略（纯函数，便于单测）。
 *
 * 一次分类同时决定两件事：用哪个模型桶（routine/deep）、以及在该模型上把
 * 推理档位落在什么区间。这样「换模型」和「调强度」不会各说各话。
 */

export const TIERS = ['minimal', 'low', 'medium', 'high', 'xhigh', 'max']

/** 深度任务的强 cue：出现即视为 deep。 */
const DEEP_CUES = [
  '重构', '架构', '设计', '方案', '迁移', '并发', '死锁', '竞态', '性能', '优化',
  '排查', '根因', '调试', '为什么', '原理', '权衡', '评审', 'review', '安全', '加密',
  'refactor', 'architecture', 'migrate', 'concurren', 'race', 'deadlock', 'optimi',
  'debug', 'root cause', 'design', 'trade-off', 'security',
]

/** 机械任务的 cue：出现即视为 routine（除非同时命中 deep）。 */
const ROUTINE_CUES = [
  '改名', '重命名', '格式化', '排版', '加日志', '补注释', '跑测试', '执行', '安装',
  '列出', '查一下', '看一下', '统计', 'rename', 'format', 'lint', 'run test',
  'install', 'list', 'show', 'count',
]

/**
 * 按用户这一轮的输入给任务分类。
 * @param brief 用户消息纯文本
 * @returns {{bucket:'routine'|'deep', reason:string}}
 */
export function classifyBrief(brief) {
  const text = String(brief || '').toLowerCase()
  if (!text.trim()) return { bucket: 'routine', reason: 'empty brief' }
  const deep = DEEP_CUES.filter((cue) => text.indexOf(cue.toLowerCase()) >= 0)
  const routine = ROUTINE_CUES.filter((cue) => text.indexOf(cue.toLowerCase()) >= 0)
  if (deep.length > 0) return { bucket: 'deep', reason: 'deep cue: ' + deep.slice(0, 3).join(',') }
  if (routine.length > 0) return { bucket: 'routine', reason: 'routine cue: ' + routine.slice(0, 3).join(',') }
  // 默认：长文本更像设计/排查，短文本更像机械操作
  return text.length > 400
    ? { bucket: 'deep', reason: 'long brief (' + text.length + ' chars)' }
    : { bucket: 'routine', reason: 'short brief (' + text.length + ' chars)' }
}

/**
 * 在区间内按「错误升级 + 连续无错降级」派档。
 * @param band {min,max}
 * @param signals {errors:number, calmSteps:number} calmSteps=连续无错误轮数
 */
export function decideBandTier(band, signals) {
  const minIdx = Math.max(0, TIERS.indexOf(band && band.min))
  const maxIdx = Math.max(minIdx, TIERS.indexOf(band && band.max))
  const errors = Math.max(0, Number((signals && signals.errors) || 0))
  const calm = Math.max(0, Number((signals && signals.calmSteps) || 0))
  let idx = minIdx
  if (errors >= 2) idx = minIdx + 2
  else if (errors === 1) idx = minIdx + 1
  else if (calm >= 3) idx = minIdx // 连续无错：回落到下限
  return TIERS[Math.min(maxIdx, Math.max(minIdx, idx))]
}

/** 把档位收敛到目标模型声明的档位里（取最近的已有档）。 */
export function clampToModel(tier, efforts) {
  const list = Array.isArray(efforts) ? efforts.filter((e) => TIERS.indexOf(e) >= 0) : []
  if (list.length === 0) return undefined
  if (list.indexOf(tier) >= 0) return tier
  const want = TIERS.indexOf(tier)
  let best = list[0]
  let bestD = Infinity
  for (const candidate of list) {
    const d = Math.abs(TIERS.indexOf(candidate) - want)
    if (d < bestD) {
      bestD = d
      best = candidate
    }
  }
  return best
}

/** 把「桶配置」解析成一次注入决策；缺配置时返回 null（fail-open）。 */
export function resolveRoute(routes, bucket) {
  if (!routes || typeof routes !== 'object') return null
  const route = routes[bucket]
  if (!route || typeof route !== 'object') return null
  const provider = typeof route.provider === 'string' && route.provider ? route.provider : undefined
  const model = typeof route.model === 'string' && route.model ? route.model : undefined
  const min = TIERS.indexOf(route.min) >= 0 ? route.min : 'high'
  const max = TIERS.indexOf(route.max) >= 0 ? route.max : min
  if (!provider || !model) return null
  return { provider, model, band: { min, max } }
}
