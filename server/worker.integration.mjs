import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {db} from './db.mjs';
import {hash} from './password.mjs';
const base='https://704-announcement-api.easonlin2013927.workers.dev',origin='https://easonlin2013927.github.io';
const ids=[],subjects=[],homework=[],records=[],plans=[],rooms=[],prefix='worker-check-'+randomUUID();
async function request(path,method='GET',value,token){const r=await fetch(base+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(value===undefined?{}:{body:JSON.stringify(value)})});assert.equal(r.headers.get('Access-Control-Allow-Origin'),origin);assert.equal(r.headers.get('Cache-Control'),'no-store');return {status:r.status,value:await r.json()};}
async function account(role,suffix=role){const id=randomUUID(),email=prefix+'-'+suffix;ids.push(id);await db.query('insert into accounts704(id,email,display_name,role,password_hash) values($1,$2,$3,$4,$5)',[id,email,email,role,await hash('x')]);const r=await request('/login','POST',{email,password:'x',portal:role==='assistant'?'teacher':role});assert.equal(r.status,200);return {id,email,token:r.value.token};}
try{
 const preflight=await fetch(base+'/login',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}});assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),origin);
 assert.equal((await request('/health')).value.status,'ok');
 const admin=await account('admin'),teacher=await account('teacher'),assistant=await account('assistant'),a=await account('student','a'),b=await account('student','b');
 assert.equal((await request('/me','GET',undefined,a.token)).value.id,a.id);
 assert.equal((await request('/admin/accounts','GET',undefined,assistant.token)).status,403);
 assert.equal((await request('/admin/accounts','GET',undefined,a.token)).status,403);
 const s=await request('/school/subjects','POST',{name:prefix},admin.token);if(s.value.id)subjects.push(s.value.id);assert.equal(s.status,201);
 const hw=await request('/school/homework','POST',{subject_id:s.value.id,work_day:'2030-01-01',recipients:[a.id],items:[{title:prefix,due_on:'2030-01-02'}]},assistant.token);if(Array.isArray(hw.value))homework.push(...hw.value.map(h=>h.id));assert.equal(hw.status,201);
 assert.equal((await request('/school/homework/'+hw.value[0].id+'/check','PATCH',{done:true},a.token)).status,200);
 assert.ok(!(await request('/school/homework','GET',undefined,b.token)).value.some(h=>h.id===hw.value[0].id));
 const record=await request('/school/records','POST',{kind:'feedback',students:[a.id],title:prefix,content:'private worker fixture',record_day:'2030-01-01'},teacher.token);if(Array.isArray(record.value))records.push(...record.value.map(r=>r.id));assert.equal(record.status,201);
 assert.ok(!(await request('/school/records','GET',undefined,b.token)).value.some(r=>records.includes(r.id)));
 const plan=await request('/school/plans','POST',{title:prefix,start_at:'2030-01-01T00:00:00Z',end_at:'2030-01-01T01:00:00Z',done:false},a.token);if(plan.value.id)plans.push(plan.value.id);assert.equal(plan.status,201);
 const settings=await request('/school/chat-settings','GET',undefined,a.token);
 if(settings.value.enabled){const room=await request('/school/rooms','POST',{kind:'direct',members:[b.id]},a.token);if(room.value.id)rooms.push(room.value.id);assert.equal(room.status,201);const message=await request(`/school/rooms/${room.value.id}/messages`,'POST',{content:prefix},a.token);assert.equal(message.status,201);assert.ok((await request(`/school/rooms/${room.value.id}/messages`,'GET',undefined,b.token)).value.some(m=>m.id===message.value.id));}
 assert.equal((await request('/logout','POST',undefined,a.token)).status,200);
 assert.equal((await request('/me','GET',undefined,a.token)).status,401);
 const denied=await fetch(base+'/health',{headers:{Origin:'https://untrusted.example'}});assert.equal(denied.status,403);
 console.log('PASS: public Worker HTTPS, CORS preflight, login/logout, role restrictions, homework targeting, private records/calendar, chat message forwarding');
}finally{
 await db.query('delete from school_rooms where id=any($1::uuid[])',[rooms]);
 await db.query('delete from school_records where id=any($1::uuid[])',[records]);
 await db.query('delete from school_homework where id=any($1::uuid[])',[homework]);
 await db.query('delete from school_plans where id=any($1::uuid[])',[plans]);
 await db.query('delete from school_subjects where id=any($1::uuid[])',[subjects]);
 await db.query('delete from accounts704 where id=any($1::uuid[])',[ids]);
 await db.end();console.log('Worker fixtures cleaned up');
}
