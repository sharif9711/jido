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
        loadingMsg.textContent = `토지정보 수집 중... (${i + 1}/${rowsWithAddress.length})`;
        
        // API 호출 제한을 위한 지연 (700ms)
        await new Promise(resolve => setTimeout(resolve, 700));
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
    
    // 간단한 결과 메시지만 표시
    if (successCount > 0) {
        alert(`토지정보 수집 완료: ${successCount}건`);
    } else {
        alert('토지정보를 수집하지 못했습니다.');
    }
}