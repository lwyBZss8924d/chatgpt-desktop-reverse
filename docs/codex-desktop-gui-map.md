# Codex Desktop — structural GUI map

> Generated from the committed research model. Update with `npm run docs:build`; verify with `npm run docs:check`.

App archive: **26.903.61454**. OSS reference: [`ddea03ad049142943bdbf13e937b1d67e8c1ba0c`](https://github.com/openai/codex/tree/ddea03ad049142943bdbf13e937b1d67e8c1ba0c). The app binary's exact equivalence to that OSS revision is **unverified**.

Protocol declarations, bundle literals, static call sites, captured UI and analytical mappings are independent evidence types. A literal or call expression does not prove execution. A screenshot proves appearance, not a complete workflow. Domain associations do not automatically establish dependencies.

## Physical package boundaries

| Zone | Files | Bytes | Parsed JS |
| --- | --- | --- | --- |
| main | 20 | 7.93 MB | 20 |
| locales | 64 | 0.90 MB | 0 |
| dependencies | 870 | 13.89 MB | 251 |
| package | 1 | 0.01 MB | 0 |
| renderer | 8012 | 289.58 MB | 6991 |

## Structural module candidates

These groups are filename-based discovery routes. A module name is not proof of a route, DOM selector, live window or enabled feature. Open the file explorer to inspect imports and excerpts.

### Windows / shell

20 matching files. Representative paths:

- [`webview/assets/app-window-GKQjJvw0-c82216aa02f1.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fapp-window-GKQjJvw0-c82216aa02f1.js)
- [`webview/assets/app-window-GKQjJvw0-e294566510ca.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fapp-window-GKQjJvw0-e294566510ca.js)
- [`webview/assets/app-window-mac-B9s_qrAv-540f3e370b8a.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fapp-window-mac-B9s_qrAv-540f3e370b8a.js)
- [`webview/assets/app-window-mac-B9s_qrAv-cf4601d14fe9.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fapp-window-mac-B9s_qrAv-cf4601d14fe9.js)
- [`webview/assets/artifact-source-bootstrap-38a15127e17f.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fartifact-source-bootstrap-38a15127e17f.js)
- [`webview/assets/artifact-source-bootstrap-cc781733d401.css`](../site/bundle.html#mod%3Awebview%2Fassets%2Fartifact-source-bootstrap-cc781733d401.css)
- [`webview/assets/debug-window-page-df382790b7e7.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fdebug-window-page-df382790b7e7.js)
- [`webview/assets/hotkey-window-detail-layout-33c54df512e7.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fhotkey-window-detail-layout-33c54df512e7.js)
- [`webview/assets/hotkey-window-home-page-aa85d7cc4847.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fhotkey-window-home-page-aa85d7cc4847.js)
- [`webview/assets/hotkey-window-home-page-e938f981009c.css`](../site/bundle.html#mod%3Awebview%2Fassets%2Fhotkey-window-home-page-e938f981009c.css)
- [`webview/assets/hotkey-window-new-thread-page-a6ee4424a405.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fhotkey-window-new-thread-page-a6ee4424a405.js)
- [`webview/assets/hotkey-window-thread-page-7acb028f9a52.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fhotkey-window-thread-page-7acb028f9a52.js)

### Conversation hosts

26 matching files. Representative paths:

- [`webview/assets/chatgpt-conversation-client-9da8cd636f9f.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fchatgpt-conversation-client-9da8cd636f9f.js)
- [`webview/assets/chatgpt-conversation-page-326640e1d197.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fchatgpt-conversation-page-326640e1d197.js)
- [`webview/assets/local-conversation-background-terminal-tab-799757eac642.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Flocal-conversation-background-terminal-tab-799757eac642.js)
- [`webview/assets/local-conversation-git-actions-34e360a05657.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Flocal-conversation-git-actions-34e360a05657.js)
- [`webview/assets/local-conversation-page-b941a01e30a9.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Flocal-conversation-page-b941a01e30a9.js)
- [`webview/assets/local-conversation-plan-model-bf93e5ae4e71.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Flocal-conversation-plan-model-bf93e5ae4e71.js)
- [`webview/assets/local-conversation-quick-chat-overlay-64138a3a1acd.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Flocal-conversation-quick-chat-overlay-64138a3a1acd.js)
- [`webview/assets/local-conversation-sources-side-panel-tab-9d1eaac9d342.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Flocal-conversation-sources-side-panel-tab-9d1eaac9d342.js)
- [`webview/assets/local-conversation-sources-signals-76760687151d.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Flocal-conversation-sources-signals-76760687151d.js)
- [`webview/assets/local-conversation-stream-role-product-event-d419b0abc02d.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Flocal-conversation-stream-role-product-event-d419b0abc02d.js)
- [`webview/assets/local-conversation-subagents-panel-tab-546ef00015ce.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Flocal-conversation-subagents-panel-tab-546ef00015ce.js)
- [`webview/assets/local-conversation-summary-panel-sources-model-da0f4c7f78cb.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Flocal-conversation-summary-panel-sources-model-da0f4c7f78cb.js)

### Composer

18 matching files. Representative paths:

- [`webview/assets/browser-composer-disclaimer-12368dacbc07.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fbrowser-composer-disclaimer-12368dacbc07.js)
- [`webview/assets/browser-composer-disclaimer-6afff6582c79.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fbrowser-composer-disclaimer-6afff6582c79.js)
- [`webview/assets/codex-micro-mini-game-composer-9fea953baddb.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fcodex-micro-mini-game-composer-9fea953baddb.js)
- [`webview/assets/composer-4d587b24b341.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fcomposer-4d587b24b341.js)
- [`webview/assets/composer-action-bar-run-location-dropdown-1f5d5cbc9890.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fcomposer-action-bar-run-location-dropdown-1f5d5cbc9890.js)
- [`webview/assets/composer-overlay-84686971aa33.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fcomposer-overlay-84686971aa33.js)
- [`webview/assets/composer-project-selector-1358e3ee5ee2.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fcomposer-project-selector-1358e3ee5ee2.js)
- [`webview/assets/composer-provider-94f3719549b5.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fcomposer-provider-94f3719549b5.js)
- [`webview/assets/composer-utility-bar-56b96a453c00.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fcomposer-utility-bar-56b96a453c00.js)
- [`webview/assets/composer-work-home-plugins-control-bd5d6bd418c8.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fcomposer-work-home-plugins-control-bd5d6bd418c8.js)
- [`webview/assets/home-composer-mode-toggle-d4fb6b284241.css`](../site/bundle.html#mod%3Awebview%2Fassets%2Fhome-composer-mode-toggle-d4fb6b284241.css)
- [`webview/assets/home-composer-mode-toggle-e04534288010.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fhome-composer-mode-toggle-e04534288010.js)

### Panels / review

85 matching files. Representative paths:

- [`webview/apps/microsoft-terminal.png`](../site/bundle.html#mod%3Awebview%2Fapps%2Fmicrosoft-terminal.png)
- [`webview/apps/terminal.png`](../site/bundle.html#mod%3Awebview%2Fapps%2Fterminal.png)
- [`webview/assets/artifact-file-preview-icon-1737c725fcf5.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fartifact-file-preview-icon-1737c725fcf5.js)
- [`webview/assets/artifact-preview-header-3c6806dbf5e1.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fartifact-preview-header-3c6806dbf5e1.js)
- [`webview/assets/artifact-preview-status-bc5a67a0b7c8.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fartifact-preview-status-bc5a67a0b7c8.js)
- [`webview/assets/auto-review-approval-nudge-65ae58a4232e.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fauto-review-approval-nudge-65ae58a4232e.js)
- [`webview/assets/automation-side-panel-tab-de8946bf00c5.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fautomation-side-panel-tab-de8946bf00c5.js)
- [`webview/assets/background-terminal-87c8e42c31c7.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fbackground-terminal-87c8e42c31c7.js)
- [`webview/assets/chatgpt-entity-side-panel-tab-c407b020ce2e.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fchatgpt-entity-side-panel-tab-c407b020ce2e.js)
- [`webview/assets/chatgpt-sources-side-panel-tab-fc4b78d73dfc.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fchatgpt-sources-side-panel-tab-fc4b78d73dfc.js)
- [`webview/assets/cloud-browser-preview-37854eb6b805.css`](../site/bundle.html#mod%3Awebview%2Fassets%2Fcloud-browser-preview-37854eb6b805.css)
- [`webview/assets/cloud-browser-preview-86ee08dccc2d.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fcloud-browser-preview-86ee08dccc2d.js)

### Settings

61 matching files. Representative paths:

- [`webview/assets/_virtual_settings-search-documents-c55495113227.js`](../site/bundle.html#mod%3Awebview%2Fassets%2F_virtual_settings-search-documents-c55495113227.js)
- [`webview/assets/account-settings-1cbbbb0d51b0.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Faccount-settings-1cbbbb0d51b0.js)
- [`webview/assets/agent-settings-2d3e03f9b9ca.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fagent-settings-2d3e03f9b9ca.js)
- [`webview/assets/analytics-settings-6a1eedcea258.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fanalytics-settings-6a1eedcea258.js)
- [`webview/assets/appearance-settings-49bcd60dc1fd.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fappearance-settings-49bcd60dc1fd.js)
- [`webview/assets/appgen-settings-dialog-88e3b655b9c6.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fappgen-settings-dialog-88e3b655b9c6.js)
- [`webview/assets/appgen-settings-page-77dfbe7e8143.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fappgen-settings-page-77dfbe7e8143.js)
- [`webview/assets/appgen-settings-page-db80ab81945b.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fappgen-settings-page-db80ab81945b.js)
- [`webview/assets/appshots-settings-9145f54cee50.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fappshots-settings-9145f54cee50.js)
- [`webview/assets/billing-settings-6e07ff3a9d84.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fbilling-settings-6e07ff3a9d84.js)
- [`webview/assets/browser-use-settings-6cbd2811a0d7.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fbrowser-use-settings-6cbd2811a0d7.js)
- [`webview/assets/browser-use-settings-visibility-34b33f7890f3.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fbrowser-use-settings-visibility-34b33f7890f3.js)

### Plugins / integrations

37 matching files. Representative paths:

- [`webview/assets/category-plugins-query-ea86683e83a6.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fcategory-plugins-query-ea86683e83a6.js)
- [`webview/assets/chartjs-plugin-zoom.esm-e2174eb39858.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fchartjs-plugin-zoom.esm-e2174eb39858.js)
- [`webview/assets/composer-work-home-plugins-control-bd5d6bd418c8.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fcomposer-work-home-plugins-control-bd5d6bd418c8.js)
- [`webview/assets/computer-history-plugin-icon-cc68b3ed4fe9.png`](../site/bundle.html#mod%3Awebview%2Fassets%2Fcomputer-history-plugin-icon-cc68b3ed4fe9.png)
- [`webview/assets/computer-use-plugin-icon-5eae5ff78888.png`](../site/bundle.html#mod%3Awebview%2Fassets%2Fcomputer-use-plugin-icon-5eae5ff78888.png)
- [`webview/assets/legacy-video-plugins-e5662e70a03b.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Flegacy-video-plugins-e5662e70a03b.js)
- [`webview/assets/local-conversation-webmcp-tools-model-1513891e8b6d.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Flocal-conversation-webmcp-tools-model-1513891e8b6d.js)
- [`webview/assets/mcp-app-analytics-d4aac36ba72c.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fmcp-app-analytics-d4aac36ba72c.js)
- [`webview/assets/mcp-app-follow-up-confirmation-dialog-2a41ad0433b8.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fmcp-app-follow-up-confirmation-dialog-2a41ad0433b8.js)
- [`webview/assets/mcp-extension-thread-side-panel-tab-fed02a7d196f.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fmcp-extension-thread-side-panel-tab-fed02a7d196f.js)
- [`webview/assets/mcp-extension-view-frame-a61b545be43d.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fmcp-extension-view-frame-a61b545be43d.js)
- [`webview/assets/mcp-extension-view-frame-cb3b0e9c26d5.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fmcp-extension-view-frame-cb3b0e9c26d5.js)

### Hosted work

66 matching files. Representative paths:

- [`webview/assets/automation-delete-confirmation-dialog-570ca85751e0.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fautomation-delete-confirmation-dialog-570ca85751e0.js)
- [`webview/assets/automation-frequency-section-babd3c0f0928.css`](../site/bundle.html#mod%3Awebview%2Fassets%2Fautomation-frequency-section-babd3c0f0928.css)
- [`webview/assets/automation-frequency-section-d05bde108929.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fautomation-frequency-section-d05bde108929.js)
- [`webview/assets/automation-side-panel-tab-de8946bf00c5.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fautomation-side-panel-tab-de8946bf00c5.js)
- [`webview/assets/automation-status-messages-48fde054fa02.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fautomation-status-messages-48fde054fa02.js)
- [`webview/assets/automations-page-f9900c495212.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fautomations-page-f9900c495212.js)
- [`webview/assets/cloud-1clWsBF3-30b554a64a5d.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fcloud-1clWsBF3-30b554a64a5d.js)
- [`webview/assets/cloud-1clWsBF3-b77d24d569ac.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fcloud-1clWsBF3-b77d24d569ac.js)
- [`webview/assets/cloud-automation-detail-panel-57b677477bdb.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fcloud-automation-detail-panel-57b677477bdb.js)
- [`webview/assets/cloud-browser-preview-37854eb6b805.css`](../site/bundle.html#mod%3Awebview%2Fassets%2Fcloud-browser-preview-37854eb6b805.css)
- [`webview/assets/cloud-browser-preview-86ee08dccc2d.js`](../site/bundle.html#mod%3Awebview%2Fassets%2Fcloud-browser-preview-86ee08dccc2d.js)
- [`webview/assets/cloud-browser-side-panel-5e03291eec4b.css`](../site/bundle.html#mod%3Awebview%2Fassets%2Fcloud-browser-side-panel-5e03291eec4b.css)

## Window tokens

| Token | Occurrences | Runtime correspondence |
| --- | --- | --- |
| `hotkeyWindow` | 63 | Unverified by token |
| `appView` | 18 | Unverified by token |
| `annotationView` | 15 | Unverified by token |
| `applyHotkeyWindow` | 10 | Unverified by token |
| `editorWindow` | 8 | Unverified by token |
| `browserCommentPopupWindow` | 5 | Unverified by token |
| `activeConversationByWindow` | 4 | Unverified by token |
| `browserView` | 1 | Unverified by token |

## Network declarations

The following values are declared in renderer CSP. Permission is distinct from actual traffic.

| Directive | Values |
| --- | --- |
| default-src | `&#39` |
| none&#39 |  |
| img-src | `&#39` |
| self&#39 |  |
| app: | `blob:` · `data:` · `https:` |
| child-src | `&#39` |
| blob: | `codex-sandbox://*.web-sandbox.oaiusercontent.com` · `codex-sandbox://web-sandbox.oaiusercontent.com` · `https://*.web-sandbox.oaiusercontent.com` · `https://web-sandbox.oaiusercontent.com` · `https://cdn.plaid.com` |
| frame-src | `&#39` |
| worker-src | `&#39` |
| script-src | `&#39` |
| &#39 |  |
| sha256-Z2/iFzh9VMlVkEOar1f/oSHWwQk3ve1qk/C2WdsC4Xk=&#39 |  |
| wasm-unsafe-eval&#39 |  |
| https://cdn.plaid.com/link/v2/stable/link-initialize.js |  |
| style-src | `&#39` |
| unsafe-inline&#39 |  |
| font-src | `&#39` |
| data: |  |
| media-src | `&#39` |
| connect-src | `&#39` |
| https://ab.chatgpt.com | `https://api.mapbox.com` · `https://cdn.openai.com` · `https://events.mapbox.com` · `https://learn.chatgpt.com` · `https://production.plaid.com` · `https://sandbox.plaid.com` · `wss://chatgpt.com` · `wss://ws.chatgpt-staging.com` · `wss://ws.chatgpt.com` |

## Interpretation boundaries

Selectors copied from a separate skin project are not part of this model. The workbench does not inject into the app. Static findings are connected to archived captures only through explicit analytical mappings.

[Captured GUI](codex-desktop-gui-map-evidence.md) · [DeepWiki](../site/gui-map.html)
