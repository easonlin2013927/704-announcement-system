# 704公告系統

教師發布富文字公告，學生登入閱讀；前端使用 GitHub Pages，後端為自架 Node.js API 與 PostgreSQL，透過 Cloudflare Tunnel 提供 HTTPS。

## 獨立登入入口

| 身分 | 登入連結 | 功能 |
| --- | --- | --- |
| 學生 | [學生登入](https://easonlin2013927.github.io/704-announcement-system/?v=0.3.1#/student/login) | 閱讀、搜尋及分類公告 |
| 教師 | [教師登入](https://easonlin2013927.github.io/704-announcement-system/?v=0.3.1#/teacher/login) | 發布、編輯、刪除與置頂公告 |
| 維護人員（管理員） | [維護人員登入](https://easonlin2013927.github.io/704-announcement-system/?v=0.3.1#/admin/login) | 查看 API、資料庫狀態與公告數量 |

三個登入畫面獨立，沒有跨身分切換按鈕。根網址預設進入學生登入。連結只是入口，權限由後端帳號角色決定；錯誤入口會拒絕登入，不能用網址升級權限。切換入口會清除目前登入狀態。

管理員不是教師帳號，維護端不提供公告寫入功能。帳號建立、角色調整、密碼重設與備份目前使用主機端工具。尚未配發正式帳號，請先聯絡管理員建立。

## 操作文件

- [學生使用手冊](docs/wiki/Student-Guide.md)
- [教師使用手冊](docs/wiki/Teacher-Guide.md)
- [維護人員使用說明](docs/wiki/Maintenance-Guide.md)
- [1Panel 部署與帳號設定](deploy/README.md)
- [既有 Wiki](https://github.com/easonlin2013927/704-announcement-system/wiki)

主 repository 文件與目前版本同步。既有 Wiki 可能仍有前版登入步驟，請以上述對應文件為準。

## 功能與資料保留

支援粗體、斜體、底線、螢光筆、標題、引用、清單與連結。公告集中存於 PostgreSQL，沒有到期自動刪除；清除瀏覽器資料與重新部署前端不會刪除公告。教師可共同管理公告。

前端不使用 localStorage、sessionStorage 或 IndexedDB 儲存公告或登入憑證，登入只存在記憶體，重新整理需再次登入。沒有草稿、回收桶、附件與即時通知。資料庫仍需由維護人員定期備份。

## 開發與部署

前端使用 Node.js 22，無第三方套件依賴：

```sh
npm run check
npm run build
node scripts/serve.mjs
```

後端需安裝 server/package.json 的 pg 依賴。部署方式與主機環境變數見 deploy/README.md；不要執行舊 supabase/schema.sql。升級時必須同時更新前端與後端。

目前 API 與 Tunnel 已啟動，前版教師／學生權限已在主機實測。0.3.0 新增 admin 角色，升級會原子更新帳號角色約束，保留原有資料。

## 問題與建議

[Issues 選單](https://github.com/easonlin2013927/704-announcement-system/issues/new/choose) 提供問題回報、使用請教及網站建議。請勿提交密碼、學生個資或名冊。

