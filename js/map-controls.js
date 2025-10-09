// 지도 컨트롤 기능 (목록, GPS, 이름표시)

var showLabels = true; // 이름 표시 여부
var myLocationMarker = null; // 내 위치 마커
var isGpsActive = false; // GPS 활성화 여부
var markerListData = []; // 마커 목록 데이터

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
                    <div class="${capsuleClass} ${textColor} px-4 py-2 rounded-full text-sm font-semibold border shadow-lg flex-shrink-0">
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