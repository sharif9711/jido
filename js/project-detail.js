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
        
        if (tabBtn && content) {
            if (tab === tabName) {
                tabBtn.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
                tabBtn.classList.remove('text-slate-600', 'hover:text-slate-900');
                content.style.display = 'block';
                
                // 지도 탭 활성화 시 지도 초기화
                if (tab === '지도') {
                    onMapTabActivated();
                }
                
                // 보고서 탭 활성화 시 주소에서 우편번호 자동 수집
                if (tab === '보고서') {
                    fetchPostalCodesForReport();
                }
            } else {
                tabBtn.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
                tabBtn.classList.add('text-slate-600', 'hover:text-slate-900');
                content.style.display = 'none';
            }
        }
    });
}

// 보고서용 우편번호 및 좌표 자동 수집
async function fetchPostalCodesForReport() {
    if (!currentProject) return;
    
    // geocoder가 없으면 초기화
    if (typeof kakao === 'undefined' || typeof kakao.maps === 'undefined') {
        console.log('Kakao Maps API not loaded yet');
        return;
    }
    
    if (!geocoder) {
        try {
            geocoder = new kakao.maps.services.Geocoder();
        } catch (error) {
            console.error('Failed to initialize geocoder:', error);
            return;
        }
    }
    
    const rowsWithAddress = currentProject.data.filter(row => 
        row.주소 && row.주소.trim() !== ''
    );
    
    if (rowsWithAddress.length === 0) return;
    
    // 백그라운드에서 우편번호, 좌표 및 VWorld 토지정보 수집
    for (let i = 0; i < Math.min(rowsWithAddress.length, 10); i++) {
        const row = rowsWithAddress[i];
        
        try {
            geocoder.addressSearch(row.주소, async function(result, status) {
                if (status === kakao.maps.services.Status.OK) {
                    // 우편번호 수집
                    if (!row.우편번호) {
                        let zipCode = '';
                        if (result[0].road_address && result[0].road_address.zone_no) {
                            zipCode = result[0].road_address.zone_no;
                        } else if (result[0].address && result[0].address.zip_code) {
                            zipCode = result[0].address.zip_code;
                        }
                        if (zipCode) {
                            row.우편번호 = zipCode;
                        }
                    }
                    
                    // 좌표 정보 수집 (lat, lng 추가)
                    if (!row.lat || !row.lng) {
                        row.lat = parseFloat(result[0].y);
                        row.lng = parseFloat(result[0].x);
                    }
                    
                    // VWorld API를 통한 토지 정보 수집
                    if (typeof getAddressDetailInfo === 'function') {
                        try {
                            const detailInfo = await getAddressDetailInfo(row.주소);
                            if (detailInfo) {
                                // 법정동코드
                                if (!row.법정동코드 && detailInfo.bjdCode) {
                                    row.법정동코드 = detailInfo.bjdCode;
                                }
                                
                                // PNU코드
                                if (!row.pnu코드 && detailInfo.pnuCode) {
                                    row.pnu코드 = detailInfo.pnuCode;
                                }
                                
                                // 지목
                                if (!row.지목 && detailInfo.jimok) {
                                    row.지목 = detailInfo.jimok;
                                }
                                
                                // 면적
                                if (!row.면적 && detailInfo.area) {
                                    row.면적 = detailInfo.area;
                                }
                            }
                        } catch (error) {
                            console.error('VWorld API 조회 오류:', error);
                        }
                    }
                    
                    if (typeof renderReportTable === 'function') {
                        renderReportTable();
                    }
                }
            });
        } catch (error) {
            console.error('Geocoding error:', error);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 프로젝트 데이터 저장
    const projectIndex = projects.findIndex(p => p.id === currentProject.id);
    if (projectIndex !== -1) {
        projects[projectIndex] = currentProject;
    }
}

function renderDataInputTable() {
    const tbody = document.getElementById('dataInputTable');
    if (!tbody) return;
    
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

function getStatusColor(status) {
    switch(status) {
        case '예정': return 'bg-blue-50 text-blue-700';
        case '완료': return 'bg-green-50 text-green-700';
        case '보류': return 'bg-amber-50 text-amber-700';
        default: return 'bg-slate-50 text-slate-700';
    }
}

function renderReportTable() {
    const tbody = document.getElementById('reportTable');
    if (!tbody) return;
    
    tbody.innerHTML = currentProject.data
        .filter(row => row.이름 || row.연락처 || row.주소) // 입력된 자료만 표시
        .map(row => `
        <tr class="hover:bg-slate-50">
            <td class="border border-slate-300 px-3 py-2 text-center">${row.순번}</td>
            <td class="border border-slate-300 px-3 py-2">${row.이름}</td>
            <td class="border border-slate-300 px-3 py-2">${row.연락처}</td>
            <td class="border border-slate-300 px-3 py-2">${row.주소}</td>
            <td class="border border-slate-300 px-3 py-2 text-center">${row.우편번호 || '-'}</td>
            <td class="border border-slate-300 px-3 py-2 text-center">
                <select onchange="updateReportStatus('${row.id}', this.value)" 
                    class="px-2 py-1 rounded text-xs font-medium ${getStatusColor(row.상태)} border-0 cursor-pointer">
                    <option value="예정" ${row.상태 === '예정' ? 'selected' : ''}>예정</option>
                    <option value="완료" ${row.상태 === '완료' ? 'selected' : ''}>완료</option>
                    <option value="보류" ${row.상태 === '보류' ? 'selected' : ''}>보류</option>
                </select>
            </td>
            <td class="border border-slate-300 px-3 py-2 text-center">${row.법정동코드 || '-'}</td>
            <td class="border border-slate-300 px-3 py-2 text-center">${row.pnu코드 || '-'}</td>
            <td class="border border-slate-300 px-3 py-2 text-center">${row.지목 || '-'}</td>
            <td class="border border-slate-300 px-3 py-2 text-center">${row.면적 || '-'}</td>
            <td class="border border-slate-300 px-3 py-2 whitespace-pre-line">${row.기록사항 || '-'}</td>
        </tr>
    `).join('');
}

function updateReportStatus(rowId, status) {
    if (updateCell(rowId, '상태', status)) {
        renderReportTable();
    }
}

function updateMapCount() {
    const mapCount = document.getElementById('mapAddressCount');
    if (!mapCount) return;
    
    const count = currentProject.data.filter(row => row.주소).length;
    mapCount.textContent = `이 ${count}개의 주소`;
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

// 엑셀 다운로드 함수
function downloadExcel() {
    if (!currentProject) {
        alert('프로젝트가 선택되지 않았습니다.');
        return;
    }

    // 입력된 데이터만 필터링
    const filteredData = currentProject.data.filter(row => row.이름 || row.연락처 || row.주소);
    
    if (filteredData.length === 0) {
        alert('다운로드할 데이터가 없습니다.');
        return;
    }

    // CSV 형식으로 데이터 생성
    const headers = ['순번', '이름', '연락처', '주소', '우편번호', '상태', '법정동코드', 'PNU코드', '지목', '면적', '기록사항'];
    const csvContent = [
        headers.join(','),
        ...filteredData.map(row => [
            row.순번,
            `"${row.이름 || ''}"`,
            `"${row.연락처 || ''}"`,
            `"${row.주소 || ''}"`,
            `"${row.우편번호 || ''}"`,
            row.상태,
            `"${row.법정동코드 || ''}"`,
            `"${row.pnu코드 || ''}"`,
            `"${row.지목 || ''}"`,
            `"${row.면적 || ''}"`,
            `"${(row.기록사항 || '').replace(/\n/g, ' ')}"`
        ].join(','))
    ].join('\n');

    // BOM 추가 (한글 깨짐 방지)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // 다운로드
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const fileName = `${currentProject.projectName}_보고서_${new Date().toISOString().slice(0, 10)}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert(`"${fileName}" 파일이 다운로드되었습니다.`);
}

// VWorld API를 통한 토지정보 수집
async function fetchLandInfoForReport() {
    if (!currentProject) {
        alert('프로젝트가 선택되지 않았습니다.');
        return;
    }
    
    const rowsWithAddress = currentProject.data.filter(row => 
        row.주소 && row.주소.trim() !== '' && (row.이름 || row.연락처)
    );
    
    if (rowsWithAddress.length === 0) {
        alert('주소가 입력된 데이터가 없습니다.');
        return;
    }
    
    if (!confirm(`${rowsWithAddress.length}개의 주소에 대해 토지정보를 수집하시겠습니까?\n\n※ VWorld API를 사용하여 법정동코드, PNU코드, 지목, 면적 정보를 가져옵니다.\n※ 처리 시간이 다소 소요될 수 있습니다.`)) {
        return;
    }
    
    // 로딩 메시지 표시
    const loadingMsg = document.createElement('div');
    loadingMsg.id = 'landInfoLoading';
    loadingMsg.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 bg-blue-600 text-white rounded-lg shadow-lg';
    loadingMsg.textContent = '토지정보 수집 중... (0/' + rowsWithAddress.length + ')';
    document.body.appendChild(loadingMsg);
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < rowsWithAddress.length; i++) {
        const row = rowsWithAddress[i];
        
        try {
            if (typeof getAddressDetailInfo === 'function') {
                const detailInfo = await getAddressDetailInfo(row.주소);
                
                if (detailInfo) {
                    // 법정동코드
                    if (detailInfo.bjdCode) {
                        row.법정동코드 = detailInfo.bjdCode;
                    }
                    
                    // PNU코드
                    if (detailInfo.pnuCode) {
                        row.pnu코드 = detailInfo.pnuCode;
                    }
                    
                    // 지목
                    if (detailInfo.jimok) {
                        row.지목 = detailInfo.jimok;
                    }
                    
                    // 면적
                    if (detailInfo.area) {
                        row.면적 = detailInfo.area;
                    }
                    
                    // 좌표 정보
                    if (detailInfo.lat && detailInfo.lon) {
                        row.lat = detailInfo.lat;
                        row.lng = detailInfo.lon;
                    }
                    // 우편번호
                    if (detailInfo.zipCode) {
                        row.우편번호 = detailInfo.zipCode;
                    }
                    
                    successCount++;
                } else {
                    failCount++;
                }
            }
        } catch (error) {
            console.error('토지정보 수집 오류:', error);
            failCount++;
        }
        
        // 진행 상황 업데이트
        loadingMsg.textContent = `토지정보 수집 중... (${i + 1}/${rowsWithAddress.length}) - 성공: ${successCount}, 실패: ${failCount}`;
        
        // API 호출 제한을 위한 지연 (500ms)
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 프로젝트 데이터 저장
    const projectIndex = projects.findIndex(p => p.id === currentProject.id);
    if (projectIndex !== -1) {
        projects[projectIndex] = currentProject;
    }
    
    // 보고서 테이블 업데이트
    renderReportTable();
    
    // 로딩 메시지 제거
    document.body.removeChild(loadingMsg);
    
    // 결과 메시지
    alert(`토지정보 수집 완료!\n\n총 ${rowsWithAddress.length}개 주소 처리\n성공: ${successCount}개\n실패: ${failCount}개\n\n※ VWorld API의 데이터 제공 범위에 따라 일부 정보가 누락될 수 있습니다.`);
}