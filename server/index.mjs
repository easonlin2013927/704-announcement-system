import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { db, migrate } from "./db.mjs";
import { verify, digest, hash } from "./password.mjs";
const origin = process.env.ALLOWED_ORIGIN;
if (!origin) throw new Error("ALLOWED_ORIGIN is required");
const attempts = new Map();
const categories = new Set(["important","academic","activity","general"]);
async function body(req) {
 let data = ""; for await (const chunk of req) { data += chunk; if (Buffer.byteLength(data) > 262144) throw Object.assign(new Error("內容過長"),{status:413}); }
 try { return JSON.parse(data); } catch { throw Object.assign(new Error("JSON 格式錯誤"),{status:400}); }
}
function fail(status, message) { throw Object.assign(new Error(message),{status}); }
await migrate();
const server = createServer(async (req,res) => {
 const send = (code,data) => { res.writeHead(code,{"Content-Type":"application/json; charset=utf-8"});res.end(JSON.stringify(data)); };
 res.setHeader("Cache-Control","no-store");
 res.setHeader("X-Content-Type-Options","nosniff");
 res.setHeader("Vary","Origin");
 if (req.headers.origin === origin) {
 res.setHeader("Access-Control-Allow-Origin",origin);
 res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization");
 res.setHeader("Access-Control-Allow-Methods","GET, POST, PUT, PATCH, DELETE, OPTIONS");
 }
 try {
 if (req.headers.origin && req.headers.origin !== origin) fail(403,"來源不被允許");
 if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
 const path = new URL(req.url,"http://localhost").pathname;
 if (path === "/health" && req.method === "GET") { await db.query("select 1"); return send(200,{status:"ok"}); }
 if (path === "/public/banner" && req.method === "GET") {
 const banner=(await db.query("select enabled,content from login_banner704 where id=1")).rows[0];
 const marquee=(await db.query("select enabled,content from site_marquee704 where id=1")).rows[0];
 return send(200,{enabled:banner.enabled,content:banner.enabled ? banner.content : "",marqueeEnabled:marquee.enabled,marquee:marquee.enabled ? marquee.content : ""});
 }
 if (path === "/login" && req.method === "POST") {
 const data = await body(req);
 const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
 if (!email || typeof data.password !== "string" || data.password.length > 512) fail(400,"請輸入有效帳號密碼");
 const record = attempts.get(email);
 if (record && record.until > Date.now() && record.count >= 8) fail(429,"登入次數過多，請十五分鐘後再試");
 const account = (await db.query("select * from accounts704 where email=$1",[email])).rows[0];
 if (!account || !await verify(data.password,account.password_hash)) {
 attempts.set(email,{count:record?.until > Date.now() ? record.count + 1 : 1,until:Date.now()+900000});
 fail(401,"帳號或密碼錯誤");
 }
 attempts.delete(email);
 if (!["teacher","student","admin"].includes(data.portal) || data.portal !== account.role) fail(403,"帳號不屬於此登入入口");
 const token = randomBytes(32).toString("hex");
 await db.query("insert into sessions704 values($1,$2,now()+interval '8 hours')",[digest(token),account.id]);
 return send(200,{token,profile:{role:account.role,display_name:account.display_name}});
 }
 const token = req.headers.authorization?.replace(/^Bearer /,"") || "";
 const user = (await db.query("select a.id,a.role,a.display_name from sessions704 s join accounts704 a on a.id=s.account_id where s.token_hash=$1 and s.expires_at>now()",[digest(token)])).rows[0];
 if (!user) fail(401,"登入已失效，請重新登入");
 if (path === "/logout" && req.method === "POST") { await db.query("delete from sessions704 where token_hash=$1",[digest(token)]); return send(200,{ok:true}); }
 if (path === "/settings/banner" && ["GET","PUT"].includes(req.method)) {
 if (!["teacher","admin"].includes(user.role)) fail(403,"僅限教師或維護人員設定標語");
 if(req.method==="GET") return send(200,(await db.query("select enabled,content from login_banner704 where id=1")).rows[0]);
 const value=await body(req);
 if(typeof value.enabled!=="boolean" || typeof value.content!=="string" || value.content.length>20000) fail(400,"標語格式錯誤或超過 20000 字元");
 const result=await db.query("update login_banner704 set enabled=$1,content=$2,updated_at=now() where id=1 returning enabled,content",[value.enabled,value.content]);
 return send(200,result.rows[0]);
 }
 if (path === "/settings/marquee" && ["GET","PUT"].includes(req.method)) {
 if (user.role !== "admin") fail(403,"僅限管理員設定跑馬公告");
 if(req.method==="GET") return send(200,(await db.query("select enabled,content from site_marquee704 where id=1")).rows[0]);
 const value=await body(req);
 if(typeof value.enabled!=="boolean" || typeof value.content!=="string" || value.content.length>1000) fail(400,"跑馬公告格式錯誤或超過 1000 字元");
 const result=await db.query("update site_marquee704 set enabled=$1,content=$2,updated_at=now() where id=1 returning enabled,content",[value.enabled,value.content.trim()]);
 return send(200,result.rows[0]);
 }
 if (path === "/admin/accounts" && ["GET","POST"].includes(req.method)) {
 if(user.role!=="admin") fail(403,"僅限管理員管理帳號");
 if(req.method==="GET") return send(200,(await db.query("select id,email,display_name,role from accounts704 order by role,display_name")).rows);
 const value=await body(req);
 const email=typeof value.email==="string"?value.email.trim().toLowerCase():"";
 const name=typeof value.name==="string"?value.name.trim():"";
 if(!email || email.length>254 || (value.role==="admin" ? email.includes("@") : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || !name || name.length>80 || !["student","teacher","admin"].includes(value.role) || typeof value.password!=="string" || value.password.length<10 || value.password.length>512) fail(400,"請確認帳號、姓名、角色與密碼（至少 10 字）");
 const result=await db.query("insert into accounts704(id,email,display_name,role,password_hash) values($1,$2,$3,$4,$5) on conflict(email) do nothing returning id,email,display_name,role",[randomUUID(),email,name,value.role,await hash(value.password)]);
 if(!result.rowCount) fail(409,"此帳號已存在");
 return send(201,result.rows[0]);
 }
 const accountMatch=path.match(/^\/admin\/accounts\/([0-9a-f-]{36})$/i);
 if(accountMatch && ["PATCH","DELETE"].includes(req.method)) {
 if(user.role!=="admin") fail(403,"僅限管理員管理帳號");
 const target=(await db.query("select id,email,display_name,role from accounts704 where id=$1",[accountMatch[1]])).rows[0];
 if(!target) fail(404,"找不到帳號");
 if(req.method==="PATCH") {
 const value=await body(req); const name=typeof value.name==="string"?value.name.trim():"";
 if(!name || name.length>80 || !["student","teacher","admin"].includes(value.role)) fail(400,"姓名或角色格式錯誤");
 if(target.id===user.id && value.role!=="admin") fail(400,"不能移除自己最後的管理員身分");
 if(target.role==="admin" && value.role!=="admin" && Number((await db.query("select count(*)::int as total from accounts704 where role='admin'")).rows[0].total)<=1) fail(400,"至少需保留一位管理員");
 const result=await db.query("update accounts704 set display_name=$1,role=$2 where id=$3 returning id,email,display_name,role",[name,value.role,target.id]);
 return send(200,result.rows[0]);
 }
 if(target.id===user.id) fail(400,"不能刪除目前登入的帳號");
 if(target.role==="admin" && Number((await db.query("select count(*)::int as total from accounts704 where role='admin'")).rows[0].total)<=1) fail(400,"至少需保留一位管理員");
 await db.query("delete from accounts704 where id=$1",[target.id]); return send(200,{ok:true});
 }
 if (path === "/admin/status" && req.method === "GET") {
 if (user.role !== "admin") fail(403,"僅限維護人員");
 const result = await db.query("select count(*)::int as total from announcements704");
 return send(200,{status:"ok",announcements:result.rows[0].total});
 }
 if (path === "/announcements" && req.method === "GET") return send(200,(await db.query("select * from announcements704 order by pinned desc,date desc")).rows);
 if (!["teacher","admin"].includes(user.role)) fail(403,"僅限教師或管理員管理公告");
 const match = path.match(/^\/announcements\/([0-9a-f-]{36})$/i);
 if ((path === "/announcements" && req.method === "POST") || (match && req.method === "PATCH")) {
 const b = await body(req);
 if (typeof b.title !== "string" || !b.title.trim() || b.title.trim().length>80 || !categories.has(b.category) || typeof b.content !== "string" || !b.content.trim() || typeof b.audience !== "string" || b.audience.length>100 || typeof b.pinned !== "boolean") fail(400,"公告欄位不完整或格式錯誤");
 const values=[b.title.trim(),b.category,user.display_name,b.audience,b.pinned,b.content];
 const result=match ? await db.query("update announcements704 set title=$1,category=$2,author=$3,audience=$4,pinned=$5,content=$6 where id=$7 returning *",[...values,match[1]]) : await db.query("insert into announcements704(title,category,author,audience,pinned,content,id) values($1,$2,$3,$4,$5,$6,$7) returning *",[...values,randomUUID()]);
 if(!result.rows[0]) fail(404,"找不到公告");
 return send(200,result.rows[0]);
 }
 if(match && req.method==="DELETE") {
 const result=await db.query("delete from announcements704 where id=$1 returning id",[match[1]]);
 if(!result.rowCount) fail(404,"找不到公告");
 return send(200,{ok:true});
 }
 fail(404,"找不到此功能");
 } catch(error) {
 if (!error.status) console.error("API/database operation failed");
 send(error.status || 503,{message:error.status ? error.message : "服務暫時無法使用，請稍後再試"});
 }
});
server.requestTimeout=30000;
server.headersTimeout=15000;
server.listen(7040,"0.0.0.0",()=>console.log("704 API ready on port 7040"));
const cleanup=setInterval(()=>{ for(const [key,value] of attempts) if(value.until<Date.now()) attempts.delete(key); db.query("delete from sessions704 where expires_at<now()").catch(()=>{}); },60000);
cleanup.unref();
