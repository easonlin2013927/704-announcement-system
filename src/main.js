import { cloud } from "./cloud.js?v=0.3.1";
import { portals, portalRole } from "./portal.js";

let activeRole = portalRole(location.hash);
window.addEventListener("hashchange", () => {
  cloud.logout();
  state.session = null;
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

    const highlight = ["SPAN", "FONT"].includes(element.tagName) ? element.style.backgroundColor : "";
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
  if (state.session.role === "admin") return renderMaintenance();
  if (state.editingId !== null) return renderEditor();
  if (state.selectedId) return renderDetail();
  return renderDashboard();
}

function renderLogin() {
  const portal = portals[activeRole];
  document.title = portal.title + "｜704公告系統";
  app.innerHTML = `
    <main class="login-shell">
      <section class="login-brand">
        <div class="brand-mark large">知</div>
        <div class="brand-copy">
          <span class="eyebrow">CAMPUS BULLETIN</span>
          <h1>每一則重要消息，<br><em>都能被好好看見。</em></h1>
          <p>簡潔、即時、易讀的校園公告空間，讓教師安心發布，讓學生不再錯過。</p>
        </div>
        <div class="brand-orbit orbit-one"></div><div class="brand-orbit orbit-two"></div>
      </section>
      <section class="login-panel">
        <div class="login-card">
          <div class="mobile-logo"><div class="brand-mark">知</div><strong>704公告系統</strong></div>
          <span class="eyebrow dark">${portal.eyebrow}</span>
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
    </main>`;

  document.querySelector("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const button = event.currentTarget.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      const profile = await cloud.login(data.get("account"), data.get("password"), activeRole);
      if (profile.role !== activeRole) throw new Error("帳號不屬於此登入入口，請使用管理員提供的正確連結。");
      if (activeRole !== "admin") state.announcements = await cloud.list();
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
        <div class="user-block"><span class="avatar">${isTeacher ? "林" : "陳"}</span><span><strong>${escapeHtml(state.session.name)}</strong><small>${isTeacher ? "公告管理" : "704"}</small></span></div>
        <button class="icon-button" id="logout" title="登出">${icon("logout")}</button>
      </nav>
    </header>`;
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

function bindHeader() {
  document.querySelector("[data-home]")?.addEventListener("click", () => {
    state.selectedId = null;
    state.editingId = null;
    render();
  });
  document.querySelector("#logout")?.addEventListener("click", () => {
    state.session = null;
    state.selectedId = null;
    state.editingId = null;
    cloud.logout();
    render();
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
  const isTeacher = state.session.role === "teacher";
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
  const isTeacher = state.session.role === "teacher";
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
      <div class="rich-editor-wrap">
        <div class="format-toolbar" role="toolbar" aria-label="文字格式">
          <button type="button" data-command="bold" title="粗體">${icon("bold", 18)}</button><button type="button" data-command="italic" title="斜體">${icon("italic", 18)}</button><button type="button" data-command="underline" title="底線">${icon("underline", 18)}</button><span class="divider"></span>
          <button type="button" data-command="insertUnorderedList" title="項目符號">${icon("list", 18)}</button><button type="button" data-command="insertOrderedList" title="編號清單">${icon("ordered", 18)}</button><button type="button" id="add-link" title="插入連結">${icon("link", 18)}</button><span class="divider"></span>
          <label class="color-tool" title="螢光筆"><span class="highlight-icon">A</span><input type="color" id="highlight-color" value="#fef08a"></label>
          <select id="block-format" aria-label="段落格式"><option value="p">一般文字</option><option value="h2">大標題</option><option value="h3">小標題</option><option value="blockquote">引用文字</option></select>
        </div>
        <div id="rich-editor" class="rich-editor" contenteditable="true" data-placeholder="在這裡輸入公告內容…">${existing?.content || ""}</div>
      </div>
      <div class="editor-options"><label class="switch-row"><input type="checkbox" name="pinned" ${existing?.pinned ? "checked" : ""}><span class="switch"></span><span><strong>置頂公告</strong><small>讓這則公告優先顯示在列表最上方</small></span></label></div>
      <footer class="editor-footer"><span>${icon("spark", 17)} 提示：善用螢光筆標示日期與重要事項</span><div><button type="button" class="secondary-button" id="cancel-edit-bottom">取消</button><button class="primary-button" type="submit">${existing ? "儲存變更" : "發布公告"}</button></div></footer>
    </form>
  </main>`;
  bindHeader();
  const cancel = () => { state.editingId = null; render(); };
  document.querySelector("#cancel-edit").addEventListener("click", cancel);
  document.querySelector("#cancel-edit-bottom").addEventListener("click", cancel);
  const editor = document.querySelector("#rich-editor");
  document.querySelectorAll("[data-command]").forEach((button) => button.addEventListener("mousedown", (event) => {
    event.preventDefault(); document.execCommand(button.dataset.command, false); editor.focus();
  }));
  document.querySelector("#highlight-color").addEventListener("input", (event) => {
    document.execCommand("hiliteColor", false, event.target.value); editor.focus();
  });
  document.querySelector("#block-format").addEventListener("change", (event) => {
    document.execCommand("formatBlock", false, event.target.value); editor.focus();
  });
  document.querySelector("#add-link").addEventListener("mousedown", (event) => {
    event.preventDefault(); const url = window.prompt("請輸入連結網址：", "https://");
    if (url && /^https?:\/\//i.test(url)) document.execCommand("createLink", false, url);
  });
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

render();
