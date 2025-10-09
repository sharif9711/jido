// 지도 컨트롤 기능 (목록, GPS, 이름표시, 최적경로)

var showLabels = true; // 이름 표시 여부
var myLocationMarker = null; // 내 위치 마커
var isGpsActive = false; // GPS 활성화 여부
var markerListData = []; // 마커 목록 데이터
var myCurrentLocation = null; // 내 현재 위치
var routePolyline = null; // 경로 선

// 마커 목록 토글
function toggleMarkerList() {
    const panel = document.getElementById('markerListPanel');
    const btn = document.getElementById('toggleListBtn');
    
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        btn.classList.add('bg-blue-600', 'text-white');
        btn.classList.remove('bg-white', 'text-slate-700');
        updateMarkerList();
    } else {
        panel.style.display = 'none';
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.classList.add('bg-white', 'text-slate-700');
    }
}

// 마커 목록 업데이트 - 이름, 연락처, 주소 표시
function updateMarkerList() {
    const content = document.getElementById('markerListContent');
    if (!content || markerListData.length === 0) {
        content.innerHTML = `
            <div class="p-8 text-center text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-3 text-slate-300">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <p class="text-sm">표시된 마커가 없습니다</p>
            </div>
        `;
        return;
    }

    content.innerHTML = markerListData.map((item, index) => {
        // 중복 여부에 따른 스타일
        const capsuleClass = item.isDuplicate 
            ? 'bg-gradient-to-r from-red-500/80 to-red-600/80 backdrop-blur-md border-red-300/50' 
            : 'bg-white/60 backdrop-blur-md border-slate-200/50';
        
        const textColor = item.isDuplicate ? 'text-white' : 'text-slate-800';
        
        return `
            <div onclick="focusOnMarker(${index})" 
                 class="p-4 border-b border-slate-100 hover:bg-blue-50/50 cursor-pointer transition-all duration-200 hover:scale-[1.02]">
                <div class="flex items-start gap-3">
                    <!-- 순번.이름 캡슐 -->
                    <div class="${capsuleClass} ${textColor} px-4 py-2 rounded-full text-xs font-semibold border shadow-lg flex-shrink-0">
                        ${item.순번}. ${item.이름 || '이름없음'}
                    </div>
                    
                    <!-- 정보 -->
                    <div class="flex-1 min-w-0">
                        <div class="text-sm text-slate-700 mb-1 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="flex-shrink-0">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                            <span class="truncate">${item.연락처 || '-'}</span>
                        </div>
                        <div class="text-xs text-slate-600 flex items-start gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="flex-shrink-0 mt-0.5">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            <span class="break-words">${item.주소}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 특정 마커로 포커스
function focusOnMarker(index) {
    if (index < 0 || index >= markerListData.length) return;
    
    const item = markerListData[index];
    if (item.lat && item.lng && kakaoMap) {
        const position = new kakao.maps.LatLng(item.lat, item.lng);
        kakaoMap.setCenter(position);
        kakaoMap.setLevel(3); // 줌 인
        
        // 인포윈도우 열기
        if (kakaoMarkers[index] && kakaoMarkers[index].infowindow) {
            kakaoMarkers[index].infowindow.open(kakaoMap, kakaoMarkers[index].marker);
        }
    }
}

// 내 위치 표시 토글
function toggleMyLocation() {
    const btn = document.getElementById('toggleGpsBtn');
    
    if (isGpsActive) {
        // GPS 비활성화
        if (myLocationMarker) {
            myLocationMarker.setMap(null);
            myLocationMarker = null;
        }
        isGpsActive = false;
        btn.classList.remove('bg-green-600', 'text-white');
        btn.classList.add('bg-white', 'text-slate-700');
    } else {
        // GPS 활성화
        if (navigator.geolocation) {
            btn.classList.add('bg-yellow-500', 'text-white');
            btn.classList.remove('bg-white', 'text-slate-700');
            btn.textContent = '📡 검색중...';
            
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    // 내 위치 마커 생성
                    const myPosition = new kakao.maps.LatLng(lat, lng);
                    
                    if (myLocationMarker) {
                        myLocationMarker.setMap(null);
                    }
                    
                    // 파란색 원형 마커
                    myLocationMarker = new kakao.maps.Circle({
                        center: myPosition,
                        radius: 50,
                        strokeWeight: 3,
                        strokeColor: '#4285F4',
                        strokeOpacity: 1,
                        fillColor: '#4285F4',
                        fillOpacity: 0.3,
                        map: kakaoMap
                    });
                    
                    // 지도 중심 이동
                    kakaoMap.setCenter(myPosition);
                    kakaoMap.setLevel(4);
                    
                    // 위치 저장
                    myCurrentLocation = { lat: lat, lng: lng };
                    
                    isGpsActive = true;
                    btn.classList.remove('bg-yellow-500');
                    btn.classList.add('bg-green-600', 'text-white');
                    btn.textContent = '📍 GPS';
                },
                function(error) {
                    alert('위치 정보를 가져올 수 없습니다: ' + error.message);
                    btn.classList.remove('bg-yellow-500', 'text-white');
                    btn.classList.add('bg-white', 'text-slate-700');
                    btn.textContent = '📍 GPS';
                }
            );
        } else {
            alert('이 브라우저는 위치 정보를 지원하지 않습니다.');
        }
    }
}

// 마커 이름 라벨 토글
function toggleMarkerLabels() {
    showLabels = !showLabels;
    const btn = document.getElementById('toggleLabelsBtn');
    
    if (showLabels) {
        btn.classList.add('bg-blue-600', 'text-white');
        btn.classList.remove('bg-white', 'text-slate-700');
    } else {
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.classList.add('bg-white', 'text-slate-700');
    }
    
    // 모든 마커의 라벨 표시/숨김
    kakaoMarkers.forEach(item => {
        if (item.customOverlay) {
            if (showLabels) {
                item.customOverlay.setMap(kakaoMap);
            } else {
                item.customOverlay.setMap(null);
            }
        }
    });
}

// 중복 주소 체크
function checkDuplicateAddresses(addresses) {
    const addressCount = {};
    addresses.forEach(addr => {
        addressCount[addr] = (addressCount[addr] || 0) + 1;
    });
    return addressCount;
}

// 최적 경로 계산 (TSP 근사 알고리즘 - Nearest Neighbor)
async function calculateOptimalRoute() {
    if (!myCurrentLocation) {
        alert('먼저 GPS 버튼을 눌러 현재 위치를 설정해주세요.');
        return;
    }
    
    if (markerListData.length === 0) {
        alert('표시할 마커가 없습니다.');
        return;
    }
    
    const btn = document.getElementById('optimalRouteBtn');
    btn.classList.add('bg-yellow-500', 'text-white');
    btn.textContent = '🔄 계산중...';
    
    // 기존 경로 제거
    if (routePolyline) {
        routePolyline.setMap(null);
    }
    
    // 기존 화살표들 제거
    if (window.routeArrows) {
        window.routeArrows.forEach(arrow => arrow.setMap(null));
        window.routeArrows = [];
    }
    
    // 최적 경로 계산 (Nearest Neighbor 알고리즘)
    const visited = new Array(markerListData.length).fill(false);
    const routeOrder = [];
    let currentPos = myCurrentLocation;
    
    for (let i = 0; i < markerListData.length; i++) {
        let nearestIndex = -1;
        let minDistance = Infinity;
        
        for (let j = 0; j < markerListData.length; j++) {
            if (!visited[j]) {
                const distance = getDistance(
                    currentPos.lat, currentPos.lng,
                    markerListData[j].lat, markerListData[j].lng
                );
                
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestIndex = j;
                }
            }
        }
        
        if (nearestIndex !== -1) {
            visited[nearestIndex] = true;
            routeOrder.push({
                lat: markerListData[nearestIndex].lat,
                lng: markerListData[nearestIndex].lng
            });
            currentPos = { 
                lat: markerListData[nearestIndex].lat, 
                lng: markerListData[nearestIndex].lng 
            };
        }
    }
    
    // 카카오 길찾기 API를 사용하여 실제 도로 경로 그리기
    await drawRoadRoute(myCurrentLocation, routeOrder);
    
    btn.classList.remove('bg-yellow-500');
    btn.classList.add('bg-purple-600', 'text-white');
    btn.textContent = '🗺️ 경로표시';
    
    alert(`최적 경로가 계산되었습니다!\n총 ${markerListData.length}개 지점`);
}

// 실제 도로를 따라 경로 그리기 (네비게이션 스타일)
async function drawRoadRoute(start, waypoints) {
    const allPoints = [start, ...waypoints];
    const pathCoords = [];
    
    // 시작점 추가
    pathCoords.push(new kakao.maps.LatLng(start.lat, start.lng));
    
    // 각 구간마다 길찾기 API 호출
    for (let i = 0; i < allPoints.length - 1; i++) {
        const origin = allPoints[i];
        const destination = allPoints[i + 1];
        
        try {
            // 카카오 REST API를 사용한 경로 탐색
            const response = await fetch(
                `https://apis-navi.kakaomobility.com/v1/directions?` +
                `origin=${origin.lng},${origin.lat}&` +
                `destination=${destination.lng},${destination.lat}&` +
                `priority=RECOMMEND`,
                {
                    headers: {
                        'Authorization': `KakaoAK ${KAKAO_REST_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (response.ok) {
                const data = await response.json();
                
                // 경로 좌표 추출
                if (data.routes && data.routes[0] && data.routes[0].sections) {
                    data.routes[0].sections.forEach(section => {
                        if (section.roads) {
                            section.roads.forEach(road => {
                                road.vertexes.forEach((coord, idx) => {
                                    if (idx % 2 === 0) {
                                        const lng = coord;
                                        const lat = road.vertexes[idx + 1];
                                        pathCoords.push(new kakao.maps.LatLng(lat, lng));
                                    }
                                });
                            });
                        }
                    });
                }
            } else {
                // API 실패 시 직선으로 대체
                console.warn('길찾기 API 실패, 직선으로 대체');
                pathCoords.push(new kakao.maps.LatLng(destination.lat, destination.lng));
            }
        } catch (error) {
            console.error('경로 탐색 오류:', error);
            // 오류 시 직선으로 대체
            pathCoords.push(new kakao.maps.LatLng(destination.lat, destination.lng));
        }
        
        // API 호출 제한 방지
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // 기존 경로 제거
    if (routePolyline) {
        routePolyline.setMap(null);
    }
    
    // 기존 화살표들 제거
    if (window.routeArrows) {
        window.routeArrows.forEach(arrow => arrow.setMap(null));
        window.routeArrows = [];
    }
    
    // 1. 외곽선 (테두리) - 진한 파란색
    const outlinePolyline = new kakao.maps.Polyline({
        map: kakaoMap,
        path: pathCoords,
        strokeWeight: 10,
        strokeColor: '#0066CC',
        strokeOpacity: 0.9,
        strokeStyle: 'solid',
        zIndex: 1
    });
    
    // 2. 메인 경로선 - 밝은 파란색 (네비게이션 스타일)
    routePolyline = new kakao.maps.Polyline({
        map: kakaoMap,
        path: pathCoords,
        strokeWeight: 7,
        strokeColor: '#4A90E2',
        strokeOpacity: 1,
        strokeStyle: 'solid',
        zIndex: 2
    });
    
    // 외곽선도 함께 저장 (삭제하기 위해)
    if (!window.routeArrows) {
        window.routeArrows = [];
    }
    window.routeArrows.push(outlinePolyline);
    
    // 3. 화살표 마커 추가 (일정 간격으로)
    const arrowInterval = Math.floor(pathCoords.length / (allPoints.length * 2)); // 구간당 2개씩
    
    for (let i = arrowInterval; i < pathCoords.length - 1; i += arrowInterval) {
        const current = pathCoords[i];
        const next = pathCoords[Math.min(i + 5, pathCoords.length - 1)]; // 5칸 앞
        
        // 방향 계산
        const angle = calculateAngle(current, next);
        
        // 화살표 커스텀 오버레이
        const arrowContent = `
            <div style="
                width: 0;
                height: 0;
                border-left: 8px solid transparent;
                border-right: 8px solid transparent;
                border-bottom: 16px solid #FFFFFF;
                transform: rotate(${angle}deg);
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
            "></div>
        `;
        
        const arrowOverlay = new kakao.maps.CustomOverlay({
            map: kakaoMap,
            position: current,
            content: arrowContent,
            zIndex: 3
        });
        
        window.routeArrows.push(arrowOverlay);
    }
    
    // 4. 시작점 마커 (내 위치)
    const startMarkerContent = `
        <div style="
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: 4px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-size: 20px;
        ">
            🚗
        </div>
    `;
    
    const startOverlay = new kakao.maps.CustomOverlay({
        map: kakaoMap,
        position: pathCoords[0],
        content: startMarkerContent,
        zIndex: 10
    });
    
    window.routeArrows.push(startOverlay);
    
    // 5. 각 경유지에 순번 표시
    for (let i = 0; i < waypoints.length; i++) {
        const waypointPos = new kakao.maps.LatLng(waypoints[i].lat, waypoints[i].lng);
        
        const waypointContent = `
            <div style="
                width: 32px;
                height: 32px;
                background: linear-gradient(135deg, #FF6B6B, #EE5A6F);
                border: 3px solid white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 14px;
                box-shadow: 0 3px 8px rgba(0,0,0,0.3);
            ">
                ${i + 1}
            </div>
        `;
        
        const waypointOverlay = new kakao.maps.CustomOverlay({
            map: kakaoMap,
            position: waypointPos,
            content: waypointContent,
            zIndex: 9
        });
        
        window.routeArrows.push(waypointOverlay);
    }
}

// 두 점 사이의 각도 계산 (화살표 방향)
function calculateAngle(point1, point2) {
    const lat1 = point1.getLat();
    const lng1 = point1.getLng();
    const lat2 = point2.getLat();
    const lng2 = point2.getLng();
    
    const dy = lat2 - lat1;
    const dx = lng2 - lng1;
    
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    angle = angle + 90; // 위쪽이 0도가 되도록 조정
    
    return angle;
}

// 두 지점 간 거리 계산 (Haversine formula)
function getDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // 지구 반지름 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}