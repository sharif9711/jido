// ✅ 프로젝트 리스트 저장용 전역 변수
let projects = JSON.parse(localStorage.getItem("projects")) || [];
let selectedProject = null;

// ✅ 주요 DOM 요소
const projectList = document.getElementById("projectList");
const modal = document.getElementById("modal");
const addProjectBtn = document.getElementById("addProjectBtn");
const cancelBtn = document.getElementById("cancelBtn");
const okBtn = document.getElementById("okBtn");

// -------------------------------
// 🗂 프로젝트 카드 렌더링
// -------------------------------
function renderProjects() {
  projectList.innerHTML = "";

  projects.forEach((p, index) => {
    const card = document.createElement("div");
    card.className =
      "relative bg-white shadow rounded-xl p-4 border border-blue-200 hover:shadow-lg transition cursor-pointer";

    // 🗑 삭제 버튼
    const deleteBtn = document.createElement("button");
    deleteBtn.innerText = "삭제";
    deleteBtn.className =
      "delete-btn absolute top-3 right-3 text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition";

    // 🗑 삭제 로직
    deleteBtn.onclick = (event) => {
      event.stopPropagation(); // 카드 클릭과 충돌 방지
      const inputPw = prompt("비밀번호를 입력하세요:");
      if (inputPw === p.password) {
        if (confirm(`"${p.name}" 프로젝트를 삭제하시겠습니까?`)) {
          projects.splice(index, 1);
          localStorage.setItem("projects", JSON.stringify(projects));
          renderProjects();
        }
      } else {
        alert("비밀번호가 일치하지 않습니다 ❌");
      }
    };

    // 🧭 카드 클릭 시 상세 화면 열기
    card.onclick = (e) => {
      if (e.target.classList.contains("delete-btn")) return; // 삭제버튼 클릭 무시
      selectedProject = p;
      openDetail(p); // view.js의 함수 호출
    };

    // 카드 내용 구성
    card.innerHTML = `
      <h2 class="text-lg font-bold text-blue-700">${p.name}</h2>
      <p class="text-sm text-gray-600">연락처: ${p.contact}</p>
      <p class="text-xs text-gray-400 mt-2">생성일: ${p.created}</p>
    `;

    card.appendChild(deleteBtn);
    projectList.appendChild(card);
  });
}

// 페이지 로드 시 즉시 렌더링
renderProjects();

// -------------------------------
// 🧩 프로젝트 생성 모달
// -------------------------------
addProjectBtn.onclick = () => {
  modal.classList.remove("hidden");
};

cancelBtn.onclick = () => {
  modal.classList.add("hidden");
};

// -------------------------------
// ➕ 새 프로젝트 생성
// -------------------------------
okBtn.onclick = () => {
  const name = document.getElementById("projectName").value.trim();
  const contact = document.getElementById("contact").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!name || !contact || !password) {
    alert("모든 항목을 입력하세요.");
    return;
  }

  // 중복 이름 체크
  if (projects.some((p) => p.name === name)) {
    alert("같은 이름의 프로젝트가 이미 존재합니다.");
    return;
  }

  const newProject = {
    name,
    contact,
    password,
    created: new Date().toLocaleString(),
  };

  projects.push(newProject);
  localStorage.setItem("projects", JSON.stringify(projects));
  renderProjects();

  // 입력값 초기화 및 모달 닫기
  modal.classList.add("hidden");
  document.getElementById("projectName").value = "";
  document.getElementById("contact").value = "";
  document.getElementById("password").value = "";
};
