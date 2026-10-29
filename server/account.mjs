import { db, migrate } from "./db.mjs";
import { hash } from "./password.mjs";
import { randomUUID } from "node:crypto";
// JSON is supplied through stdin, never through shell arguments or Git.
try {
 let input = ""; for await (const chunk of process.stdin) input += chunk;
 const { email, password, name, role } = JSON.parse(input);
 if (typeof email !== "string" || !email.trim() || !["teacher","assistant","student","admin"].includes(role) || typeof password !== "string") throw new Error("Invalid input");
 await migrate();
 await db.query("insert into accounts704 (id,email,display_name,role,password_hash) values($1,$2,$3,$4,$5) on conflict(email) do update set display_name=excluded.display_name, role=excluded.role, password_hash=excluded.password_hash", [randomUUID(),email.trim().toLowerCase(),typeof name==="string"&&name.trim()?name.trim():email.trim(),role,await hash(password)]);
 await db.query("delete from sessions704 where account_id in (select id from accounts704 where email=$1)",[email.trim().toLowerCase()]);
 console.log("Account saved; previous sessions revoked.");
} catch { console.error("Account setup failed. Check JSON fields and database connection."); process.exitCode = 1; }
finally { await db.end(); }
