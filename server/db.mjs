import pg from "pg";
export const db = new pg.Pool({ host: process.env.PGHOST, port: Number(process.env.PGPORT || 5432), database: process.env.PGDATABASE, user: process.env.PGUSER, password: process.env.PGPASSWORD, max: 5, connectionTimeoutMillis: 10000 });
db.on("error", () => console.error("Database connection interrupted"));
export async function migrate() {
 await db.query(`create table if not exists countdowns704 (id uuid primary key, title text not null, target_at timestamptz not null, created_at timestamptz not null default now());`);
 await db.query(`create table if not exists accounts704 (
 id uuid primary key, email text unique not null, display_name text not null,
 role text not null check(role in ('teacher','student','admin')), password_hash text not null);
 create table if not exists announcements704 (
 id uuid primary key, title text not null, category text not null, author text not null,
 audience text not null, date timestamptz not null default now(), pinned boolean not null default false, content text not null);
 create table if not exists sessions704 (
 token_hash text primary key, account_id uuid not null references accounts704(id) on delete cascade,
 expires_at timestamptz not null);
 create table if not exists login_banner704 (
 id integer primary key check (id=1), enabled boolean not null default false,
 content text not null default '', updated_at timestamptz not null default now());
 insert into login_banner704 (id) values(1) on conflict do nothing;`);
 await db.query("update announcements704 set audience='學生' where audience in ('全校學生','七年級','八年級','九年級')");
 await db.query(`create table if not exists site_marquee704 (
 id integer primary key check (id=1), enabled boolean not null default false,
 content text not null default '', updated_at timestamptz not null default now());
 insert into site_marquee704 (id) values(1) on conflict do nothing;`);
 // Atomic constraint migration preserves existing accounts and announcements.
 await db.query(`begin;
 alter table accounts704 drop constraint if exists accounts704_role_check;
 alter table accounts704 add constraint accounts704_role_check check (role in ('teacher','student','admin'));
 commit;`);
}
