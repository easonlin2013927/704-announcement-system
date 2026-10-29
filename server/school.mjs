import { randomUUID } from 'node:crypto';
import { db } from './db.mjs';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const text=(value,max=2000)=>{if(typeof value!=='string'||!value.trim()||value.trim().length>max)fail(400,`請填寫內容（最多 ${max} 字）`);return value.trim();};
const date=value=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)fail(400,'日期格式錯誤');return value;};
const time=value=>{if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))fail(400,'時間格式錯誤');return new Date(value).toISOString();};
const staff=user=>['teacher','assistant','admin'].includes(user.role);
const teacher=user=>['teacher','admin'].includes(user.role);
const requireRole=(allowed)=>{if(!allowed)fail(403,'沒有使用此功能的權限');};
async function transaction(action){const c=await db.connect();try{await c.query('begin');const result=await action(c);await c.query('commit');return result;}catch(error){await c.query('rollback');throw error;}finally{c.release();}}
async function students(ids,c=db){if(!Array.isArray(ids)||!ids.length||ids.some(id=>!uuid(id)))fail(400,'請選擇學生');const unique=[...new Set(ids)];const found=await c.query("select id from accounts704 where id=any($1::uuid[]) and role='student' and not disabled",[unique]);if(found.rowCount!==unique.length)fail(400,'選擇的學生不存在或已停用');return unique;}
async function membership(id,user,c=db){if(!uuid(id))fail(400,'交談格式錯誤');const row=(await c.query('select r.* from school_rooms r join school_members m on m.room_id=r.id where r.id=$1 and m.account_id=$2',[id,user.id])).rows[0];if(!row)fail(403,'你不是此交談的成員');return row;}
async function chatOpen(c=db){const row=(await c.query('select enabled from school_chat_settings where id=1')).rows[0];if(!row.enabled)fail(403,'管理員目前已停用聊天');}
export async function migrateSchool(){await db.query(`
 alter table countdowns704 add column if not exists ends_at timestamptz;
 create table if not exists school_subjects(id uuid primary key,name text not null unique,active boolean not null default true);
 create table if not exists school_homework(id uuid primary key,subject_id uuid not null references school_subjects(id),author_id uuid references accounts704(id) on delete set null,title text not null,work_day date not null,due_on date not null,recipients uuid[],created_at timestamptz not null default now());
 create table if not exists school_checks(homework_id uuid references school_homework(id) on delete cascade,student_id uuid references accounts704(id) on delete cascade,done boolean not null default false,updated_at timestamptz not null default now(),primary key(homework_id,student_id));
 create table if not exists school_records(id uuid primary key,kind text not null check(kind in ('missing','feedback')),student_id uuid not null references accounts704(id) on delete cascade,author_id uuid references accounts704(id) on delete set null,subject_id uuid references school_subjects(id),title text not null,content text not null default '',record_day date not null,due_on date,resolved boolean not null default false,created_at timestamptz not null default now());
 create table if not exists school_plans(id uuid primary key,owner_id uuid not null references accounts704(id) on delete cascade,title text not null,start_at timestamptz not null,end_at timestamptz not null,done boolean not null default false);
 create table if not exists school_chat_settings(id integer primary key check(id=1),enabled boolean not null default true);
 insert into school_chat_settings(id) values(1) on conflict do nothing;
 create table if not exists school_rooms(id uuid primary key,title text not null,kind text not null check(kind in ('direct','group')),creator_id uuid references accounts704(id) on delete set null,direct_key text unique,created_at timestamptz not null default now());
 create table if not exists school_members(room_id uuid references school_rooms(id) on delete cascade,account_id uuid references accounts704(id) on delete cascade,primary key(room_id,account_id));
 create table if not exists school_messages(id uuid primary key,room_id uuid not null references school_rooms(id) on delete cascade,author_id uuid references accounts704(id) on delete set null,author_name text not null,content text not null,deleted boolean not null default false,created_at timestamptz not null default now());
 create index if not exists school_message_room on school_messages(room_id,created_at);
 create table if not exists school_reports(id uuid primary key,message_id uuid not null references school_messages(id) on delete cascade,reporter_id uuid references accounts704(id) on delete set null,reason text not null,resolved boolean not null default false,created_at timestamptz not null default now());
 create index if not exists school_records_student on school_records(student_id,record_day);
 create index if not exists school_plans_owner on school_plans(owner_id,start_at);
 `);}
export async function schoolRoutes({path,method,user,readBody,send}){
 const tail=path.slice('/school/'.length).split('/');const [resource,id,action]=tail;
 if(resource==='students'&&method==='GET'){requireRole(staff(user));return send(200,(await db.query("select id,display_name,nickname from accounts704 where role='student' and not disabled order by display_name")).rows);}
 if(resource==='subjects'){
  if(method==='GET')return send(200,(await db.query('select * from school_subjects order by name')).rows);
  requireRole(user.role==='admin');
  if(method==='POST'){const b=await readBody();try{return send(201,(await db.query('insert into school_subjects(id,name) values($1,$2) returning *',[randomUUID(),text(b.name,80)])).rows[0]);}catch(e){if(e.code==='23505')fail(409,'科目名稱已存在');throw e;}}
  if(method==='PATCH'&&uuid(id)){const b=await readBody();if(typeof b.active!=='boolean')fail(400,'請選擇啟用狀態');try{const r=await db.query('update school_subjects set name=$1,active=$2 where id=$3 returning *',[text(b.name,80),b.active,id]);if(!r.rowCount)fail(404,'找不到科目');return send(200,r.rows[0]);}catch(e){if(e.code==='23505')fail(409,'科目名稱已存在');throw e;}}
 }
 if(resource==='homework'){
  if(method==='GET')return send(200,(await db.query(`select h.*,s.name as subject,a.display_name as author,coalesce(c.done,false) as done from school_homework h join school_subjects s on s.id=h.subject_id left join accounts704 a on a.id=h.author_id left join school_checks c on c.homework_id=h.id and c.student_id=$1 ${user.role==='student'?'where h.recipients is null or $1=any(h.recipients)':''} order by h.work_day desc,h.created_at`,[user.id])).rows);
  if(method==='PATCH'&&uuid(id)&&action==='check'){
   requireRole(user.role==='student');const b=await readBody();if(typeof b.done!=='boolean')fail(400,'勾選格式錯誤');
   return send(200,await transaction(async c=>{const h=(await c.query('select * from school_homework where id=$1 for share',[id])).rows[0];if(!h||(h.recipients&&!h.recipients.includes(user.id)))fail(404,'找不到你的作業');return (await c.query('insert into school_checks(homework_id,student_id,done) values($1,$2,$3) on conflict(homework_id,student_id) do update set done=$3,updated_at=now() returning *',[id,user.id,b.done])).rows[0];}));
  }
  requireRole(staff(user));
  if(method==='POST'){
   const b=await readBody();if(!uuid(b.subject_id)||!Array.isArray(b.items)||!b.items.length||b.items.length>50)fail(400,'請選擇科目並新增 1 至 50 項作業');
   return send(201,await transaction(async c=>{if(!(await c.query('select id from school_subjects where id=$1 and active for share',[b.subject_id])).rowCount)fail(400,'科目未啟用');const recipients=b.recipients===null?null:await students(b.recipients,c);const day=date(b.work_day),rows=[];for(const item of b.items){const due=date(item.due_on);if(due<day)fail(400,'截止日期不能早於登錄日期');rows.push((await c.query('insert into school_homework(id,subject_id,author_id,title,work_day,due_on,recipients) values($1,$2,$3,$4,$5,$6,$7) returning *',[randomUUID(),b.subject_id,user.id,text(item.title,1000),day,due,recipients])).rows[0]);}return rows;}));
  }
  if(uuid(id)&&(method==='PATCH'||method==='DELETE'))return send(200,await transaction(async c=>{const h=(await c.query('select * from school_homework where id=$1 for update',[id])).rows[0];if(!h)fail(404,'找不到作業');requireRole(teacher(user)||h.author_id===user.id);if(method==='DELETE'){await c.query('delete from school_homework where id=$1',[id]);return {ok:true};}const b=await readBody(),due=date(b.due_on);if(due<new Date(h.work_day).toISOString().slice(0,10))fail(400,'截止日期不能早於登錄日期');return (await c.query('update school_homework set title=$1,due_on=$2 where id=$3 returning *',[text(b.title,1000),due,id])).rows[0];}));
 }
 if(resource==='records'){
  if(method==='GET'){requireRole(teacher(user)||user.role==='student');return send(200,(await db.query(`select r.*,a.display_name as student,s.name as subject,t.display_name as author from school_records r join accounts704 a on a.id=r.student_id left join school_subjects s on s.id=r.subject_id left join accounts704 t on t.id=r.author_id ${user.role==='student'?'where r.student_id=$1':''} order by r.record_day desc,r.created_at desc`,user.role==='student'?[user.id]:[])).rows);}
  requireRole(teacher(user));
  if(method==='POST'){const b=await readBody();if(!['missing','feedback'].includes(b.kind))fail(400,'紀錄類型錯誤');const subject=b.subject_id||null;if(subject&&!uuid(subject))fail(400,'科目格式錯誤');const content=b.content==null?'':typeof b.content==='string'&&b.content.length<=5000?b.content:fail(400,'評語最多 5000 字');return send(201,await transaction(async c=>{const selected=await students(b.students,c),rows=[];for(const student of selected)rows.push((await c.query('insert into school_records(id,kind,student_id,author_id,subject_id,title,content,record_day,due_on) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *',[randomUUID(),b.kind,student,user.id,subject,text(b.title,200),content,date(b.record_day),b.due_on?date(b.due_on):null])).rows[0]);return rows;}));}
  if(uuid(id)&&method==='PATCH'){const b=await readBody();if(typeof b.resolved!=='boolean')fail(400,'請設定補交狀態');const row=await db.query('update school_records set resolved=$1 where id=$2 returning *',[b.resolved,id]);if(!row.rowCount)fail(404,'找不到紀錄');return send(200,row.rows[0]);}
  if(uuid(id)&&method==='DELETE'){await db.query('delete from school_records where id=$1',[id]);return send(200,{ok:true});}
 }
 if(resource==='plans'){
  if(method==='GET')return send(200,(await db.query('select * from school_plans where owner_id=$1 order by start_at',[user.id])).rows);
  if(method==='POST'||(method==='PATCH'&&uuid(id))){const b=await readBody(),start=time(b.start_at),end=time(b.end_at);if(end<start)fail(400,'結束時間不能早於開始時間');if(typeof b.done!=='boolean')fail(400,'請設定完成狀態');const row=method==='POST'?await db.query('insert into school_plans(id,owner_id,title,start_at,end_at,done) values($1,$2,$3,$4,$5,$6) returning *',[randomUUID(),user.id,text(b.title,200),start,end,b.done]):await db.query('update school_plans set title=$1,start_at=$2,end_at=$3,done=$4 where id=$5 and owner_id=$6 returning *',[text(b.title,200),start,end,b.done,id,user.id]);if(!row.rowCount)fail(404,'找不到你的事項');return send(method==='POST'?201:200,row.rows[0]);}
  if(method==='DELETE'&&uuid(id)){const r=await db.query('delete from school_plans where id=$1 and owner_id=$2 returning id',[id,user.id]);if(!r.rowCount)fail(404,'找不到你的事項');return send(200,{ok:true});}
 }
 if(resource==='chat-settings'){
  if(method==='GET')return send(200,(await db.query('select enabled from school_chat_settings where id=1')).rows[0]);
  requireRole(user.role==='admin');if(method==='PATCH'){const b=await readBody();if(typeof b.enabled!=='boolean')fail(400,'設定格式錯誤');return send(200,(await db.query('update school_chat_settings set enabled=$1 where id=1 returning enabled',[b.enabled])).rows[0]);}
 }
 if(resource==='people'&&method==='GET'){requireRole(user.role==='student');return send(200,(await db.query("select id,display_name,nickname from accounts704 where role='student' and not disabled order by display_name")).rows);}
 if(resource==='rooms'){
  requireRole(user.role==='student');
  if(method==='GET'&&!id)return send(200,(await db.query(`select r.*, (select coalesce(json_agg(json_build_object('id',a.id,'name',a.display_name,'nickname',a.nickname)),'[]') from school_members x join accounts704 a on a.id=x.account_id where x.room_id=r.id) as members from school_rooms r join school_members m on m.room_id=r.id where m.account_id=$1 order by r.created_at desc`,[user.id])).rows);
  if(method==='POST'&&!id){const b=await readBody();if(!['direct','group'].includes(b.kind))fail(400,'請選擇私訊或群組');return send(201,await transaction(async c=>{await chatOpen(c);const members=await students([...new Set([user.id,...(Array.isArray(b.members)?b.members:[])])],c);if(members.length<2||(b.kind==='direct'&&members.length!==2))fail(400,'請選擇交談對象');const key=b.kind==='direct'?[...members].sort().join(':'):null;const title=b.kind==='group'?text(b.title,80):'私訊';const row=(await c.query('insert into school_rooms(id,title,kind,creator_id,direct_key) values($1,$2,$3,$4,$5) on conflict(direct_key) do update set direct_key=excluded.direct_key returning *',[randomUUID(),title,b.kind,user.id,key])).rows[0];for(const member of members)await c.query('insert into school_members values($1,$2) on conflict do nothing',[row.id,member]);return row;}));}
  if(uuid(id)&&action==='members'&&method==='POST'){const b=await readBody();return send(200,await transaction(async c=>{await chatOpen(c);const room=await membership(id,user,c);if(room.kind!=='group'||room.creator_id!==user.id)fail(403,'只有群組建立者可加入成員');for(const member of await students(b.members,c))await c.query('insert into school_members values($1,$2) on conflict do nothing',[id,member]);return {ok:true};}));}
  if(uuid(id)&&action==='leave'&&method==='POST'){const room=await membership(id,user);if(room.kind==='direct')fail(400,'私訊無須退出');await db.query('delete from school_members where room_id=$1 and account_id=$2',[id,user.id]);return send(200,{ok:true});}
  if(uuid(id)&&action==='messages'){
   await membership(id,user);
   if(method==='GET')return send(200,(await db.query(`select m.id,m.author_id,m.author_name,case when m.deleted then '此訊息已移除' else m.content end as content,m.deleted,m.created_at,a.nickname from school_messages m left join accounts704 a on a.id=m.author_id where room_id=$1 order by created_at desc,id desc limit 200`,[id])).rows.reverse());
   if(method==='POST'){const b=await readBody();return send(201,await transaction(async c=>{await chatOpen(c);await membership(id,user,c);return (await c.query('insert into school_messages(id,room_id,author_id,author_name,content) values($1,$2,$3,$4,$5) returning id',[randomUUID(),id,user.id,user.display_name,text(b.content,5000)])).rows[0];}));}
  }
 }
 if(resource==='messages'&&uuid(id)){
  const msg=(await db.query('select * from school_messages where id=$1',[id])).rows[0];if(!msg)fail(404,'找不到訊息');await membership(msg.room_id,user);
  if(method==='DELETE'){requireRole(msg.author_id===user.id);await db.query("update school_messages set deleted=true,content='' where id=$1",[id]);return send(200,{ok:true});}
  if(action==='report'&&method==='POST'){const b=await readBody();if(msg.deleted)fail(400,'訊息已移除');return send(201,(await db.query('insert into school_reports(id,message_id,reporter_id,reason) values($1,$2,$3,$4) returning id',[randomUUID(),id,user.id,text(b.reason,1000)])).rows[0]);}
 }
 if(resource==='reports'){
  requireRole(user.role==='admin');
  if(method==='GET')return send(200,(await db.query('select r.*,m.content,m.author_name,m.deleted from school_reports r join school_messages m on m.id=r.message_id order by r.created_at desc')).rows);
  if(method==='PATCH'&&uuid(id)){const b=await readBody();if(typeof b.remove_message!=='boolean')fail(400,'處理格式錯誤');return send(200,await transaction(async c=>{const report=(await c.query('update school_reports set resolved=true where id=$1 returning *',[id])).rows[0];if(!report)fail(404,'找不到檢舉');if(b.remove_message)await c.query("update school_messages set deleted=true,content='' where id=$1",[report.message_id]);return {ok:true};}));}
 }
 fail(404,'找不到此功能');
}
