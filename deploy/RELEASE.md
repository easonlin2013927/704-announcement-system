# v0.2.0-rc.1 自架部署預覽

- 新增 Node.js API、自架 PostgreSQL、教師及學生權限驗證。
- 新增密碼雜湊、登入撤銷、公告 CRUD、CORS 與基本登入限流。
- 新增 Docker Compose、1Panel／Cloudflare Tunnel 部署手冊與帳號建立工具。
- 前端連接 api704.easonlin2013927.dpdns.org，無瀏覽器本地公告儲存。

已通過密碼測試、語法檢查與前端建置。尚未在使用者主機完成 Docker 建置、PostgreSQL 連線與跨裝置權限驗收，因此此版本為預發行版，不代表正式服務已可登入。請依 deploy/README.md 部署與驗收。
