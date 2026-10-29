import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {db} from './db.mjs';
import {hash} from './password.mjs';
const prefix='school-check-'+randomUUID(),accounts=[],homework=[],records=[],plans=[],rooms=[],subjects=[],activities=[];
let previousChat;
async function request(path,method='GET',data,token){const r=await fetch('http://127.0.0.1:7040'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})});return {status:r.status,value:await r.json()};}
async function fixture(role,suffix=role){const id=randomUUID(),email=prefix+'-'+suffix;accounts.push(id);await db.query('insert into accounts704(id,email,display_name,role,password_hash) values($1,$2,$3,$4,$5)',[id,email,email,role,await hash('x')]);const r=await request('/login','POST',{email,password:'x',portal:role==='assistant'?'teacher':role});assert.equal(r.status,200);return {id,token:r.value.token};}
try{
 const admin=await fixture('admin'),teacher=await fixture('teacher'),assistant=await fixture('assistant'),a=await fixture('student','a'),b=await fixture('student','b'),outsider=await fixture('student','outsider');
 previousChat=(await request('/school/chat-settings','GET',undefined,admin.token)).value.enabled;
 const call=(actor,path,method='GET',data)=>request('/school/'+path,method,data,actor.token);
 assert.equal((await call(teacher,'subjects','POST',{name:prefix})).status,403);
 const subject=await call(admin,'subjects','POST',{name:prefix});if(subject.value.id)subjects.push(subject.value.id);assert.equal(subject.status,201);
 assert.equal((await call(a,'students')).status,403);assert.equal((await call(assistant,'students')).status,200);
 const batch={subject_id:subject.value.id,work_day:'2030-01-01',recipients:null,items:[{title:prefix+' work1',due_on:'2030-01-02'},{title:prefix+' work2',due_on:'2030-01-03'}]};
 const hw=await call(assistant,'homework','POST',batch);if(Array.isArray(hw.value))homework.push(...hw.value.map(h=>h.id));assert.equal(hw.status,201);assert.equal(hw.value.length,2);
 const assigned=await call(teacher,'homework','POST',{...batch,recipients:[a.id],items:[batch.items[0]]});if(Array.isArray(assigned.value))homework.push(...assigned.value.map(h=>h.id));assert.equal(assigned.status,201);
 assert.equal((await call(b,`homework/${assigned.value[0].id}/check`,'PATCH',{done:true})).status,404);
 assert.equal((await call(a,`homework/${hw.value[0].id}/check`,'PATCH',{done:true})).status,200);
 assert.equal((await call(a,'homework')).value.find(h=>h.id===hw.value[0].id).done,true);
 assert.equal((await call(b,'homework')).value.find(h=>h.id===hw.value[0].id).done,false);
 assert.ok(!(await call(b,'homework')).value.some(h=>h.id===assigned.value[0].id));
 assert.equal((await call(assistant,'homework/'+assigned.value[0].id,'PATCH',{title:'forbidden',due_on:'2030-01-03'})).status,403);
 assert.equal((await call(a,'homework','POST',batch)).status,403);
 const invalid=await call(teacher,'homework','POST',{...batch,items:[batch.items[0],{title:prefix+' rollback',due_on:'bad'}]});assert.equal(invalid.status,400);
 assert.equal((await db.query('select count(*)::int as n from school_homework where title like $1',[prefix+'%'])).rows[0].n,3);
 for(const kind of ['missing','feedback']){
 const r=await call(teacher,'records','POST',{kind,students:[a.id],title:prefix+' '+kind,content:'private fixture',record_day:'2030-01-01',due_on:kind==='missing'?'2030-01-03':null,subject_id:subject.value.id});if(Array.isArray(r.value))records.push(...r.value.map(x=>x.id));assert.equal(r.status,201);
 }
 assert.ok((await call(a,'records')).value.some(r=>r.id===records[0]));assert.ok(!(await call(b,'records')).value.some(r=>records.includes(r.id)));
 assert.equal((await call(assistant,'records')).status,403);assert.equal((await call(a,'records/'+records[0],'PATCH',{resolved:true})).status,403);
 assert.equal((await call(teacher,'records/'+records[0],'PATCH',{resolved:true})).status,200);
 const planData={title:prefix,start_at:'2030-01-01T01:00:00Z',end_at:'2030-01-02T02:00:00Z',done:false};
 const p=await call(a,'plans','POST',planData);if(p.value.id)plans.push(p.value.id);assert.equal(p.status,201);
 assert.ok(!(await call(b,'plans')).value.some(x=>x.id===p.value.id));assert.equal((await call(b,'plans/'+p.value.id,'DELETE')).status,404);
 assert.equal((await call(a,'plans/'+p.value.id,'PATCH',{...planData,done:true})).status,200);
 assert.equal((await call(a,'plans','POST',{...planData,end_at:'2029-01-01T00:00:00Z'})).status,400);
 const activity=await request('/countdowns','POST',{title:prefix,target_at:'2030-01-01T00:00:00Z',ends_at:'2030-01-02T00:00:00Z'},teacher.token);if(activity.value.id)activities.push(activity.value.id);assert.equal(activity.status,200);assert.ok(activity.value.ends_at);
 assert.equal((await request('/countdowns','POST',{title:prefix,target_at:'2030-01-03T00:00:00Z',ends_at:'2030-01-02T00:00:00Z'},teacher.token)).status,400);
 await call(admin,'chat-settings','PATCH',{enabled:true});
 const direct=await call(a,'rooms','POST',{kind:'direct',members:[b.id]});if(direct.value.id)rooms.push(direct.value.id);assert.equal(direct.status,201);
 const repeat=await call(b,'rooms','POST',{kind:'direct',members:[a.id]});assert.equal(repeat.value.id,direct.value.id);
 const msg=await call(a,`rooms/${direct.value.id}/messages`,'POST',{content:'<script>literal text</script>'});assert.equal(msg.status,201);
 assert.equal((await call(outsider,`rooms/${direct.value.id}/messages`)).status,403);
 assert.equal((await call(outsider,`rooms/${direct.value.id}/messages`,'POST',{content:'forbidden'})).status,403);
 assert.equal((await call(b,'messages/'+msg.value.id,'DELETE')).status,403);
 assert.equal((await call(outsider,'messages/'+msg.value.id+'/report','POST',{reason:'forbidden'})).status,403);
 const report=await call(b,'messages/'+msg.value.id+'/report','POST',{reason:prefix});assert.equal(report.status,201);
 assert.equal((await call(a,'reports')).status,403);assert.ok((await call(admin,'reports')).value.some(r=>r.id===report.value.id));
 assert.equal((await call(admin,'reports/'+report.value.id,'PATCH',{remove_message:true})).status,200);
 assert.equal((await call(b,`rooms/${direct.value.id}/messages`)).value[0].deleted,true);
 await db.query("insert into school_messages(id,room_id,author_id,author_name,content) select gen_random_uuid(),$1,$2,$3,'history fixture' from generate_series(1,201)",[direct.value.id,a.id,prefix]);
 const recent=await call(a,`rooms/${direct.value.id}/messages`);assert.equal(recent.value.length,200);
 const earlier=await call(a,`rooms/${direct.value.id}/messages?before=${recent.value[0].id}`);assert.equal(earlier.value.length,2);
 assert.ok(!earlier.value.some(m=>recent.value.some(x=>x.id===m.id)));
 const group=await call(a,'rooms','POST',{kind:'group',title:prefix,members:[b.id]});if(group.value.id)rooms.push(group.value.id);assert.equal(group.status,201);
 assert.equal((await call(b,`rooms/${group.value.id}/members`,'POST',{members:[outsider.id]})).status,403);
 assert.equal((await call(a,`rooms/${group.value.id}/members`,'POST',{members:[outsider.id]})).status,200);
 assert.equal((await call(outsider,`rooms/${group.value.id}/messages`)).status,200);
 assert.equal((await call(outsider,`rooms/${group.value.id}/leave`,'POST',{})).status,200);
 assert.equal((await call(outsider,`rooms/${group.value.id}/messages`)).status,403);
 await call(admin,'chat-settings','PATCH',{enabled:false});
 assert.equal((await call(a,`rooms/${group.value.id}/messages`,'POST',{content:'blocked'})).status,403);
 assert.equal((await call(a,'rooms','POST',{kind:'group',title:prefix,members:[b.id]})).status,403);
 assert.equal((await call(teacher,'rooms')).status,403);
 console.log('PASS: subjects/admin boundaries, homework targeting and private completion, atomic batch rollback, private student records, personal calendar isolation, activity end times, direct/group membership, chat moderation and disable controls');
}finally{
 if(typeof previousChat==='boolean')await db.query('update school_chat_settings set enabled=$1 where id=1',[previousChat]);
 await db.query('delete from school_rooms where id=any($1::uuid[])',[rooms]);
 await db.query('delete from school_records where id=any($1::uuid[])',[records]);
 await db.query('delete from school_homework where id=any($1::uuid[])',[homework]);
 await db.query('delete from school_plans where id=any($1::uuid[])',[plans]);
 await db.query('delete from countdowns704 where id=any($1::uuid[])',[activities]);
 await db.query('delete from school_subjects where id=any($1::uuid[])',[subjects]);
 await db.query('delete from accounts704 where id=any($1::uuid[])',[accounts]);
 await db.end();console.log('School fixtures cleaned up');
}
