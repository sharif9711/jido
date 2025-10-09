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
function addKakaoMarker(coordinate, label, status, rowData, isDuplicate) {
    if (!kakaoMap) {
        console.error('Map not initialized, cannot add marker');
        return null;
    }

    const markerPosition = new kakao.maps.LatLng(coordinate.lat, coordinate.lng);
    
    console.log('Adding marker at:', coordinate.lat, coordinate.lng, 'Label:', label);
    
    // 순번이 있는 입체 마커 이미지 생성
    const markerImage = createNumberedMarkerImage(rowData.순번, status);

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
        <div style="padding:12px; min-width:180px; border-radius: 8px;">
            <div style="font-weight:bold; margin-bottom:8px; color:${statusColor}; font-size: 15px;">
                ${rowData.순번}. ${label || '위치'}
            </div>
            <div style="font-size:12px; color:#666; margin-bottom:5px; display: flex; align-items: center; gap: 5px;">
                <span>📞</span>
                <span>${rowData.연락처 || '-'}</span>
            </div>
            <div style="font-size:11px; color:#888; margin-bottom:8px; display: flex; align-items: start; gap: 5px;">
                <span>📍</span>
                <span style="line-height: 1.4;">${coordinate.address}</span>
            </div>
            <div style="font-size:11px; margin-top:8px;">
                <span style="background:${statusColor}; color:white; padding:3px 10px; border-radius:12px; font-weight:500;">${status}</span>
            </div>
        </div>
    `;

    const infowindow = new kakao.maps.InfoWindow({
        content: infoContent
    });

    // 마커 클릭 이벤트
    kakao.maps.event.addListener(marker, 'click', function() {
        // 다른 인포윈도우 닫기
        kakaoMarkers.forEach(item => {
            if (item.infowindow) {
                item.infowindow.close();
            }
        });
        infowindow.open(kakaoMap, marker);
    });

    // 마커 호버 이벤트
    kakao.maps.event.addListener(marker, 'mouseover', function() {
        infowindow.open(kakaoMap, marker);
    });

    kakao.maps.event.addListener(marker, 'mouseout', function() {
        infowindow.close();
    });

    // 커스텀 라벨 생성 (이름 표시) - 투명 캡슐 또는 붉은색 유리 캡슐
    const labelBg = isDuplicate 
        ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(220, 38, 38, 0.9))' 
        : 'rgba(255, 255, 255, 0.85)';
    
    const labelBorder = isDuplicate ? 'rgba(255, 100, 100, 0.5)' : 'rgba(0, 0, 0, 0.15)';
    const labelTextColor = isDuplicate ? 'white' : '#1e293b';
    const labelShadow = isDuplicate 
        ? '0 4px 12px rgba(239, 68, 68, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.3)' 
        : '0 2px 8px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.8)';
    
    const labelContent = `
        <div style="
            background: ${labelBg};
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            color: ${labelTextColor};
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            white-space: nowrap;
            box-shadow: ${labelShadow};
            border: 1.5px solid ${labelBorder};
            letter-spacing: 0.3px;
        ">
            ${rowData.순번}. ${rowData.이름 || '이름없음'}
        </div>
    `;

    const customOverlay = new kakao.maps.CustomOverlay({
        position: markerPosition,
        content: labelContent,
        yAnchor: 2.5,
        map: showLabels ? kakaoMap : null
    });

    kakaoMarkers.push({ marker, infowindow, customOverlay });
    
    console.log('Marker added successfully. Total markers:', kakaoMarkers.length);
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
    console.log('Project data rows:', projectData.length);
    console.log('Map object exists:', !!kakaoMap);
    console.log('Geocoder exists:', !!geocoder);
    
    if (!kakaoMap) {
        console.log('Map not initialized, initializing now...');
        initKakaoMap();
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const loadingStatus = document.getElementById('mapLoadingStatus');

    if (!kakaoMap) {
        if (loadingStatus) {
            loadingStatus.style.display = 'block';
            loadingStatus.style.color = '#ef4444';
            loadingStatus.textContent = '✗ 지도를 초기화할 수 없습니다. 페이지를 새로고침해주세요.';
        }
        return;
    }

    clearKakaoMarkers();

    const addressesWithData = projectData.filter(row => 
        row.주소 && row.주소.trim() !== ''
    );

    console.log('Addresses to process:', addressesWithData.length);

    if (addressesWithData.length === 0) {
        if (loadingStatus) {
            loadingStatus.style.display = 'block';
            loadingStatus.style.color = '#f59e0b';
            loadingStatus.textContent = '⚠ 표시할 주소가 없습니다. 자료입력 메뉴에서 주소를 입력해주세요.';
        }
        return;
    }

    // 중복 주소 체크
    const addressList = addressesWithData.map(row => row.주소);
    const duplicateCheck = checkDuplicateAddresses(addressList);

    if (loadingStatus) {
        loadingStatus.style.display = 'block';
        loadingStatus.textContent = `주소 검색 중... (0/${addressesWithData.length})`;
    }

    const coordinates = [];
    let successCount = 0;
    markerListData = []; // 목록 데이터 초기화

    for (let i = 0; i < addressesWithData.length; i++) {
        const row = addressesWithData[i];
        console.log(`\n[${i + 1}/${addressesWithData.length}] Processing:`, row.주소);
        
        const coord = await geocodeAddressKakao(row.주소);
        
        if (coord) {
            const isDuplicate = duplicateCheck[row.주소] > 1;
            const marker = addKakaoMarker(coord, row.이름 || `#${row.순번}`, row.상태, row, isDuplicate);
            if (marker) {
                coordinates.push(new kakao.maps.LatLng(coord.lat, coord.lng));
                
                // 목록 데이터 추가
                markerListData.push({
                    순번: row.순번,
                    이름: row.이름,
                    연락처: row.연락처,
                    주소: row.주소,
                    lat: coord.lat,
                    lng: coord.lng,
                    isDuplicate: isDuplicate
                });
                
                successCount++;
                console.log('✓ Success');
            }
        } else {
            console.warn('✗ Failed');
        }

        if (loadingStatus) {
            loadingStatus.textContent = 
                `주소 검색 중... (${i + 1}/${addressesWithData.length}) - 성공: ${successCount}개`;
        }
        
        // API 호출 제한을 위한 지연
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (loadingStatus) {
        loadingStatus.style.display = 'none';
    }

    // 모든 마커가 보이도록 지도 범위 조정
    if (coordinates.length > 0) {
        const bounds = new kakao.maps.LatLngBounds();
        coordinates.forEach(coord => bounds.extend(coord));
        kakaoMap.setBounds(bounds);
        console.log('Map bounds set to show all markers');
        
        // 지도 크기 재조정
        setTimeout(() => {
            kakaoMap.relayout();
        }, 100);
    }

    console.log('=== displayProjectOnKakaoMap END ===');
    console.log('Total success:', successCount, '/', addressesWithData.length);
    
    // alert 대신 로딩 상태로 결과 표시
    if (loadingStatus) {
        loadingStatus.style.display = 'block';
        loadingStatus.style.color = successCount > 0 ? '#10b981' : '#ef4444';
        loadingStatus.textContent = `✓ 총 ${addressesWithData.length}개 주소 중 ${successCount}개를 지도에 표시했습니다.`;
        
        // 3초 후 메시지 숨김
        setTimeout(() => {
            if (loadingStatus) {
                loadingStatus.style.display = 'none';
            }
        }, 3000);
    }
    
    // 목록 패널이 열려있으면 업데이트
    const panel = document.getElementById('markerListPanel');
    if (panel && panel.style.display !== 'none') {
        updateMarkerList();
    }
}

// 지도 탭이 활성화될 때 호출
function onMapTabActivated() {
    if (!kakaoMap && currentProject) {
        initKakaoMap();
    }
}