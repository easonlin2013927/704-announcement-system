# Cloudflare Workers API 入口

公開 API：`https://704-announcement-api.easonlin2013927.workers.dev`

健康檢查：`https://704-announcement-api.easonlin2013927.workers.dev/health`，正常顯示 `{"status":"ok"}`。

前端維持 GitHub Pages，Worker 將允許的 API 路徑固定轉送至原公告主機 `https://api704.easonlin2013927.dpdns.org`。帳號權限與 PostgreSQL 資料仍由原本 API 管理，不必搬移資料庫。**不要刪除原 Cloudflare Tunnel 的 API 路由**，它仍是 Worker 使用的上游。

## 程式與部署

- `proxy.mjs`：實際部署程式，固定上游、限定來源及 API 路徑，請求與回應不快取；不輸出帳密或登入憑證。
- `proxy.test.mjs`：來源限制、轉送、錯誤及容量的本地測試，可執行 `node --test deploy/worker/proxy.test.mjs`。
- `wrangler.jsonc`：CLI 部署設定；可在此資料夾使用已登入 Cloudflare 的 Wrangler 執行 `npx wrangler deploy`。
- 也可在 Cloudflare → Workers 和 Pages → 704-announcement-api → 編輯代碼，以 `proxy.mjs` 完整內容取代 Worker 程式並部署。

目前已停用 Workers Logs 保留；沒有建立或提交 Cloudflare API 金鑰。前端的 API URL 設定在 `src/config.js`；修改後應更新模組版本並重新部署 GitHub Pages。

## 容量與使用量

部署時使用 Workers Free，帳戶每日上限 100,000 次請求（UTC 午夜重設）；超限可能回傳 Cloudflare 1027。請在 Workers 儀表板查看使用量。聊天室背景頁籤暫停輪詢，減少不必要請求。需要增加配額時，由帳戶擁有者評估方案，本系統不會自動升級付費。

官方文件：[workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/) · [Workers 配額](https://developers.cloudflare.com/workers/platform/limits/)。`workers.dev` 適合先測試此替代入口；正式長期使用可另評估自有網域及服務方案。

## 校內 iPad 測試

請使用學校 Wi-Fi 開啟新的健康檢查，確認回傳 `status: ok`，再重新開啟最新版學生或教師入口登入。新網址能否通過校方的網域信譽分類仍須以實際裝置測試為準，不能保證一定放行。

若新網址仍出現校方防火牆或非私人連線警告，請勿略過警告輸入帳密；可暫用手機熱點，或依校方流程處理。原網址能否直接開啟不影響新入口的瀏覽器連線，只要 Worker 能連到原主機即可。

## 回復原 API

必要時可將 `src/config.js` 改回 `https://api704.easonlin2013927.dpdns.org`，更新模組版本並重新部署前端。資料庫不需變更。這只適用於能正常存取原網域的網路，不會解除學校對原網域的攔截。
