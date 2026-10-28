// Run inside the API container against its local API. Only temporary fixture IDs are removed.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { db } from './db.mjs';
import { hash } from './password.mjs';
const ids=[];
const prefix='account-check-'+randomUUID();
async function request(path,method='GET',data,token){
 const response=await fetch('http://127.0.0.1:7040'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})});
 const value=await response.json();
 if(path==='/admin/accounts'&&method==='POST'&&value.id)ids.push(value.id);
 return {status:response.status,value};
}
async function fixture(role){
 const id=randomUUID(),email=prefix+'-'+role;ids.push(id);
 await db.query('insert into accounts704(id,email,display_name,role,password_hash) values($1,$2,$3,$4,$5)',[id,email,email,role,await hash('x')]);
 const login=await request('/login','POST',{email,password:'x',portal:role});assert.equal(login.status,200);return login.value.token;
}
try{
 const teacher=await fixture('teacher'),admin=await fixture('admin');
 const student=await request('/admin/accounts','POST',{email:prefix+'-student',name:'',role:'student',password:'x'},teacher);
 assert.equal(student.status,201);assert.equal(student.value.display_name,prefix+'-student');
 const login=await request('/login','POST',{email:student.value.email,password:'x',portal:'student'});assert.equal(login.status,200);
 const list=await request('/admin/accounts','GET',undefined,teacher);assert.equal(list.status,200);
 assert.ok(list.value.some(row=>row.id===student.value.id));assert.ok(list.value.every(row=>row.role==='student'&&!('password_hash' in row)));
 for(const role of ['admin','teacher'])assert.equal((await request('/admin/accounts','POST',{email:prefix+'-'+role+'-forbidden',name:'',role,password:'x'},teacher)).status,403);
 assert.equal((await request('/admin/accounts','GET',undefined,login.value.token)).status,403);
 assert.equal((await request('/admin/accounts','POST',{email:prefix+'-forbidden',name:'',role:'student',password:''},login.value.token)).status,403);
 assert.equal((await request('/admin/accounts/'+student.value.id,'PATCH',{name:'changed',role:'admin'},teacher)).status,403);
 assert.equal((await request('/admin/accounts/'+student.value.id,'DELETE',undefined,teacher)).status,403);
 for(const [suffix,password] of [['blank',''],['long','p'.repeat(600)]]){
  const account=await request('/admin/accounts','POST',{email:prefix+'-'+suffix,name:'n'.repeat(100),role:'student',password},teacher);assert.equal(account.status,201);
  assert.equal((await request('/login','POST',{email:account.value.email,password,portal:'student'})).status,200);
 }
 const extra=await request('/admin/accounts','POST',{email:prefix+'@arbitrary',name:'',role:'admin',password:''},admin);assert.equal(extra.status,201);
 assert.equal((await request('/login','POST',{email:extra.value.email,password:'',portal:'admin'})).status,200);
 assert.equal((await request('/admin/accounts','POST',{email:student.value.email,name:'',role:'student',password:''},teacher)).status,409);
 console.log('PASS: unrestricted account formats/password lengths, teacher student creation, role boundaries, duplicate handling');
}finally{
 await db.query('delete from accounts704 where id=any($1::uuid[])',[ids]);
 await db.end();
 console.log('Temporary account fixtures cleaned up');
}
