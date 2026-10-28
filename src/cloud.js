import { config } from "./config.js";
let token = null;
async function request(path, options = {}) {
  if (!config.url || !config.publicKey) throw new Error("系統尚未設定雲端服務，請聯絡管理員。");
  const response = await fetch(config.url.replace(/\/$/, "") + path, {
    ...options,
    headers: { apikey: config.publicKey, ...(token ? { Authorization: "Bearer " + token } : {}),
      "Content-Type": "application/json", ...options.headers },
    cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("登入失效或帳號密碼錯誤，請重新登入。");
    if (response.status === 403) throw new Error("沒有操作權限，請聯絡管理員。");
    throw new Error("雲端操作失敗，資料尚未確認儲存，請稍後重試。");
  }
  return response.status === 204 ? null : response.json();
}
export const cloud = {
  async login(email, password) {
    token = null;
    const auth = await request("/auth/v1/token?grant_type=password", {
      method: "POST", body: JSON.stringify({ email, password }),
    });
    token = auth.access_token;
    const profiles = await request("/rest/v1/profiles?id=eq." + encodeURIComponent(auth.user.id) + "&select=role,display_name");
    if (!profiles[0]) { token = null; throw new Error("帳號尚未完成角色設定，請聯絡管理員。"); }
    return profiles[0];
  },
  logout() { token = null; },
  async list() {
    const rows = await request("/rest/v1/announcements?select=*&order=date.desc");
    return rows.map(row => ({ ...row, authorInitial: row.author.charAt(0) }));
  },
  async save(item, editing) {
    const { authorInitial, ...row } = item;
    await request("/rest/v1/announcements" + (editing ? "?id=eq." + encodeURIComponent(item.id) : ""), {
      method: editing ? "PATCH" : "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify(row),
    }).then(rows => { if (!rows?.length) throw new Error("公告未儲存，請確認權限後重新整理。"); });
  },
  async remove(id) {
    const rows = await request("/rest/v1/announcements?id=eq." + encodeURIComponent(id), {
      method: "DELETE", headers: { Prefer: "return=representation" },
    });
    if (!rows?.length) throw new Error("公告未刪除，請確認權限後重新整理。");
  },
};
