# 归档运行时证据

> 从已提交的研究模型生成。使用 `npm run docs:build` 更新，使用 `npm run docs:check` 校验。

当前站点从 `shots/` 镜像 42 张 JPG：19 张应用画面与 23 张设置画面。`shots/recapture-results.json` 包含 23 条设置结果。图片完整性与交互成功属于不同检查。

| 路径 | 用途 |
| --- | --- |
| `shots/`, `shots/settings/` | 工作台使用的归档画面 |
| `recapture.mjs` | 历史变化检测截图驱动 |
| `sweep*.mjs` | 保留用于方法溯源的早期截图驱动 |
| `lib/bridge.mjs` | macOS 无障碍截图桥客户端 |
| `.tmp/`, `.derived/` | 忽略的临时输出 |

新的截图运行需要新窗口观测、有效的 macOS 权限与显式版本化归档。已保存的 ref／坐标不能作为实时地址回放。当前站点构建、CI 与部署不调用这些驱动，也不修改已安装应用。

[截图方法与修正](../../docs/codex-desktop-runtime-evidence_Zh.md) · [完整 GUI 证据](../../docs/codex-desktop-gui-map-evidence_Zh.md)
