// 프로젝트 상세 화면 관련 함수

function showProjectDetail() {
    document.getElementById('projectListScreen').classList.remove('active');
    document.getElementById('projectDetailScreen').classList.add('active');
    document.getElementById('currentProjectName').textContent = currentProject.projectName;
    switchTab('자료입력');
    renderDataInputTable();
    renderReportTable();
    updateMapCount();
}

function backToList() {
    document.getElementById('projectDetailScreen').classList.remove('active');
    document.getElementById('projectListScreen').classList.add('active');
    currentProject = null;
}

function switchTab(tabName) {
    const tabs = ['자료입력', '보고서', '지도', '연결'];
    tabs.forEach(tab => {
        const tabBtn = document.getElementById('tab-' + tab);
        const content = document.getElementById('content-' + tab);
        
        if (tab === tabName) {
            tabBtn.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
            tabBtn.classList.remove('text-slate-600', 'hover:text-slate-900');
            content.style.display = 'block';
        } else {
            tabBtn.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
            tabBtn.classList.add('text-slate-600', 'hover:text-slate-900');
            content.style.display = 'none';
        }
    });
}

function renderDataInputTable() {
    const tbody = document.getElementById('dataInputTable');
    tbody.innerHTML = currentProject.data.map((row, index) => `
        <tr class="hover:bg-slate-50">
            <td class="border border-slate-300 px-4 py-2 text-center text-sm">${row.순번}</td>
            <td class="border border-slate-300 px-2 py-1">
                <input type="text" value="${row.이름}" 
                    onchange="updateCellAndRefresh('${row.id}', '이름', this.value)"
                    onpaste="handlePaste(event, ${index}, '이름')"
                    class="w-full px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">
            </td>
            <td class="border border-slate-300 px-2 py-1">
                <input type="text" value="${row.연락처}"
                    onchange="updateCellAndRefresh('${row.id}', '연락처', this.value)"
                    onpaste="handlePaste(event, ${index}, '연락처')"
                    class="w-full px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">
            </td>
            <td class="border border-slate-300 px-2 py-1">
                <input type="text" value="${row.주소}"
                    onchange="updateCellAndRefresh('${row.id}', '주소', this.value)"
                    onpaste="handlePaste(event, ${index}, '주소')"
                    class="w-full px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">
            </td>
        </tr>
    `).join('');
}

function renderReportTable() {
    const tbody = document.getElementById('reportTable');
    tbody.innerHTML = currentProject.data.map(row => `
        <tr class="hover:bg-slate-50">
            <td class="border border-slate-300 px-3 py-2 text-center">${row.순번}</td>
            <td class="border border-slate-300 px-3 py-2">${row.이름}</td>
            <td class="border border-slate-300 px-3 py-2">${row.연락처}</td>
            <td class="border border-slate-300 px-3 py-2">${row.주소}</td>
            <td class="border border-slate-300 px-3 py-2 text-center">${row.상태 || '-'}</td>
            <td class="border border-slate-300 px-3 py-2 text-center">${row.법정동코드 || '-'}</td>
            <td class="border border-slate-300 px-3 py-2 text-center">${row.pnu코드 || '-'}</td>
            <td class="border border-slate-300 px-3 py-2 text-center">${row.지목 || '-'}</td>
            <td class="border border-slate-300 px-3 py-2 text-center">${row.면적 || '-'}</td>
            <td class="border border-slate-300 px-3 py-2">${row.기록사항 || '-'}</td>
        </tr>
    `).join('');
}

function updateMapCount() {
    const count = currentProject.data.filter(row => row.주소).length;
    document.getElementById('mapAddressCount').textContent = `총 ${count}개의 주소`;
}

function updateCellAndRefresh(rowId, field, value) {
    if (updateCell(rowId, field, value)) {
        renderReportTable();
        updateMapCount();
    }
}

function handlePaste(event, rowIndex, field) {
    event.preventDefault();
    const pastedText = event.clipboardData.getData('text');
    processPasteData(pastedText, rowIndex, field);
    renderDataInputTable();
    renderReportTable();
    updateMapCount();
}