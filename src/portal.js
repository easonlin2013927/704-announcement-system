export const portals = {
  student: { label: "學生", title: "學生登入", description: "閱讀班級消息，掌握每一則重要公告。", eyebrow: "STUDENT PORTAL" },
  teacher: { label: "教師", title: "教師登入", description: "發布與管理公告，清楚傳遞校園資訊。", eyebrow: "TEACHER PORTAL" },
  admin: { label: "維護人員", title: "維護人員登入", description: "查看系統狀態，維護公告服務。", eyebrow: "MAINTENANCE PORTAL" },
};
export function portalRole(hash) {
  const match = hash.match(/^#\/(student|teacher|admin)\/login$/);
  return match ? match[1] : "student";
}
