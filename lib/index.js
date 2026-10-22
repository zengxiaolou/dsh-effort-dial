/**
 * dsh-effort-dial —— 宿主半边：Auto 区间的状态与逐轮派档。
 *
 * 设计要点（吸取 dsh-effort-router 的教训）：
 *   - 不依赖模型「广告了 auto」这一前提：区间模式由本插件自己的状态开关控制，
 *     派出的档位永远取自用户选定的 [min,max] 区间内的合法档，因此不会触发
 *     「档位没被声明 → 被剥掉」那种失败；
 *   - 任何一步出错都原样放行（fail-open），绝不阻断请求；
 *   - 状态落在 profile 目录的 .effort-dial/state.json，客户端通过
 *     GET /effort-dial/state 读取、POST /effort-dial/band 修改。
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { classifyBrief, decideBandTier, clampToModel, resolveRoute, TIERS as POLICY_TIERS } from './policy.js'
import { dirname, join } from 'node:path'

export const name = 'dsh-effort-dial'
export const inject = []

/** 合法思考档（宿主 THINKING_LEVELS 的思考子集，顺序即强弱）。 */
export const TIERS = ['minimal', 'low', 'medium', 'high', 'xhigh', 'max']

export const DEFAULT_BAND = { enabled: false, min: 'high', max: 'max' }
/** 两个模型桶的默认配置：留空表示不换模型。 */
export const DEFAULT_ROUTES = { routine: null, deep: null }

/** 把任意值收敛成合法档位；非法时回退到 fallback。 */
export function normalizeTier(value, fallback) {
  return TIERS.indexOf(value) >= 0 ? value : fallback
}

/**
 * 纯函数：在 [min,max] 区间内按「失败即升级」派档。
 * - 没有错误：停在 min（区间下限就是保底强度）
 * - 出现 1 次工具错误：升一档
 * - 出现 2 次及以上：再升一档，最多到 max
 * 这样区间既是约束，也是升级路径。
 */
export function pickBandLevel(band, signals) {
  const minIdx = Math.max(0, TIERS.indexOf(normalizeTier(band && band.min, DEFAULT_BAND.min)))
  const maxIdx = Math.max(minIdx, TIERS.indexOf(normalizeTier(band && band.max, DEFAULT_BAND.max)))
  const errors = Math.max(0, Number((signals && signals.errors) || 0))
  if (errors <= 0) return TIERS[minIdx]
  const step = errors >= 2 ? 2 : 1
  return TIERS[Math.min(maxIdx, minIdx + step)]
}

/**
 * 读会话事件。宿主真实字段是 `session.eventsSnapshot`（懒构建的冻结数组），
 * 不是 `session.events`；旧版本可能只暴露 events 或 snapshotEvents()。
 */
export function sessionEvents(agent) {
  try {
    const session = agent && agent.session
    if (!session) return []
    if (Array.isArray(session.eventsSnapshot)) return session.eventsSnapshot
    if (typeof session.snapshotEvents === 'function') {
      const value = session.snapshotEvents()
      if (Array.isArray(value)) return value
    }
    if (Array.isArray(session.events)) return session.events
    return []
  } catch (_e) {
    return []
  }
}

/** 取最近一条用户消息的纯文本（best-effort）。 */
export function lastUserText(agent) {
  try {
    const events = sessionEvents(agent)
    if (events.length === 0) return ''
    for (let i = events.length - 1; i >= 0; i -= 1) {
      const ev = events[i]
      if (!ev || typeof ev !== 'object') continue
      const kind = String(ev.kind || ev.type || '')
      if (kind.indexOf('user') < 0) continue
      const data = ev.data || ev
      // 跳过系统注入的指令文件消息，它们不是用户任务
      const source = data && data.source
      if (source && String(source.kind || '') === 'agent-instructions') continue
      const text = collectText(data, 0)
      if (text) return text
    }
    return ''
  } catch (_e) {
    return ''
  }
}

/** 把任意节点采样成「结构素描」，用于诊断事件形状（不含大段正文）。 */
export function sampleShape(node, depth = 0) {
  if (depth > 4) return '…'
  if (node == null) return String(node)
  if (typeof node === 'string') return node.length > 40 ? node.slice(0, 40) + '…(' + node.length + ')' : node
  if (typeof node === 'number' || typeof node === 'boolean') return node
  if (Array.isArray(node)) {
    return { __array: node.length, first: node.length ? sampleShape(node[0], depth + 1) : null }
  }
  if (typeof node === 'object') {
    const out = {}
    const keys = Object.keys(node).slice(0, 12)
    for (const key of keys) out[key] = sampleShape(node[key], depth + 1)
    return out
  }
  return String(node)
}

let lastDump = 0
/** 提取失败时把最后一次用户事件的结构写到状态目录，供离线定位。 */
function dumpUserEvent(file, agent) {
  try {
    const now = Date.now()
    if (now - lastDump < 10000) return
    lastDump = now
    const session = agent && agent.session
    const events = sessionEvents(agent)
    const sample = {
      at: new Date(now).toISOString(),
      agentKeys: agent ? Object.keys(agent).slice(0, 20) : null,
      sessionKeys: session ? Object.keys(session).slice(0, 20) : null,
      eventsIsArray: events.length > 0,
      eventsSource: Array.isArray(session && session.eventsSnapshot) ? 'eventsSnapshot' : 'other',
      eventsLength: Array.isArray(events) ? events.length : null,
      userLike: [],
    }
    if (Array.isArray(events)) {
      for (let i = events.length - 1; i >= 0 && sample.userLike.length < 3; i -= 1) {
        const ev = events[i]
        const kind = String((ev && (ev.kind || ev.type)) || '')
        if (kind.indexOf('user') < 0) continue
        sample.userLike.push(sampleShape(ev))
      }
    }
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(join(dirname(file), 'debug-user-event.json'), JSON.stringify(sample, null, 2))
  } catch (_e) {}
}

/** 事件结构在不同宿主版本里不一样：递归收集文本，取最长的可读串。 */
export function collectText(node, depth = 0, out = []) {
  if (depth > 5 || node == null) return ''
  if (typeof node === 'string') {
    const t = node.trim()
    if (t.length >= 2) out.push(t)
    return out.length ? out.sort((a, b) => b.length - a.length)[0] : ''
  }
  if (Array.isArray(node)) {
    for (const item of node) collectText(item, depth + 1, out)
    return out.length ? out.sort((a, b) => b.length - a.length)[0] : ''
  }
  if (typeof node === 'object') {
    for (const key of ['text', 'content', 'parts', 'blocks', 'message', 'value', 'body']) {
      if (key in node) collectText(node[key], depth + 1, out)
    }
    return out.length ? out.sort((a, b) => b.length - a.length)[0] : ''
  }
  return ''
}

/** 统计最近 N 次工具调用里的错误数（best-effort，取不到就当 0）。 */
export function countRecentErrors(agent, window = 8) {
  try {
    const events = sessionEvents(agent)
    if (events.length === 0) return 0
    let seen = 0
    let errors = 0
    for (let i = events.length - 1; i >= 0 && seen < window; i -= 1) {
      const ev = events[i]
      if (!ev || typeof ev !== 'object') continue
      const kind = String(ev.kind || ev.type || '')
      if (kind.indexOf('tool') < 0) continue
      seen += 1
      const data = ev.data || {}
      const result = data.result || data.output || data.error
      const failed =
        data.ok === false ||
        data.isError === true ||
        ev.isError === true ||
        (result && typeof result === 'object' && (result.isError === true || result.ok === false)) ||
        /error/i.test(String(data.status || ''))
      if (failed) errors += 1
    }
    return errors
  } catch (_e) {
    return 0
  }
}

/** 状态文件位置：优先宿主 profileContext 服务，其次环境变量。 */
export function resolveStateFile(env = typeof process === 'undefined' ? {} : process.env, profileDir) {
  if (typeof profileDir === 'string' && profileDir.length > 0) {
    return join(profileDir, '.effort-dial', 'state.json')
  }
  const home = env.DSH_HOME || join(env.USERPROFILE || env.HOME || '.', '.dsh')
  const dir = env.DSH_PROFILE_DIR || join(home, 'profiles', env.DSH_PROFILE || 'web')
  return join(dir, '.effort-dial', 'state.json')
}

function emptyState() {
  return { version: 1, global: { ...DEFAULT_BAND }, routes: { ...DEFAULT_ROUTES }, sessions: {} }
}

function normalizeRoute(route) {
  if (!route || typeof route !== 'object') return null
  const provider = typeof route.provider === 'string' && route.provider ? route.provider : ''
  const model = typeof route.model === 'string' && route.model ? route.model : ''
  if (!provider || !model) return null
  const min = POLICY_TIERS.indexOf(route.min) >= 0 ? route.min : 'high'
  const max = POLICY_TIERS.indexOf(route.max) >= 0 ? route.max : min
  return { provider, model, min: POLICY_TIERS.indexOf(min) <= POLICY_TIERS.indexOf(max) ? min : max,
    max: POLICY_TIERS.indexOf(min) <= POLICY_TIERS.indexOf(max) ? max : min }
}

export function loadState(file) {
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'))
    const global = parsed && parsed.global ? parsed.global : {}
    const sessions = parsed && parsed.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : {}
    const routesIn = parsed && parsed.routes && typeof parsed.routes === 'object' ? parsed.routes : {}
    return {
      version: 1,
      global: {
        enabled: global.enabled === true,
        min: normalizeTier(global.min, DEFAULT_BAND.min),
        max: normalizeTier(global.max, DEFAULT_BAND.max),
      },
      routes: { routine: normalizeRoute(routesIn.routine), deep: normalizeRoute(routesIn.deep) },
      sessions,
    }
  } catch (_e) {
    return emptyState()
  }
}

export function saveState(file, state) {
  try {
    mkdirSync(dirname(file), { recursive: true })
    const tmp = file + '.tmp'
    writeFileSync(tmp, JSON.stringify(state))
    renameSync(tmp, file)
  } catch (_e) {
    /* 状态写不进去也不能影响宿主 */
  }
}

function sendJson(res, status, body) {
  const text = JSON.stringify(body === undefined ? null : body)
  try {
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'content-length': Buffer.byteLength(text),
    })
    res.end(text)
  } catch (_e) {}
}

export function apply(ctx) {
  const logger =
    typeof ctx.logger === 'function'
      ? ctx.logger('effort-dial')
      : ctx.logger && typeof ctx.logger.info === 'function'
        ? ctx.logger
        : console
  const service = (n) => {
    try {
      return ctx.get(n)
    } catch (_e) {
      return undefined
    }
  }
  const profileCtx = service('profileContext')
  const profileDir = profileCtx && (profileCtx.dir || profileCtx.profileDir || profileCtx.path)
  const file = resolveStateFile(undefined, typeof profileDir === 'string' ? profileDir : undefined)
  let state = loadState(file)

  let saveTimer = 0
  const scheduleSave = () => {
    try {
      if (saveTimer) clearTimeout(saveTimer)
      saveTimer = setTimeout(() => {
        saveTimer = 0
        saveState(file, state)
      }, 400)
      if (typeof saveTimer.unref === 'function') saveTimer.unref()
    } catch (_e) {}
  }

  /** 记录该会话本轮实际跑的档位，供客户端实时显示。 */
  const recordPick = (sessionId, level, extra) => {
    if (!sessionId) return
    const current = state.sessions[sessionId] || {}
    state.sessions[sessionId] = { ...current, last: { level, at: Date.now(), ...(extra || {}) } }
    scheduleSave()
  }

  /** 目标模型声明的档位（取不到就返回 undefined，交给调用方 fail-open）。 */
  const effortsOf = async (provider, model) => {
    try {
      const llm = service('llm')
      if (!llm || typeof llm.listModels !== 'function') return undefined
      const models = await llm.listModels(provider)
      const hit = Array.isArray(models) ? models.find((m) => m && m.id === model) : undefined
      const efforts = hit && hit.reasoning && Array.isArray(hit.reasoning.efforts) ? hit.reasoning.efforts : []
      return efforts.map((e) => (typeof e === 'string' ? e : e && e.id)).filter(Boolean)
    } catch (_e) {
      return undefined
    }
  }

  const bandFor = (sessionId) => {
    const own = sessionId && state.sessions ? state.sessions[sessionId] : undefined
    const base = state.global || DEFAULT_BAND
    if (!own) return { ...base, session: false }
    return {
      enabled: own.enabled === undefined ? base.enabled : own.enabled === true,
      min: normalizeTier(own.min, base.min),
      max: normalizeTier(own.max, base.max),
      session: true,
    }
  }

  // ── 请求注入：区间模式下逐轮派档 ────────────────────────────────────
  try {
    ctx.on('agent/request', async (payload, next) => {
      const seed = await next()
      try {
        const agent = payload && payload.agent
        const sessionId = (agent && (agent.sessionId || (agent.session && agent.session.id))) || undefined
        if (!seed || typeof seed !== 'object') return seed
        const band = bandFor(sessionId)
        const errors = countRecentErrors(agent)
        const brief = lastUserText(agent)
        if (!brief) dumpUserEvent(file, agent)
        const cls = classifyBrief(brief)
        const route = resolveRoute(state.routes, cls.bucket)
        // 未启用区间且没有模型路由 → 完全放行
        if (!route && (!band || band.enabled !== true)) return seed
        const effBand = route ? route.band : { min: band.min, max: band.max }
        let level = decideBandTier(effBand, { errors })
        let nextProvider = route ? route.provider : undefined
        let nextModel = route ? route.model : undefined
        if (nextProvider && nextModel) {
          // 目标模型没声明的档位要收敛，避免被宿主剥掉
          const efforts = await effortsOf(nextProvider, nextModel)
          if (efforts && efforts.length) {
            const clamped = clampToModel(level, efforts)
            if (clamped) level = clamped
            else {
              nextProvider = undefined
              nextModel = undefined
            }
          }
        }
        if (TIERS.indexOf(level) < 0) return seed
        recordPick(sessionId, level, {
          errors,
          min: effBand.min,
          max: effBand.max,
          bucket: cls.bucket,
          reason: cls.reason,
          model: nextModel || seed.model,
        })
        const out = { ...seed, reasoningEffort: level }
        if (nextProvider && nextModel) {
          out.provider = nextProvider
          out.model = nextModel
        }
        return out
      } catch (_e) {
        return seed
      }
    })
  } catch (error) {
    logger.warn?.('[effort-dial] agent/request hook unavailable: ' + String((error && error.message) || error))
  }

  // ── 读状态 / 改区间 ────────────────────────────────────────────────
  try {
    ctx.inject(['webServer'], (scope) => {
      scope.effect(
        () => [
          scope.webServer.register({
            kind: 'exact',
            path: '/effort-dial/state',
            handler: (req, res) => {
              try {
                const url = new URL(req.url || '/', 'http://localhost')
                const sessionId = url.searchParams.get('sessionId') || undefined
                const own = sessionId && state.sessions ? state.sessions[sessionId] : undefined
                sendJson(res, 200, {
                  ok: true,
                  tiers: TIERS,
                  global: state.global,
                  routes: state.routes,
                  band: bandFor(sessionId),
                  last: own && own.last ? own.last : null,
                })
              } catch (error) {
                sendJson(res, 500, { ok: false, error: String((error && error.message) || error) })
              }
            },
          }),
          scope.webServer.register({
            kind: 'exact',
            path: '/effort-dial/band',
            handler: (req, res) => {
              let body = ''
              req.on('data', (chunk) => {
                body += chunk
                if (body.length > 4096) req.destroy()
              })
              req.on('end', () => {
                try {
                  const patch = JSON.parse(body || '{}')
                  const sessionId = typeof patch.sessionId === 'string' ? patch.sessionId : undefined
                  const target = sessionId ? { ...(state.sessions[sessionId] || {}) } : { ...state.global }
                  if (typeof patch.enabled === 'boolean') target.enabled = patch.enabled
                  if (patch.min) target.min = normalizeTier(patch.min, target.min || DEFAULT_BAND.min)
                  if (patch.max) target.max = normalizeTier(patch.max, target.max || DEFAULT_BAND.max)
                  const minIdx = TIERS.indexOf(target.min)
                  const maxIdx = TIERS.indexOf(target.max)
                  if (minIdx > maxIdx) target.max = target.min
                  if (patch.routes && typeof patch.routes === 'object') {
                    const nextRoutes = { ...state.routes }
                    for (const bucket of ['routine', 'deep']) {
                      if (Object.prototype.hasOwnProperty.call(patch.routes, bucket)) {
                        nextRoutes[bucket] = normalizeRoute(patch.routes[bucket])
                      }
                    }
                    state.routes = nextRoutes
                  }
                  if (sessionId) state.sessions[sessionId] = target
                  else if (patch.enabled !== undefined || patch.min || patch.max) state.global = target
                  saveState(file, state)
                  sendJson(res, 200, {
                    ok: true,
                    global: state.global,
                    routes: state.routes,
                    band: bandFor(sessionId),
                  })
                } catch (error) {
                  sendJson(res, 400, { ok: false, error: String((error && error.message) || error) })
                }
              })
            },
          }),
        ],
        'effort-dial: state + band routes',
      )
    })
  } catch (error) {
    logger.warn?.('[effort-dial] webServer unavailable: ' + String((error && error.message) || error))
  }

  logger.info?.('[effort-dial] state file: ' + file)
}
