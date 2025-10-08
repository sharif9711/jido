// 데이터 관리
var projects = [];
var currentProject = null;
var selectedProjectId = null;

// 500행 초기 데이터 생성
function createInitialData() {
    const initialData = [];
    for (let i = 0; i < 500; i++) {
        initialData.push({
            id: Date.now() + '_' + i,
            순번: i + 1,
            이름: '',
            연락처: '',
            주소: '',
            상태: '예정',
            법정동코드: '',
            pnu코드: '',
            지목: '',
            면적: '',
            기록사항: ''
        });
    }
    return initialData;
}

// 프로젝트 생성
function createProjectData(name, contact, password) {
    return {
        id: Date.now().toString(),
        projectName: name,
        contact: contact,
        password: password,
        createdAt: new Date(),
        data: createInitialData()
    };
}

// 셀 업데이트
function updateCell(rowId, field, value) {
    const row = currentProject.data.find(r => r.id === rowId);
    if (row) {
        row[field] = value;
        const projectIndex = projects.findIndex(p => p.id === currentProject.id);
        if (projectIndex !== -1) {
            projects[projectIndex] = currentProject;
        }
        return true;
    }
    return false;
}

// 붙여넣기 처리
function processPasteData(pastedText, rowIndex, field) {
    const rows = pastedText.split('\n').filter(row => row.trim() !== '');
    const fields = ['이름', '연락처', '주소'];
    const startFieldIndex = fields.indexOf(field);
    
    rows.forEach((row, i) => {
        const targetIndex = rowIndex + i;
        if (targetIndex < currentProject.data.length) {
            const cells = row.split('\t');
            const targetRow = currentProject.data[targetIndex];
            
            cells.forEach((cell, cellIndex) => {
                const targetField = fields[startFieldIndex + cellIndex];
                if (targetField) {
                    targetRow[targetField] = cell.trim();
                }
            });
        }
    });

    const projectIndex = projects.findIndex(p => p.id === currentProject.id);
    if (projectIndex !== -1) {
        projects[projectIndex] = currentProject;
    }
}

// 날짜 포맷
function formatDate(date) {
    const d = new Date(date);
    return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(d);
}