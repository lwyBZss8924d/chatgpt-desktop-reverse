#!/usr/bin/env node
import { createServer } from 'vite';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { pageMeta } from './research/content.mjs';
import { documentHtml } from './lib/document.mjs';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (!existsSync(join(ROOT, '.cache/atlas-pages/index.json')))
  execFileSync(process.execPath, [join(ROOT, 'scripts/build-atlas.mjs')], {
    cwd: ROOT,
    stdio: 'inherit',
  });
const index = process.argv.indexOf('--port');
const port = index >= 0 ? Number(process.argv[index + 1]) : 8000;
const server = await createServer({
  root: ROOT,
  configFile: false,
  publicDir: join(ROOT, 'site'),
  appType: 'custom',
  server: { host: '127.0.0.1', port },
  plugins: [
    {
      name: 'atlas-pages',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url, 'http://localhost');
          const id =
            url.pathname === '/' ? 'index' : url.pathname.replace(/^\//, '').replace(/\.html$/, '');
          const page = pageMeta.find((p) => p.id === id);
          if (!page) return next();
          try {
            const data = JSON.parse(
              await readFile(join(ROOT, `.cache/atlas-pages/${id}.json`), 'utf8')
            );
            const { render } = await server.ssrLoadModule('/web/entry-server.tsx');
            const html = documentHtml(page, render(data), data, [], '/web/entry-client.tsx', true);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(html);
          } catch (e) {
            server.ssrFixStacktrace(e);
            next(e);
          }
        });
      },
    },
  ],
});
await server.listen();
server.printUrls();
