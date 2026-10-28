# 維護人員使用說明

[前往維護人員登入](https://easonlin2013927.github.io/704-announcement-system/?v=0.4.1#/admin/login)

請使用 README 的維護人員獨立入口，輸入 role 為 admin 的帳號。教師或學生帳號不能登入此入口。

登入後可查看 API／資料庫連線狀態與公告總數，按「重新檢查」更新。維護端不提供公告新增、修改、刪除或網站內帳號管理。

帳號由主機執行 server/account.mjs 建立，JSON 的 role 填 admin。密碼至少 12 字元，只在主機端輸入，勿提交至 GitHub。資料庫結構會在新 API 啟動時自動升級，不會清空公告。

重新整理需再次登入；登出或切換入口清除記憶體憑證。資料庫權限、備份、角色變更及密碼重設請依 deploy/README.md 使用主機工具。

登入入口不符會被後端拒絕。若服務失效，先檢查 api704 容器日誌、PostgreSQL 狀態與 Tunnel；不要藉由公開資料庫埠修復。正式帳號尚需管理員建立。
