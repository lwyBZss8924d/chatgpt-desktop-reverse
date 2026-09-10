# Codex Desktop — GUI 截图证据

> 从已提交的研究模型生成。使用 `npm run docs:build` 更新，使用 `npm run docs:check` 校验。

> 公开版本：图片为带隐私马赛克的真实截图，原图与历史研究保留在本地归档。

App 归档：**26.903.61454**。OSS 参考：[`ddea03ad049142943bdbf13e937b1d67e8c1ba0c`](https://github.com/openai/codex/tree/ddea03ad049142943bdbf13e937b1d67e8c1ba0c)。应用二进制与该 OSS 提交的精确等价关系仍为**未验证**。

本目录使用当前工作台提供的 42 个 JPG 文件。早期 PNG 集保留为历史证据，不替代当前画面。

现有 `recapture-results.json` 包含 23 条设置结果。其余 19 张图片保留为归档画面，在该回执中没有匹配条目；不会从文件名补造缺失回执。

## navigation

| 截图 | 进入路径 | 作用域 | 回执 |
| --- | --- | --- | --- |
| [新聊天](../evidence/runtime/shots/01-sidebar-home.jpg) | 侧栏 → 新聊天 | 应用导航 | 归档画面 |
| [定时任务](../evidence/runtime/shots/02-scheduled.jpg) | 侧栏 → 定时任务 | 应用导航 | 归档画面 |
| [拉取请求](../evidence/runtime/shots/03-pull-requests.jpg) | 侧栏 → 拉取请求 | 应用导航 | 归档画面 |
| [插件](../evidence/runtime/shots/04-plugins.jpg) | 侧栏 → 插件 | 应用导航 | 归档画面 |
| [安全](../evidence/runtime/shots/05-security.jpg) | 侧栏 → 安全 | 应用导航 | 归档画面 |
| [探索](../evidence/runtime/shots/06-explore.jpg) | 侧栏 → 探索 | 应用导航 | 归档画面 |

该组的能力关联：

- **新聊天** → [`thread-lifecycle`](../site/three-way.html#cap-thread-lifecycle)
- **定时任务** → [`automation`](../site/three-way.html#cap-automation)
- **拉取请求** → [`cloud-tasks`](../site/three-way.html#cap-cloud-tasks)
- **插件** → [`extensions`](../site/three-way.html#cap-extensions)
- **安全** → [`cloud-tasks`](../site/three-way.html#cap-cloud-tasks)
- **探索** → [`agents`](../site/three-way.html#cap-agents)

## palette

| 截图 | 进入路径 | 作用域 | 回执 |
| --- | --- | --- | --- |
| [命令面板](../evidence/runtime/shots/07-command-palette.jpg) | ⌘K | 应用导航 | 归档画面 |
| [查找会话](../evidence/runtime/shots/08-palette-chats.jpg) | ⌘K → 会话 | 应用导航 | 归档画面 |
| [查找面板](../evidence/runtime/shots/09-palette-panels.jpg) | ⌘K → 面板 | 应用导航 | 归档画面 |
| [查找设置](../evidence/runtime/shots/10-palette-settings.jpg) | ⌘K → 设置 | 应用导航 | 归档画面 |

该组的能力关联：

- **命令面板** → [`shell-ui`](../site/three-way.html#cap-shell-ui)
- **查找会话** → [`thread-lifecycle`](../site/three-way.html#cap-thread-lifecycle)
- **查找面板** → [`shell-ui`](../site/three-way.html#cap-shell-ui)
- **查找设置** → [`config`](../site/three-way.html#cap-config)

## overlay

| 截图 | 进入路径 | 作用域 | 回执 |
| --- | --- | --- | --- |
| [快速聊天](../evidence/runtime/shots/11-quick-chat.jpg) | ⌥⌘N | 独立桌面窗口 | 归档画面 |

该组的能力关联：

- **快速聊天** → [`shell-ui`](../site/three-way.html#cap-shell-ui), [`thread-lifecycle`](../site/three-way.html#cap-thread-lifecycle)

## workspace

| 截图 | 进入路径 | 作用域 | 回执 |
| --- | --- | --- | --- |
| [活动会话](../evidence/runtime/shots/19-thread-open.jpg) | 打开已有会话 | 需要活动会话 | 归档画面 |
| [审阅面板](../evidence/runtime/shots/20-panel-review.jpg) | 活动会话 → ⌃⇧G | 需要活动会话 | 归档画面 |
| [终端面板](../evidence/runtime/shots/21-panel-terminal.jpg) | 活动会话 → ⌃` | 需要活动会话 | 归档画面 |
| [浏览器面板](../evidence/runtime/shots/22-panel-browser.jpg) | 活动会话 → ⌘T | 需要活动会话 | 归档画面 |
| [文件面板](../evidence/runtime/shots/23-panel-files.jpg) | 活动会话 → ⌘P | 需要活动会话 | 归档画面 |
| [侧边聊天](../evidence/runtime/shots/24-panel-sidechat.jpg) | 活动会话 → 侧边聊天 | 需要活动会话 | 归档画面 |

该组的能力关联：

- **活动会话** → [`thread-lifecycle`](../site/three-way.html#cap-thread-lifecycle)
- **审阅面板** → [`approval`](../site/three-way.html#cap-approval)
- **终端面板** → [`exec`](../site/three-way.html#cap-exec)
- **浏览器面板** → [`browser`](../site/three-way.html#cap-browser)
- **文件面板** → [`fs`](../site/three-way.html#cap-fs)
- **侧边聊天** → [`thread-lifecycle`](../site/three-way.html#cap-thread-lifecycle)

## settings

| 截图 | 进入路径 | 作用域 | 回执 |
| --- | --- | --- | --- |
| [设置总览](../evidence/runtime/shots/25-settings-open.jpg) | 打开设置 | 应用导航 | 归档画面 |
| [设置搜索](../evidence/runtime/shots/26-settings-search.jpg) | 设置 → 搜索 | 应用导航 | 归档画面 |
| [通用](../evidence/runtime/shots/settings/01-general.jpg) | 设置 → 通用 | 应用导航 | 匹配结果 |
| [导入](../evidence/runtime/shots/settings/02-import.jpg) | 设置 → 导入 | 应用导航 | 匹配结果 |
| [个人资料](../evidence/runtime/shots/settings/03-profile.jpg) | 设置 → 个人资料 | 应用导航 | 匹配结果 |
| [外观](../evidence/runtime/shots/settings/04-appearance.jpg) | 设置 → 外观 | 应用导航 | 匹配结果 |
| [语音](../evidence/runtime/shots/settings/05-voice.jpg) | 设置 → 语音 | 应用导航 | 匹配结果 |
| [配置](../evidence/runtime/shots/settings/06-configuration.jpg) | 设置 → 配置 | 应用导航 | 匹配结果 |
| [个性化](../evidence/runtime/shots/settings/07-personalization.jpg) | 设置 → 个性化 | 应用导航 | 匹配结果 |
| [宠物](../evidence/runtime/shots/settings/08-pets.jpg) | 设置 → 宠物 | 应用导航 | 匹配结果 |
| [键盘快捷键](../evidence/runtime/shots/settings/09-keyboard-shortcuts.jpg) | 设置 → 键盘快捷键 | 应用导航 | 匹配结果 |
| [用量与计费](../evidence/runtime/shots/settings/10-usage-billing.jpg) | 设置 → 用量与计费 | 应用导航 | 匹配结果 |
| [分析](../evidence/runtime/shots/settings/11-analytics.jpg) | 设置 → 分析 | 应用导航 | 匹配结果 |
| [账号](../evidence/runtime/shots/settings/12-account.jpg) | 设置 → 账号 | 应用导航 | 匹配结果 |
| [电脑使用](../evidence/runtime/shots/settings/13-computer-use.jpg) | 设置 → 电脑使用 | 应用导航 | 匹配结果 |
| [电脑历史](../evidence/runtime/shots/settings/14-computer-history.jpg) | 设置 → 电脑历史 | 应用导航 | 匹配结果 |
| [应用快照](../evidence/runtime/shots/settings/15-appshots.jpg) | 设置 → 应用快照 | 应用导航 | 匹配结果 |
| [插件](../evidence/runtime/shots/settings/16-plugins.jpg) | 设置 → 插件 | 应用导航 | 匹配结果 |
| [浏览器](../evidence/runtime/shots/settings/17-browser.jpg) | 设置 → 浏览器 | 应用导航 | 匹配结果 |
| [钩子](../evidence/runtime/shots/settings/18-hooks.jpg) | 设置 → 钩子 | 应用导航 | 匹配结果 |
| [连接](../evidence/runtime/shots/settings/19-connections.jpg) | 设置 → 连接 | 应用导航 | 匹配结果 |
| [Git](../evidence/runtime/shots/settings/20-git.jpg) | 设置 → Git | 应用导航 | 匹配结果 |
| [环境](../evidence/runtime/shots/settings/21-environments.jpg) | 设置 → 环境 | 应用导航 | 匹配结果 |
| [工作树](../evidence/runtime/shots/settings/22-worktrees.jpg) | 设置 → 工作树 | 应用导航 | 匹配结果 |
| [已归档聊天](../evidence/runtime/shots/settings/23-archived-chats.jpg) | 设置 → 已归档聊天 | 应用导航 | 匹配结果 |

该组的能力关联：

- **设置总览** → [`config`](../site/three-way.html#cap-config), [`account`](../site/three-way.html#cap-account)
- **设置搜索** → [`config`](../site/three-way.html#cap-config)
- **通用** → [`config`](../site/three-way.html#cap-config)
- **导入** → [`config`](../site/three-way.html#cap-config)
- **个人资料** → [`account`](../site/three-way.html#cap-account)
- **外观** → [`shell-ui`](../site/three-way.html#cap-shell-ui)
- **语音** → [`thread-lifecycle`](../site/three-way.html#cap-thread-lifecycle)
- **配置** → [`config`](../site/three-way.html#cap-config)
- **个性化** → [`memory`](../site/three-way.html#cap-memory)
- **宠物** → [`growth`](../site/three-way.html#cap-growth)
- **键盘快捷键** → [`shell-ui`](../site/three-way.html#cap-shell-ui)
- **用量与计费** → [`account`](../site/three-way.html#cap-account)
- **分析** → [`telemetry`](../site/three-way.html#cap-telemetry)
- **账号** → [`account`](../site/three-way.html#cap-account)
- **电脑使用** → [`config`](../site/three-way.html#cap-config)
- **电脑历史** → [`config`](../site/three-way.html#cap-config)
- **应用快照** → [`config`](../site/three-way.html#cap-config)
- **插件** → [`extensions`](../site/three-way.html#cap-extensions)
- **浏览器** → [`browser`](../site/three-way.html#cap-browser)
- **钩子** → [`extensions`](../site/three-way.html#cap-extensions)
- **连接** → [`extensions`](../site/three-way.html#cap-extensions)
- **Git** → [`config`](../site/three-way.html#cap-config)
- **环境** → [`cloud-tasks`](../site/three-way.html#cap-cloud-tasks)
- **工作树** → [`config`](../site/three-way.html#cap-config)
- **已归档聊天** → [`thread-lifecycle`](../site/three-way.html#cap-thread-lifecycle)

## 标注

会话工作区图片具有经过人工查看的归一化区域标注，覆盖导航、会话区域和 Review。标注定位可见区域并链接分析记录，不回放实时应用，也不声明一对一实现映射。

## 已知限制

定时任务、拉取请求、安全与探索已有截图，但未进行内部端到端走查。终端与浏览器界面未用于执行命令或加载 URL。侧聊发送未被驱动。截图与窗口令牌仍是独立记录。

[截图方法](codex-desktop-runtime-evidence_Zh.md) · [DeepWiki](../site/gui-map.html)
