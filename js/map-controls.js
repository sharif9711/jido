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

// 마커 목록 업데이트
function updateMarkerList() {
    const content = document.getElementById('markerListContent');
    if (!content || markerListData.length === 0) return;

    content.innerHTML = markerListData.map((item, index) => `
        <div onclick="focusOnMarker(${index})" class="p-4 border-b border-slate-100 hover:bg-blue-50 cursor-pointer transition-colors">
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <div class="font-semibold text-slate-900 mb-1">${item.순번}. ${item.이름 || '이름없음'}</div>
                    <div class="text-sm text-slate-600 mb-1">📞 ${item.연락처 || '-'}</div>
                    <div class="text-sm text-slate-600">📍 ${item.주소}</div>
                </div>
                ${item.isDuplicate ? '<span class="text-red-500 text-xs font-bold">중복</span>' : ''}
            </div>
        </div>
    `).join('');
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