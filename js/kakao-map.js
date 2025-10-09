// 카카오맵 관련 함수

var kakaoMap = null;
var kakaoMarkers = [];
var geocoder = null;
const KAKAO_REST_KEY = 'dc5ce78383da06e2004e87949b9e8d5d';

// 카카오맵 초기화
function initKakaoMap() {
    const mapContainer = document.getElementById('kakaoMap');
    if (!mapContainer) {
        console.error('kakaoMap element not found');
        return;
    }

    console.log('Initializing Kakao Map...', mapContainer);

    // 기존 지도가 있으면 제거
    if (kakaoMap) {
        mapContainer.innerHTML = '';
        kakaoMap = null;
    }

    try {
        // 지도 옵션
        const mapOption = {
            center: new kakao.maps.LatLng(37.5665, 126.978), // 서울시청
            level: 8 // 확대 레벨
        };

        // 지도 생성
        kakaoMap = new kakao.maps.Map(mapContainer, mapOption);
        
        console.log('Map created successfully');
        
        // 지도타입 컨트롤 추가 (일반지도, 스카이뷰)
        const mapTypeControl = new kakao.maps.MapTypeControl();
        kakaoMap.addControl(mapTypeControl, kakao.maps.ControlPosition.TOPRIGHT);
        
        // 줌 컨트롤 추가
        const zoomControl = new kakao.maps.ZoomControl();
        kakaoMap.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);
        
        // Geocoder 객체 생성
        geocoder = new kakao.maps.services.Geocoder();

        console.log('Kakao Map initialized with controls');
        
        // 지도 크기 재조정
        setTimeout(() => {
            kakaoMap.relayout();
        }, 100);
        
    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

// 주소를 좌표로 변환
function geocodeAddressKakao(address) {
    return new Promise((resolve, reject) => {
        if (!address || address.trim() === '') {
            resolve(null);
            return;
        }

        if (!geocoder) {
            console.error('Geocoder not initialized');
            resolve(null);
            return;
        }

        console.log('Searching address:', address);

        geocoder.addressSearch(address, function(result, status) {
            console.log('Geocoding result:', status, result);
            
            if (status === kakao.maps.services.Status.OK) {
                console.log('Geocoding success:', address, result[0]);
                resolve({
                    lat: parseFloat(result[0].y),
                    lng: parseFloat(result[0].x),
                    address: address
                });
            } else {
                console.warn('Geocoding failed for:', address, 'Status:', status);
                resolve(null);
            }
        });
    });
}

// 상태별 입체적인 순번 마커 이미지 생성 (3D 효과)
function createNumberedMarkerImage(number, status) {
    let baseColor = '#3b82f6';  // 예정 - 파란색
    let shadowColor = '#1e40af';
    
    if (status === '완료') {
        baseColor = '#10b981';  // 초록색
        shadowColor = '#047857';
    } else if (status === '보류') {
        baseColor = '#f59e0b';  // 주황색
        shadowColor = '#d97706';
    }

    // 입체적인 핀 마커 SVG (그라데이션 + 그림자)
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52">
            <defs>
                <linearGradient id="grad_${number}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${baseColor};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${shadowColor};stop-opacity:1" />
                </linearGradient>
                <filter id="shadow_${number}" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                    <feOffset dx="1" dy="2" result="offsetblur"/>
                    <feComponentTransfer>
                        <feFuncA type="linear" slope="0.4"/>
                    </feComponentTransfer>
                    <feMerge>
                        <feMergeNode/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
                <filter id="innerShadow_${number}">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur"/>
                    <feOffset in="blur" dx="0" dy="1" result="offsetBlur"/>
                    <feFlood flood-color="#000000" flood-opacity="0.2" result="offsetColor"/>
                    <feComposite in="offsetColor" in2="offsetBlur" operator="in" result="offsetBlur"/>
                    <feBlend in="SourceGraphic" in2="offsetBlur" mode="normal"/>
                </filter>
            </defs>
            
            <!-- 그림자 -->
            <ellipse cx="20" cy="48" rx="12" ry="3" fill="rgba(0,0,0,0.2)"/>
            
            <!-- 핀 모양 (입체감) -->
            <path d="M20 0 C9 0 0 9 0 20 C0 28 20 48 20 48 C20 48 40 28 40 20 C40 9 31 0 20 0 Z" 
                  fill="url(#grad_${number})" 
                  filter="url(#shadow_${number})"
                  stroke="${shadowColor}" 
                  stroke-width="1.5"/>
            
            <!-- 흰색 원형 배경 (입체감) -->
            <circle cx="20" cy="18" r="12" fill="white" opacity="0.95" filter="url(#innerShadow_${number})"/>
            <circle cx="20" cy="18" r="12" fill="none" stroke="${shadowColor}" stroke-width="1" opacity="0.3"/>
            
            <!-- 순번 텍스트 -->
            <text x="20" y="23" 
                  font-family="Arial, sans-serif" 
                  font-size="${number > 99 ? '10' : '12'}" 
                  font-weight="bold" 
                  fill="${shadowColor}" 
                  text-anchor="middle">
                ${number}
            </text>
            
            <!-- 하이라이트 효과 -->
            <ellipse cx="16" cy="14" rx="4" ry="3" fill="white" opacity="0.4"/>
        </svg>
    `;
    
    const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    
    const imageSize = new kakao.maps.Size(40, 52);
    const imageOption = { offset: new kakao.maps.Point(20, 52) };
    
    return new kakao.maps.MarkerImage(url, imageSize, imageOption);
}

// 마커 추가
function addKakaoMarker(coordinate, label, status, rowData, isDuplicate, markerIndex) {
    if (!kakaoMap) {
        console.error('Map not initialized, cannot add marker');
        return null;
    }

    const markerPosition = new kakao.maps.LatLng(coordinate.lat, coordinate.lng);
    
    console.log('Adding marker:', markerIndex, label);
    
    // 순번이 있는 입체 마커 이미지 생성
    const markerImage = createNumberedMarkerImage(rowData.순번, status);

    // 마커 생성
    const marker = new kakao.maps.Marker({
        position: markerPosition,
        map: kakaoMap,
        image: markerImage,
        title: label,
        clickable: true
    });

    // 마커 클릭 이벤트
    kakao.maps.event.addListener(marker, 'click', function() {
        console.log('Marker clicked:', markerIndex, rowData);
        showBottomInfoPanel(rowData, markerIndex);
    });

    // 커스텀 라벨 생성 - 유리 굴절 캡슐
    const labelBg = isDuplicate 
        ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.85), rgba(220, 38, 38, 0.9))' 
        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.5))';
    
    const labelBorder = isDuplicate ? 'rgba(255, 100, 100, 0.6)' : 'rgba(255, 255, 255, 0.8)';
    const labelTextColor = isDuplicate ? 'white' : '#1e293b';
    const labelShadow = isDuplicate 
        ? '0 8px 32px rgba(239, 68, 68, 0.4), inset 0 2px 8px rgba(255, 255, 255, 0.3), inset 0 -2px 8px rgba(0, 0, 0, 0.1)' 
        : '0 8px 32px rgba(31, 38, 135, 0.15), inset 0 2px 8px rgba(255, 255, 255, 0.8), inset 0 -2px 8px rgba(0, 0, 0, 0.05)';
    
    const labelContent = `
        <div style="
            background: ${labelBg};
            backdrop-filter: blur(16px) saturate(180%);
            -webkit-backdrop-filter: blur(16px) saturate(180%);
            color: ${labelTextColor};
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            white-space: nowrap;
            box-shadow: ${labelShadow};
            border: 2px solid ${labelBorder};
            letter-spacing: 0.3px;
            text-shadow: ${isDuplicate ? '0 1px 2px rgba(0,0,0,0.3)' : '0 1px 2px rgba(255,255,255,0.8)'};
            pointer-events: none;
        ">
            <div style="
                position: absolute;
                top: 4px;
                left: 6px;
                width: 50%;
                height: 30%;
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0) 100%);
                border-radius: 10px 10px 0 0;
            "></div>
            ${rowData.순번}. ${rowData.이름 || '이름없음'}
        </div>
    `;

    // 라벨을 마커 위쪽에 배치 (마커 상단과 라벨 상단 정렬)
    const customOverlay = new kakao.maps.CustomOverlay({
        position: markerPosition,
        content: labelContent,
        xAnchor: 0.5,    // 중앙 정렬
        yAnchor: 1.5,    // 마커 위쪽에 배치 (마커 높이 52px 고려)
        map: showLabels ? kakaoMap : null,
        zIndex: 1
    });

    kakaoMarkers.push({ 
        marker, 
        customOverlay, 
        rowData: rowData
    });
    
    console.log('Marker added successfully. Total:', kakaoMarkers.length);
    return marker;
}

// 모든 마커 제거
function clearKakaoMarkers() {
    console.log('Clearing', kakaoMarkers.length, 'markers');
    kakaoMarkers.forEach(item => {
        item.marker.setMap(null);
        if (item.customOverlay) {
            item.customOverlay.setMap(null);
        }
    });
    kakaoMarkers = [];
}

// 프로젝트 데이터로 지도에 마커 표시
async function displayProjectOnKakaoMap(projectData) {
    console.log('=== displayProjectOnKakaoMap START ===');
    
    if (!kakaoMap) {
        console.log('Map not initialized, initializing now...');
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

    const addressesWithData = projectData.filter(row => 
        row.주소 && row.주소.trim() !== ''
    );

    if (addressesWithData.length === 0) {
        if (loadingStatus) {
            loadingStatus.style.display = 'block';
            loadingStatus.style.backgroundColor = '#f59e0b';
            loadingStatus.textContent = '⚠ 표시할 주소가 없습니다.';
        }
        return;
    }

    // 중복 주소 체크
    const addressList = addressesWithData.map(row => row.주소);
    const duplicateCheck = checkDuplicateAddresses(addressList);

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
            const markerIndex = kakaoMarkers.length;
            
            const marker = addKakaoMarker(
                coord, 
                row.이름 || `#${row.순번}`, 
                row.상태, 
                row, 
                isDuplicate,
                markerIndex
            );
            
            if (marker) {
                coordinates.push(new kakao.maps.LatLng(coord.lat, coord.lng));
                
                markerListData.push({
                    순번: row.순번,
                    이름: row.이름,
                    연락처: row.연락처,
                    주소: row.주소,
                    상태: row.상태,
                    lat: coord.lat,
                    lng: coord.lng,
                    isDuplicate: isDuplicate
                });
                
                successCount++;
            }
        }

        if (loadingStatus) {
            loadingStatus.textContent = 
                `주소 검색 중... (${i + 1}/${addressesWithData.length}) - 성공: ${successCount}개`;
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    // 지도 클릭 이벤트 등록 (한 번만)
    if (!window.mapClickListenerRegistered) {
        kakao.maps.event.addListener(kakaoMap, 'click', function() {
            hideBottomInfoPanel();
        });
        window.mapClickListenerRegistered = true;
    }

    // 모든 마커가 보이도록 지도 범위 조정
    if (coordinates.length > 0) {
        const bounds = new kakao.maps.LatLngBounds();
        coordinates.forEach(coord => bounds.extend(coord));
        kakaoMap.setBounds(bounds);
        
        setTimeout(() => {
            kakaoMap.relayout();
        }, 100);
    }

    if (loadingStatus) {
        loadingStatus.style.display = 'block';
        loadingStatus.style.backgroundColor = successCount > 0 ? '#10b981' : '#ef4444';
        loadingStatus.textContent = `✓ 총 ${addressesWithData.length}개 주소 중 ${successCount}개를 지도에 표시했습니다.`;
        
        setTimeout(() => {
            if (loadingStatus) {
                loadingStatus.style.display = 'none';
            }
        }, 3000);
    }

    const panel = document.getElementById('markerListPanel');
    if (panel && panel.style.display !== 'none') {
        updateMarkerList();
    }
    
    console.log('=== displayProjectOnKakaoMap END ===');
}

// 지도 탭이 활성화될 때 호출
function onMapTabActivated() {
    if (!kakaoMap && currentProject) {
        initKakaoMap();
    }
}

// 하단 정보창 표시
var currentMarkerIndex = null;
var currentDisplayedMarkers = []; // 현재 표시 중인 마커들

function showBottomInfoPanel(rowData, markerIndex) {
    currentMarkerIndex = markerIndex;
    
    // 같은 주소의 마커들 찾기
    const sameAddressMarkers = [];
    kakaoMarkers.forEach((item, index) => {
        if (item.rowData.주소 === rowData.주소) {
            sameAddressMarkers.push({
                index: index,
                data: item.rowData
            });
        }
    });
    
    currentDisplayedMarkers = sameAddressMarkers;
    
    const panel = document.getElementById('bottomInfoPanel');
    if (!panel) return;
    
    // 여러 마커 정보 표시
    const markersHtml = sameAddressMarkers.map((markerInfo, idx) => {
        const data = markerInfo.data;
        const mIdx = markerInfo.index;
        
        // 메모 데이터 가져오기
        const memos = data.메모 || [];
        const memosHtml = memos.length > 0 
            ? memos.map((memo, memoIdx) => `
                <div class="text-xs text-slate-600 mb-1">
                    <span class="font-semibold">${memoIdx + 1}.</span> ${memo.내용} 
                    <span class="text-slate-400">(${memo.시간})</span>
                </div>
              `).join('')
            : '<div class="text-xs text-slate-400">메모가 없습니다</div>';
        
        return `
            <div class="bg-white rounded-lg p-6 ${idx > 0 ? 'border-t-2 border-slate-200' : ''}">
                <div class="mb-4 pr-8">
                    <h3 class="text-xl font-bold text-slate-900 mb-2">
                        ${data.순번}. ${data.이름 || '이름없음'}
                    </h3>
                    <div class="flex flex-wrap gap-4 text-sm text-slate-600">
                        <a href="tel:${data.연락처 || ''}" class="flex items-center gap-2 hover:text-blue-600 transition-colors ${!data.연락처 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                            <span class="underline">${data.연락처 || '-'}</span>
                        </a>
                        <button onclick="openKakaoNavi('${(data.이름 || '목적지').replace(/'/g, "\\'")}', ${data.lat || 0}, ${data.lng || 0})" class="flex items-center gap-2 hover:text-blue-600 transition-colors cursor-pointer">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            <span class="underline">${data.주소}</span>
                        </button>
                    </div>
                </div>
                
                <div class="mb-4">
                    <label class="block text-sm font-medium text-slate-700 mb-2">상태</label>
                    <div class="flex gap-2">
                        <button onclick="changeMarkerStatus(${mIdx}, '예정')" 
                                class="px-4 py-2 rounded-lg font-medium transition-all ${data.상태 === '예정' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
                            예정
                        </button>
                        <button onclick="changeMarkerStatus(${mIdx}, '완료')" 
                                class="px-4 py-2 rounded-lg font-medium transition-all ${data.상태 === '완료' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
                            완료
                        </button>
                        <button onclick="changeMarkerStatus(${mIdx}, '보류')" 
                                class="px-4 py-2 rounded-lg font-medium transition-all ${data.상태 === '보류' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
                            보류
                        </button>
                    </div>
                </div>
                
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <label class="block text-sm font-medium text-slate-700">메모</label>
                        <button onclick="openMemoModal(${mIdx})" 
                                class="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                            + 메모 추가
                        </button>
                    </div>
                    <div class="bg-slate-50 rounded-lg p-4 max-h-32 overflow-y-auto">
                        ${memosHtml}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    panel.innerHTML = `
        <div class="bg-white rounded-t-2xl shadow-2xl max-w-4xl mx-auto relative">
            <button onclick="hideBottomInfoPanel()" class="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-lg transition-colors z-10">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
            
            ${sameAddressMarkers.length > 1 ? `
                <div class="bg-blue-50 px-6 py-3 border-b border-blue-100">
                    <p class="text-sm text-blue-700 font-medium">
                        ℹ️ 같은 주소에 ${sameAddressMarkers.length}개의 항목이 있습니다
                    </p>
                </div>
            ` : ''}
            
            <div class="max-h-[70vh] overflow-y-auto">
                ${markersHtml}
            </div>
        </div>
    `;
    
    panel.style.display = 'block';
    panel.style.animation = 'slideUp 0.3s ease-out';
}

function hideBottomInfoPanel() {
    const panel = document.getElementById('bottomInfoPanel');
    if (panel) {
        panel.style.animation = 'slideDown 0.3s ease-out';
        setTimeout(() => {
            panel.style.display = 'none';
        }, 300);
    }
    currentMarkerIndex = null;
    currentDisplayedMarkers = [];
}

// 카카오네비 열기
function openKakaoNavi(name, lat, lng) {
    if (!lat || !lng) {
        alert('위치 정보가 없습니다.');
        return;
    }
    
    const naviUrl = `kakaonavi://route?ep=${lng},${lat}&by=ROADMAP&name=${encodeURIComponent(name)}`;
    const webNaviUrl = `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        window.location.href = naviUrl;
        setTimeout(() => {
            window.open(webNaviUrl, '_blank');
        }, 1000);
    } else {
        window.open(webNaviUrl, '_blank');
    }
}

// 상태 변경
function changeMarkerStatus(markerIndex, newStatus) {
    if (!currentProject || !kakaoMarkers[markerIndex]) return;
    
    const markerData = kakaoMarkers[markerIndex].rowData;
    const oldStatus = markerData.상태;
    markerData.상태 = newStatus;
    
    // 원본 데이터 업데이트 (보고서에도 반영)
    const row = currentProject.data.find(r => r.id === markerData.id);
    if (row) {
        row.상태 = newStatus;
        
        // 보고서 테이블 업데이트
        if (typeof renderReportTable === 'function') {
            renderReportTable();
        }
    }
    
    // 프로젝트 데이터 저장
    const projectIndex = projects.findIndex(p => p.id === currentProject.id);
    if (projectIndex !== -1) {
        projects[projectIndex] = currentProject;
    }
    
    // 마커 색상 변경
    const oldMarker = kakaoMarkers[markerIndex];
    oldMarker.marker.setMap(null);
    if (oldMarker.customOverlay) {
        oldMarker.customOverlay.setMap(null);
    }
    
    const newMarkerImage = createNumberedMarkerImage(markerData.순번, newStatus);
    oldMarker.marker.setImage(newMarkerImage);
    oldMarker.marker.setMap(kakaoMap);
    if (oldMarker.customOverlay && showLabels) {
        oldMarker.customOverlay.setMap(kakaoMap);
    }
    
    // 같은 주소의 모든 마커 업데이트
    currentDisplayedMarkers.forEach(item => {
        if (item.index === markerIndex) {
            item.data.상태 = newStatus;
        }
    });
    
    showBottomInfoPanel(markerData, markerIndex);
}

// 메모 모달
function openMemoModal(markerIndex) {
    const modal = document.getElementById('memoModal');
    if (!modal) return;
    
    modal.dataset.markerIndex = markerIndex;
    document.getElementById('memoInput').value = '';
    modal.style.display = 'flex';
}

function closeMemoModal() {
    const modal = document.getElementById('memoModal');
    if (modal) {
        modal.style.display = 'none';
    }
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
    
    if (!markerData.메모) {
        markerData.메모 = [];
    }
    
    const now = new Date();
    const timeStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    markerData.메모.push({
        내용: memoText,
        시간: timeStr
    });
    
    // 원본 데이터 업데이트 (보고서에도 반영)
    const row = currentProject.data.find(r => r.id === markerData.id);
    if (row) {
        row.메모 = markerData.메모;
        
        // 기록사항에 추가
        const memoEntry = `${timeStr} - ${memoText}`;
        
        if (!row.기록사항 || row.기록사항.trim() === '' || row.기록사항 === '-') {
            row.기록사항 = memoEntry;
        } else {
            row.기록사항 += '\n' + memoEntry;
        }
        
        // 보고서 테이블 업데이트
        if (typeof renderReportTable === 'function') {
            renderReportTable();
        }
    }
    
    // 프로젝트 데이터 저장
    const projectIndex = projects.findIndex(p => p.id === currentProject.id);
    if (projectIndex !== -1) {
        projects[projectIndex] = currentProject;
    }
    
    closeMemoModal();
    showBottomInfoPanel(markerData, markerIndex);
}