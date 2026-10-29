# v0.14.1 Workers API 新入口與專案網址更新

- 新增固定轉送至原公告主機的 Cloudflare Workers API 入口，沿用現有資料庫及帳號權限。
- 前端改用 https://704-announcement-api.easonlin2013927.workers.dev，並更新模組版本。
- 專案改名為 704-class-system，更新所有登入、GitHub repo、Issues 及文件連結。
- API 不快取個人資料；新增來源限制、容量、轉送及權限測試。外部登入、作業、私人紀錄、行事曆及聊天驗證通過，測試資料已清除。
- 聊天背景頁籤暫停輪詢，並補充 Workers 配額及維護說明。
- 新入口是否通過校方網域信譽過濾，仍須由使用者在校網 iPad 驗證。