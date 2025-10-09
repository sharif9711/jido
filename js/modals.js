// 모달 관련 함수

function openCreateModal() {
    document.getElementById('createModal').classList.add('active');
}

function closeCreateModal() {
    document.getElementById('createModal').classList.remove('active');
    document.getElementById('projectName').value = '';
    document.getElementById('projectContact').value = '';
    document.getElementById('projectPassword').value = '';
}

function createProject() {
    const name = document.getElementById('projectName').value;
    const contact = document.getElementById('projectContact').value;
    const password = document.getElementById('projectPassword').value;

    if (!name || !contact || !password) {
        alert('모든 필드를 입력해주세요.');
        return;
    }

    const project = createProjectData(name, contact, password);
    projects.unshift(project);
    closeCreateModal();
    renderProjects();
}

function openPasswordModal(projectId) {
    selectedProjectId = projectId;
    const project = projects.find(p => p.id === projectId);
    document.getElementById('passwordProjectName').textContent = project.projectName;
    document.getElementById('passwordModal').classList.add('active');
    setTimeout(() => {
        document.getElementById('enteredPassword').focus();
    }, 100);
}

function closePasswordModal() {
    document.getElementById('passwordModal').classList.remove('active');
    document.getElementById('enteredPassword').value = '';
    selectedProjectId = null;
}

function checkPassword() {
    const password = document.getElementById('enteredPassword').value;
    const project = projects.find(p => p.id === selectedProjectId);

    if (project && password === project.password) {
        currentProject = project;
        closePasswordModal();
        showProjectDetail();
    } else {
        alert('비밀번호가 올바르지 않습니다.');
        document.getElementById('enteredPassword').value = '';
    }
}