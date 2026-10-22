/**
 * dsh-effort-dial —— 宿主侧入口。
 *
 * 这个插件只在浏览器里干活（滑杆渲染 + 写入档位）。宿主侧没有任何注册，
 * 只保留一个空 apply，让 profile 里那条 entry 有东西可装载。
 */

export const name = 'dsh-effort-dial'
export const inject = []

export function apply() {}
