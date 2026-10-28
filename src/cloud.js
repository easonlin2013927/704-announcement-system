import { config } from "./config.js";
let token = null;
async function request(path, options = {}) {
  if (!config.url) throw new Error("系統尚未設定雲端服務，請聯絡管理員。");
  let response;
  try {
    response = await fetch(config.url.replace(/\/$/, "") + path, {
      ...options,
      headers: { ...(token ? { Authorization: "Bearer " + token } : {}),
        "Content-Type": "application/json", ...options.headers },
      cache: "no-store",
    });
  } catch { throw new Error("無法連接公告服務，請確認網路或聯絡管理員。"); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "雲端操作失敗，請稍後重試。");
  return data;
}
export const cloud = {
  async login(email, password, portal) {
    token = null;
    const result = await request("/login", { method: "POST", body: JSON.stringify({ email, password, portal }) });
    token = result.token;
    return result.profile;
  },
  logout() {
    if (token) request("/logout", { method: "POST" }).catch(() => {});
    token = null;
  },
  async list() {
    const rows = await request("/announcements");
    return rows.map(row => ({ ...row, authorInitial: row.author.charAt(0) }));
  },
  async save(item, editing) {
    const row = await request("/announcements" + (editing ? "/" + encodeURIComponent(item.id) : ""), {
      method: editing ? "PATCH" : "POST", body: JSON.stringify(item),
    });
    Object.assign(item, row, { authorInitial: row.author.charAt(0) });
  },
  async remove(id) {
    await request("/announcements/" + encodeURIComponent(id), { method: "DELETE" });
  },
  status() { return request("/admin/status"); },
  publicBanner() { return request("/public/banner"); },
  bannerSettings() { return request("/settings/banner"); },
  saveBanner(value) { return request("/settings/banner", { method: "PUT", body: JSON.stringify(value) }); },
};
