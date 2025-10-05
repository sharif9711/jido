// 프로젝트 목록 렌더링
function renderProjects() {
  const list = document.getElementById("projectList");
  list.innerHTML = "";
  (window.projects || []).forEach((p) => {
    const card = document.createElement("div");
    card.className =
      "p-4 bg-white rounded-lg shadow-md border hover:shadow-lg cursor-pointer relative";
    card.innerHTML = `
      <h3 class="font-semibold text-lg mb-2">${p.name}</h3>
      <p class="text-sm text-gray-600 mb-1">📞 ${p.contact}</p>
      <p class="text-xs text-gray-500">생성일: ${p.createdAt}</p>
      <button class="absolute top-2 right-2 text-red-500 hover:text-red-700 text-sm delete-btn">삭제</button>
    `;
    card.querySelector(".delete-btn").onclick = () => {
      const pass = prompt("비밀번호를 입력하세요:");
      if (pass === p.password) {
        window.projects = window.projects.filter((x) => x.id !== p.id);
        localStorage.setItem("projects", JSON.stringify(window.projects));
        renderProjects();
      } else alert("비밀번호가 틀렸습니다.");
    };
    card.onclick = (e) => {
      if (e.target.classList.contains("delete-btn")) return;
      openProject(p);
    };
    list.appendChild(card);
  });
}

function openProject(p) {
  document.getElementById("mainView").classList.add("hidden");
  document.getElementById("detailView").classList.remove("hidden");
  document.getElementById("projectTitle").textContent = p.name;
  window.currentProject = p;
  window.projectData = [];
  loadMenu("input");
}

document.getElementById("backBtn").onclick = () => {
  document.getElementById("detailView").classList.add("hidden");
  document.getElementById("mainView").classList.remove("hidden");
};
