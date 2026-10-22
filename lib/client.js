/**
 * dsh-effort-dial —— 浏览器半边（输入框里的「推理强度滑杆」）。
 *
 * 包在 window.__ModuleLoader__.load({ id, factory }) 信封里，只能 require 外壳种子
 * 预置的 react，导出具名 name / inject / apply。
 *
 * v0.3.0：整套动画照搬 dsh-thinking-levels（MIT）的 effort-slider 视觉层——
 *   - canvas「辐射」：每 4px 一列的三道正弦波（指数 2.6/3.2/4）+ 峰尖（15/18 次幂）
 *     + 从滑块向左侧指数衰减的尾迹 + 4px 像素网格与 grain 噪点 + 滑块处径向光晕
 *     + 14 条向左飞行的粒子流，全部裁剪在滑块左侧，screen 混合、pixelated；
 *   - 滑块处 flare：椭圆径向渐变 + 横向 52px / 纵向 20px 两道十字光带；
 *   - 拖拽时 canvas 提亮提饱和、flare 加强、速度 ×2.8；
 *   - 到最高档时轨道呼吸脉冲（breathe）；
 *   - 8 帧鲸鱼娘奔跑立绘（同源素材），悬停/拖拽时逐帧跑。
 *
 * 与参考实现的差异（有意为之）：
 *   - 胶囊强制 overflow:hidden + contain:paint —— 上一版蓝线事故的结构性修复；
 *   - 6 个思考档而不是参考的「按模型广告档位平铺」：档数仍由模型声明决定；
 *   - 动画在空闲时降到 12fps（常显控件，省电），悬停/拖拽恢复 60fps；
 *     prefers-reduced-motion 下只画一帧静态。
 */

window.__ModuleLoader__.load({
  id: 'dsh-effort-dial',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    var React = require('react')
    var h = React.createElement

    var STYLE_ID = 'dsh-effort-dial-style'
    var FONT =
      '-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", system-ui, sans-serif'

    // 鲸鱼娘奔跑条：8 帧，原始 67x92（2x），CSS 显示高 24px
    var WHALE_SRC = 'data:image/png;base64,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'
    var FRAME_W = 67
    var FRAME_H = 92
    var FRAMES = 8
    var GIRL_H = 24
    var GIRL_W = Math.round((GIRL_H * FRAME_W) / FRAME_H * 10) / 10
    var STRIP_W = Math.round(GIRL_W * FRAMES * 10) / 10

    // 弹簧（进度 fraction 为单位）：k=170 c=24 ≈ 阻尼比 0.92
    var SPRING_K = 170
    var SPRING_C = 24

    // 轨道细高：canvas 辐射带高度 / 轨道高度
    var FX_H = 16
    var RAIL_H = 16

    var CSS = [
      // ── 胶囊：强制裁剪，内部元素不可能溢出到外层 ─────────────────────
      '.ed{position:relative;display:inline-flex;align-items:center;gap:8px;height:30px;',
      'padding:0 10px 0 7px;border-radius:999px;box-sizing:border-box;overflow:hidden;',
      'contain:paint;isolation:isolate;',
      'border:1px solid var(--dsw-alias-border-l2,rgba(122,132,152,.30));',
      'background:var(--dsw-alias-bg-layer-1,rgba(127,137,160,.08));',
      'color:var(--dsw-alias-label-secondary,#8b93a7);--ed-heat:0;',
      'font:500 11px/1 ' + FONT + ';letter-spacing:.02em;',
      'user-select:none;-webkit-user-select:none;outline:none;',
      'transition:border-color .16s ease,box-shadow .2s ease,opacity .16s ease}',
      '.ed:hover,.ed:focus-within{border-color:var(--dsw-alias-border-l3,rgba(122,132,152,.5));',
      'box-shadow:0 0 0 3px rgba(94,140,255,.10)}',
      '.ed[data-busy="true"]{opacity:.7}',
      '.ed[data-error="true"]{border-color:var(--dsw-alias-state-error-primary,#e5484d);',
      'box-shadow:0 0 0 3px rgba(229,72,77,.18)}',
      '.ed[data-unavailable="true"]{opacity:.72;cursor:default;gap:0;padding:0 10px}',
      '.ed{flex-wrap:wrap}',
      '.ed-band{position:absolute;top:50%;height:' + RAIL_H + 'px;margin-top:-' + RAIL_H / 2 + 'px;',
      'border-radius:999px;border:1px dashed rgba(150,170,255,.75);z-index:2;pointer-events:none;',
      'box-shadow:0 0 10px rgba(120,150,255,.25) inset}',

      '.ed-label{flex:0 0 auto;width:46px;text-align:right;font-variant-numeric:tabular-nums;',
      'letter-spacing:.03em;color:var(--dsw-alias-label-primary,#cbd3e1);',
      'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:color .18s ease}',
      '.ed[data-auto="true"] .ed-label{color:var(--dsw-alias-label-secondary,#98a2b6)}',
      '.ed[data-band="true"] .ed-label{width:auto;max-width:132px;min-width:46px}',
      '.ed[data-unavailable="true"] .ed-label{width:auto;text-align:center}',

      '.ed-auto{all:unset;flex:0 0 auto;width:16px;height:16px;border-radius:50%;display:grid;',
      'place-items:center;font:700 9px/1 ' + FONT + ';letter-spacing:0;cursor:pointer;',
      'color:var(--dsw-alias-label-tertiary,#7b8496);',
      'border:1px solid var(--dsw-alias-border-l2,rgba(122,132,152,.34));',
      'transition:color .15s ease,background .15s ease,border-color .15s ease,box-shadow .15s ease}',
      '.ed-auto:hover{color:var(--dsw-alias-label-primary,#cbd3e1);',
      'border-color:var(--dsw-alias-border-l3,rgba(122,132,152,.55))}',
      '.ed-auto[aria-pressed="true"]{color:#fff;border-color:transparent;',
      'background:var(--dsw-alias-brand-primary,#5b8cff);box-shadow:0 0 0 3px rgba(91,140,255,.18)}',

      // ── 轨道区 ────────────────────────────────────────────────────
      '.ed-track{position:relative;flex:0 1 var(--ed-track-w,132px);width:var(--ed-track-w,132px);',
      'min-width:88px;height:100%;',
      'cursor:ew-resize;touch-action:none;outline:none}',
      '.ed-inner{position:absolute;left:9px;right:9px;top:0;bottom:0;isolation:isolate}',
      '.ed-slot{position:absolute;left:' + GIRL_W / 2 + 'px;right:' + GIRL_W / 2 + 'px;top:0;bottom:0}',

      // 轨道底：深色深紫渐变 + 内侧辐射（照搬参考）
      '.ed-rail{position:absolute;left:0;right:0;top:50%;height:' + RAIL_H + 'px;',
      'margin-top:-' + RAIL_H / 2 + 'px;border-radius:999px;overflow:hidden;isolation:isolate;',
      'background:linear-gradient(100deg,#03040a 0%,#071126 22%,#101d4c 45%,#302262 70%,#5d35a0 100%);',
      'box-shadow:inset 0 1px 0 rgba(189,199,255,.15),inset 0 -1px 0 rgba(0,0,0,.55),',
      '0 3px 10px rgba(12,17,55,.34)}',
      '.ed-rail::after{content:"";position:absolute;inset:0;pointer-events:none;',
      'background:radial-gradient(circle at 18% 45%,rgba(82,130,255,.12),transparent 24%),',
      'linear-gradient(90deg,rgba(0,0,0,.28),transparent 42%,rgba(168,113,255,.12))}',
      // 浅色主题：淡蓝到深蓝的基底（参考里的同款），并去掉内侧辐射
      'html:not([data-ds-dark-theme]) body:not([data-ds-dark-theme]) .ed-rail{',
      'background:linear-gradient(90deg,#d9eafc 0%,#b3d3f5 40%,#6ba6e8 78%,#4080d8 100%);',
      'box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(80,133,194,.14),',
      '0 3px 10px rgba(48,101,165,.13)}',
      'html:not([data-ds-dark-theme]) body:not([data-ds-dark-theme]) .ed-rail::after{display:none}',

      // 进度填充：参考里只在浅色主题出现（深色靠 canvas 辐射表达进度）
      '.ed-fill{position:absolute;left:0;top:50%;height:' + RAIL_H + 'px;',
      'margin-top:-' + RAIL_H / 2 + 'px;border-radius:999px;display:none;will-change:width;',
      'transition:width .12s cubic-bezier(.22,1,.36,1);',
      'background:linear-gradient(90deg,#ffffff 0%,#d7eaff 18%,#75afea 54%,#0751ad 100%)}',
      'html:not([data-ds-dark-theme]) body:not([data-ds-dark-theme]) .ed-fill{display:block}',

      // canvas 辐射层（照搬：pixelated + screen；浅色用 normal）
      '.ed-fx{position:absolute;left:0;right:0;top:50%;height:' + FX_H + 'px;',
      'margin-top:-' + FX_H / 2 + 'px;width:100%;border-radius:999px;',
      'image-rendering:pixelated;mix-blend-mode:screen;pointer-events:none;',
      'transition:filter .14s ease}',
      '.ed[data-dragging="true"] .ed-fill{transition:none}',
      'html:not([data-ds-dark-theme]) body:not([data-ds-dark-theme]) .ed-fx{mix-blend-mode:normal}',
      '.ed[data-dragging="true"] .ed-fx{filter:saturate(1.45) brightness(1.28) contrast(1.06)}',

      // 刻度（压在辐射之上，加暗描边保证可读）
      '.ed-tick{position:absolute;top:50%;width:2px;height:9px;margin:-4.5px 0 0 0;',
      'transform:translateX(-50%);border-radius:1px;',
      'background:rgba(255,255,255,.26);z-index:3;',
      'filter:drop-shadow(0 0 1px rgba(0,0,0,.75));transition:background .18s ease}',
      '.ed-tick[data-on="true"]{background:rgba(255,255,255,.78)}',
      'html:not([data-ds-dark-theme]) body:not([data-ds-dark-theme]) .ed-tick{background:rgba(24,44,80,.35)}',
      'html:not([data-ds-dark-theme]) body:not([data-ds-dark-theme]) .ed-tick[data-on="true"]{',
      'background:rgba(255,255,255,.92)}',

      // 鲸鱼娘
      '.ed-thumb{position:absolute;left:0;top:50%;width:' + GIRL_W + 'px;height:' + GIRL_H + 'px;',
      'transform:translate(-50%,-50%);will-change:left;pointer-events:none;z-index:4;',
      'transition:left .12s cubic-bezier(.22,1,.36,1)}',
      '.ed[data-dragging="true"] .ed-thumb{transition:none}',
      '.ed-girl{position:absolute;inset:0;background-image:url(' + WHALE_SRC + ');',
      'background-repeat:no-repeat;background-size:' + STRIP_W + 'px ' + GIRL_H + 'px;',
      'filter:drop-shadow(0 1px 2px rgba(8,12,32,.45));',
      'animation:ed-run .92s steps(' + FRAMES + ') infinite;animation-play-state:paused}',
      '.ed:hover .ed-girl,.ed[data-dragging="true"] .ed-girl{animation-play-state:running}',
      '@keyframes ed-run{from{background-position-x:0}to{background-position-x:-' + STRIP_W + 'px}}',

      // flare：椭圆光 + 两道十字光带（照搬尺寸/渐变/blend）
      '.ed-flare{position:absolute;left:50%;top:50%;width:54px;height:24px;border-radius:50%;',
      'transform:translate(-100%,-50%);pointer-events:none;',
      'background:radial-gradient(ellipse at 100% 50%,rgba(255,255,255,.96) 0 4%,',
      'rgba(188,189,255,.8) 11%,rgba(106,87,255,.5) 28%,rgba(105,31,255,.2) 49%,transparent 74%);',
      'filter:blur(1.5px) saturate(1.25);mix-blend-mode:screen;transition:filter .14s ease}',
      '.ed-flare::before,.ed-flare::after{content:"";position:absolute;left:100%;top:50%;',
      'border-radius:999px;transform:translate(-50%,-50%)}',
      '.ed-flare::before{width:44px;height:1px;',
      'background:linear-gradient(90deg,transparent,rgba(100,160,255,.42),#f1ecff,',
      'rgba(193,82,255,.65),transparent);box-shadow:0 0 7px #9b7cff,0 0 13px rgba(72,132,255,.64)}',
      '.ed-flare::after{width:1px;height:16px;',
      'background:linear-gradient(180deg,transparent,rgba(196,190,255,.84),transparent);',
      'box-shadow:0 0 7px #9c7cff}',
      '.ed[data-dragging="true"] .ed-flare{filter:blur(1.5px) saturate(1.6) brightness(1.42)}',

      // Auto：虚线轨道 + 立绘灰阶 + 关掉辐射
      '.ed[data-auto="true"] .ed-rail{background-image:repeating-linear-gradient(90deg,',
      'var(--dsw-alias-border-l2,rgba(122,132,152,.34)) 0 4px,transparent 4px 8px);',
      'background-color:transparent;box-shadow:none}',
      '.ed[data-auto="true"] .ed-rail::after{display:none}',
      '.ed[data-auto="true"] .ed-fx{opacity:0}',
      '.ed[data-auto="true"] .ed-flare{opacity:0}',
      '.ed[data-auto="true"] .ed-girl{filter:grayscale(1) brightness(.92) opacity(.75)}',
      '.ed[data-auto="true"] .ed-fill{opacity:.5}',

      // 到最高档：轨道呼吸（照搬）
      '.ed[data-top="true"] .ed-rail{animation:ed-breathe 1.9s ease-in-out infinite}',
      '@keyframes ed-breathe{',
      '0%,100%{box-shadow:inset 0 1px 0 rgba(196,204,255,.16),0 3px 10px rgba(18,25,72,.4)}',
      '50%{box-shadow:inset 0 1px 0 rgba(220,214,255,.24),0 0 21px rgba(111,66,255,.5)}}',

      'html[data-ds-dark-theme] .ed, body[data-ds-dark-theme] .ed{background:rgba(255,255,255,.045)}',
      '.ed[data-animate="false"] .ed-girl{animation:none!important}',
      '.ed[data-animate="false"] .ed-rail{animation:none!important}',
      '.ed[data-animate="false"] .ed-thumb,.ed[data-animate="false"] .ed-fill{transition:none!important}',
      '@media (prefers-reduced-motion: reduce){.ed-girl{animation:none!important}',
      '.ed-rail{animation:none!important}}',
    ].join('')

    function ensureStyles() {
      if (typeof document === 'undefined') return
      var existing = document.getElementById(STYLE_ID)
      if (existing) {
        if (existing.textContent !== CSS) existing.textContent = CSS
        return
      }
      var el = document.createElement('style')
      el.id = STYLE_ID
      el.textContent = CSS
      document.head.appendChild(el)
    }

    function clamp(v, lo, hi) {
      return v < lo ? lo : v > hi ? hi : v
    }

    function effortsOf(model) {
      var reasoning = model && model.reasoning
      var list = reasoning && Array.isArray(reasoning.efforts) ? reasoning.efforts : []
      return list.filter(function (e) {
        return e && typeof e.id === 'string' && e.id !== 'off' && e.id !== 'auto'
      })
    }

    function hasAuto(model) {
      var reasoning = model && model.reasoning
      var list = reasoning && Array.isArray(reasoning.efforts) ? reasoning.efforts : []
      return list.some(function (e) {
        return e && e.id === 'auto'
      })
    }

    var TIER_ORDER = ['minimal', 'low', 'medium', 'high', 'xhigh', 'max']

    /** 读宿主侧的区间状态（fail-open：拿不到就用停用态）。 */
    function fetchBand(sessionId, cb) {
      try {
        var q = sessionId ? '?sessionId=' + encodeURIComponent(sessionId) : ''
        fetch('/effort-dial/state' + q, { cache: 'no-store' })
          .then(function (r) {
            return r.ok ? r.json() : null
          })
          .then(function (json) {
            if (json && json.ok) cb(json.global, json.band)
          })
          .catch(function () {})
      } catch (e) {}
    }

    /** 写区间：既写全局默认，也按 sessionId 写单会话。 */
    function postBand(patch, cb) {
      try {
        fetch('/effort-dial/band', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(patch),
        })
          .then(function (r) {
            return r.ok ? r.json() : null
          })
          .then(function (json) {
            if (json && json.ok) cb(json.global, json.band)
          })
          .catch(function () {})
      } catch (e) {}
    }

    function notifyBand() {
      try {
        window.dispatchEvent(new Event('dsh-effort-dial:band'))
      } catch (e) {}
    }

    function snapshotOf(directory) {
      try {
        return directory && directory.store ? directory.store.getSnapshot() : undefined
      } catch (e) {
        return undefined
      }
    }

    function isDarkTheme() {
      if (typeof document === 'undefined') return false
      var b = document.body
      var r = document.documentElement
      return !!(
        (b && b.hasAttribute && b.hasAttribute('data-ds-dark-theme')) ||
        (r && r.hasAttribute && r.hasAttribute('data-ds-dark-theme'))
      )
    }

    /**
     * 照搬自 dsh-thinking-levels（MIT）的 drawRadiation：正弦列 + 峰尖 + 指数尾迹 +
     * 4px 网格 grain + 滑块径向光晕 + 14 条向左粒子流，裁剪在滑块左侧。
     */
    function drawRadiation(context, width, height, time, state) {
      var origin = state.origin
      var dark = isDarkTheme()
      var cell = 4
      var speed = state.dragging ? 2.8 : 1
      context.clearRect(0, 0, width, height)
      if (origin <= 0) return
      context.save()
      context.beginPath()
      context.rect(0, 0, origin, height)
      context.clip()

      for (var x = 0; x < origin; x += cell) {
        var delta = x + cell * 0.5 - origin
        var distance = Math.abs(delta)
        var phaseA = distance / 10 - time * 0.0074 * speed
        var phaseB = distance / 23 - time * 0.0041 * speed + 1.7
        var phaseC = distance / 40 - time * 0.0022 * speed + 3.4
        var sinA = Math.max(0, Math.sin(phaseA))
        var sinB = Math.max(0, Math.sin(phaseB))
        var sinC = Math.max(0, Math.sin(phaseC))
        var waveA = Math.pow(sinA, 2.6)
        var waveB = Math.pow(sinB, 3.2)
        var waveC = Math.pow(sinC, 4)
        var crest = Math.pow(sinA, 15) + Math.pow(sinB, 18) * 0.78
        var wave = Math.min(1, waveA * 0.76 + waveB * 0.58 + waveC * 0.32)
        var trail = 0.38 + 0.62 * Math.exp(-distance / Math.max(55, width * 0.72))
        var pillar = Math.pow(Math.max(0, Math.sin(x / 20 + time * 0.0016)), 3) * 0.27
        var columnEnergy = trail * (wave * 1.04 + pillar + crest * 0.32)
        if (columnEnergy > 0.012) {
          var nearness = Math.max(0, 1 - distance / Math.max(1, width * 0.78))
          context.fillStyle =
            'rgba(' +
            (dark
              ? Math.round(42 + 124 * nearness + 75 * wave)
              : Math.round(28 + 58 * nearness + 15 * wave)) +
            ', ' +
            (dark
              ? Math.round(56 + 58 * nearness + 44 * crest)
              : Math.round(88 + 72 * nearness + 30 * crest)) +
            ', ' +
            (dark
              ? Math.round(175 + 72 * nearness + 8 * wave)
              : Math.round(182 + 62 * nearness)) +
            ', ' +
            (dark ? Math.min(0.88, columnEnergy * 0.72) : Math.min(0.9, columnEnergy * 0.85)) +
            ')'
          context.fillRect(x, 0, 3, height)
        }
        for (var y = 0; y < height; y += cell) {
          var deltaY = y + cell * 0.5 - height * 0.5
          var radial = Math.hypot(delta / 38, deltaY / 11)
          var halo = Math.exp(-radial * 0.96) * 1.08
          var verticalShape = 0.58 + 0.42 * Math.cos((deltaY / height) * Math.PI)
          var grain = 0.72 + 0.28 * Math.sin(x * 0.73 + y * 1.31 + time * 0.006)
          var alpha = Math.min(0.96, (columnEnergy * 0.88 + halo + crest * 0.19) * verticalShape * grain)
          if (alpha < 0.035) continue
          var hot = Math.max(0, 1 - radial / 2.4)
          context.fillStyle =
            'rgba(' +
            (dark
              ? Math.round(54 + 148 * hot + 42 * wave + 35 * crest)
              : Math.round(20 + 92 * hot + 18 * wave)) +
            ', ' +
            (dark
              ? Math.round(68 + 78 * hot + 46 * crest)
              : Math.round(78 + 80 * hot + 30 * crest)) +
            ', ' +
            (dark ? Math.round(186 + 64 * hot) : Math.round(188 + 62 * hot)) +
            ', ' +
            (dark ? alpha : alpha * 0.95) +
            ')'
          context.fillRect(x, y, 3, 3)
        }
      }

      for (var i = 0; i < 14; i += 1) {
        var particleX =
          origin - ((time * (state.dragging ? 0.16 : 0.065) * (0.78 + (i % 5) * 0.09) + i * 23) %
            Math.max(30, origin + 64))
        if (particleX < -24 || particleX > width + 16) continue
        var particleY = 3 + ((i * 13 + Math.sin(time * 0.003 + i) * 5) % Math.max(7, height - 6))
        var length = 4 + (i % 4) * 4 + (state.dragging ? 6 : 0)
        var palpha = 0.28 + (i % 5) * 0.1
        var streak = context.createLinearGradient(particleX, 0, particleX + length, 0)
        streak.addColorStop(0, dark ? 'rgba(72,118,255,0)' : 'rgba(24,94,184,0)')
        streak.addColorStop(0.68, dark ? 'rgba(112,135,255,' + palpha + ')' : 'rgba(36,108,202,' + palpha * 0.72 + ')')
        streak.addColorStop(
          1,
          dark
            ? 'rgba(236,222,255,' + Math.min(1, palpha + 0.26) + ')'
            : 'rgba(103,175,248,' + Math.min(0.82, palpha + 0.18) + ')',
        )
        context.fillStyle = streak
        context.fillRect(particleX, particleY, length, i % 3 === 0 ? 2 : 1)
      }

      var glow = context.createRadialGradient(origin, height / 2, 0, origin, height / 2, 24)
      glow.addColorStop(0, dark ? 'rgba(255,255,255,.82)' : 'rgba(255,255,255,.86)')
      glow.addColorStop(0.14, dark ? 'rgba(183,190,255,.54)' : 'rgba(162,210,255,.48)')
      glow.addColorStop(0.44, dark ? 'rgba(103,74,255,.28)' : 'rgba(37,112,207,.22)')
      glow.addColorStop(1, dark ? 'rgba(86,31,210,0)' : 'rgba(25,91,181,0)')
      context.fillStyle = glow
      context.fillRect(origin - 26, 0, 52, height)
      context.restore()
    }


    // ── 配置（localStorage；纯客户端，不需要宿主参与）─────────────────
    var CFG_KEY = 'dsh-effort-dial.config.v1'
    var CFG_DEFAULT = { animate: true, trackWidth: 132, showAuto: true }

    function readConfig() {
      try {
        var raw = window.localStorage.getItem(CFG_KEY)
        if (!raw) return Object.assign({}, CFG_DEFAULT)
        var parsed = JSON.parse(raw)
        return {
          animate: parsed.animate !== false,
          trackWidth:
            typeof parsed.trackWidth === 'number' && parsed.trackWidth >= 88 && parsed.trackWidth <= 220
              ? parsed.trackWidth
              : CFG_DEFAULT.trackWidth,
          showAuto: parsed.showAuto !== false,
        }
      } catch (e) {
        return Object.assign({}, CFG_DEFAULT)
      }
    }

    function writeConfig(patch) {
      var next = Object.assign(readConfig(), patch)
      try {
        window.localStorage.setItem(CFG_KEY, JSON.stringify(next))
      } catch (e) {}
      try {
        window.dispatchEvent(new Event('dsh-effort-dial:config'))
      } catch (e) {}
      return next
    }

    /** 设置页：滑杆外观 + 自动区间，改完即时生效并持久化。 */
    function SettingsPage() {
      var cfgState = React.useState(readConfig())
      var cfg = cfgState[0]
      var setCfg = cfgState[1]
      var bandState = React.useState({ enabled: false, min: 'high', max: 'max' })
      var band = bandState[0]
      var setBand = bandState[1]
      React.useEffect(function () {
        fetchBand(undefined, function (b) {
          if (b) setBand({ enabled: b.enabled === true, min: b.min || 'high', max: b.max || 'max' })
        })
      }, [])
      React.useEffect(function () {
        function onChange() {
          setCfg(readConfig())
        }
        window.addEventListener('dsh-effort-dial:config', onChange)
        return function () {
          window.removeEventListener('dsh-effort-dial:config', onChange)
        }
      }, [])
      var row = function (key, label, control) {
        return h(
          'div',
          {
            key: key,
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              padding: '10px 0',
              borderBottom: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))',
              font: '500 12px/1.4 ' + FONT,
              color: 'var(--dsw-alias-label-primary, #cbd3e1)',
            },
          },
          h('span', {}, label),
          control,
        )
      }
      var toggle = function (key, value) {
        return h(
          'button',
          {
            type: 'button',
            onClick: function () {
              writeConfig(((k, v) => ({ [k]: v }))(key, !value))
            },
            style: {
              minWidth: '52px',
              padding: '4px 10px',
              borderRadius: '999px',
              border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.35))',
              background: value ? 'var(--dsw-alias-brand-primary, #5b8cff)' : 'transparent',
              color: value ? '#fff' : 'var(--dsw-alias-label-secondary, #98a2b6)',
              font: '600 11px/1 ' + FONT,
              cursor: 'pointer',
            },
          },
          value ? '开' : '关',
        )
      }
      var bandIdx = function (edge) {
        return TIER_ORDER.indexOf(edge === 'min' ? band.min : band.max)
      }
      var bandSlider = function (edge) {
        return h('input', {
          type: 'range',
          'data-role': edge === 'min' ? 'band-min' : 'band-max',
          min: 0,
          max: TIER_ORDER.length - 1,
          step: 1,
          value: bandIdx(edge),
          onChange: function (e) {
            var tier = TIER_ORDER[Number(e.currentTarget.value)]
            var next = Object.assign({}, band)
            next[edge] = tier
            if (TIER_ORDER.indexOf(next.min) > TIER_ORDER.indexOf(next.max)) {
              if (edge === 'min') next.max = tier
              else next.min = tier
            }
            setBand(next)
            postBand({ min: next.min, max: next.max }, notifyBand)
          },
          style: { width: '180px' },
        })
      }
      var bandPreview = h(
        'div',
        {
          style: {
            position: 'relative',
            height: '10px',
            borderRadius: '999px',
            background: 'var(--dsw-alias-border-l2, rgba(127,127,127,.25))',
            overflow: 'hidden',
            width: '180px',
          },
        },
        h('div', {
          style: {
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: ((bandIdx('min') / (TIER_ORDER.length - 1)) * 100).toFixed(2) + '%',
            width: (((bandIdx('max') - bandIdx('min')) / (TIER_ORDER.length - 1)) * 100).toFixed(2) + '%',
            background: 'var(--dsw-alias-brand-primary, #5b8cff)',
            opacity: band.enabled ? 0.9 : 0.4,
          },
        }),
      )
      return h(
        'div',
        { style: { padding: '4px 0 12px', maxWidth: '620px' } },
        row('animate', '动画（辐射 / 奔跑 / 过渡）', toggle('animate', cfg.animate)),
        row('showAuto', '显示 Auto 按钮', toggle('showAuto', cfg.showAuto)),
        row(
          'bandEnabled',
          '自动区间（区间内按失败升级派档）',
          h(
            'button',
            {
              type: 'button',
              onClick: function () {
                var enabled = !band.enabled
                setBand(Object.assign({}, band, { enabled: enabled }))
                postBand({ enabled: enabled }, notifyBand)
              },
              style: {
                minWidth: '52px',
                padding: '4px 10px',
                borderRadius: '999px',
                border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.35))',
                background: band.enabled ? 'var(--dsw-alias-brand-primary, #5b8cff)' : 'transparent',
                color: band.enabled ? '#fff' : 'var(--dsw-alias-label-secondary, #98a2b6)',
                font: '600 11px/1 ' + FONT,
                cursor: 'pointer',
              },
            },
            band.enabled ? '开' : '关',
          ),
        ),
        row(
          'bandMin',
          '下限：' + band.min,
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, [bandSlider('min'), bandPreview]),
        ),
        row('bandMax', '上限：' + band.max, bandSlider('max')),
        row(
          'trackWidth',
          '轨道宽度 ' + cfg.trackWidth + 'px',
          h('input', {
            type: 'range',
            'data-role': 'track-width',
            min: 88,
            max: 220,
            step: 4,
            value: cfg.trackWidth,
            onChange: function (e) {
              writeConfig({ trackWidth: Number(e.currentTarget.value) })
            },
            style: { width: '180px' },
          }),
        ),
      )
    }

    function Dial(props) {
      var directories = props.directories
      var sessions = props.sessions
      // 宿主官方做法：directoryFor() 内部先 sessions.scope(id)，取不到就直接抛
      // 「resolved no scope」。所以这里先用同一个 sessions 服务验证候选 id，
      // 取第一个能解析出 scope 的；都不行才退回第一个字符串候选，让错误照实暴露。
      var candidates = []
      if (typeof props.injectSessionId === 'string') candidates.push(props.injectSessionId)
      if (typeof props.sessionId === 'string') candidates.push(props.sessionId)
      if (props.session && typeof props.session.id === 'string') candidates.push(props.session.id)
      function domSessionId() {
        try {
          var el = document.querySelector('[data-conversation-session]')
          var v = el && el.getAttribute('data-conversation-session')
          return typeof v === 'string' && v ? v : undefined
        } catch (e) {
          return undefined
        }
      }
      var domSid = domSessionId()
      if (domSid) candidates.push(domSid)
      var sessionId
      var idNote = ''
      for (var ci = 0; ci < candidates.length; ci += 1) {
        var cid = candidates[ci]
        try {
          if (sessions && typeof sessions.scope === 'function' && sessions.scope(cid)) {
            sessionId = cid
            break
          }
        } catch (e) {}
      }
      if (!sessionId) {
        sessionId = candidates[0]
        idNote = candidates.length ? '未解析(' + candidates.length + '候选)' : '无候选'
      }
      var bumpState = React.useState(0)
      var bump = bumpState[1]

      // 运行时探测目录服务的真实 API：不同 DSH 版本的方法名不一样，
      // 探测失败时把「服务暴露了哪些键」直接显示出来，避免盲猜。
      var probe = React.useMemo(
        function () {
          var out = { directory: undefined, why: '' }
          if (!directories) {
            out.why = '无D'
            return out
          }
          if (!sessionId) {
            out.why = '无S'
            return out
          }
          var keys = []
          try {
            keys = Object.keys(directories || {})
          } catch (e) {}
          var cands = ['directoryFor', 'forSession', 'for', 'get', 'resolve', 'directory', 'of']
          for (var i = 0; i < cands.length; i += 1) {
            var name = cands[i]
            var fn = directories[name]
            if (typeof fn !== 'function') continue
            try {
              var got = fn.call(directories, sessionId)
              if (got) {
                out.directory = got
                out.why = ''
                return out
              }
              out.why = name + '→空'
            } catch (e) {
              out.why = name + '→' + String((e && e.message) || e).slice(0, 24)
            }
          }
          if (typeof directories === 'function') {
            try {
              var viaFn = directories(sessionId)
              if (viaFn) {
                out.directory = viaFn
                out.why = ''
                return out
              }
              out.why = 'call→空'
            } catch (e) {
              out.why = 'call→' + String((e && e.message) || e).slice(0, 24)
            }
          }
          if (!out.why) out.why = 'keys:' + (keys.join(',') || '空')
          return out
        },
        [directories, sessionId, domSid, bumpState[0]],
      )
      var directory = probe.directory
      var dirError = probe.why

      React.useEffect(
        function () {
          if (directory) return
          var tries = 0
          var timer = setInterval(function () {
            tries += 1
            if (tries > 20) {
              clearInterval(timer)
              return
            }
            bump(function (x) {
              return x + 1
            })
          }, 350)
          return function () {
            clearInterval(timer)
          }
        },
        [directory],
      )
      var snap = React.useSyncExternalStore(
        React.useCallback(
          function (onChange) {
            if (!directory || !directory.store || typeof directory.store.subscribe !== 'function') {
              return function () {}
            }
            return directory.store.subscribe(onChange)
          },
          [directory],
        ),
        function () {
          return snapshotOf(directory)
        },
        function () {
          return snapshotOf(directory)
        },
      )

      var pendingState = React.useState(null)
      var pending = pendingState[0]
      var setPending = pendingState[1]
      var draggingState = React.useState(false)
      var dragging = draggingState[0]
      var setDragging = draggingState[1]
      var errState = React.useState(null)
      var err = errState[0]
      var setErr = errState[1]

      var bandState = React.useState({ enabled: false, min: 'high', max: 'max' })
      var band = bandState[0]
      var setBand = bandState[1]
      var cfgState = React.useState(readConfig())
      var cfg = cfgState[0]
      var setCfg = cfgState[1]
      React.useEffect(function () {
        function onChange() {
          setCfg(readConfig())
        }
        window.addEventListener('dsh-effort-dial:config', onChange)
        return function () {
          window.removeEventListener('dsh-effort-dial:config', onChange)
        }
      }, [])

      var rootRef = React.useRef(null)
      var innerRef = React.useRef(null)
      var slotRef = React.useRef(null)
      var thumbRef = React.useRef(null)
      var fillRef = React.useRef(null)
      var labelRef = React.useRef(null)
      var fxRef = React.useRef(null)
      var tickRefs = React.useRef([])
      var widthRef = React.useRef(0)
      var posRef = React.useRef(0)
      var velRef = React.useRef(0)
      var springRaf = React.useRef(0)
      var moveRaf = React.useRef(0)
      var fxRaf = React.useRef(0)
      var dragRef = React.useRef(null)
      var hoverRef = React.useRef(false)
      var errTimer = React.useRef(0)
      var labelTextRef = React.useRef('')
      var restingRef = React.useRef(0)
      var seededRef = React.useRef(false)
      var seededCountRef = React.useRef(-1)
      var lastTickRef = React.useRef(-1)

      function measure() {
        var el = innerRef.current
        try {
          widthRef.current = el ? el.getBoundingClientRect().width : 0
        } catch (e) {
          widthRef.current = 0
        }
      }

      React.useEffect(
        function () {
          function sync() {
            fetchBand(undefined, function (globalBand) {
              if (globalBand) {
                setBand({
                  enabled: globalBand.enabled === true,
                  min: globalBand.min || 'high',
                  max: globalBand.max || 'max',
                })
              }
            })
          }
          sync()
          window.addEventListener('dsh-effort-dial:band', sync)
          return function () {
            window.removeEventListener('dsh-effort-dial:band', sync)
          }
        },
        [sessionId],
      )

      React.useEffect(
        function () {
          if (!directory || typeof directory.load !== 'function') return
          var tries = 0
          var timer = 0
          var stopped = false
          function attempt() {
            if (stopped) return
            tries += 1
            var p
            try {
              p = directory.load()
            } catch (e) {
              p = Promise.reject(e)
            }
            Promise.resolve(p).catch(function (e) {
              if (stopped || tries >= 4) return
              timer = setTimeout(attempt, 600 * Math.pow(2, tries - 1))
            })
          }
          attempt()
          return function () {
            stopped = true
            if (timer) clearTimeout(timer)
          }
        },
        [directory],
      )

      var current = snap && snap.current ? snap.current : undefined
      var model = undefined
      if (current && snap && Array.isArray(snap.groups)) {
        for (var gi = 0; gi < snap.groups.length; gi += 1) {
          var g = snap.groups[gi]
          if (g && g.id === current.provider && Array.isArray(g.models)) {
            for (var mi = 0; mi < g.models.length; mi += 1) {
              if (g.models[mi] && g.models[mi].id === current.model) {
                model = g.models[mi]
                break
              }
            }
            break
          }
        }
      }

      var ORDER = { minimal: 1, low: 2, medium: 3, high: 4, xhigh: 5, max: 6 }
      var levels = effortsOf(model)
        .slice()
        .sort(function (a, b) {
          var ra = ORDER[a.id] === undefined ? 99 : ORDER[a.id]
          var rb = ORDER[b.id] === undefined ? 99 : ORDER[b.id]
          return ra - rb
        })
      var count = levels.length
      var autoOffered = hasAuto(model)
      var selectedId = pending !== null ? pending : current && current.reasoningEffort
      var activeIndex = -1
      for (var li = 0; li < count; li += 1) {
        if (levels[li].id === selectedId) {
          activeIndex = li
          break
        }
      }
      var isAuto = selectedId === 'auto'
      var isOff = selectedId === 'off'
      var restingFrac = activeIndex >= 0 && count > 1 ? activeIndex / (count - 1) : 0
      var bandMinIdx = Math.max(0, TIER_ORDER.indexOf(band.min))
      var bandMaxIdx = Math.max(bandMinIdx, TIER_ORDER.indexOf(band.max))
      var bandFromFrac = count > 1 ? Math.min(bandMinIdx, count - 1) / (count - 1) : 0
      var bandToFrac = count > 1 ? Math.min(bandMaxIdx, count - 1) / (count - 1) : 0
      var bandActive = band.enabled === true

      function indexToFrac(index) {
        return count > 1 ? index / (count - 1) : 0
      }

      function fracToIndex(frac) {
        if (count <= 1) return 0
        return clamp(Math.round(frac * (count - 1)), 0, count - 1)
      }

      function levelName(index) {
        var lv = levels[index]
        if (!lv) return ''
        return lv.name || lv.id
      }

      function originX(width) {
        return clamp(posRef.current * (width - GIRL_W) + GIRL_W / 2, 0, width)
      }

      function paint(frac, labelText) {
        posRef.current = frac
        var width = widthRef.current
        if (!width) {
          measure()
          width = widthRef.current
        }
        var pct = (clamp(frac, 0, 1) * 100).toFixed(3) + '%'
        if (thumbRef.current) thumbRef.current.style.left = pct
        if (fillRef.current) fillRef.current.style.width = pct
        if (rootRef.current && !dragRef.current) {
          rootRef.current.style.setProperty('--ed-heat', String(frac))
        }
        var idx = fracToIndex(frac)
        if (idx !== lastTickRef.current) {
          lastTickRef.current = idx
          for (var i = 0; i < tickRefs.current.length; i += 1) {
            var el = tickRefs.current[i]
            if (el) el.setAttribute('data-on', i <= idx ? 'true' : 'false')
          }
        }
        if (labelRef.current && typeof labelText === 'string') labelRef.current.textContent = labelText
      }

      function stopSpring() {
        if (springRaf.current) {
          cancelAnimationFrame(springRaf.current)
          springRaf.current = 0
        }
      }

      function springTo(target) {
        stopSpring()
        velRef.current = 0
        var last = 0
        function step(now) {
          if (!last) last = now
          var dt = Math.min(0.032, Math.max(0.001, (now - last) / 1000))
          last = now
          var x = posRef.current
          var dx = target - x
          velRef.current += (-SPRING_K * dx - SPRING_C * velRef.current) * dt
          var next = x + velRef.current * dt
          if (Math.abs(target - next) < 0.0009 && Math.abs(velRef.current) < 0.006) {
            paint(target)
            springRaf.current = 0
            return
          }
          paint(next)
          springRaf.current = requestAnimationFrame(step)
        }
        springRaf.current = requestAnimationFrame(step)
      }

      var labelText = bandActive
        ? 'Auto ' + band.min + '→' + band.max
        : isAuto
        ? 'Auto'
        : isOff
          ? 'Off'
          : activeIndex >= 0
            ? levelName(activeIndex)
            : typeof selectedId === 'string' && selectedId
              ? selectedId
              : levelName(0)
      labelTextRef.current = labelText
      restingRef.current = restingFrac

      // ── canvas 辐射循环：空闲 12fps，悬停/拖拽 60fps ─────────────────
      React.useEffect(
        function () {
          var reduced =
            typeof window !== 'undefined' &&
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
          var last = 0
          function draw(now) {
            var canvas = fxRef.current
            var host = innerRef.current
            if (!canvas || !host) return
            var rect = host.getBoundingClientRect()
            var w = Math.round(rect.width)
            if (!w) return
            var dpr = Math.min(2, window.devicePixelRatio || 1)
            var h = FX_H
            if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
              canvas.width = Math.max(1, Math.round(w * dpr))
              canvas.height = Math.max(1, Math.round(h * dpr))
            }
            var context = canvas.getContext('2d')
            if (!context) return
            context.setTransform(dpr, 0, 0, dpr, 0, 0)
            drawRadiation(context, w, h, now, {
              origin: originX(w),
              dragging: dragRef.current !== null,
            })
          }
          if (reduced) {
            draw(performance.now())
            return
          }
          function frame(now) {
            fxRaf.current = requestAnimationFrame(frame)
            var dragging = dragRef.current !== null
            var active = hoverRef.current || dragging
            var gap = dragging ? 1000 / 30 : active ? 1000 / 60 : 1000 / 12
            if (now - last < gap) return
            last = now
            draw(now)
          }
          fxRaf.current = requestAnimationFrame(frame)
          return function () {
            if (fxRaf.current) cancelAnimationFrame(fxRaf.current)
            fxRaf.current = 0
          }
        },
        [],
      )

      React.useEffect(function () {
        measure()
        function onResize() {
          measure()
          paint(posRef.current)
        }
        window.addEventListener('resize', onResize)
        return function () {
          window.removeEventListener('resize', onResize)
        }
      }, [])

      React.useEffect(
        function () {
          if (dragRef.current) return
          // 首次挂载 / 档数变化：内部游标必须先按状态播种，否则后续任何重绘
          // （resize、错误提示、父级重渲染）都会把滑块写回旧位置。
          if (!seededRef.current || seededCountRef.current !== count) {
            seededRef.current = true
            seededCountRef.current = count
            posRef.current = restingFrac
            paint(restingFrac, labelTextRef.current)
            return
          }
          // 正确性优先：立刻把位置写到目标值（CSS 负责过渡观感），
          // 不再依赖 rAF —— rAF 不跑时位置也必须是对的。
          paint(restingFrac, labelTextRef.current)
        },
        [restingFrac, count, selectedId],
      )

      React.useEffect(
        function () {
          return function () {
            stopSpring()
            if (moveRaf.current) cancelAnimationFrame(moveRaf.current)
            if (errTimer.current) clearTimeout(errTimer.current)
          }
        },
        [],
      )

      React.useEffect(
        function () {
          if (pending !== null && current && current.reasoningEffort === pending) setPending(null)
        },
        [pending, current],
      )

      var fail = React.useCallback(function (e) {
        setPending(null)
        var msg = e && e.message ? String(e.message) : String(e || 'unknown error')
        setErr(msg.slice(0, 160))
        if (labelRef.current) labelRef.current.textContent = labelTextRef.current
        paint(restingRef.current, labelTextRef.current)
        if (errTimer.current) clearTimeout(errTimer.current)
        errTimer.current = setTimeout(function () {
          errTimer.current = 0
          setErr(null)
        }, 6000)
      }, [])

      var leaveAuto = React.useCallback(
        function () {
          if (!band.enabled) return
          setBand(function (b) {
            return Object.assign({}, b, { enabled: false })
          })
          postBand({ enabled: false }, function () {})
        },
        [band.enabled, sessionId],
      )

      var commit = React.useCallback(
        function (id) {
          if (!directory || typeof directory.select !== 'function' || !current) {
            fail('modelDirectories.select 不可用（宿主未提供该服务）')
            return
          }
          setPending(id)
          setErr(null)
          var promise
          try {
            promise = directory.select({
              provider: current.provider,
              model: current.model,
              reasoningEffort: id,
            })
          } catch (e) {
            fail(e)
            return
          }
          if (promise && typeof promise.then === 'function') {
            promise.then(function (result) {
              // 官方契约：select() 解析为 { ok, error }，失败既不抛错也不改选中状态
              if (result && result.ok === false) {
                fail((result.error && (result.error.message || result.error.code)) || 'select 被拒绝')
                return
              }
              var now = snapshotOf(directory)
              var got = now && now.current ? now.current.reasoningEffort : undefined
              if (got !== undefined && got !== id) {
                fail('宿主未接受该档位（实际=' + String(got) + '）')
              }
            }).catch(fail)
          }
        },
        [directory, current, fail],
      )

      if (!current) {
        // 不要在数据缺失时静默消失：给一个会说话的小胶囊，便于定位卡在哪一步
        var why = !directory
          ? '无目录服务'
          : snap === undefined
            ? '快照缺失'
            : snap.status === 'loading'
              ? '加载中'
              : !snap.current
                ? '无当前选择'
                : '模型未匹配'
        // 临时诊断：把组件实际收到的 props 键名与 id 形态直接打出来
        var pkeys = []
        try { pkeys = Object.keys(props || {}).filter(function (k) { return k !== 'children' }) } catch (e) {}
        var sidShape = typeof sessionId + ':' + String(sessionId === undefined ? 'undef' : sessionId).slice(0, 10)
        var short = !directories
          ? '无D'
          : !sessionId
            ? '无S'
            : !directory
              ? 'K:' + pkeys.join(',').slice(0, 40) + '|' + String(dirError || '异常').slice(0, 18)
              : snap === undefined
                ? '快照?'
                : snap.status === 'loading'
                  ? '加载中'
                  : '无选择'
        return h(
          'div',
          {
            className: 'ed',
            'data-unavailable': 'true',
            'data-diag': why,
            title:
              '模型目录未就绪：' +
              why +
              '（sid=' +
              sidShape +
              '；props=' +
              pkeys.join(',') +
              '；' +
              (sessionId ? 'ok' : 'missing') +
              '；' +
              (idNote || 'resolved') +
              '；' +
              (dirError || 'no-error') +
              '）' +
              '（directory=' +
              (directory ? 'ok' : 'missing') +
              ', status=' +
              (snap ? snap.status : 'undefined') +
              ', groups=' +
              (snap && Array.isArray(snap.groups) ? snap.groups.length : 'n/a') +
              ', current=' +
              (snap && snap.current ? 'ok' : 'null') +
              '）',
          },
          h('span', { key: 'label', className: 'ed-label' }, short),
        )
      }

      if (count <= 1) {
        var onlyLevel = count === 1 ? levels[0] : undefined
        return h(
          'div',
          {
            className: 'ed',
            'data-unavailable': 'true',
            title:
              count === 1
                ? '当前模型只声明一个思考档（开关型），滑杆无级可调 —— 请在模型选择器里切 Off / On'
                : '当前模型没有声明思考档位（reasoningEfforts 为空或未声明），滑杆无级可调',
          },
          h(
            'span',
            { key: 'label', className: 'ed-label' },
            onlyLevel ? onlyLevel.name || onlyLevel.id : '—',
          ),
        )
      }

      function fracFromEvent(event) {
        var el = slotRef.current
        if (!el) return 0
        var rect = el.getBoundingClientRect()
        if (rect.width <= 0) return 0
        return clamp((event.clientX - rect.left) / rect.width, 0, 1)
      }

      function onPointerDown(event) {
        if (event.button !== undefined && event.button !== 0) return
        event.preventDefault()
        stopSpring()
        if (moveRaf.current) {
          cancelAnimationFrame(moveRaf.current)
          moveRaf.current = 0
        }
        var el = innerRef.current
        if (el && el.setPointerCapture && event.pointerId !== undefined) {
          try {
            el.setPointerCapture(event.pointerId)
          } catch (e) {}
        }
        measure()
        var frac = fracFromEvent(event)
        dragRef.current = { frac: frac }
        setDragging(true)
        paint(frac, levelName(fracToIndex(frac)))
      }

      function onPointerMove(event) {
        if (!dragRef.current) return
        event.preventDefault()
        var f = fracFromEvent(event)
        dragRef.current.frac = f
        // 同步落位：pointermove 本身就是按帧派发的，再加 rAF 节流只会造成滞后
        paint(f, levelName(fracToIndex(f)))
      }

      function finishDrag(event) {
        if (!dragRef.current) return
        var frac = event ? fracFromEvent(event) : dragRef.current.frac
        dragRef.current = null
        setDragging(false)
        var index = fracToIndex(frac)
        paint(indexToFrac(index), levelName(index))
        leaveAuto()
        var target = levels[index]
        if (target) commit(target.id)
      }

      function onKeyDown(event) {
        var base = activeIndex >= 0 ? activeIndex : 0
        var next = null
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = clamp(base + 1, 0, count - 1)
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = clamp(base - 1, 0, count - 1)
        else if (event.key === 'Home') next = 0
        else if (event.key === 'End') next = count - 1
        else if (event.key === 'PageUp') next = clamp(base + 2, 0, count - 1)
        else if (event.key === 'PageDown') next = clamp(base - 2, 0, count - 1)
        else if ((event.key === 'a' || event.key === 'A') && autoOffered) {
          event.preventDefault()
          commit('auto')
          return
        }
        if (next === null) return
        event.preventDefault()
        leaveAuto()
        commit(levels[next].id)
      }

      var children = []
      // 区间模式不再依赖模型是否广告 auto（我们不发 auto，只发区间内的具体档）
      if (cfg.showAuto) {
        children.push(
          h(
            'button',
            {
              key: 'auto',
              type: 'button',
              className: 'ed-auto',
              'aria-pressed': bandActive ? 'true' : 'false',
              title: bandActive
                ? '自动区间开：' + band.min + ' → ' + band.max + '（点击关闭；区间在 设置 → 推理强度滑杆 调整）'
                : '开启自动区间：' + band.min + ' → ' + band.max + '（区间在设置页调整）',
              onClick: function (event) {
                event.preventDefault()
                event.stopPropagation()
                var enabled = !bandActive
                setBand(Object.assign({}, band, { enabled: enabled }))
                postBand({ enabled: enabled }, function () {})
              },
            },
            'A',
          ),
        )
      }
      children.push(h('span', { key: 'label', className: 'ed-label', ref: labelRef }, labelText))

      var ticks = []
      for (var ti = 0; ti < count; ti += 1) {
        var ratio = count > 1 ? ti / (count - 1) : 0
        ticks.push(
          h('span', {
            key: 'tick' + ti,
            className: 'ed-tick',
            ref: (function (idx) {
              return function (el) {
                tickRefs.current[idx] = el
              }
            })(ti),
            'data-on': activeIndex >= ti ? 'true' : 'false',
            style: { left: (count > 1 ? (ti / (count - 1)) * 100 : 50) + '%' },
          }),
        )
      }

      children.push(
        h(
          'div',
          {
            key: 'track',
            className: 'ed-track',
            tabIndex: 0,
            role: 'slider',
            'aria-label': '推理强度',
            'aria-valuemin': 1,
            'aria-valuemax': count,
            'aria-valuenow': activeIndex >= 0 ? activeIndex + 1 : isAuto ? count : undefined,
            'aria-valuetext': labelText,
            onKeyDown: onKeyDown,
            onPointerDown: onPointerDown,
            onPointerMove: onPointerMove,
            onPointerUp: finishDrag,
            onPointerCancel: finishDrag,
            onDoubleClick: function (event) {
              event.preventDefault()
              if (autoOffered) commit('auto')
            },
          },
          h('div', { className: 'ed-inner', ref: innerRef }, [
            h('div', { key: 'rail', className: 'ed-rail' }),
            h('canvas', { key: 'fx', className: 'ed-fx', ref: fxRef }),
            h('div', { key: 'slot', className: 'ed-slot', ref: slotRef }, [
              // 区间高亮：直接由 React 写（拖拽时也只在区间变化时更新）
              bandActive
                ? h('div', {
                    key: 'band',
                    className: 'ed-band',
                    style: {
                      left: bandFromFrac * 100 + '%',
                      width: Math.max(0, bandToFrac - bandFromFrac) * 100 + '%',
                    },
                  })
                : null,
              // 位置/宽度只由 paint() 写：React 再写会与拖拽互相覆盖
              h('div', { key: 'fill', className: 'ed-fill', ref: fillRef }),
              ticks,
              h(
                'span',
                { key: 'thumb', className: 'ed-thumb', ref: thumbRef },
                h('span', { key: 'flare', className: 'ed-flare' }),
                h('span', { key: 'girl', className: 'ed-girl' }),
              ),
            ]),
          ]),
        ),
      )

      return h(
        'div',
        {
          className: 'ed',
          ref: rootRef,
          'data-auto': isAuto ? 'true' : 'false',
          'data-band': bandActive ? 'true' : 'false',
          'data-dragging': dragging ? 'true' : 'false',
          'data-busy': pending !== null ? 'true' : 'false',
          'data-error': err ? 'true' : 'false',
          'data-animate': cfg.animate ? 'true' : 'false',
          style: { '--ed-track-w': cfg.trackWidth + 'px' },
          'data-top': !isAuto && !isOff && activeIndex === count - 1 ? 'true' : 'false',
          title: err
            ? '写入档位失败：' + err
            : '推理强度：拖动鲸鱼娘；←/→ 微调；PageUp/PageDown 跳两档；Home/End 到两端；A 交给调度器；双击回 Auto。共 ' +
              count +
              ' 档。',
          onMouseEnter: function () {
            hoverRef.current = true
          },
          onMouseLeave: function () {
            hoverRef.current = false
          },
        },
        children,
      )
    }

    var inject = ['slots']

    function apply(ctx) {
      ensureStyles()
      ctx.slots.inject('settings.section', function () {
        return ctx.slots.register(
          {
            name: 'settings.section',
            id: 'effort-dial',
            order: 57,
            label: function () {
              return '推理强度滑杆'
            },
          },
          SettingsPage,
        )
      })
      ctx.inject(['modelDirectories', 'sessions'], function (scope) {
        var directories = scope.modelDirectories
        var sessions = scope.sessions
        if (!directories) return
        ctx.slots.inject('conversation.input.right', function () {
          return ctx.slots.register(
            {
              name: 'conversation.input.right',
              id: 'effort-dial',
              order: 25,
              inject: function (sessionId) {
                // 这个插槽的 inject 不一定收到 sessionId；真正可靠的是组件标准 props.sessionId，
                // 所以把服务本身传下去，让 Dial 自己解析目录。
                return {
                  directories: directories,
                  sessions: sessions,
                  injectSessionId: sessionId,
                }
              },
            },
            Dial,
          )
        })
      })
    }

    exports.__testing = { effortsOf: effortsOf, hasAuto: hasAuto, drawRadiation: drawRadiation, isDarkTheme: isDarkTheme, css: CSS }

    exports.name = 'dsh-effort-dial'
    exports.inject = inject
    exports.apply = apply
    return module.exports
  },
})
