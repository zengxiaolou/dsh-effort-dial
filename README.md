# dsh-effort-dial

输入框里的「推理强度滑动变阻器」——一个纯浏览器半边的 DSH 插件。

拖动滑块选择思考档位，松手吸附到最近的停位并通过官方 `modelDirectories` 服务写入当前会话；
它不拥有任何状态，读的写的都是官方那份会话选择，所以和官方模型选择器、Auto 调度插件互不打架。

## 界面

- **胶囊**：左侧 `A`（有 Auto 时出现，点击把档位交回调度器）、当前档位名、右侧五档轨道。
- **轨道**：每一档一根小竖线（模型声明几档就是几根，当前 7 档）；已越过的停位高亮，填充渐变，滑块光晕随档位变强。
- **Auto 态**：轨道变虚线、滑块收成空心圈 = 当前手没接管。
- 深浅色跟随宿主主题 token（`--dsw-alias-*` + `html[data-ds-dark-theme]`）。

## 交互

| 操作 | 行为 |
|---|---|
| 在轨道上按下并拖动 | 滑块跟手（拖拽中不吸附、不加 CSS 过渡），松手用弹簧吸到最近档并提交 |
| `←` / `→`（或 `↑` / `↓`） | 微调一档，立即提交 |
| `PageUp` / `PageDown` | 一次跳两档 |
| `Home` / `End` | 跳到最低 / 最高档 |
| `A` 键、点 `A`、双击轨道 | 交回 Auto（由调度器按任务派档） |
| 悬停 / 拖拽 | 上方浮出「档位名 n/总数」浮标 |

## 档位来源

停位不是写死的：插件读当前模型在模型目录里声明的 `reasoningEfforts`，过滤掉 `off` / `auto` 后全部列出。
所以模型声明 5 档就是 5 个停位，声明 3 档就是 3 个。要改档数改模型配置，不用改这个插件。

## 安装

```sh
# 本地目录
dsh plugin --profile <profile> add /path/to/dsh-effort-dial
# 或在 DSH 里用 plugin_manager install_bundle file:/path/to/dsh-effort-dial
```

宿主半边是空 `apply()`（只为让入口可装载），所有逻辑在 `lib/client.js`。

## 已知限制

- 只写 reasoning effort，不切换模型/供应商——那是模型选择器的事。
- 依赖官方 `modelDirectories` 客户端服务；服务缺失时静默不渲染（fail-open，不影响输入框其他控件）。
- `conversation.input.right` 是横向空间紧张的位置；若与其它按钮挤在一起，调整 `order` 或换到 `conversation.input.left`。
