// ✅ main.js - 로그인 연동 + 프로젝트 자동 복원 버전
console.log("✅ js/main.js loaded successfully.");

async function initApp() {
    if (window.isAppInitialized) return;
    window.isAppInitialized = true;
    console.log('🚀 Initializing application...');

    // ✅ 로그인 확인
    const authRes = await fetch("/html/map/api/auth.php");
    const authData = await authRes.json();

    if (!authData.success) {
        alert("로그인이 필요합니다.");
        location.href = "/bbs/login.php";
        return;
    }

    console.log(`👤 로그인된 사용자: ${authData.mb_id}`);

    // ✅ 서버에서 프로젝트 목록 불러오기
    const projectRes = await fetch("/html/map/api/get_projects.php");
    const projectData = await projectRes.json();

    if (projectData.success && Array.isArray(projectData.projects)) {
        projects = projectData.projects;
        localStorage.setItem("vworldProjects", JSON.stringify(projects));
        console.log(`📦 서버에서 ${projects.length}개 프로젝트 로드 완료.`);
    } else {
        projects = [];
        console.warn("⚠️ 서버에서 프로젝트를 불러오지 못했습니다.");
    }

    // ✅ UI 초기화
    if (typeof createProgressAndToastUI === 'function') createProgressAndToastUI();

    const createModalContainer = document.getElementById('createModal');
    if (createModalContainer && typeof getCreateModalHTML === 'function') {
        createModalContainer.innerHTML = getCreateModalHTML();
        console.log('✅ Create modal content loaded.');
    }

    // ✅ 프로젝트 목록 렌더링
    if (typeof renderProjects === 'function') renderProjects();

    // ✅ URL 해시값으로 바로 프로젝트 열기
    const hash = window.location.hash.substring(1);
    if (hash) {
        const project = projects.find(p => p.id === hash);
        if (project) {
            currentProject = project;
            if (typeof showProjectDetail === 'function') showProjectDetail();
        }
    }
}

document.addEventListener('DOMContentLoaded', initApp);
