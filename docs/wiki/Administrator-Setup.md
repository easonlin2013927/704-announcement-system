# 管理員設定與維護

## 必要服務

GitHub Pages 提供靜態前端，Supabase 提供帳號驗證與 PostgreSQL 資料庫。尚未連接 Supabase 前，網站不能登入或發布。GitHub repository 不是公告資料庫。

## 建立資料庫

1. 建立自己的 Supabase 專案，妥善保管資料庫密碼。
2. 在 SQL Editor 執行 repository 的 supabase/schema.sql，一個全新專案只執行一次。
3. 在 Authentication 建立學生與教師的電子郵件帳號，依管理需求確認郵件。
4. 取得 Auth 使用者 UUID，在 SQL Editor 登錄角色：

```sql
insert into public.profiles (id, display_name, role)
values ('使用者UUID', '顯示名稱', 'student');
-- 教師的 role 請填 teacher，角色只能由管理員設定。
```

5. 將 Project URL 及公開 publishable／anon key 填入 src/config.js。切勿放入 service_role、secret key 或資料庫密碼。
6. 關閉不需要的公開自行註冊。學生與教師依管理員配發帳號登入。
7. 建置部署後，用實際教師與學生帳號完成驗收。

RLS 由資料庫強制執行。profiles 僅允許使用者讀取自己的角色，禁止前端自行建立或升級權限。公告讀取限有 profile 的帳號，寫入限 teacher。完整規則見 SQL 原始檔。官方參考：https://supabase.com/docs/guides/database/postgres/row-level-security

## GitHub Pages 部署

使用 Node.js 22，執行 npm run check 與 npm run build。將 main 推送 GitHub 後，在 Settings → Pages 選擇 GitHub Actions。部署 workflow 會上傳 dist。

私人 repository 的 Pages 與 Wiki 可用性依帳號方案而定。不要為部署擅自公開含私人資訊的 repository；由擁有者選擇適合方案或其他託管方式。

## Wiki 發布

docs/wiki 保留 Wiki 全部來源，README 直接連結這些可用文件。若 repository 已啟用原生 Wiki，先在 GitHub Wiki 建立第一頁，再將此資料夾的 Markdown 同步至獨立的 704-announcement-system.wiki.git repository。原生 Wiki 與主 repository 是兩個獨立 Git repository，主分支 commit 不會自動建立 Wiki 頁面。

## 正式上線驗收

- 教師新增公告，學生在另一裝置登入後能閱讀。
- 教師修改與取消置頂後，學生重新登入看到更新。
- 學生直接透過 API 嘗試新增、修改、刪除皆遭拒絕。
- 未登入與沒有 profile 的帳號不能讀取公告。
- 清除瀏覽器資料後，重新登入仍讀得到雲端公告。
- 教師刪除後，學生重新登入不再看到該公告。
- 修改日期、切換月份或再次部署不會移除公告。
- 驗證資料庫備份能還原後，再投入正式使用。

## 備份、復原與服務維護

定期匯出資料庫並保存在受控位置，保留 schema、profiles 與 announcements。依 Supabase 方案評估備份與恢復功能，不假設免費方案自動具備所有備份保障。定期演練復原；刪除資料前先備份。

設定沒有到期自動刪除規則，但外部服務的持續可用性與保留政策仍由管理員維護。勿刪除 Supabase 專案或將部署腳本改為重建正式資料庫。

## 已知邊界

登入只保留在記憶體，重新整理需登入；沒有自動更新、即時通知、草稿、附件、版本紀錄或回收桶。教師共同管理所有公告。若新增其他頁面或區塊，也必須建立雲端資料表及 RLS，不能僅將狀態存在前端。

GitHub Wiki 的學生／教師文件分開是導覽分類，不是文件權限隔離。知道網址且有 repository 閱讀權限的人仍可閱讀其他文件；實際操作權限由資料庫保護。
