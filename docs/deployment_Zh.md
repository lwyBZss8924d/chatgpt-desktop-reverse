# 部署与 CI/CD

> 从已提交的研究模型生成。使用 `npm run docs:build` 更新，使用 `npm run docs:check` 校验。

| 设置 | 值 |
| --- | --- |
| GitHub | https://github.com/lwyBZss8924d/chatgpt-desktop-reverse |
| Vercel scope | `<VERCEL_SCOPE>` |
| 项目 | codex-desktop-deepwiki |
| 生产 URL | 尚未部署 |
| 生产分支 | main |
| 安装 | `npm ci --ignore-scripts` |
| 构建 | `npm run ci` |
| 输出 | `site/` |
| Node.js | 24 |

## 交付流程

首次本地打包以 commit 和机器可读 Git PoUW 注记归档。用已走查提交初始化指定 GitHub 远端，再通过 PR 交付部署集成变更。CI 校验类型、研究输入、文档、静态构建及浏览器行为。Vercel Git 集成提供分支预览与 main 生产交付。

产物保留 `.html` 路由、相对本地资源、子路径托管与直接刷新能力，没有应用后端或必需的运行时密钥。Vercel 项目关联与 Git 连接属于部署配置，不改变归档研究快照。

## 部署前核对目标

```bash
vercel project inspect --non-interactive
vercel --help
```

从仓库根目录运行并核对 owner／project。缺少关联时，应显式初始化预期项目，不替换为其他已有项目。本地 `.vercel/` 目录不提交。

## 检查与发布证据

工作流将浏览器验证结果与静态站点保存为 CI 产物。发布收尾在 PoUW 中记录精确 Git 提交、CI 结果、Vercel 部署与最终 URL；不把排队中构建或失败部署描述为成功发布。

参考实现： [codex-plugins-market-audit](https://github.com/lwyBZss8924d/codex-plugins-market-data) · [已发布报告](https://codex-chatgpt-plugins-index.vercel.app/report.html)
