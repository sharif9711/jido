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

    // 기존 지도가 있으면 제거
    if (kakaoMap) {
        mapContainer.innerHTML = '';
    }

    // 지도 옵션
    const mapOption = {
        center: new kakao.maps.LatLng(37.5665, 126.978), // 서울시청
        level: 8 // 확대 레벨
    };

    // 지도 생성
    kakaoMap = new kakao.maps.Map(mapContainer, mapOption);
    
    // Geocoder 객체 생성
    geocoder = new kakao.maps.services.Geocoder();

    console.log('Kakao Map initialized');
}

// 주소를 좌표로 변환
function geocodeAddressKakao(address) {
    return new Promise((resolve, reject) => {
        if (!address || address.trim() === '') {
            resolve(null);
            return;
        }

        geocoder.addressSearch(address, function(result, status) {
            if (status === kakao.maps.services.Status.OK) {
                resolve({
                    lat: parseFloat(result[0].y),
                    lng: parseFloat(result[0].x),
                    address: address
                });
            } else {
                console.warn('Geocoding failed for:', address, status);
                resolve(null);
            }
        });
    });
}

// 마커 추가
function addKakaoMarker(coordinate, label, status) {
    const markerPosition = new kakao.maps.LatLng(coordinate.lat, coordinate.lng);
    
    // 상태별 마커 이미지 색상
    let markerColor = '#3b82f6'; // 예정 - 파란색
    if (status === '완료') markerColor = '#10b981'; // 초록색
    if (status === '보류') markerColor = '#f59e0b'; // 주황색

    // 마커 생성
    const marker = new kakao.maps.Marker({
        position: markerPosition,
        map: kakaoMap
    });

    // 인포윈도우 내용
    const infoContent = `
        <div style="padding:10px; min-width:150px;">
            <div style="font-weight:bold; margin-bottom:5px; color:${markerColor};">${label || '위치'}</div>
            <div style="font-size:12px; color:#666;">${coordinate.address}</div>
            <div style="font-size:11px; color:${markerColor}; margin-top:5px;">
                <span style="background:${markerColor}; color:white; padding:2px 6px; border-radius:3px;">${status}</span>
            </div>
        </div>
    `;

    const infowindow = new kakao.maps.InfoWindow({
        content: infoContent
    });

    // 마커 클릭 이벤트
    kakao.maps.event.addListener(marker, 'click', function() {
        infowindow.open(kakaoMap, marker);
    });

    kakaoMarkers.push({ marker, infowindow });
    
    return marker;
}

// 모든 마커 제거
function clearKakaoMarkers() {
    kakaoMarkers.forEach(item => {
        item.marker.setMap(null);
    });
    kakaoMarkers = [];
}

// 프로젝트 데이터로 지도에 마커 표시
async function displayProjectOnKakaoMap(projectData) {
    if (!kakaoMap) {
        initKakaoMap();
        // 지도 초기화 후 약간의 지연
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    clearKakaoMarkers();

    const addressesWithData = projectData.filter(row => 
        row.주소 && row.주소.trim() !== ''
    );

    if (addressesWithData.length === 0) {
        alert('표시할 주소가 없습니다. 자료입력 메뉴에서 주소를 입력해주세요.');
        return;
    }

    const loadingStatus = document.getElementById('mapLoadingStatus');
    loadingStatus.style.display = 'block';
    loadingStatus.textContent = `주소 검색 중... (0/${addressesWithData.length})`;

    const coordinates = [];
    let successCount = 0;

    for (let i = 0; i < addressesWithData.length; i++) {
        const row = addressesWithData[i];
        const coord = await geocodeAddressKakao(row.주소);
        
        if (coord) {
            addKakaoMarker(coord, row.이름 || `#${row.순번}`, row.상태);
            coordinates.push(new kakao.maps.LatLng(coord.lat, coord.lng));
            successCount++;
        }

        loadingStatus.textContent = 
            `주소 검색 중... (${i + 1}/${addressesWithData.length}) - 성공: ${successCount}개`;
        
        // API 호출 제한을 위한 지연
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    loadingStatus.style.display = 'none';

    // 모든 마커가 보이도록 지도 범위 조정
    if (coordinates.length > 0) {
        const bounds = new kakao.maps.LatLngBounds();
        coordinates.forEach(coord => bounds.extend(coord));
        kakaoMap.setBounds(bounds);
    }

    alert(`총 ${addressesWithData.length}개 주소 중 ${successCount}개를 지도에 표시했습니다.`);
}

// 지도 탭이 활성화될 때 호출
function onMapTabActivated() {
    if (!kakaoMap && currentProject) {
        initKakaoMap();
    }
}