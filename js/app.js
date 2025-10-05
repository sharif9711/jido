document.addEventListener("DOMContentLoaded", () => {
  const addProjectBtn = document.getElementById("addProjectBtn");
  const projectList = document.getElementById("projectList");

  // 프로젝트 생성
  addProjectBtn.onclick = () => {
    const name = prompt("프로젝트 이름:");
    if (!name) return;
    const phone = prompt("연락처(지도주소 받을 번호):");
    if (!phone) return;
    const pass = prompt("비밀번호:");
    if (!pass) return;

    const project = {
      id: Date.now(),
      name,
      phone,
      pass,
      createdAt: formatDate(),
      status: "예정",
      memo: [],
    };

    window.projectData.push(project);
    renderProjectCards();
  };

  // 초기 렌더링
  renderProjectCards();
});

function renderProjectCards() {
  const projectList = document.getElementById("projectList");
  projectList.innerHTML = "";
  window.projectData.forEach((p, idx) => {
    const card = document.createElement("div");
    card.className =
      "p-4 bg-white rounded-lg shadow hover:shadow-lg cursor-pointer transition";
    card.innerHTML = `
      <h3 class="font-semibold text-lg mb-1">${p.name}</h3>
      <p class="text-sm text-gray-600">📱 ${p.phone}</p>
      <p class="text-xs text-gray-400">${p.createdAt}</p>
    `;
    card.onclick = () => openDetail(p);
    projectList.appendChild(card);
  });
}

function openDetail(project) {
  document.getElementById("mainView").classList.add("hidden");
  document.getElementById("detailView").classList.remove("hidden");
  document.getElementById("projectTitle").innerText = project.name;

  document.getElementById("mapBtn").onclick = () => {
    renderVWorldMap();
  };

  document.getElementById("backBtn").onclick = () => {
    document.getElementById("detailView").classList.add("hidden");
    document.getElementById("mainView").classList.remove("hidden");
  };
}
