# 静态研究证据

> 从已提交的研究模型生成。使用 `npm run docs:build` 更新，使用 `npm run docs:check` 校验。

> 公开版本：图片为带隐私马赛克的真实截图，原图与历史研究保留在本地归档。

App 归档：**26.903.61454**。OSS 参考：[`ddea03ad049142943bdbf13e937b1d67e8c1ba0c`](https://github.com/openai/codex/tree/ddea03ad049142943bdbf13e937b1d67e8c1ba0c)。应用二进制与该 OSS 提交的精确等价关系仍为**未验证**。

| 产物 | 作用 |
| --- | --- |
| `scan-model.json` | 原始命令／资产／窗口统计 |
| `rust-core-model.json` | 原始 OSS 协议扫描 |
| `three-way-model.json` | 原始接口与能力分组 |
| `atlas-model.json` | 当前统一证据、接口、导入、洞察与 GUI 关联 |
| `licenses/` | 所引用 OSS 源码的许可 |
| `legacy-shots/`, `legacy-screenshots/` | 历史截图，不作为当前有回执的替代品 |
| `ax-outlines/` | 历史无障碍观测，ref 不是实时地址 |

协议声明、包内字面量、静态调用点、界面截图和分析映射是独立的证据类型。字面量或调用表达式不证明执行；截图证明界面出现，不证明完整工作流；领域关联不自动构成依赖。

仅针对匹配的归档解包与固定 Git 提交，使用 `npm run research` 刷新统一模型。普通站点构建读取已提交产物。原始扫描保留 `presentInApp`／`unused` 等历史字段名，当前 UI 将其解读为字面量存在证据，不作为运行时使用证明。

[主 README](../../README_Zh.md) · [运行时证据](../runtime/README_Zh.md)
