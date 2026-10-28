# 704公告系統

提供教師發布富文字公告、學生登入閱讀的響應式校園公告網站。前端託管於 GitHub Pages，公告與角色權限由 Supabase 集中管理。

## 操作文件

- [學生使用手冊](docs/wiki/Student-Guide.md)：登入、閱讀、搜尋與常見問題，不包含教師操作。
- [教師使用手冊](docs/wiki/Teacher-Guide.md)：發布、格式設定、置頂、編輯與刪除。
- [完整使用中心](docs/wiki/Home.md)
- [管理員設定與維護](docs/wiki/Administrator-Setup.md)

Wiki 全文來源保存在 docs/wiki。原生 GitHub Wiki 需另行啟用與同步；以上連結直接使用主 repository 文件，不依賴 Wiki 啟用。

## 目前狀態

已完成前端與 Supabase API／權限 SQL。尚未建立或連接實際 Supabase 專案，因此目前不能以真實帳號登入與發布；不是已上線的資料庫服務。

## 功能

- 電子郵件與密碼登入，角色由資料庫決定
- 粗體、斜體、底線、螢光筆、標題、引用、清單與連結
- 公告搜尋、分類、置頂、全文閱讀、修改與刪除
- 學生唯讀、教師共同管理公告的資料庫權限
- 雲端儲存，沒有自動過期或定期刪除
- 不使用 localStorage、sessionStorage 或 IndexedDB 儲存公告或登入憑證
- GitHub Actions 靜態建置部署

登入只保留於記憶體，重新整理需重新登入；目前沒有即時推播、草稿、附件、版本紀錄與回收桶。公告對象是標籤，不是閱讀權限。

## 本機建置

需要 Node.js 22，無第三方套件依賴。

```bash
npm run check
npm run build
node scripts/serve.mjs
```

開啟 http://127.0.0.1:4173 。正式資料庫設定請參照管理員手冊，執行 supabase/schema.sql 並填寫 src/config.js 的公開專案設定。不要提交管理金鑰或密碼。

## 部署

將 main 推送後，在 repository 的 Settings → Pages 選擇 GitHub Actions。部署設定為 .github/workflows/deploy.yml。私人 repository 能否使用 Pages 與 Wiki 取決於帳號方案。

## 問題與建議

在 Issues → New issue 選擇「問題回報」「使用請教」或「網站建議」。提交前先閱讀對應手冊，避免附上密碼、學號、學生個資或完整名冊。

## 資料保留

公告不會因關閉瀏覽器、清除快取或重新部署而刪除。直到教師明確刪除前，系統不設定到期清除。資料庫服務維護、備份及復原仍由管理員負責，無法保證外部服務永不中斷。
