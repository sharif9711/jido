// 카카오맵 관련 함수
var kakaoMap = null;
var kakaoMarkers = [];
var geocoder = null;
const KAKAO_REST_KEY = 'dc5ce78383da06e2004e87949b9e8d5d';

// 카카오맵 초기화
function initKakaoMap() {
    const mapContainer = document.getElementById('kakaoMap');
    if (!mapContainer) return;

    if (kakaoMap) {
        mapContainer.innerHTML = '';
        kakaoMap = null;
    }

    try {
        kakaoMap = new kakao.maps.Map(mapContainer, {
            center: new kakao.maps.LatLng(37.5665, 126.978),
            level: 8
        });
        
        kakaoMap.addControl(new kakao.maps.MapTypeControl(), kakao.maps.ControlPosition.TOPRIGHT);
        kakaoMap.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);
        geocoder = new kakao.maps.services.Geocoder();
        
        setTimeout(() => {
            if (kakaoMap && kakaoMap.relayout) kakaoMap.relayout();
        }, 100);
    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

// 주소를 좌표로 변환 (우편번호 정보도 함께 가져오기)
function geocodeAddressKakao(address) {
    return new Promise((resolve) => {
        if (!address || !geocoder) {
            resolve(null);
            return;
        }
        geocoder.addressSearch(address, function(result, status) {
            if (status === kakao.maps.services.Status.OK) {
                // 우편번호 추출 (도로명 주소 우선, 없으면 지번 주소)
                let zipCode = '';
                if (result[0].road_address && result[0].road_address.zone_no) {
                    zipCode = result[0].road_address.zone_no;
                } else if (result[0].address && result[0].address.zip_code) {
                    zipCode = result[0].address.zip_code;
                }
                
                resolve({
                    lat: parseFloat(result[0].y),
                    lng: parseFloat(result[0].x),
                    address: address,
                    zipCode: zipCode
                });
            } else {
                resolve(null);
            }
        });
    });
}

// 마커 이미지 생성
function createNumberedMarkerImage(number, status) {
    let baseColor = '#3b82f6', shadowColor = '#1e40af';
    if (status === '완료') { baseColor = '#10b981'; shadowColor = '#047857'; }
    if (status === '보류') { baseColor = '#f59e0b'; shadowColor = '#d97706'; }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52">
        <defs>
            <linearGradient id="g${number}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:${baseColor}"/>
                <stop offset="100%" style="stop-color:${shadowColor}"/>
            </linearGradient>
        </defs>
        <ellipse cx="20" cy="48" rx="12" ry="3" fill="rgba(0,0,0,0.2)"/>
        <path d="M20 0 C9 0 0 9 0 20 C0 28 20 48 20 48 C20 48 40 28 40 20 C40 9 31 0 20 0 Z" fill="url(#g${number})" stroke="${shadowColor}" stroke-width="1.5"/>
        <circle cx="20" cy="18" r="12" fill="white" opacity="0.95"/>
        <text x="20" y="23" font-family="Arial" font-size="12" font-weight="bold" fill="${shadowColor}" text-anchor="middle">${number}</text>
    </svg>`;
    
    return new kakao.maps.MarkerImage(
        URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })),
        new kakao.maps.Size(40, 52),
        { offset: new kakao.maps.Point(20, 52) }
    );
}

// 마커 추가
function addKakaoMarker(coordinate, label, status, rowData, isDuplicate, markerIndex) {
    if (!kakaoMap) return null;

    const markerPosition = new kakao.maps.LatLng(coordinate.lat, coordinate.lng);
    const marker = new kakao.maps.Marker({
        position: markerPosition,
        map: kakaoMap,
        image: createNumberedMarkerImage(rowData.순번, status),
        clickable: true
    });

    kakao.maps.event.addListener(marker, 'click', () => showBottomInfoPanel(rowData, markerIndex));

    // 이름을 마커 위쪽에 표시 - 중복 주소면 빨간색
    const labelBg = isDuplicate 
        ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(220, 38, 38, 0.8))' 
        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7))';
    const labelColor = isDuplicate ? '#ffffff' : '#1e293b';
    const labelBorder = isDuplicate ? 'rgba(255, 100, 100, 0.8)' : 'rgba(255, 255, 255, 0.9)';
    
    const customOverlay = new kakao.maps.CustomOverlay({
        position: markerPosition,
        content: `<div style="background:${labelBg};backdrop-filter:blur(16px);color:${labelColor};padding:6px 12px;border-radius:20px;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.15);border:2px solid ${labelBorder};pointer-events:none">${rowData.이름 || '이름없음'}</div>`,
        xAnchor: 0.5,
        yAnchor: 2.6,
        map: showLabels ? kakaoMap : null,
        zIndex: 1
    });

    kakaoMarkers.push({ marker, customOverlay, rowData });
    return marker;
}

// 모든 마커 제거
function clearKakaoMarkers() {
    kakaoMarkers.forEach(item => {
        item.marker.setMap(null);
        if (item.customOverlay) item.customOverlay.setMap(null);
    });
    kakaoMarkers = [];
}

// 프로젝트 데이터로 지도에 마커 표시
async function displayProjectOnKakaoMap(projectData) {
    if (!kakaoMap) {
        initKakaoMap();
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const loadingStatus = document.getElementById('mapLoadingStatus');
    if (!kakaoMap) {
        if (loadingStatus) {
            loadingStatus.style.display = 'block';
            loadingStatus.style.backgroundColor = '#ef4444';
            loadingStatus.textContent = '✗ 지도를 초기화할 수 없습니다.';
        }
        return;
    }

    clearKakaoMarkers();

    const addressesWithData = projectData.filter(row => row.주소 && row.주소.trim());
    if (addressesWithData.length === 0) {
        if (loadingStatus) {
            loadingStatus.style.display = 'block';
            loadingStatus.style.backgroundColor = '#f59e0b';
            loadingStatus.textContent = '⚠ 표시할 주소가 없습니다.';
        }
        return;
    }

    const duplicateCheck = checkDuplicateAddresses(addressesWithData.map(r => r.주소));
    if (loadingStatus) {
        loadingStatus.style.display = 'block';
        loadingStatus.style.backgroundColor = '#3b82f6';
        loadingStatus.textContent = `주소 검색 중... (0/${addressesWithData.length})`;
    }

    const coordinates = [];
    let successCount = 0;
    markerListData = [];

    for (let i = 0; i < addressesWithData.length; i++) {
        const row = addressesWithData[i];
        const coord = await geocodeAddressKakao(row.주소);
        
        if (coord) {
            const isDuplicate = duplicateCheck[row.주소] > 1;
            const marker = addKakaoMarker(coord, row.이름 || `#${row.순번}`, row.상태, row, isDuplicate, kakaoMarkers.length);
            
            if (marker) {
                coordinates.push(new kakao.maps.LatLng(coord.lat, coord.lng));
                markerListData.push({
                    순번: row.순번, 이름: row.이름, 연락처: row.연락처, 주소: row.주소,
                    상태: row.상태, lat: coord.lat, lng: coord.lng, isDuplicate
                });
                
                // 우편번호 정보를 원본 데이터에 저장
                const originalRow = currentProject.data.find(r => r.id === row.id);
                if (originalRow) {
                    if (coord.zipCode && coord.zipCode !== '') {
                        originalRow.우편번호 = coord.zipCode;
                    }
                }
                
                successCount++;
            }
        }

        if (loadingStatus) {
            loadingStatus.textContent = `주소 검색 중... (${i + 1}/${addressesWithData.length}) - 성공: ${successCount}개`;
        }
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // 우편번호가 업데이트되었으므로 프로젝트 저장
    const projectIndex = projects.findIndex(p => p.id === currentProject.id);
    if (projectIndex !== -1) {
        projects[projectIndex] = currentProject;
    }
    
    // 보고서 테이블도 업데이트
    if (typeof renderReportTable === 'function') {
        renderReportTable();
    }

    if (!window.mapClickListenerRegistered) {
        kakao.maps.event.addListener(kakaoMap, 'click', hideBottomInfoPanel);
        window.mapClickListenerRegistered = true;
    }

    if (coordinates.length > 0) {
        const bounds = new kakao.maps.LatLngBounds();
        coordinates.forEach(coord => bounds.extend(coord));
        kakaoMap.setBounds(bounds);
        setTimeout(() => { if (kakaoMap && kakaoMap.relayout) kakaoMap.relayout(); }, 100);
    }

    if (loadingStatus) {
        loadingStatus.style.display = 'block';
        loadingStatus.style.backgroundColor = successCount > 0 ? '#10b981' : '#ef4444';
        loadingStatus.textContent = `✓ 총 ${addressesWithData.length}개 주소 중 ${successCount}개를 지도에 표시했습니다.`;
        setTimeout(() => { if (loadingStatus) loadingStatus.style.display = 'none'; }, 3000);
    }

    const panel = document.getElementById('markerListPanel');
    if (panel && panel.style.display !== 'none') updateMarkerList();
}

// 지도 탭 활성화
function onMapTabActivated() {
    if (!kakaoMap && currentProject) initKakaoMap();
}

// 하단 정보창
var currentMarkerIndex = null;
var currentDisplayedMarkers = [];

function showBottomInfoPanel(rowData, markerIndex) {
    currentMarkerIndex = markerIndex;
    const sameAddressMarkers = [];
    kakaoMarkers.forEach((item, index) => {
        if (item.rowData.주소 === rowData.주소) {
            sameAddressMarkers.push({ index, data: item.rowData });
        }
    });
    currentDisplayedMarkers = sameAddressMarkers;
    
    const panel = document.getElementById('bottomInfoPanel');
    if (!panel) return;
    
    const markersHtml = sameAddressMarkers.map((markerInfo, idx) => {
        const data = markerInfo.data;
        const mIdx = markerInfo.index;
        const memos = data.메모 || [];
        const memosHtml = memos.length > 0 
            ? memos.map((memo, i) => `<div class="text-xs text-slate-600 mb-1"><span class="font-semibold">${i + 1}.</span> ${memo.내용} <span class="text-slate-400">(${memo.시간})</span></div>`).join('')
            : '<div class="text-xs text-slate-400">메모가 없습니다</div>';
        
        return `<div class="bg-white rounded-lg p-6 ${idx > 0 ? 'border-t-2 border-slate-200' : ''}">
            <div class="mb-4 pr-8">
                <h3 class="text-xl font-bold text-slate-900 mb-2">${data.순번}. ${data.이름 || '이름없음'}</h3>
                <div class="flex flex-wrap gap-4 text-sm text-slate-600 mb-3">
                    <a href="tel:${data.연락처 || ''}" class="flex items-center gap-2 hover:text-blue-600 ${!data.연락처 ? 'pointer-events-none opacity-50' : ''}">
                        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        <span class="underline">${data.연락처 || '-'}</span>
                    </a>
                    <div class="flex items-center gap-2">
                        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        <span class="text-xs">${data.주소}</span>
                        <button onclick="openKakaoNavi('${data.주소.replace(/'/g, "\\'")}', ${data.lat || 0}, ${data.lng || 0})" class="ml-2 p-1.5 bg-yellow-400 hover:bg-yellow-500 rounded-full transition-colors" title="카카오내비로 안내">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
            <div class="mb-4">
                <label class="block text-sm font-medium text-slate-700 mb-2">상태</label>
                <div class="flex gap-2">
                    <button onclick="changeMarkerStatus(${mIdx}, '예정')" class="px-4 py-2 rounded-lg font-medium transition-all ${data.상태 === '예정' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">예정</button>
                    <button onclick="changeMarkerStatus(${mIdx}, '완료')" class="px-4 py-2 rounded-lg font-medium transition-all ${data.상태 === '완료' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">완료</button>
                    <button onclick="changeMarkerStatus(${mIdx}, '보류')" class="px-4 py-2 rounded-lg font-medium transition-all ${data.상태 === '보류' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">보류</button>
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between mb-2">
                    <label class="block text-sm font-medium text-slate-700">메모</label>
                    <button onclick="openMemoModal(${mIdx})" class="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">+ 메모 추가</button>
                </div>
                <div class="bg-slate-50 rounded-lg p-4 max-h-32 overflow-y-auto">${memosHtml}</div>
            </div>
        </div>`;
    }).join('');
    
    panel.innerHTML = `<div class="bg-white rounded-t-2xl shadow-2xl max-w-4xl mx-auto relative">
        <button onclick="hideBottomInfoPanel()" class="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-lg z-10">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        ${sameAddressMarkers.length > 1 ? `<div class="bg-blue-50 px-6 py-3 border-b border-blue-100"><p class="text-sm text-blue-700 font-medium">ℹ️ 같은 주소에 ${sameAddressMarkers.length}개의 항목이 있습니다</p></div>` : ''}
        <div class="max-h-[70vh] overflow-y-auto">${markersHtml}</div>
    </div>`;
    
    panel.style.display = 'block';
    panel.style.animation = 'slideUp 0.3s ease-out';
}

function hideBottomInfoPanel() {
    const panel = document.getElementById('bottomInfoPanel');
    if (panel) {
        panel.style.animation = 'slideDown 0.3s ease-out';
        setTimeout(() => panel.style.display = 'none', 300);
    }
    currentMarkerIndex = null;
    currentDisplayedMarkers = [];
}

function openKakaoNavi(address, lat, lng) {
    if (!lat || !lng) { 
        alert('위치 정보가 없습니다.'); 
        return; 
    }
    
    // 목적지 이름 설정
    const destination = address || '목적지';
    
    // 카카오내비 앱 스킴 (올바른 파라미터 형식)
    const naviUrl = `kakaonavi://navigate?ep=${lng},${lat}&by=KATEC`;
    
    // 웹 카카오맵 길찾기 URL
    const webNaviUrl = `https://map.kakao.com/link/to/${encodeURIComponent(destination)},${lat},${lng}`;
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // 모바일: 먼저 카카오내비 앱 시도
        const appLink = document.createElement('a');
        appLink.href = naviUrl;
        appLink.style.display = 'none';
        document.body.appendChild(appLink);
        appLink.click();
        document.body.removeChild(appLink);
        
        // 1초 후에도 페이지가 그대로면 웹 버전 열기
        setTimeout(() => {
            window.open(webNaviUrl, '_blank');
        }, 1000);
    } else {
        // PC: 웹 버전 바로 열기
        window.open(webNaviUrl, '_blank');
    }
}
function changeMarkerStatus(markerIndex, newStatus) {
    if (!currentProject || !kakaoMarkers[markerIndex]) return;
    const markerData = kakaoMarkers[markerIndex].rowData;
    markerData.상태 = newStatus;
    
    const row = currentProject.data.find(r => r.id === markerData.id);
    if (row) {
        row.상태 = newStatus;
        if (typeof renderReportTable === 'function') renderReportTable();
    }
    
    const projectIndex = projects.findIndex(p => p.id === currentProject.id);
    if (projectIndex !== -1) projects[projectIndex] = currentProject;
    
    const oldMarker = kakaoMarkers[markerIndex];
    oldMarker.marker.setMap(null);
    if (oldMarker.customOverlay) oldMarker.customOverlay.setMap(null);
    
    oldMarker.marker.setImage(createNumberedMarkerImage(markerData.순번, newStatus));
    oldMarker.marker.setMap(kakaoMap);
    if (oldMarker.customOverlay && showLabels) oldMarker.customOverlay.setMap(kakaoMap);
    
    currentDisplayedMarkers.forEach(item => {
        if (item.index === markerIndex) item.data.상태 = newStatus;
    });
    
    showBottomInfoPanel(markerData, markerIndex);
}

function openMemoModal(markerIndex) {
    const modal = document.getElementById('memoModal');
    if (!modal) return;
    modal.dataset.markerIndex = markerIndex;
    document.getElementById('memoInput').value = '';
    modal.style.display = 'flex';
}

function closeMemoModal() {
    const modal = document.getElementById('memoModal');
    if (modal) modal.style.display = 'none';
}

function saveMemo() {
    const modal = document.getElementById('memoModal');
    const markerIndex = parseInt(modal.dataset.markerIndex);
    const memoText = document.getElementById('memoInput').value.trim();
    
    if (!memoText || !kakaoMarkers[markerIndex]) {
        alert('메모 내용을 입력해주세요.');
        return;
    }
    
    const markerData = kakaoMarkers[markerIndex].rowData;
    if (!markerData.메모) markerData.메모 = [];
    
    const now = new Date();
    const timeStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    markerData.메모.push({ 내용: memoText, 시간: timeStr });
    
    const row = currentProject.data.find(r => r.id === markerData.id);
    if (row) {
        row.메모 = markerData.메모;
        const memoEntry = `${markerData.메모.length}. ${memoText} (${timeStr})`;
        
        // 줄바꿈을 두 번 추가 (\n\n)
        row.기록사항 = (!row.기록사항 || row.기록사항.trim() === '' || row.기록사항 === '-') 
            ? memoEntry 
            : row.기록사항 + '\n\n' + memoEntry;
        
        if (typeof renderReportTable === 'function') renderReportTable();
    }
    
    const projectIndex = projects.findIndex(p => p.id === currentProject.id);
    if (projectIndex !== -1) projects[projectIndex] = currentProject;
    
    closeMemoModal();
    showBottomInfoPanel(markerData, markerIndex);
}