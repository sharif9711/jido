// 프로젝트 생성
document.getElementById("addProjectBtn").onclick = () =>
  (document.getElementById("modal").classList.remove("hidden"));

document.getElementById("cancelBtn").onclick = () =>
  (document.getElementById("modal").classList.add("hidden"));

document.getElementById("okBtn").onclick = () => {
  const name = document.getElementById("projectName").value.trim();
  const contact = document.getElementById("contact").value.trim();
  const password = document.getElementById("password").value.trim();
  if (!name || !contact || !password) return alert("모든 항목을 입력하세요.");
  const p = {
    id: crypto.randomUUID(),
    name, contact, password,
    createdAt: new Date().toLocaleString("ko-KR"),
  };
  window.projects = window.projects || [];
  window.projects.push(p);
  localStorage.setItem("projects", JSON.stringify(window.projects));
  document.getElementById("modal").classList.add("hidden");
  renderProjects();
};

// 초기화
window.addEventListener("load", () => {
  window.projects = JSON.parse(localStorage.getItem("projects") || "[]");
  renderProjects();
});
