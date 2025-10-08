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
    
    // 지도타입 컨트롤 추가 (일반지도, 스카이뷰)
    const mapTypeControl = new kakao.maps.MapTypeControl();
    kakaoMap.addControl(mapTypeControl, kakao.maps.ControlPosition.TOPRIGHT);
    
    // 줌 컨트롤 추가
    const zoomControl = new kakao.maps.ZoomControl();
    kakaoMap.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);
    
    // Geocoder 객체 생성
    geocoder = new kakao.maps.services.Geocoder();

    console.log('Kakao Map initialized with controls');
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

        geocoder.addressSearch(address, function(result, status) {
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

// 상태별 마커 이미지 생성
function createMarkerImage(status) {
    let color = '#3b82f6'; // 예정 - 파란색
    if (status === '완료') color = '#10b981'; // 초록색
    if (status === '보류') color = '#f59e0b'; // 주황색

    // SVG 마커 생성
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
            <path d="M16 0C7.2 0 0 7.2 0 16c0 8.8 16 24 16 24s16-15.2 16-24C32 7.2 24.8 0 16 0z" fill="${color}"/>
            <circle cx="16" cy="16" r="6" fill="white"/>
        </svg>
    `;
    
    const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    
    const imageSize = new kakao.maps.Size(32, 40);
    const imageOption = { offset: new kakao.maps.Point(16, 40) };
    
    return new kakao.maps.MarkerImage(url, imageSize, imageOption);
}

// 마커 추가
function addKakaoMarker(coordinate, label, status) {
    const markerPosition = new kakao.maps.LatLng(coordinate.lat, coordinate.lng);
    
    // 마커 이미지 생성
    const markerImage = createMarkerImage(status);

    // 마커 생성
    const marker = new kakao.maps.Marker({
        position: markerPosition,
        map: kakaoMap,
        image: markerImage,
        title: label
    });

    // 상태별 색상
    let statusColor = '#3b82f6';
    if (status === '완료') statusColor = '#10b981';
    if (status === '보류') statusColor = '#f59e0b';

    // 인포윈도우 내용
    const infoContent = `
        <div style="padding:10px; min-width:150px;">
            <div style="font-weight:bold; margin-bottom:5px; color:${statusColor};">${label || '위치'}</div>
            <div style="font-size:12px; color:#666; margin-bottom:5px;">${coordinate.address}</div>
            <div style="font-size:11px; margin-top:5px;">
                <span style="background:${statusColor}; color:white; padding:2px 8px; border-radius:4px; font-weight:500;">${status}</span>
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

    // 마커 호버 이벤트
    kakao.maps.event.addListener(marker, 'mouseover', function() {
        infowindow.open(kakaoMap, marker);
    });

    kakao.maps.event.addListener(marker, 'mouseout', function() {
        infowindow.close();
    });

    kakaoMarkers.push({ marker, infowindow });
    
    console.log('Marker added:', label, coordinate);
    return marker;
}

// 모든 마커 제거
function clearKakaoMarkers() {
    kakaoMarkers.forEach(item => {
        item.marker.setMap(null);
    });
    kakaoMarkers = [];
    console.log('All markers cleared');
}

// 프로젝트 데이터로 지도에 마커 표시
async function displayProjectOnKakaoMap(projectData) {
    console.log('displayProjectOnKakaoMap called with', projectData.length, 'rows');
    
    if (!kakaoMap) {
        console.log('Map not initialized, initializing now...');
        initKakaoMap();
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    clearKakaoMarkers();

    const addressesWithData = projectData.filter(row => 
        row.주소 && row.주소.trim() !== ''
    );

    console.log('Found', addressesWithData.length, 'addresses to display');

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
        console.log(`Processing address ${i + 1}:`, row.주소);
        
        const coord = await geocodeAddressKakao(row.주소);
        
        if (coord) {
            addKakaoMarker(coord, row.이름 || `#${row.순번}`, row.상태);
            coordinates.push(new kakao.maps.LatLng(coord.lat, coord.lng));
            successCount++;
            console.log('Success:', coord);
        } else {
            console.warn('Failed to geocode:', row.주소);
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
        console.log('Map bounds set to show all markers');
    }

    alert(`총 ${addressesWithData.length}개 주소 중 ${successCount}개를 지도에 표시했습니다.`);
}

// 지도 탭이 활성화될 때 호출
function onMapTabActivated() {
    if (!kakaoMap && currentProject) {
        initKakaoMap();
    }
}