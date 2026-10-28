# 704公告系統

管理員除了教師的公告管理、富文字編輯與登入標語設定，還可建立學生／教師／管理員帳號、調整角色、刪除帳號，以及設定所有頁面頂端的跑馬公告。帳號與跑馬公告均儲存在 PostgreSQL；最後一位管理員與目前登入中的管理員帳號受到保護。詳見[管理員手冊](docs/wiki/Maintenance-Guide.md)。

教師發布富文字公告，學生登入閱讀；前端使用 GitHub Pages，後端為自架 Node.js API 與 PostgreSQL，透過 Cloudflare Tunnel 提供 HTTPS。

## 各系統登入網址

| 身分 | 登入連結 | 功能 |
| --- | --- | --- |
| 學生 | [學生登入](https://easonlin2013927.github.io/704-announcement-system/?v=0.8.0#/student/login) | 閱讀、搜尋及分類公告 |
| 教師 | [教師登入](https://easonlin2013927.github.io/704-announcement-system/?v=0.8.0#/teacher/login) | 發布、編輯、刪除與置頂公告 |
| 維護人員（管理員） | [維護人員登入](https://easonlin2013927.github.io/704-announcement-system/?v=0.8.0#/admin/login) | 公告管理、帳號管理、跑馬公告與系統狀態 |

三個登入畫面獨立，沒有跨身分切換按鈕。根網址預設進入學生登入。連結只是入口，權限由後端帳號角色決定；錯誤入口會拒絕登入，不能用網址升級權限。切換入口會清除目前登入狀態。

管理員擁有教師的公告管理與登入標語設定功能，並可建立學生、教師及管理員帳號、調整角色、刪除帳號與編輯全站跑馬公告。詳細步驟請閱讀[維護人員手冊](docs/wiki/Maintenance-Guide.md)。

## 操作文件

- [登入標語設定](docs/wiki/Login-Banner.md)：教師／維護人員啟用與編輯登入頁上方的富文字標語。

- [學生使用手冊](docs/wiki/Student-Guide.md)
- [教師使用手冊](docs/wiki/Teacher-Guide.md)
- [維護人員使用說明](docs/wiki/Maintenance-Guide.md)
- [1Panel 部署與帳號設定](deploy/README.md)
- [既有 Wiki](https://github.com/easonlin2013927/704-announcement-system/wiki)

三個登入網址亦列於 [Wiki 首頁](https://github.com/easonlin2013927/704-announcement-system/wiki)，各身分手冊提供自己的登入入口。

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

## 活動倒數（v0.8.0）

教師與管理員可從首頁「新增 → 活動」開啟活動表單。學生從首頁查看每秒更新的天、時、分、秒；到期顯示「活動已開始」並保留，直到教師或管理員刪除。活動時間依建立者裝置時區輸入，集中儲存在 PostgreSQL。

公告對象限「學生、教師、全部人員」。學生看不到教師專屬公告，教師與管理員可管理所有公告。原有年級公告轉為學生公告。

## 頁面導覽（v0.8.0）

首頁顯示公告及活動倒數卡片。教師與管理員可在右側「新增」按鈕移入滑鼠或點擊，選擇公告或活動。所有人可在首頁公告區閱讀倒數，屋子圖示返回首頁，「設定」進入獨立設定頁。管理員在設定頁查看表格形式的服務及執行環境狀態；「帳號管理」先顯示人員名單，點「建立人員」才會開啟表單。

## 建立帳號（v0.8.0）

管理員可建立學生、教師及其他管理員；教師可從上方「學生帳號」按「建立學生」，建立學生帳號。一般帳號名稱即可登入，不要求電子郵件，移除姓名及密碼的長度限制，姓名可空白（使用帳號顯示），密碼也可留空。登入帳號仍需填寫且不可重複。教師只能建立與查看學生，修改角色及刪除帳號由管理員處理。
