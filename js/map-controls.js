// 지도 컨트롤 기능

var showLabels = true;
var myLocationMarker = null;
var isGpsActive = false;
var markerListData = [];
var myCurrentLocation = null;
var routePolyline = null;
var routeMarkers = []; // 경로 순번 마커들

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

// 마커 목록 업데이트
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
        // 상태별 색상
        let statusColor = 'bg-blue-100 text-blue-700'; // 예정
        if (item.상태 === '완료') statusColor = 'bg-green-100 text-green-700';
        if (item.상태 === '보류') statusColor = 'bg-amber-100 text-amber-700';
        
        return `
            <div onclick="focusOnMarker(${index})" 
                 class="p-4 border-b border-slate-100 hover:bg-blue-50/50 cursor-pointer transition-all duration-200 hover:scale-[1.02]">
                <div class="flex items-start gap-3">
                    <div class="bg-white/60 backdrop-blur-md border-slate-200/50 text-slate-800 px-4 py-2 rounded-full text-xs font-semibold border shadow-lg flex-shrink-0">
                        ${item.순번}. ${item.이름 || '이름없음'}
                    </div>
                    
                    <div class="flex-1 min-w-0">
                        <div class="mb-1">
                            <span class="inline-block px-2 py-1 rounded-full text-xs font-medium ${statusColor}">
                                ${item.상태}
                            </span>
                        </div>
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
        kakaoMap.setLevel(3);
    }
}

// 내 위치 표시 토글
var gpsWatchId = null; // 위치 추적 ID

function toggleMyLocation() {
    const btn = document.getElementById('toggleGpsBtn');
    
    // 상태 0: OFF → 상태 1: 내 위치 표시
    if (!isGpsActive && !gpsWatchId) {
        if (navigator.geolocation) {
            btn.classList.add('bg-yellow-500', 'text-white');
            btn.classList.remove('bg-white', 'text-slate-700', 'bg-green-600');
            btn.textContent = '🔡 검색중...';
            showMapMessage('현재 위치를 검색하고 있습니다...', 'info');
            
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    const myPosition = new kakao.maps.LatLng(lat, lng);
                    
                    if (myLocationMarker) {
                        myLocationMarker.setMap(null);
                    }
                    
                    // 더 시인성 좋은 내 위치 마커 생성
                    myLocationMarker = new kakao.maps.CustomOverlay({
                        position: myPosition,
                        content: `
                            <div style="position: relative; width: 40px; height: 40px;">
                                <div style="position: absolute;top: 50%;left: 50%;transform: translate(-50%, -50%);width: 40px;height: 40px;background: rgba(66, 133, 244, 0.3);border-radius: 50%;animation: pulse 2s infinite;"></div>
                                <div style="position: absolute;top: 50%;left: 50%;transform: translate(-50%, -50%);width: 24px;height: 24px;background: rgba(66, 133, 244, 0.5);border-radius: 50%;border: 3px solid white;box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>
                                <div style="position: absolute;top: 50%;left: 50%;transform: translate(-50%, -50%);width: 12px;height: 12px;background: #4285F4;border-radius: 50%;border: 2px solid white;"></div>
                            </div>
                            <style>
                                @keyframes pulse {
                                    0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                                    100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
                                }
                            </style>
                        `,
                        map: kakaoMap,
                        zIndex: 10
                    });
                    
                    kakaoMap.setCenter(myPosition);
                    kakaoMap.setLevel(4);
                    
                    myCurrentLocation = { lat: lat, lng: lng };
                    
                    isGpsActive = true;
                    btn.classList.remove('bg-yellow-500');
                    btn.classList.add('bg-green-600', 'text-white');
                    btn.textContent = '📍 GPS';
                    showMapMessage('내 위치가 표시되었습니다', 'success');
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
    // 상태 1: 내 위치 표시 → 상태 2: 실시간 추적
    else if (isGpsActive && !gpsWatchId) {
        btn.classList.add('bg-blue-600', 'text-white');
        btn.classList.remove('bg-green-600');
        btn.textContent = '🎯 추적중';
        showMapMessage('실시간 위치 추적을 시작합니다', 'info');
        
        gpsWatchId = navigator.geolocation.watchPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const myPosition = new kakao.maps.LatLng(lat, lng);
                
                if (myLocationMarker) {
                    myLocationMarker.setMap(null);
                }
                
                myLocationMarker = new kakao.maps.CustomOverlay({
                    position: myPosition,
                    content: `
                        <div style="position: relative; width: 40px; height: 40px;">
                            <div style="position: absolute;top: 50%;left: 50%;transform: translate(-50%, -50%);width: 40px;height: 40px;background: rgba(66, 133, 244, 0.3);border-radius: 50%;animation: pulse 2s infinite;"></div>
                            <div style="position: absolute;top: 50%;left: 50%;transform: translate(-50%, -50%);width: 24px;height: 24px;background: rgba(66, 133, 244, 0.5);border-radius: 50%;border: 3px solid white;box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>
                            <div style="position: absolute;top: 50%;left: 50%;transform: translate(-50%, -50%);width: 12px;height: 12px;background: #4285F4;border-radius: 50%;border: 2px solid white;"></div>
                        </div>
                        <style>
                            @keyframes pulse {
                                0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                                100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
                            }
                        </style>
                    `,
                    map: kakaoMap,
                    zIndex: 10
                });
                
                kakaoMap.setCenter(myPosition);
                myCurrentLocation = { lat: lat, lng: lng };
            },
            function(error) {
                console.error('위치 추적 오류:', error);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 5000
            }
        );
    }
    // 상태 2: 실시간 추적 → 상태 0: OFF
    else {
        if (gpsWatchId) {
            navigator.geolocation.clearWatch(gpsWatchId);
            gpsWatchId = null;
        }
        if (myLocationMarker) {
            myLocationMarker.setMap(null);
            myLocationMarker = null;
        }
        isGpsActive = false;
        myCurrentLocation = null;
        btn.classList.remove('bg-green-600', 'bg-blue-600', 'text-white');
        btn.classList.add('bg-white', 'text-slate-700');
        btn.textContent = '📍 GPS';
        showMapMessage('GPS가 꺼졌습니다', 'info');
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

// 최적 경로 계산 (ON/OFF 토글)
var isRouteActive = false;

async function calculateOptimalRoute() {
    const btn = document.getElementById('optimalRouteBtn');
    
    // 이미 경로가 표시되어 있으면 제거 (OFF)
    if (isRouteActive) {
        // 경로 제거
        if (routePolyline) {
            routePolyline.setMap(null);
            routePolyline = null;
        }
        
        // 순번 마커 제거
        routeMarkers.forEach(marker => marker.setMap(null));
        routeMarkers = [];
        
        isRouteActive = false;
        
        btn.classList.remove('bg-purple-600', 'text-white');
        btn.classList.add('bg-white', 'text-slate-700');
        btn.textContent = '🗺️ 최적경로';
        
        showMapMessage('경로가 제거되었습니다.', 'info');
        return;
    }
    
    // 경로 계산 시작 (ON)
    if (!myCurrentLocation) {
        showMapMessage('먼저 GPS 버튼을 눌러 현재 위치를 설정해주세요.', 'warning');
        return;
    }
    
    if (markerListData.length === 0) {
        showMapMessage('표시할 마커가 없습니다.', 'warning');
        return;
    }
    
    // 예정 상태인 마커만 필터링
    const pendingMarkers = markerListData.filter(marker => marker.상태 === '예정');
    
    if (pendingMarkers.length === 0) {
        showMapMessage('예정 상태인 마커가 없습니다. (완료/보류 제외)', 'warning');
        return;
    }
    
    btn.classList.remove('bg-white', 'text-slate-700');
    btn.classList.add('bg-yellow-500', 'text-white');
    btn.textContent = '🔄 계산중...';
    
    // 최적 경로 계산
    const visited = new Array(pendingMarkers.length).fill(false);
    const routeOrder = [];
    let currentPos = myCurrentLocation;
    
    for (let i = 0; i < pendingMarkers.length; i++) {
        let nearestIndex = -1;
        let minDistance = Infinity;
        
        for (let j = 0; j < pendingMarkers.length; j++) {
            if (!visited[j]) {
                const distance = getDistance(
                    currentPos.lat, currentPos.lng,
                    pendingMarkers[j].lat, pendingMarkers[j].lng
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
                lat: pendingMarkers[nearestIndex].lat,
                lng: pendingMarkers[nearestIndex].lng,
                순번: i + 1,
                이름: pendingMarkers[nearestIndex].이름
            });
            currentPos = { 
                lat: pendingMarkers[nearestIndex].lat, 
                lng: pendingMarkers[nearestIndex].lng 
            };
        }
    }
    
    // 경로 그리기
    await drawRoadRoute(myCurrentLocation, routeOrder);
    
    isRouteActive = true;
    btn.classList.remove('bg-yellow-500');
    btn.classList.add('bg-purple-600', 'text-white');
    btn.textContent = '✓ 경로표시중';
    
    showMapMessage(`최적 경로 완성! 총 ${pendingMarkers.length}개 지점 (예정 상태만)`, 'success');
}

// 실제 도로를 따라 경로 그리기
async function drawRoadRoute(start, waypoints) {
    const allPoints = [start, ...waypoints];
    const pathCoords = [];
    
    pathCoords.push(new kakao.maps.LatLng(start.lat, start.lng));
    
    for (let i = 0; i < allPoints.length - 1; i++) {
        const origin = allPoints[i];
        const destination = allPoints[i + 1];
        
        try {
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
                pathCoords.push(new kakao.maps.LatLng(destination.lat, destination.lng));
            }
        } catch (error) {
            console.error('경로 탐색 오류:', error);
            pathCoords.push(new kakao.maps.LatLng(destination.lat, destination.lng));
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // 메인 경로 선 그리기 (두꺼운 선)
    routePolyline = new kakao.maps.Polyline({
        map: kakaoMap,
        path: pathCoords,
        strokeWeight: 8,
        strokeColor: '#4A90E2',
        strokeOpacity: 0.8,
        strokeStyle: 'solid',
        zIndex: 2
    });
    
    // 방향 화살표 추가
    drawDirectionArrows(pathCoords);
    
    // 순번 마커 추가
    waypoints.forEach((point, index) => {
        const markerContent = `
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
                ${point.순번}
            </div>
        `;
        
        const customOverlay = new kakao.maps.CustomOverlay({
            map: kakaoMap,
            position: new kakao.maps.LatLng(point.lat, point.lng),
            content: markerContent,
            zIndex: 100
        });
        
        routeMarkers.push(customOverlay);
    });
}

// 경로에 방향 화살표 그리기
function drawDirectionArrows(pathCoords) {
    if (pathCoords.length < 2) return;
    
    // 경로를 따라 일정 간격으로 화살표 배치
    const arrowInterval = Math.floor(pathCoords.length / 15); // 약 15개의 화살표
    
    for (let i = arrowInterval; i < pathCoords.length - 1; i += arrowInterval) {
        const start = pathCoords[i];
        const end = pathCoords[i + 1];
        
        // 두 점 사이의 각도 계산
        const angle = calculateAngle(start, end);
        
        // 화살표 SVG
        const arrowSvg = `
            <svg width="24" height="24" viewBox="0 0 24 24" style="transform: rotate(${angle}deg);">
                <path d="M12 2 L12 18 M12 18 L6 12 M12 18 L18 12" 
                      stroke="white" 
                      stroke-width="2.5" 
                      fill="none" 
                      stroke-linecap="round" 
                      stroke-linejoin="round"/>
                <path d="M12 2 L12 18 M12 18 L6 12 M12 18 L18 12" 
                      stroke="#4A90E2" 
                      stroke-width="2" 
                      fill="none" 
                      stroke-linecap="round" 
                      stroke-linejoin="round"/>
            </svg>
        `;
        
        const arrowOverlay = new kakao.maps.CustomOverlay({
            map: kakaoMap,
            position: start,
            content: `<div style="transform: translate(-12px, -12px);">${arrowSvg}</div>`,
            zIndex: 3
        });
        
        routeMarkers.push(arrowOverlay);
    }
}

// 두 좌표 사이의 각도 계산 (도 단위)
function calculateAngle(start, end) {
    const startLat = start.getLat();
    const startLng = start.getLng();
    const endLat = end.getLat();
    const endLng = end.getLng();
    
    const dLng = endLng - startLng;
    const dLat = endLat - startLat;
    
    let angle = Math.atan2(dLng, dLat) * (180 / Math.PI);
    
    return angle;
}

// 거리 계산
function getDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// 지도 메시지 표시
function showMapMessage(message, type = 'info') {
    const loadingStatus = document.getElementById('mapLoadingStatus');
    if (!loadingStatus) return;
    
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6',
        warning: '#f59e0b'
    };
    
    loadingStatus.style.display = 'block';
    loadingStatus.style.backgroundColor = colors[type] || colors.info;
    loadingStatus.textContent = message;
    
    setTimeout(() => {
        if (loadingStatus) {
            loadingStatus.style.display = 'none';
        }
    }, 3000);
}