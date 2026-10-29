import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {db} from './db.mjs';
import {hash} from './password.mjs';
const ids=[],posts=[],events=[],prefix='assistant-check-'+randomUUID();
async function request(path,method='GET',data,token){
 const response=await fetch('http://127.0.0.1:7040'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})});
 return {status:response.status,value:await response.json()};
}
try{
 const adminId=randomUUID();ids.push(adminId);
 await db.query('insert into accounts704(id,email,display_name,role,password_hash) values($1,$2,$3,$4,$5)',[adminId,prefix+'-admin','Role check admin','admin',await hash('x')]);
 const admin=(await request('/login','POST',{email:prefix+'-admin',password:'x',portal:'admin'})).value.token;
 const created=await request('/admin/accounts','POST',{email:prefix+'-assistant',name:'Role check assistant',role:'assistant',password:'x'},admin);
 if(created.value.id)ids.push(created.value.id);
 assert.equal(created.status,201);assert.equal(created.value.role,'assistant');
 for(const portal of ['student','admin','assistant']) assert.equal((await request('/login','POST',{email:created.value.email,password:'x',portal})).status,403);
 const login=await request('/login','POST',{email:created.value.email,password:'x',portal:'teacher'});
 assert.equal(login.status,200);assert.equal(login.value.profile.role,'assistant');const token=login.value.token;
 assert.equal((await request('/admin/accounts','GET',undefined,token)).status,403);
 assert.equal((await request('/admin/accounts','POST',{email:prefix+'-forbidden',role:'student',password:'x'},token)).status,403);
 assert.equal((await request('/admin/accounts/'+adminId,'PATCH',{name:'forbidden'},token)).status,403);
 assert.equal((await request('/admin/accounts/'+adminId,'DELETE',undefined,token)).status,403);
 assert.equal((await request('/admin/status','GET',undefined,token)).status,403);
 assert.equal((await request('/settings/banner','GET',undefined,token)).status,403);
 const article={title:prefix,category:'general',audience:'學生',pinned:false,content:'<p>Role fixture</p>',comments_enabled:true};
 const post=await request('/announcements','POST',article,token);if(post.value.id)posts.push(post.value.id);
 assert.equal(post.status,200);assert.equal(post.value.author_id,created.value.id);
 assert.equal((await request('/announcements/'+post.value.id,'PATCH',{...article,title:prefix+' edited'},token)).status,200);
 const event=await request('/countdowns','POST',{title:prefix,target_at:'2030-01-01T00:00:00Z'},token);if(event.value.id)events.push(event.value.id);
 assert.equal(event.status,200);
 assert.equal((await request('/countdowns/'+event.value.id,'PATCH',{title:prefix+' edited',target_at:'2030-02-01T00:00:00Z'},token)).status,200);
 assert.equal((await request('/countdowns/'+event.value.id,'DELETE',undefined,token)).status,200);
 assert.equal((await request('/announcements/'+post.value.id,'DELETE',undefined,token)).status,200);
 assert.equal((await request('/admin/accounts/'+created.value.id,'PATCH',{disabled:true},admin)).status,200);
 assert.equal((await request('/announcements','GET',undefined,token)).status,401);
 console.log('PASS: assistant teacher-entry login, announcement/activity publishing, forbidden account and site administration, disabled-session revocation');
}finally{
 await db.query('delete from announcements704 where id=any($1::uuid[])',[posts]);
 await db.query('delete from countdowns704 where id=any($1::uuid[])',[events]);
 await db.query('delete from accounts704 where id=any($1::uuid[])',[ids]);
 await db.end();console.log('Assistant fixtures cleaned up');
}
