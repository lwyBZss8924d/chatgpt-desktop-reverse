# 部署与 CI/CD

> 从已提交的研究模型生成。使用 `npm run docs:build` 更新，使用 `npm run docs:check` 校验。

| 设置 | 值 |
| --- | --- |
| GitHub | https://github.com/lwyBZss8924d/chatgpt-desktop-reverse |
| Vercel scope | `<VERCEL_SCOPE>` |
| 项目 | codex-desktop-deepwiki |
| 生产 URL | https://codex-desktop-deepwiki.vercel.app |
| 生产分支 | main |
| 安装 | `npm ci --ignore-scripts` |
| 构建 | `npm run ci` |
| 输出 | `site/` |
| Node.js | 24 |

## 交付流程

将变更推送到功能分支并创建面向 main 的 PR。GitHub CI 校验类型、研究输入、静态构建、文档链接和浏览器行为，Vercel Git 集成生成分支预览。两项检查通过后合并，main 提交会自动触发上述地址的生产部署。部署构建先生成页面再验证文档链接，因此不依赖预先生成的 site 目录。

本地研究归档保留原始截图和历史研究提交，公开仓库存放当前源码、规范化证据和带隐私马赛克的真实截图。两份 Git 历史分别维护：公开代码通过自身克隆与 PR 更新。更新研究快照时，在本地研究工作区运行下方导出命令，走查发布副本的差异，构建与测试后再推送。不要将归档历史推送到公开远端。

```bash
# Run only when exporting a new snapshot from the local research archive.
node scripts/export-public.mjs --out /path/to/publication-checkout
```

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
