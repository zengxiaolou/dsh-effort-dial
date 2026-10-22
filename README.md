# dsh-effort-dial

DeepSeek Harness（DSH）插件：输入框里的「推理强度滑杆」。

拖动鲸鱼娘选择思考档位，松手吸附到停位并写入当前会话；支持「自动区间」（在选定区间内按失败升级派档）、
可选「模型路由」（按任务类型挑 provider/model）。档位数不写死，跟着模型声明的 `reasoningEfforts` 走。

## 功能

- **档位自适应**：读当前模型声明的思考档（过滤 `off`/`auto`），声明几档就画几根刻度，顺序固定 `minimal → max`。
- **鲸鱼娘滑块**：8 帧奔跑立绘（悬停/拖拽时跑），松手吸附；位置与刻度由同一套百分比坐标驱动。
- **三级特效**：
  - `medium` 及以下：只有轨道底纹与进度；
  - `xhigh`：2 段波形 + 6 条粒子 + 弱光晕；
  - `max`：3 段波形 + 峰尖 + 像素噪点 + 14 条粒子 + 十字光带 + 呼吸脉冲。
- **自动区间**：`A` 键开关；区间内无错误停在**下限**，1 次工具错误升一档，2 次及以上再升一档，封顶上限。
  胶囊显示 `medium→max · xhigh`（区间 + 宿主上一轮实际跑的档位）。
- **模型路由**：`routine` / `deep` 两个桶各自绑定 `provider/model` 与区间；按用户消息里的 cue 分类，
  一次分类同时决定「用哪个模型」与「档位区间」；目标模型没声明的档位会就近收敛。
- **设置页**（设置 → 推理强度滑杆）：动画开关、A 按钮显隐、轨道宽度、自动区间上下限与预览、模型路由。
- **失败可见**：写入被宿主拒绝时胶囊红框并显示原因，不再静默回弹。

## 交互

| 操作 | 行为 |
|---|---|
| 拖动轨道 | 跟手（拖拽时无过渡、同步落位），松手吸附并提交 |
| `←` / `→`（`↑` / `↓`） | 微调一档 |
| `PageUp` / `PageDown` | 跳两档 |
| `Home` / `End` | 到最低 / 最高档 |
| `A` 键 / 点 A / 点标签 | 切换自动区间（区间在设置页调） |
| 双击轨道 | 回到自动区间 |

## 安装

```bash
# 本地目录
dsh plugin --profile <profile> add /path/to/dsh-effort-dial
# 或本仓库内（DSH 宿主）
# plugin_manager install_bundle file:/path/to/dsh-effort-dial
```

配置写入 profile 的 `.effort-dial/state.json`（区间、路由、每会话最近一次派档）。

## 模型前提

宿主只接受 `off / minimal / low / medium / high / xhigh / max` 七个档位**键**；写别的键（例如把网关的
`ultra` 当键）会让整条模型配置校验失败。`ultra` 这类只存在于网关线缆层的值，只能作为「值」绑到合法键上。

## 测试

```bash
node test/band.test.mjs      # 策略与提取的纯函数单测
./test/run.sh                # 真实 React + DOM 渲染与交互断言（headless Chrome 截图）
```

`test/dial.test.html` 覆盖：渲染、拖动提交、被拒回弹、父级重渲染下仍跟手、区间编辑与同步、
实际档位显示与定位、三级特效的像素能量比较。

## 结构

| 文件 | 作用 |
|---|---|
| `lib/client.js` | 浏览器半边：胶囊、滑块、特效、设置页 |
| `lib/index.js` | 宿主半边：区间状态、`agent/request` 派档、路由、`/effort-dial/state` 与 `/effort-dial/band` |
| `lib/policy.js` | 纯函数：任务分类、区间派档、模型能力收敛、路由解析 |
| `test/` | 单测与界面断言 |

## License

MIT
