import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {db} from './db.mjs';
import {hash} from './password.mjs';
const users=[],posts=[],prefix='community-check-'+randomUUID();
const avatar='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aMZkAAAAASUVORK5CYII=';
async function call(path,method='GET',body,token){const response=await fetch('http://127.0.0.1:7040'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const data=await response.json();if(path==='/announcements'&&method==='POST'&&data.id)posts.push(data.id);return {status:response.status,data};}
async function account(role,suffix){const id=randomUUID(),name=prefix+'-'+suffix;users.push(id);await db.query('insert into accounts704(id,email,display_name,role,password_hash) values($1,$2,$3,$4,$5)',[id,name,name,role,await hash('x')]);const login=await call('/login','POST',{email:name,password:'x',portal:role});assert.equal(login.status,200);assert.equal(login.data.profile.id,id);return {id,name,token:login.data.token};}
try{
 const owner=await account('teacher','owner'),other=await account('teacher','other'),student=await account('student','student'),second=await account('student','second'),admin=await account('admin','admin');
 const settings={nickname:'小星',theme:'forest',avatar_url:avatar};
 assert.equal((await call('/me','PATCH',settings,student.token)).status,200);
 const me=await call('/me','GET',undefined,student.token);assert.equal(me.data.nickname,'小星');assert.equal(me.data.theme,'forest');assert.equal(me.data.avatar_url,avatar);assert.equal(me.data.display_name,student.name);
 const again=await call('/login','POST',{email:student.name,password:'x',portal:'student'});assert.equal(again.data.profile.theme,'forest');assert.equal(again.data.profile.nickname,'小星');
 assert.equal((await call('/me','PATCH',{...settings,theme:'bad'},student.token)).status,400);
 assert.equal((await call('/me','PATCH',{...settings,avatar_url:'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='},student.token)).status,400);
 assert.equal((await call('/me','PATCH',{...settings,role:'admin',display_name:'changed'},student.token)).data.role,'student');
 const post={title:prefix,category:'general',audience:'學生',content:'<p>fixture</p>',pinned:false,comments_enabled:false};
 const created=await call('/announcements','POST',post,owner.token);assert.equal(created.status,200);assert.equal(created.data.author_id,owner.id);const id=created.data.id;
 assert.equal((await call('/announcements/'+id+'/comments','POST',{content:'closed'},student.token)).status,403);
 assert.equal((await call('/announcements/'+id,'PATCH',{...post,comments_enabled:true},other.token)).status,403);
 assert.equal((await call('/announcements/'+id,'PATCH',{...post,comments_enabled:true},owner.token)).status,200);
 const comment=await call('/announcements/'+id+'/comments','POST',{content:'<script>plain text</script>'},student.token);assert.equal(comment.status,201);
 let list=await call('/announcements/'+id+'/comments','GET',undefined,second.token);assert.equal(list.data.comments[0].nickname,'小星');assert.equal(list.data.comments[0].avatar_url,avatar);assert.equal(list.data.comments[0].author,student.name);assert.equal(list.data.comments[0].can_delete,false);
 assert.equal((await call('/announcements/'+id+'/comments/'+comment.data.id,'DELETE',undefined,second.token)).status,403);
 assert.equal((await call('/announcements/'+id,'PATCH',post,owner.token)).status,200);
 list=await call('/announcements/'+id+'/comments','GET',undefined,student.token);assert.equal(list.data.enabled,false);assert.equal(list.data.comments.length,0);assert.equal(Number((await db.query('select count(*) from comments704 where announcement_id=$1',[id])).rows[0].count),1);
 assert.equal((await call('/announcements/'+id,'PATCH',{...post,comments_enabled:true},admin.token)).status,200);
 assert.equal((await call('/announcements/'+id+'/comments/'+comment.data.id,'DELETE',undefined,owner.token)).status,200);
 const own=await call('/announcements/'+id+'/comments','POST',{content:'own'},student.token);assert.equal((await call('/announcements/'+id+'/comments/'+own.data.id,'DELETE',undefined,student.token)).status,200);
 const privatePost=await call('/announcements','POST',{...post,audience:'教師',comments_enabled:true},owner.token);assert.equal((await call('/announcements/'+privatePost.data.id+'/comments','GET',undefined,student.token)).status,403);assert.equal((await call('/announcements/'+privatePost.data.id+'/comments','POST',{content:'no'},student.token)).status,403);
 assert.equal((await call('/announcements/'+id+'/comments','POST',{content:'empty'},undefined)).status,401);
 assert.equal((await call('/me','PATCH',{nickname:'作者暱稱',theme:'light',avatar_url:avatar},owner.token)).status,200);
 const announcements=await call('/announcements','GET',undefined,student.token);const published=announcements.data.find(row=>row.id===id);assert.equal(published.author_nickname,'作者暱稱');assert.equal(published.author_avatar,avatar);
 console.log('PASS: profile persistence, avatar validation, role protection, comment ownership, audience isolation, closed-comment retention, nickname/avatar display');
}finally{await db.query('delete from announcements704 where id=any($1::uuid[])',[posts]);await db.query('delete from accounts704 where id=any($1::uuid[])',[users]);await db.end();console.log('Community fixtures cleaned up');}
