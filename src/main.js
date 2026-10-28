import { cloud } from "./cloud.js?v=0.5.0";
import { portals, portalRole } from "./portal.js";

let activeRole = portalRole(location.hash);
window.addEventListener("hashchange", () => {
  cloud.logout();
  state.session = null;
  state.settingsOpen = false;
  state.selectedId = null;
  state.editingId = null;
  activeRole = portalRole(location.hash);
  render();
});

const categories = {
  important: { label: "重要通知", tone: "rose" },
  academic: { label: "課務資訊", tone: "indigo" },
  activity: { label: "活動消息", tone: "amber" },
  general: { label: "一般公告", tone: "slate" },
};


const state = {
  session: null,
  settingsOpen: false,
  banner: { enabled: false, content: "" },
  accounts: [],
  adminView: "dashboard",
  marquee: { enabled: false, content: "" },
  announcements: [],
  search: "",
  category: "all",
  selectedId: null,
  editingId: null,
};

const app = document.querySelector("#app");

function escapeHtml(value = "") {
  return value.replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;",
  }[char]));
}

function stripHtml(html) {
  const node = document.createElement("div");
  node.innerHTML = html;
  return node.textContent || "";
}

function sanitizeHtml(html = "") {
  const template = document.createElement("template");
  template.innerHTML = html;
  const allowed = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "MARK", "UL", "OL", "LI", "H2", "H3", "BLOCKQUOTE", "A", "SPAN", "FONT"]);

  template.content.querySelectorAll("*").forEach((element) => {
    if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED"].includes(element.tagName)) {
      element.remove();
      return;
    }
    if (!allowed.has(element.tagName)) {
      element.replaceWith(...element.childNodes);
      return;
    }

    const highlight = element.style.backgroundColor;
    const href = element.tagName === "A" ? element.getAttribute("href") : null;
    [...element.attributes].forEach((attribute) => element.removeAttribute(attribute.name));

    if (highlight) element.style.backgroundColor = highlight;
    if (element.tagName === "A" && href) {
      try {
        const url = new URL(href, window.location.origin);
        if (["http:", "https:", "mailto:"].includes(url.protocol)) {
          element.setAttribute("href", url.href);
          element.setAttribute("target", "_blank");
          element.setAttribute("rel", "noopener noreferrer");
        }
      } catch {
        // Invalid links remain plain text.
      }
    }
  });
  return template.innerHTML;
}

function formatDate(value, detailed = false) {
  const options = detailed
    ? { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }
    : { month: "short", day: "numeric" };
  return new Intl.DateTimeFormat("zh-TW", options).format(new Date(value));
}

function icon(name, size = 20) {
  const paths = {
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    logout: '<path d="M10 17l5-5-5-5M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>',
    pin: '<path d="M12 17v5M5 17h14l-3-5V4l2-2H6l2 2v8z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/>',
    arrow: '<path d="m9 18 6-6-6-6"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    spark: '<path d="m12 3-1.9 5.1L5 10l5.1 1.9L12 17l1.9-5.1L19 10l-5.1-1.9z"/><path d="m5 3-.7 1.8L2.5 5.5l1.8.7L5 8l.7-1.8 1.8-.7-1.8-.7z"/>',
    bold: '<path d="M6 4h8a4 4 0 0 1 0 8H6zM6 12h9a4 4 0 0 1 0 8H6z"/>',
    italic: '<path d="M10 4h8M6 20h8M14 4 10 20"/>',
    underline: '<path d="M6 3v7a6 6 0 0 0 12 0V3M4 21h16"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    ordered: '<path d="M10 6h11M10 12h11M10 18h11M4 6h1V3M4 10h2l-2 3h2M4 17h2l-2 4h2"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}

function toast(message, tone = "success") {
  const el = document.createElement("div");
  el.className = `toast ${tone}`;
  el.textContent = message;
  document.querySelector("#toast-region").append(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 250);
  }, 2600);
}

function render() {
  if (!state.session) return renderLogin();
  if (state.settingsOpen) return renderSettings();
  if (state.adminView === "accounts" && state.session.role === "admin") return renderAccounts();
  if (state.editingId !== null) return renderEditor();
  if (state.selectedId) return renderDetail();
  return renderDashboard();
}

function renderLogin() {
  const portal = portals[activeRole];
  document.title = portal.title + "｜704公告系統";
  app.innerHTML = `
    <main class="login-shell">
      <header class="login-masthead"><span class="portal-emblem">704</span><span>704公告系統</span><span class="portal-status"><i></i> CAMPUS CONNECTED</span></header>
      ${state.marquee.enabled && state.marquee.content ? `<div class="login-marquee site-marquee" role="status"><strong>最新消息</strong><marquee>${escapeHtml(state.marquee.content)}</marquee></div>` : ""}
      <div class="login-center">
        <section class="login-slogan rich-content" aria-label="登入標語" ${state.banner.enabled && stripHtml(state.banner.content).trim() ? "" : "hidden"}>${sanitizeHtml(state.banner.content)}</section>
      <section class="login-panel">
        <div class="login-card">
          <div class="portal-pill"><span></span>${portal.eyebrow}</div>
          <h2>${portal.title}</h2>
          <p class="muted">${portal.description}</p>
          <form id="login-form">
            <label>帳號<input name="account" autocomplete="username" placeholder="${activeRole === "admin" ? "請輸入維護帳號" : "請輸入電子郵件"}" type="${activeRole === "admin" ? "text" : "email"}" required></label>
            <label>密碼<input name="password" type="password" autocomplete="current-password" placeholder="請輸入密碼" required></label>
            <button class="primary-button wide" type="submit">登入系統 ${icon("arrow", 18)}</button>
          </form>
          <p class="helper">${activeRole === "admin" ? "使用維護人員專用帳號登入。" : "使用管理員提供的電子郵件與密碼登入。公告儲存於雲端。"}</p>
        </div>
      </section>
      </div><footer class="login-footnote">704 ANNOUNCEMENT SYSTEM <span>讓每一則消息，清楚抵達。</span></footer>
    </main>`;

  document.querySelector("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const button = event.currentTarget.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      const profile = await cloud.login(data.get("account"), data.get("password"), activeRole);
      if (profile.role !== activeRole) throw new Error("帳號不屬於此登入入口，請使用管理員提供的正確連結。");
      state.announcements = await cloud.list();
      state.session = { ...profile, name: profile.display_name };
      state.selectedId = null;
      state.editingId = null;
      render();
    } catch (error) { cloud.logout(); toast(error.message, "error"); }
    finally { button.disabled = false; }
  });
}

function headerTemplate() {
  const isTeacher = state.session.role === "teacher";
  return `
    <header class="topbar">
      <button class="wordmark" data-home aria-label="回到公告首頁"><span class="brand-mark small">知</span><span><strong>704公告系統</strong><small>校園公告</small></span></button>
      <nav class="top-actions">
        <span class="role-chip">${portals[state.session.role].label}端</span>
        <div class="user-block"><span class="avatar">${escapeHtml(state.session.name.charAt(0))}</span><span><strong>${escapeHtml(state.session.name)}</strong><small>${state.session.role === "admin" ? "系統管理" : isTeacher ? "公告管理" : "704"}</small></span></div>
${state.session.role === "admin" ? '<button class="secondary-button" id="open-accounts">帳號管理</button>' : ""}
${["teacher","admin"].includes(state.session.role) ? '<button class="secondary-button" id="open-settings">設定</button>' : ""}
        <button class="icon-button" id="logout" title="登出">${icon("logout")}</button>
      </nav>
    </header>${state.marquee.enabled && state.marquee.content ? `<div class="site-marquee" role="status"><strong>最新消息</strong><marquee>${escapeHtml(state.marquee.content)}</marquee></div>` : ""}`;
}

function renderMaintenance() {
  document.title = "系統維護｜704公告系統";
  app.innerHTML = `${headerTemplate()}<main class="page-shell">
    <section class="hero-row"><div><span class="eyebrow dark">MAINTENANCE CONSOLE</span>
    <h1>系統維護</h1><p>此入口用於查看服務狀態；公告內容由教師端管理。</p></div></section>
    <section class="article-paper"><h2>服務狀態</h2><p id="maintenance-status" aria-live="polite">正在檢查…</p>
    <button class="secondary-button" id="refresh-status">重新檢查</button>
    <p class="muted">帳號建立、角色調整與資料庫備份目前由主機端工具執行。</p></section></main>`;
  bindHeader();
  const status = document.querySelector("#maintenance-status");
  const refresh = document.querySelector("#refresh-status");
  const check = async () => {
    refresh.disabled = true;
    try {
      const result = await cloud.status();
      status.textContent = `API 與資料庫正常；目前共有 ${result.announcements} 則公告。`;
    } catch (error) { status.textContent = error.message; }
    finally { refresh.disabled = false; }
  };
  refresh.addEventListener("click", check);
  check();
}

function renderAccounts() {
  app.innerHTML = `${headerTemplate()}<main class="editor-shell">
    <button class="back-button" id="accounts-back">${icon("back",18)} 返回管理首頁</button>
    <div class="editor-heading"><span class="eyebrow dark">ACCOUNT ADMINISTRATION</span><h1>帳號管理</h1><p>建立學生、教師與管理員帳號；教師與學生使用電子郵件登入，管理員可使用不含 @ 的維護帳號。</p></div>
    <form class="editor-card" id="account-form"><h2>新增帳號</h2><div class="form-grid">
      <label>登入帳號<input name="email" required maxlength="254" placeholder="學生／教師輸入電子郵件；管理員可用維護帳號"></label>
      <label>顯示姓名<input name="name" required maxlength="80"></label>
      <label>角色<select name="role"><option value="student">學生</option><option value="teacher">教師</option><option value="admin">管理員</option></select></label>
      <label>初始密碼<input name="password" required minlength="10" maxlength="512" type="password" autocomplete="new-password"></label>
    </div><footer class="editor-footer"><span>密碼至少 10 字元，請安全地將登入資料交給本人。</span><button class="primary-button">建立帳號</button></footer></form>
    <section class="editor-card"><h2>現有帳號</h2><p id="accounts-message" role="status">載入中…</p><div id="accounts-list"></div></section>
  </main>`;
  bindHeader();
  document.querySelector("#accounts-back").addEventListener("click", () => { state.adminView="dashboard"; render(); });
  const message=document.querySelector("#accounts-message"), list=document.querySelector("#accounts-list");
  const refresh=async()=>{ try { state.accounts=await cloud.accounts(); list.innerHTML=state.accounts.map(account=>`<div class="account-row" data-account="${account.id}"><strong>${escapeHtml(account.display_name)}</strong><span>${escapeHtml(account.email)}</span><select aria-label="${escapeHtml(account.display_name)}角色"><option value="student" ${account.role==="student"?"selected":""}>學生</option><option value="teacher" ${account.role==="teacher"?"selected":""}>教師</option><option value="admin" ${account.role==="admin"?"selected":""}>管理員</option></select><button class="danger-button" data-remove-account="${account.id}">刪除</button></div>`).join("")||"<p>尚無帳號。</p>"; message.textContent=""; } catch(error){message.textContent=error.message;} };
  document.querySelector("#account-form").addEventListener("submit",async event=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget));try{await cloud.createAccount(data);event.currentTarget.reset();toast("帳號已建立");await refresh();}catch(error){toast(error.message,"error");}});
  list.addEventListener("change",async event=>{if(!event.target.matches("select"))return;const row=event.target.closest("[data-account]");const account=state.accounts.find(item=>item.id===row.dataset.account);try{await cloud.updateAccount(account.id,{name:account.display_name,role:event.target.value});toast("角色已更新");await refresh();}catch(error){toast(error.message,"error");await refresh();}});
  list.addEventListener("click",async event=>{const button=event.target.closest("[data-remove-account]");if(!button)return;const account=state.accounts.find(item=>item.id===button.dataset.removeAccount);if(!window.confirm(`確定刪除帳號「${account.display_name}」？`))return;try{await cloud.deleteAccount(account.id);toast("帳號已刪除");await refresh();}catch(error){toast(error.message,"error");}});
  refresh();
}

function bindHeader() {
  document.querySelector("#open-settings")?.addEventListener("click", () => { state.settingsOpen = true; render(); });
  document.querySelector("#open-accounts")?.addEventListener("click", () => { state.adminView="accounts"; render(); });
  document.querySelector("[data-home]")?.addEventListener("click", () => {
    state.selectedId = null;
    state.editingId = null;
    state.settingsOpen = false;
    render();
  });
  document.querySelector("#logout")?.addEventListener("click", () => {
    state.session = null;
    state.selectedId = null;
    state.editingId = null;
    cloud.logout();
    state.settingsOpen = false;
    render();
    refreshBanner();
  });
}

function filteredAnnouncements() {
  const needle = state.search.toLowerCase().trim();
  return [...state.announcements]
    .filter((item) => state.category === "all" || item.category === state.category)
    .filter((item) => !needle || `${item.title} ${stripHtml(item.content)} ${item.author}`.toLowerCase().includes(needle))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.date) - new Date(a.date));
}

function renderDashboard() {
  const isTeacher = ["teacher","admin"].includes(state.session.role);
  const results = filteredAnnouncements();
  app.innerHTML = `
    ${headerTemplate()}
    <main class="page-shell">
      <section class="hero-row">
        <div><span class="eyebrow dark">${isTeacher ? "TEACHER CONSOLE" : "STUDENT BULLETIN"}</span><h1>${isTeacher ? "公告管理" : "校園最新公告"}</h1><p>${isTeacher ? "清楚傳遞每一項校園資訊。" : "今天也別忘了看看校園裡的新消息。"}</p></div>
        ${isTeacher ? `<button class="primary-button" id="new-post">${icon("plus", 18)} 發布新公告</button>` : `<div class="date-card"><span>${new Intl.DateTimeFormat("zh-TW", { weekday: "long" }).format(new Date())}</span><strong>${new Intl.DateTimeFormat("zh-TW", { month: "long", day: "numeric" }).format(new Date())}</strong></div>`}
      </section>
      <section class="toolbar" aria-label="公告篩選">
        <label class="search-box">${icon("search", 19)}<input id="search" value="${escapeHtml(state.search)}" placeholder="搜尋標題、內容或發布教師"></label>
        <div class="filter-tabs">
          ${[{ key: "all", label: "全部公告" }, ...Object.entries(categories).map(([key, item]) => ({ key, label: item.label }))].map((item) => `<button data-category="${item.key}" class="filter-tab ${state.category === item.key ? "active" : ""}">${item.label}</button>`).join("")}
        </div>
      </section>
      <section class="section-heading"><div><h2>${state.category === "all" ? "最新公告" : categories[state.category].label}</h2><span>${results.length} 則消息</span></div></section>
      <div class="announcement-grid">
        ${results.length ? results.map((item) => announcementCard(item, isTeacher)).join("") : `<div class="empty-state">${icon("search", 32)}<h3>找不到符合的公告</h3><p>試著更換關鍵字或其他分類。</p></div>`}
      </div>
    </main>`;
  bindHeader();
  document.querySelector("#new-post")?.addEventListener("click", () => { state.editingId = "new"; render(); });
  document.querySelector("#search").addEventListener("input", (event) => {
    state.search = event.target.value;
    const selection = event.target.selectionStart;
    renderDashboard();
    const input = document.querySelector("#search");
    input.focus(); input.setSelectionRange(selection, selection);
  });
  document.querySelectorAll("[data-category]").forEach((button) => button.addEventListener("click", () => {
    state.category = button.dataset.category; renderDashboard();
  }));
  document.querySelectorAll("[data-open]").forEach((button) => button.addEventListener("click", () => {
    state.selectedId = button.dataset.open; render();
  }));
  document.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation(); state.editingId = button.dataset.edit; render();
  }));
  document.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation(); deleteAnnouncement(button.dataset.delete);
  }));
}

function announcementCard(item, isTeacher) {
  const category = categories[item.category];
  const excerpt = stripHtml(item.content).slice(0, 112);
  return `<article class="announcement-card ${item.pinned ? "pinned" : ""}" data-open="${item.id}" tabindex="0">
    <div class="card-meta"><span class="category-tag ${category.tone}">${item.pinned ? icon("pin", 13) : ""}${category.label}</span><time>${formatDate(item.date)}</time></div>
    <h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(excerpt)}${stripHtml(item.content).length > 112 ? "…" : ""}</p>
    <footer><div class="author"><span class="avatar mini">${escapeHtml(item.authorInitial)}</span><span><strong>${escapeHtml(item.author)}</strong><small>${escapeHtml(item.audience)}</small></span></div>
    ${isTeacher ? `<div class="card-actions"><button data-edit="${item.id}" title="編輯">${icon("edit", 17)}</button><button class="danger" data-delete="${item.id}" title="刪除">${icon("trash", 17)}</button></div>` : `<span class="read-more">閱讀全文 ${icon("arrow", 16)}</span>`}</footer>
  </article>`;
}

function renderDetail() {
  const item = state.announcements.find((entry) => entry.id === state.selectedId);
  if (!item) { state.selectedId = null; return render(); }
  const category = categories[item.category];
  const isTeacher = ["teacher","admin"].includes(state.session.role);
  app.innerHTML = `${headerTemplate()}<main class="article-shell">
    <button class="back-button" id="back">${icon("back", 18)} 返回公告列表</button>
    <article class="article-paper">
      <header><div class="article-tags"><span class="category-tag ${category.tone}">${item.pinned ? icon("pin", 13) : ""}${category.label}</span><span class="audience-tag">${icon("users", 14)} ${escapeHtml(item.audience)}</span></div>
      <h1>${escapeHtml(item.title)}</h1><div class="article-byline"><span class="avatar">${escapeHtml(item.authorInitial)}</span><div><strong>${escapeHtml(item.author)}</strong><span>${icon("clock", 14)} 發布於 ${formatDate(item.date, true)}</span></div></div></header>
      <div class="rich-content">${sanitizeHtml(item.content)}</div>
      ${isTeacher ? `<footer class="article-controls"><button class="secondary-button" id="edit-post">${icon("edit", 17)} 編輯公告</button><button class="danger-button" id="delete-post">${icon("trash", 17)} 刪除</button></footer>` : ""}
    </article>
  </main>`;
  bindHeader();
  document.querySelector("#back").addEventListener("click", () => { state.selectedId = null; render(); });
  document.querySelector("#edit-post")?.addEventListener("click", () => { state.editingId = item.id; state.selectedId = null; render(); });
  document.querySelector("#delete-post")?.addEventListener("click", () => deleteAnnouncement(item.id));
}

function renderEditor() {
  const existing = state.editingId === "new" ? null : state.announcements.find((item) => item.id === state.editingId);
  app.innerHTML = `${headerTemplate()}<main class="editor-shell">
    <button class="back-button" id="cancel-edit">${icon("back", 18)} 取消並返回</button>
    <div class="editor-heading"><div><span class="eyebrow dark">RICH TEXT EDITOR</span><h1>${existing ? "編輯公告" : "發布新公告"}</h1><p>運用清楚的層次與重點標示，讓學生快速掌握資訊。</p></div></div>
    <form id="editor-form" class="editor-card">
      <div class="form-grid">
        <label class="span-2">公告標題<input name="title" maxlength="80" value="${escapeHtml(existing?.title || "")}" placeholder="輸入清楚明確的公告標題" required></label>
        <label>公告分類<select name="category">${Object.entries(categories).map(([key, category]) => `<option value="${key}" ${existing?.category === key ? "selected" : ""}>${category.label}</option>`).join("")}</select></label>
        <label>公告對象<select name="audience">${["全校學生", "七年級", "八年級", "九年級"].map((value) => `<option ${existing?.audience === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
      </div>
      <label class="editor-label">公告內容</label>
      ${editorMarkup(existing?.content || "")}
      <div class="editor-options"><label class="switch-row"><input type="checkbox" name="pinned" ${existing?.pinned ? "checked" : ""}><span class="switch"></span><span><strong>置頂公告</strong><small>讓這則公告優先顯示在列表最上方</small></span></label></div>
      <footer class="editor-footer"><span>${icon("spark", 17)} 提示：善用螢光筆標示日期與重要事項</span><div><button type="button" class="secondary-button" id="cancel-edit-bottom">取消</button><button class="primary-button" type="submit">${existing ? "儲存變更" : "發布公告"}</button></div></footer>
    </form>
  </main>`;
  bindHeader();
  const cancel = () => { state.editingId = null; render(); };
  document.querySelector("#cancel-edit").addEventListener("click", cancel);
  document.querySelector("#cancel-edit-bottom").addEventListener("click", cancel);
  const editor = bindRichEditor();
  document.querySelector("#editor-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (!stripHtml(editor.innerHTML).trim()) { toast("請輸入公告內容", "error"); editor.focus(); return; }
    const announcement = {
      id: existing?.id || crypto.randomUUID(), title: data.get("title").trim(), category: data.get("category"),
      author: state.session.name, authorInitial: state.session.name.charAt(0), audience: data.get("audience"),
      date: existing?.date || new Date().toISOString(), pinned: data.get("pinned") === "on", content: sanitizeHtml(editor.innerHTML),
    };
    try {
      await cloud.save(announcement, Boolean(existing));
    } catch (error) { toast(error.message, "error"); return; }
    if (existing) state.announcements = state.announcements.map((item) => item.id === existing.id ? announcement : item);
    else state.announcements.unshift(announcement);
    state.editingId = null; render(); toast(existing ? "公告已更新" : "公告已發布");
  });
}

async function deleteAnnouncement(id) {
  const item = state.announcements.find((entry) => entry.id === id);
  if (!item || !window.confirm(`確定要刪除「${item.title}」嗎？`)) return;
  try { await cloud.remove(id); } catch (error) { toast(error.message, "error"); return; }
  state.announcements = state.announcements.filter((entry) => entry.id !== id);
  state.selectedId = null; state.editingId = null; render(); toast("公告已刪除");
}

function editorMarkup(content = "") {
  return `      <div class="rich-editor-wrap">
        <div class="format-toolbar" role="toolbar" aria-label="文字格式">
          <button type="button" data-command="bold" title="粗體">${icon("bold", 18)}</button><button type="button" data-command="italic" title="斜體">${icon("italic", 18)}</button><button type="button" data-command="underline" title="底線">${icon("underline", 18)}</button><span class="divider"></span>
          <button type="button" data-command="insertUnorderedList" title="項目符號">${icon("list", 18)}</button><button type="button" data-command="insertOrderedList" title="編號清單">${icon("ordered", 18)}</button><button type="button" id="add-link" title="插入連結">${icon("link", 18)}</button><span class="divider"></span>
          <button type="button" id="apply-highlight" title="螢光筆"><span class="highlight-icon">A</span></button><label class="color-tool" title="螢光筆顏色"><input type="color" id="highlight-color" aria-label="螢光筆顏色" value="#fef08a"></label>
          <select id="block-format" aria-label="段落格式"><option value="p">一般文字</option><option value="h2">大標題</option><option value="h3">小標題</option><option value="blockquote">引用文字</option></select>
        </div>
        <div id="rich-editor" class="rich-editor" contenteditable="true" data-placeholder="在這裡輸入公告內容…">${sanitizeHtml(content)}</div>
      </div>`;
}

function bindRichEditor() {
  const editor = document.querySelector("#rich-editor");
  let savedRange = null;
  const capture = () => {
    const selection = window.getSelection();
    if (selection.rangeCount && editor.contains(selection.anchorNode)) savedRange = selection.getRangeAt(0).cloneRange();
  };
  editor.addEventListener("mouseup", capture);
  editor.addEventListener("keyup", capture);
  document.querySelector(".format-toolbar").addEventListener("pointerdown", capture);
  const restore = () => {
    editor.focus();
    if (savedRange) { const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(savedRange); }
  };
  document.querySelectorAll("[data-command]").forEach((button) => button.addEventListener("mousedown", (event) => {
    event.preventDefault(); document.execCommand(button.dataset.command, false); editor.focus();
  }));
  document.querySelector("#highlight-color").addEventListener("input", (event) => {
    restore();
    document.execCommand("hiliteColor", false, event.target.value); editor.focus();
  });
  document.querySelector("#apply-highlight").addEventListener("mousedown", (event) => {
    event.preventDefault();
    document.execCommand("hiliteColor", false, document.querySelector("#highlight-color").value);
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  });
  document.querySelector("#block-format").addEventListener("change", (event) => {
    restore();
    document.execCommand("formatBlock", false, event.target.value); editor.focus();
  });
  document.querySelector("#add-link").addEventListener("mousedown", (event) => {
    event.preventDefault(); const url = window.prompt("請輸入連結網址：", "https://");
    if (url && /^https?:\/\//i.test(url)) document.execCommand("createLink", false, url);
  });
  return editor;
}

async function refreshBanner() {
  try {
    state.banner = await cloud.publicBanner();
    state.marquee = { enabled: state.banner.marqueeEnabled, content: state.banner.marquee || "" };
    if (!state.session) {
      const slogan = document.querySelector(".login-slogan");
      if (slogan) {
        slogan.innerHTML = sanitizeHtml(state.banner.content);
        slogan.hidden = !state.banner.enabled || !stripHtml(state.banner.content).trim();
      }
      const masthead=document.querySelector(".login-masthead");
      document.querySelector(".login-marquee")?.remove();
      if(masthead && state.marquee.enabled && state.marquee.content){const ticker=document.createElement("div");ticker.className="login-marquee site-marquee";ticker.innerHTML=`<strong>最新消息</strong><marquee>${escapeHtml(state.marquee.content)}</marquee>`;masthead.after(ticker);}
    }
  } catch {
    // Login remains usable if the public banner endpoint is temporarily unavailable.
  }
}

function renderSettings() {
  app.innerHTML = `${headerTemplate()}<main class="editor-shell settings-shell">
    <button class="back-button" id="close-settings">${icon("back",18)} 返回</button>
    <div class="editor-heading"><span class="eyebrow dark">PORTAL SETTINGS</span><h1>登入頁設定</h1>
    <p>教師與維護人員共用設定，會套用至三個登入入口。</p></div>
    <section class="editor-card"><p id="settings-message" role="status">載入設定中…</p>
    <div id="settings-fields" hidden>
      <label class="switch-row"><input id="banner-enabled" type="checkbox"><span class="switch"></span><span><strong>啟用標語編輯器與登入標語</strong><small>停用會隱藏標語，已儲存的內容仍會保留。</small></span></label>
      <div id="banner-editor-section" hidden><label class="editor-label" for="rich-editor">標語內容</label>${editorMarkup()}
      <p class="muted">標語會公開顯示在登入卡片上方，請勿放入學生個資或密碼。</p>
      <h2 class="preview-label">顯示預覽</h2><div id="banner-preview" class="login-slogan rich-content"></div></div>
      <footer class="editor-footer"><span>儲存後，新開啟登入頁即可看見更新。</span><button id="save-banner" class="primary-button">儲存設定</button></footer>
      ${state.session.role === "admin" ? `<hr><h2>網站頂端跑馬公告</h2><label class="switch-row"><input id="marquee-enabled" type="checkbox"><span class="switch"></span><span><strong>顯示全站跑馬公告</strong><small>公告會顯示在登入頁與已登入頁面的最上方。</small></span></label><label class="editor-label" for="marquee-content">跑馬公告文字</label><textarea id="marquee-content" maxlength="1000" rows="3" placeholder="輸入要公告給全站的短訊息"></textarea><div class="editor-footer"><span>最多 1000 字；停用後內容仍會保留。</span><button id="save-marquee" class="secondary-button">儲存跑馬公告</button></div>` : ""}
    </div></section></main>`;
  bindHeader();
  document.querySelector("#close-settings").addEventListener("click", () => { state.settingsOpen = false; render(); });
  const message = document.querySelector("#settings-message");
  const editor = bindRichEditor();
  const fields = document.querySelector("#settings-fields");
  const enabled = document.querySelector("#banner-enabled");
  const section = document.querySelector("#banner-editor-section");
  const preview = document.querySelector("#banner-preview");
  const updatePreview = () => { preview.innerHTML = sanitizeHtml(editor.innerHTML); };
  enabled.addEventListener("change", () => { section.hidden = !enabled.checked; });
  editor.addEventListener("input", updatePreview);
  cloud.bannerSettings().then(value => {
    if (!fields.isConnected) return;
    enabled.checked = value.enabled;
    editor.innerHTML = sanitizeHtml(value.content);
    updatePreview();
    section.hidden = !value.enabled;
    fields.hidden = false;
    message.textContent = "";
  }).catch(error => { message.textContent = error.message; });
  if(state.session.role === "admin") cloud.marqueeSettings().then(value=>{const toggle=document.querySelector("#marquee-enabled"),input=document.querySelector("#marquee-content");if(toggle&&input){toggle.checked=value.enabled;input.value=value.content;}}).catch(error=>{message.textContent=error.message;});
  document.querySelector("#save-marquee")?.addEventListener("click",async event=>{const button=event.currentTarget;button.disabled=true;try{const value=await cloud.saveMarquee({enabled:document.querySelector("#marquee-enabled").checked,content:document.querySelector("#marquee-content").value});state.marquee=value;toast("跑馬公告設定已儲存");render();}catch(error){message.textContent=error.message;}finally{button.disabled=false;}});
  document.querySelector("#save-banner").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    if (enabled.checked && !stripHtml(editor.innerHTML).trim()) { toast("請輸入標語內容，或停用標語", "error"); return; }
    const content = sanitizeHtml(editor.innerHTML);
    if (content.length > 20000) { toast("標語內容過長，請縮短後再試", "error"); return; }
    button.disabled = true;
    try {
      const value = await cloud.saveBanner({ enabled: enabled.checked, content });
      state.banner = value;
      toast("登入標語已儲存");
      message.textContent = "設定已儲存至資料庫。";
    } catch (error) { message.textContent = error.message; }
    finally { button.disabled = false; }
  });
}

render();
refreshBanner();
