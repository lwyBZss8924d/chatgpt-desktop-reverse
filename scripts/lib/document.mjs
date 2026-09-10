const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
export function documentHtml(page, markup, data, css, script, development = false) {
  const json = JSON.stringify(data)
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
  return `<!doctype html>
<html lang="en" data-locale="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${escape(page.label.en)} — Codex(ChatGPT) Desktop App DeepWiki</title><meta name="description" content="${escape(page.description.en)}"><link rel="icon" href="favicon.svg" type="image/svg+xml">
<script>(()=>{try{const l=localStorage.getItem('atlas-locale');document.documentElement.dataset.locale=l==='zh'||l==='en'?l:((navigator.language||'').startsWith('zh')?'zh':'en');const t=localStorage.getItem('atlas-theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t;}catch{}document.documentElement.lang=document.documentElement.dataset.locale==='zh'?'zh-Hans':'en';})();</script>
${css.map((href) => `<link rel="stylesheet" href="${escape(href)}">`).join('\n')}</head><body><div id="root">${markup}</div><script id="atlas-data" type="application/json">${json}</script>${development ? '<script type="module" src="/@vite/client"></script>' : ''}<script type="module" src="${escape(script)}"></script></body></html>`;
}
