// ✅ project-list.js - 로그인 기반 + 서버 삭제 동기화
console.log("✅ js/project-list.js loaded successfully.");

function renderProjects() {
    const projectListScreen = document.getElementById('projectListScreen');
    if (!projectListScreen) return;
    projectListScreen.innerHTML = getProjectListHTML();

    const emptyState = document.getElementById('emptyState');
    const projectsList = document.getElementById('projectsList');
    const projectsGrid = document.getElementById('projectsGrid');
    const projectCount = document.getElementById('projectCount');

    if (!emptyState || !projectsList || !projectsGrid || !projectCount) return;

    if (projects.length === 0) {
        emptyState.style.display = 'flex';
        projectsList.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        projectsList.style.display = 'block';
        projectCount.textContent = projects.length;

        projectsGrid.innerHTML = projects.map(project => {
            const mapTypeBadge = project.mapType === 'vworld'
                ? '<span class="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">VWorld</span>'
                : '<span class="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">카카오맵</span>';

            return `
            <div class="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 group relative">
                <button onclick="deleteProject(event, '${project.id}')" class="absolute top-3 right-3 p-1.5 bg-red-50 hover:bg-red-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100 z-10" title="프로젝트 삭제">
                    🗑️
                </button>
                <div onclick="openProjectDirectly('${project.id}')" class="p-6 cursor-pointer">
                    <div class="flex items-start justify-between pb-3">
                        <div class="p-2 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-600">
                                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
                                <line x1="9" y1="3" x2="9" y2="18"></line>
                                <line x1="15" y1="6" x2="15" y2="21"></line>
                            </svg>
                        </div>
                        ${mapTypeBadge}
                    </div>
                    <h3 class="text-lg font-semibold text-slate-900 line-clamp-1">${project.projectName}</h3>
                    <p class="text-xs text-slate-500 border-t mt-3 pt-2">${formatDate(project.createdAt)}</p>
                </div>
            </div>
            `;
        }).join('');
    }
}

// ✅ 서버에서도 프로젝트 삭제
async function deleteProject(event, projectId) {
    event.stopPropagation();

    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    if (!confirm(`"${project.projectName}" 프로젝트를 삭제하시겠습니까?`)) return;

    // 서버 삭제 요청
    try {
        const res = await fetch("/map/api/delete_project.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ project_id: projectId })
        });
        const result = await res.json();

        if (result.success) {
            projects = projects.filter(p => p.id !== projectId);
            localStorage.setItem("vworldProjects", JSON.stringify(projects));
            renderProjects();
            alert("🗑️ 프로젝트 삭제 완료");
        } else {
            alert("삭제 실패: " + result.message);
        }
    } catch (err) {
        console.error("삭제 중 오류:", err);
        alert("서버 오류로 삭제에 실패했습니다.");
    }
}
