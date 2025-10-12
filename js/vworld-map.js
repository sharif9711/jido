// VWorld 지도 관련 함수

var vworldMap = null;
var vworldMarkers = [];
var vworldOverlays = [];
var vworldRouteLayer = null;
var vworldRouteMarkers = [];
const VWORLD_API_KEY = 'BE552462-0744-32DB-81E7-1B7317390D68';

// JSONP 콜백 함수를 위한 글로벌 카운터
let vworldCallbackId = 0;

// JSONP 방식으로 VWorld API 호출 (CORS 우회)
function vworldJsonp(url) {
    return new Promise((resolve, reject) => {
        const callbackName = 'vworldCallback' + vworldCallbackId++;
        
        window[callbackName] = function(data) {
            delete window[callbackName];
            document.body.removeChild(script);
            resolve(data);
        };
        
        const script = document.createElement('script');
        script.src = url + '&callback=' + callbackName;
        script.onerror = () => {
            delete window[callbackName];
            document.body.removeChild(script);
            reject(new Error('JSONP request failed'));
        };
        
        document.body.appendChild(script);
        
        setTimeout(() => {
            if (window[callbackName]) {
                delete window[callbackName];
                if (script.parentNode) {
                    document.body.removeChild(script);
                }
                reject(new Error('JSONP request timeout'));
            }
        }, 10000);
    });
}

function initVWorldMap() {
    const mapContainer = document.getElementById('vworldMap');
    if (!mapContainer) {
        console.error('vworldMap element not found');
        return;
    }

    if (vworldMap) {
        vworldMap.setTarget(null);
        vworldMap = null;
    }

    try {
        vworldMap = new ol.Map({
            target: 'vworldMap',
            layers: [
                // VWorld 기본 위성 영상
                new ol.layer.Tile({
                    source: new ol.source.XYZ({
                        url: 'https://api.vworld.kr/req/wmts/1.0.0/' + VWORLD_API_KEY + '/Satellite/{z}/{y}/{x}.jpeg',
                        crossOrigin: 'anonymous'
                    }),
                    zIndex: 0
                }),
                // VWorld 기본 지번도 (gray - 지적 경계 포함)
                new ol.layer.Tile({
                    source: new ol.source.XYZ({
                        url: 'https://api.vworld.kr/req/wmts/1.0.0/' + VWORLD_API_KEY + '/gray/{z}/{y}/{x}.png',
                        crossOrigin: 'anonymous'
                    }),
                    opacity: 0.4,
                    zIndex: 1
                }),
                // 라벨(지명) 레이어
                new ol.layer.Tile({
                    source: new ol.source.XYZ({
                        url: 'https://api.vworld.kr/req/wmts/1.0.0/' + VWORLD_API_KEY + '/Hybrid/{z}/{y}/{x}.png',
                        crossOrigin: 'anonymous'
                    }),
                    opacity: 0.8,
                    zIndex: 2
                })
            ],
            view: new ol.View({
                center: ol.proj.fromLonLat([126.978, 37.5665]),
                zoom: 12
            }),
            controls: [
                new ol.control.Zoom(),
                new ol.control.Attribution(),
                new ol.control.FullScreen(),
                new ol.control.ScaleLine()
            ]
        });

        console.log('✅ VWorld map initialized with default layers');
        
    } catch (error) {
        console.error('❌ Failed to initialize VWorld map:', error);
    }
}

// 주소를 좌표로 변환 (JSONP 방식으로 변경)
async function geocodeAddressVWorld(address) {
    if (!address || address.trim() === '') {
        return null;
    }

    try {
        // JSONP 방식으로 CORS 우회
        const url = 'https://api.vworld.kr/req/address?service=address&request=getcoord&version=2.0&crs=epsg:4326&address=' + encodeURIComponent(address) + '&refine=true&simple=false&format=json&type=road&key=' + VWORLD_API_KEY;
        
        const data = await vworldJsonp(url);

        if (data && data.response && data.response.status === 'OK' && data.response.result) {
            const point = data.response.result.point;
            return {
                lon: parseFloat(point.x),
                lat: parseFloat(point.y),
                address: address
            };
        }
    } catch (error) {
        console.error('Geocoding error for address:', address, error);
    }
    
    return null;
}

// VWorld 기본 마커 사용 (간단한 핀 모양)
function createVWorldMarker(coordinate, 순번, status) {
    let color = '#3b82f6';  // 파란색
    if (status === '완료') color = '#10b981';  // 초록색
    if (status === '보류') color = '#f59e0b';  // 주황색

    const markerElement = document.createElement('div');
    markerElement.innerHTML = `
        <div style="
            position: relative;
            cursor: pointer;
            transform: translate(-50%, -100%);
        ">
            <!-- 기본 핀 모양 -->
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
                <path d="M16 0 C7.16 0 0 7.16 0 16 C0 24 16 40 16 40 C16 40 32 24 32 16 C32 7.16 24.84 0 16 0 Z" 
                      fill="${color}" 
                      stroke="#fff" 
                      stroke-width="2"/>
                <circle cx="16" cy="16" r="8" fill="white" opacity="0.9"/>
                <text x="16" y="20" 
                      font-family="Arial" 
                      font-size="10" 
                      font-weight="bold" 
                      fill="${color}" 
                      text-anchor="middle">${순번}</text>
            </svg>
        </div>
    `;

    return markerElement;
}

// 마커 추가 (간소화)
function addVWorldMarker(coordinate, label, status, rowData, isDuplicate, markerIndex) {
    if (!vworldMap) {
        console.error('VWorld map not initialized');
        return null;
    }

    const markerElement = createVWorldMarker(coordinate, rowData.순번, status);
    
    const position = ol.proj.fromLonLat([coordinate.lon, coordinate.lat]);
    
    const marker = new ol.Overlay({
        position: position,
        element: markerElement,
        positioning: 'bottom-center',
        stopEvent: false
    });

    vworldMap.addOverlay(marker);

    // 클릭 이벤트
    markerElement.onclick = () => {
        showBottomInfoPanelVWorld(rowData, markerIndex);
    };

    // 이름 라벨 (선택사항 - showLabels가 true일 때만)
    let labelOverlay = null;
    if (showLabels) {
        const labelBg = isDuplicate ? '#ef4444' : '#ffffff';
        const labelColor = isDuplicate ? '#ffffff' : '#1e293b';
        
        const labelElement = document.createElement('div');
        labelElement.innerHTML = `
            <div style="
                background: ${labelBg};
                color: ${labelColor};
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 600;
                white-space: nowrap;
                box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                border: 1px solid rgba(255,255,255,0.8);
                pointer-events: none;
            ">${rowData.이름 || '이름없음'}</div>
        `;

        labelOverlay = new ol.Overlay({
            position: position,
            element: labelElement,
            positioning: 'bottom-center',
            offset: [0, -45],
            stopEvent: false
        });

        vworldMap.addOverlay(labelOverlay);
    }

    vworldMarkers.push({ marker, labelOverlay, rowData });
    
    return marker;
}

// 모든 마커 제거
function clearVWorldMarkers() {
    vworldMarkers.forEach(item => {
        vworldMap.removeOverlay(item.marker);
        vworldMap.removeOverlay(item.labelOverlay);
    });
    vworldMarkers = [];
}

// 프로젝트 데이터로 지도에 마커 표시
async function displayProjectOnVWorldMap(projectData) {
    if (!vworldMap) {
        initVWorldMap();
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const loadingStatus = document.getElementById('mapLoadingStatus');
    if (!vworldMap) {
        if (loadingStatus) {
            loadingStatus.style.display = 'block';
            loadingStatus.style.backgroundColor = '#ef4444';
            loadingStatus.textContent = '✗ 지도를 초기화할 수 없습니다.';
        }
        return;
    }

    clearVWorldMarkers();

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

// 마커 표시를 2번 반복 (누락 방지)
    for (let attempt = 1; attempt <= 2; attempt++) {
        console.log(`\n========== 마커 표시 시도 ${attempt}/2 ==========`);
        
        // attempt가 2번째일 때는 이미 추가된 마커 건너뛰기
        const alreadyAddedAddresses = new Set();
        if (attempt === 2) {
            markerListData.forEach(item => {
                alreadyAddedAddresses.add(item.주소);
            });
            console.log(`이미 추가된 마커: ${alreadyAddedAddresses.size}개`);
        }
    }


    for (let i = 0; i < addressesWithData.length; i++) {
            const row = addressesWithData[i];
            
            // 2번째 시도에서 이미 추가된 주소는 건너뛰기
            if (attempt === 2 && alreadyAddedAddresses.has(row.주소)) {
                console.log(`⏭️ Skip (already added): ${row.주소}`);
                continue;
            }
            
            let coord = null;
            
            // 1순위: VWorld 전용 좌표가 있으면 사용
            if (row.vworld_lon && row.vworld_lat) {
                coord = {
                    lon: row.vworld_lon,
                    lat: row.vworld_lat,
                    address: row.주소
                };
                console.log(`✅ [시도 ${attempt}] Using cached VWorld coords for: ${row.주소}`);
            }
            // 2순위: 카카오맵 좌표가 있으면 재사용 (WGS84 좌표계 동일)
            else if (row.lat && row.lng) {
                coord = {
                    lon: row.lng,
                    lat: row.lat,
                    address: row.주소
                };
                console.log(`✅ [시도 ${attempt}] Using cached Kakao coords for: ${row.주소}`);
            }
            // 3순위: 새로 좌표 검색
            else {
                console.log(`🔍 [시도 ${attempt}] Searching coordinates for: ${row.주소}`);
                coord = await geocodeAddressVWorld(row.주소);
            }
            
            if (coord) {
                console.log(`✅ [시도 ${attempt}] Address ${i + 1}/${addressesWithData.length}: ${row.주소}`, coord);
                
                // 좌표 유효성 검사
                if (isNaN(coord.lon) || isNaN(coord.lat)) {
                    console.error(`❌ [시도 ${attempt}] Invalid coordinates:`, coord);
                    if (loadingStatus) {
                        loadingStatus.textContent = `[시도 ${attempt}/2] 주소 검색 중... (${i + 1}/${addressesWithData.length}) - 성공: ${successCount}개`;
                    }
                    continue;
                }
                
                // 좌표 범위 검사 (한국 영역)
                if (coord.lon < 124 || coord.lon > 132 || coord.lat < 33 || coord.lat > 43) {
                    console.warn(`⚠️ [시도 ${attempt}] Coordinates outside Korea:`, coord);
                }
                
                // 원본 데이터에 좌표 저장
                const originalRow = currentProject.data.find(r => r.id === row.id);
                if (originalRow) {
                    originalRow.vworld_lon = parseFloat(coord.lon);
                    originalRow.vworld_lat = parseFloat(coord.lat);
                    
                    if (!originalRow.lat || !originalRow.lng) {
                        originalRow.lat = parseFloat(coord.lat);
                        originalRow.lng = parseFloat(coord.lon);
                    }
                }
                
                row.vworld_lon = parseFloat(coord.lon);
                row.vworld_lat = parseFloat(coord.lat);
                
                const isDuplicate = duplicateCheck[row.주소] > 1;
                
                const rowDataWithCoords = {
                    ...row,
                    lon: parseFloat(coord.lon),
                    lat: parseFloat(coord.lat),
                    lng: parseFloat(coord.lon)
                };
                
                console.log(`🔵 [시도 ${attempt}] Creating marker for:`, rowDataWithCoords.이름 || rowDataWithCoords.주소);
                
                const marker = addVWorldMarker(
                    coord, 
                    row.이름 || `#${row.순번}`, 
                    row.상태, 
                    rowDataWithCoords, 
                    isDuplicate, 
                    vworldMarkers.length
                );
                
                if (marker) {
                    coordinates.push([coord.lon, coord.lat]);
                    markerListData.push({
                        순번: row.순번,
                        이름: row.이름,
                        연락처: row.연락처,
                        주소: row.주소,
                        상태: row.상태,
                        lat: parseFloat(coord.lat),
                        lng: parseFloat(coord.lon),
                        isDuplicate
                    });
                    
                    successCount++;
                    console.log(`✔ [시도 ${attempt}] Marker ${successCount} added successfully (${i + 1}/${addressesWithData.length})`);
                } else {
                    console.error(`❌ [시도 ${attempt}] Failed to create marker for:`, row.주소);
                }
            } else {
                console.error(`❌ [시도 ${attempt}] No coordinates found for address ${i + 1}: ${row.주소}`);
            }

            if (loadingStatus) {
                loadingStatus.textContent = `[시도 ${attempt}/2] 주소 검색 중... (${i + 1}/${addressesWithData.length}) - 성공: ${successCount}개`;
            }
        }
        
        // 1번째 시도 완료 후 결과 확인
        if (attempt === 1) {
            console.log(`\n========== 1차 시도 완료: ${successCount}/${addressesWithData.length}개 성공 ==========`);
            
            // 모든 마커가 표시되었으면 2번째 시도 생략
            if (successCount === addressesWithData.length) {
                console.log('✅ 모든 마커가 표시되어 2차 시도 생략');
                break;
            } else {
                console.log(`⚠️ ${addressesWithData.length - successCount}개 누락, 2차 시도 시작...`);
                // 2번째 시도 전 잠시 대기
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }
    
    // 2번 반복 후 최종 결과
    console.log(`\n========== 최종 결과: ${successCount}/${addressesWithData.length}개 마커 표시 완료 ==========`);
    
    // 모든 좌표 검색 완료 대기
    const results = await Promise.all(markerPromises);
    
    // 성공한 마커만 필터링하여 표시
    results.forEach((result, i) => {
        if (result) {
            const { coord, row, rowDataWithCoords, isDuplicate } = result;
            
            console.log('🔵 Creating marker for:', rowDataWithCoords.이름 || rowDataWithCoords.주소);
            
            const marker = addVWorldMarker(
                coord, 
                row.이름 || `#${row.순번}`, 
                row.상태, 
                rowDataWithCoords, 
                isDuplicate, 
                vworldMarkers.length
            );
            
            if (marker) {
                coordinates.push([coord.lon, coord.lat]);
                markerListData.push({
                    순번: row.순번,
                    이름: row.이름,
                    연락처: row.연락처,
                    주소: row.주소,
                    상태: row.상태,
                    lat: parseFloat(coord.lat),
                    lng: parseFloat(coord.lon),
                    isDuplicate
                });
                
                successCount++;
                console.log(`✔ Marker added successfully (${successCount}/${addressesWithData.length})`);
            } else {
                console.error('❌ Failed to create marker for:', row.주소);
            }
        }
        
        if (loadingStatus) {
            loadingStatus.textContent = `주소 검색 중... (${i + 1}/${addressesWithData.length}) - 성공: ${successCount}개`;
        }
    });
    
    console.log('=== Final Results ===');
    console.log('Total addresses:', addressesWithData.length);
    console.log('Successfully added markers:', successCount);
    console.log('Failed markers:', addressesWithData.length - successCount);
    console.log('VWorld markers array length:', vworldMarkers.length);
    console.log('Coordinates for map bounds:', coordinates.length);
    
    const projectIndex = projects.findIndex(p => p.id === currentProject.id);
    if (projectIndex !== -1) {
        projects[projectIndex] = currentProject;
    }
    
    if (typeof renderReportTable === 'function') {
        renderReportTable();
    }

    if (coordinates.length > 0) {
        console.log('Setting map bounds with', coordinates.length, 'coordinates');
        const extent = ol.extent.boundingExtent(
            coordinates.map(coord => ol.proj.fromLonLat(coord))
        );
        vworldMap.getView().fit(extent, {
            padding: [100, 100, 100, 100],
            maxZoom: 16,
            duration: 1000
        });
        
        // 지번 외곽선 자동 표시 (시간 증가)
        setTimeout(() => {
            console.log('Re-displaying parcel boundaries after marker load...');
            showParcelBoundaries();
        }, 1500);
    } else {
        console.warn('⚠️ No coordinates to display on map!');
    }

    if (loadingStatus) {
        loadingStatus.style.display = 'block';
        loadingStatus.style.backgroundColor = successCount > 0 ? '#10b981' : '#ef4444';
        loadingStatus.textContent = `✓ 이 ${addressesWithData.length}개 주소 중 ${successCount}개를 지도에 표시했습니다.`;
        setTimeout(() => { if (loadingStatus) loadingStatus.style.display = 'none'; }, 3000);
    }

    const panel = document.getElementById('markerListPanel');
    if (panel && panel.style.display !== 'none') updateMarkerList();
}

// 하단 정보창 (VWorld용)
function showBottomInfoPanelVWorld(rowData, markerIndex) {
    const sameAddressMarkers = [];
    vworldMarkers.forEach((item, index) => {
        if (item.rowData.주소 === rowData.주소) {
            sameAddressMarkers.push({ index, data: item.rowData });
        }
    });
    
    const panel = document.getElementById('bottomInfoPanel');
    if (!panel) return;
    
    const markersHtml = sameAddressMarkers.map((markerInfo, idx) => {
        const data = markerInfo.data;
        const mIdx = markerInfo.index;
        const memos = data.메모 || [];
        
        const markerLat = data.lat || 0;
        const markerLng = data.lng || data.lon || 0;
        
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
                        <button id="naviBtn-vworld-${mIdx}" data-address="${(data.주소 || '').replace(/"/g, '&quot;')}" data-lat="${markerLat}" data-lng="${markerLng}" class="ml-2 p-1.5 bg-yellow-400 hover:bg-yellow-500 rounded-full transition-colors ${!markerLat || !markerLng ? 'opacity-50 cursor-not-allowed' : ''}" title="카카오내비로 안내" ${!markerLat || !markerLng ? 'disabled' : ''}>
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
                    <button onclick="changeVWorldMarkerStatus(${mIdx}, '예정')" class="px-4 py-2 rounded-lg font-medium transition-all ${data.상태 === '예정' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">예정</button>
                    <button onclick="changeVWorldMarkerStatus(${mIdx}, '완료')" class="px-4 py-2 rounded-lg font-medium transition-all ${data.상태 === '완료' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">완료</button>
                    <button onclick="changeVWorldMarkerStatus(${mIdx}, '보류')" class="px-4 py-2 rounded-lg font-medium transition-all ${data.상태 === '보류' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">보류</button>
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between mb-2">
                    <label class="block text-sm font-medium text-slate-700">메모</label>
                    <button onclick="openMemoModalVWorld(${mIdx})" class="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">+ 메모 추가</button>
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
    
    // 이벤트 리스너 등록
    sameAddressMarkers.forEach((markerInfo) => {
        const mIdx = markerInfo.index;
        const naviBtn = document.getElementById(`naviBtn-vworld-${mIdx}`);
        
        if (naviBtn) {
            naviBtn.addEventListener('click', function() {
                const address = this.getAttribute('data-address');
                const lat = parseFloat(this.getAttribute('data-lat'));
                const lng = parseFloat(this.getAttribute('data-lng'));
                
                console.log('VWorld 네비 버튼 클릭:', address, lat, lng);
                openKakaoNavi(address, lat, lng);
            });
        }
    });
}

// 상태 변경 (VWorld용)
function changeVWorldMarkerStatus(markerIndex, newStatus) {
    if (!currentProject || !vworldMarkers[markerIndex]) return;
    
    const markerData = vworldMarkers[markerIndex].rowData;
    markerData.상태 = newStatus;
    
    const row = currentProject.data.find(r => r.id === markerData.id);
    if (row) {
        row.상태 = newStatus;
        if (typeof renderReportTable === 'function') renderReportTable();
    }
    
    const projectIndex = projects.findIndex(p => p.id === currentProject.id);
    if (projectIndex !== -1) projects[projectIndex] = currentProject;
    
    // 마커 다시 그리기
    const oldMarker = vworldMarkers[markerIndex];
    vworldMap.removeOverlay(oldMarker.marker);
    
    const newMarkerElement = createVWorldMarker(
        { lon: markerData.lon || markerData.lng, lat: markerData.lat },
        markerData.순번,
        newStatus
    );
    
    newMarkerElement.onclick = () => showBottomInfoPanelVWorld(markerData, markerIndex);
    
    const newMarker = new ol.Overlay({
        position: ol.proj.fromLonLat([markerData.lon || markerData.lng, markerData.lat]),
        element: newMarkerElement,
        positioning: 'bottom-center',
        stopEvent: false
    });
    
    vworldMap.addOverlay(newMarker);
    vworldMarkers[markerIndex].marker = newMarker;
    
    showBottomInfoPanelVWorld(markerData, markerIndex);
}

// 메모 모달 (VWorld용)
function openMemoModalVWorld(markerIndex) {
    const modal = document.getElementById('memoModal');
    if (!modal) return;
    modal.dataset.markerIndex = markerIndex;
    modal.dataset.mapType = 'vworld';
    document.getElementById('memoInput').value = '';
    modal.style.display = 'flex';
}

// VWorld 경로 그리기 (OSRM 사용)
async function drawVWorldRoute(start, waypoints) {
    if (!vworldMap) {
        console.error('VWorld map not initialized');
        showMapMessage('지도가 초기화되지 않았습니다.', 'error');
        return;
    }
    
    console.log('drawVWorldRoute called with', waypoints.length, 'waypoints');
    
    const allPoints = [start, ...waypoints];
    const pathCoords = [];
    
    // 시작점 추가
    pathCoords.push(ol.proj.fromLonLat([start.lng, start.lat]));
    
    // 각 구간을 OSRM으로 경로 찾기
    for (let i = 0; i < allPoints.length - 1; i++) {
        const origin = allPoints[i];
        const destination = allPoints[i + 1];
        
        console.log(`Finding route ${i + 1}/${allPoints.length - 1}:`, origin, '->', destination);
        
        try {
            // OSRM API 호출 (무료 공개 서버)
            const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
            
            console.log('OSRM request:', url);
            
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.routes && data.routes[0] && data.routes[0].geometry) {
                    const coordinates = data.routes[0].geometry.coordinates;
                    
                    // GeoJSON 좌표를 OpenLayers 좌표로 변환
                    coordinates.forEach(coord => {
                        pathCoords.push(ol.proj.fromLonLat(coord));
                    });
                    
                    console.log(`✓ OSRM route segment ${i + 1}: ${coordinates.length} points`);
                } else {
                    console.warn('OSRM response has no routes, using straight line');
                    // OSRM 실패 시 직선으로
                    pathCoords.push(ol.proj.fromLonLat([destination.lng, destination.lat]));
                }
            } else {
                console.warn('OSRM API failed, using straight line');
                // API 실패 시 직선으로
                pathCoords.push(ol.proj.fromLonLat([destination.lng, destination.lat]));
            }
        } catch (error) {
            console.error('OSRM routing error:', error);
            // 오류 시 직선으로
            pathCoords.push(ol.proj.fromLonLat([destination.lng, destination.lat]));
        }
        
        // API 요청 간격 (OSRM 공개 서버 제한)
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('Total route points:', pathCoords.length);
    
    if (pathCoords.length < 2) {
        console.error('Not enough points to draw route');
        showMapMessage('경로를 그릴 수 없습니다.', 'error');
        return;
    }
    
    // 경로 선 생성
    const routeLine = new ol.geom.LineString(pathCoords);
    
    const routeFeature = new ol.Feature({
        geometry: routeLine
    });
    
    const routeStyle = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: '#4A90E2',
            width: 6,
            lineCap: 'round',
            lineJoin: 'round'
        })
    });
    
    routeFeature.setStyle(routeStyle);
    
    const vectorSource = new ol.source.Vector({
        features: [routeFeature]
    });
    
    vworldRouteLayer = new ol.layer.Vector({
        source: vectorSource,
        zIndex: 2
    });
    
    vworldMap.addLayer(vworldRouteLayer);
    console.log('Route layer added to map');
    
    // 순번 마커 추가
    waypoints.forEach((point, index) => {
        const markerElement = document.createElement('div');
        markerElement.innerHTML = `
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
        
        const markerOverlay = new ol.Overlay({
            position: ol.proj.fromLonLat([point.lng, point.lat]),
            element: markerElement,
            positioning: 'center-center',
            stopEvent: false
        });
        
        vworldMap.addOverlay(markerOverlay);
        vworldRouteMarkers.push(markerOverlay);
    });
    
    console.log('Route markers added:', vworldRouteMarkers.length);
}

// 나머지 기존 VWorld 함수들

function onMapTabActivated() {
    if (!vworldMap && currentProject) {
        initVWorldMap();
    }
}

async function searchAddressOnMap(address) {
    const coord = await geocodeAddressVWorld(address);
    if (coord && vworldMap) {
        vworldMap.getView().animate({
            center: ol.proj.fromLonLat([coord.lon, coord.lat]),
            zoom: 17,
            duration: 1000
        });
    }
}

// PNU코드 분석 (대장구분, 본번, 부번)
function analyzePNU(pnuCode) {
    if (!pnuCode || pnuCode.length < 19) {
        return { 
            대장구분: '', 
            본번: '0000', 
            부번: '0000' 
        };
    }
    
    try {
        const daejangCode = pnuCode.substr(10, 1);
        const bonStr = pnuCode.substr(11, 4);
        const buStr = pnuCode.substr(15, 4);
        
        let 대장구분 = '';
        switch(daejangCode) {
            case '1': 대장구분 = '토지'; break;
            case '2': 대장구분 = '임야'; break;
            case '3': 대장구분 = '하천'; break;
            case '4': 대장구분 = '간척'; break;
            default: 대장구분 = '';
        }
        
        return {
            대장구분: 대장구분,
            본번: bonStr || '0000',
            부번: buStr || '0000'
        };
    } catch (error) {
        console.error('PNU 분석 오류:', error);
        return { 
            대장구분: '', 
            본번: '0000', 
            부번: '0000' 
        };
    }
}

// 지목 코드를 한글로 변환
function convertJimokCode(code) {
    const jimokMap = {
        '01': '전', '02': '답', '03': '과', '04': '목', '05': '임', 
        '06': '광', '07': '염', '08': '대', '09': '공', '10': '도',
        '11': '철', '12': '제', '13': '학', '14': '주', '15': '창',
        '16': '수', '17': '유', '18': '양', '19': '체', '20': '사',
        '21': '묘', '22': '잡', '23': '구', '24': '유지', '25': '종',
        '26': '사적지', '27': '공원', '28': '하천'
    };
    
    if (/^\d+$/.test(code)) {
        const paddedCode = code.padStart(2, '0');
        return jimokMap[paddedCode] || code;
    }
    
    return code;
}


// 주소에서 지번 추출 (산 지번 처리 개선)
function extractJibun(address) {
    // "산"이 포함되어 있는지 확인
    const isSan = /\s산\s|\s산(?=\d)/.test(address);
    
    // 주소에서 숫자-숫자 패턴 또는 산 다음의 숫자 찾기
    let jibunPattern;
    if (isSan) {
        // 산 지번: "산 15" 또는 "산15-3" 형태
        jibunPattern = /산\s*(\d+)(?:-(\d+))?/;
    } else {
        // 일반 지번: "76-17" 또는 "123번지" 형태
        jibunPattern = /(\d+)(?:-(\d+))?(?:\s*번지)?/g;
    }
    
    const matches = address.match(jibunPattern);
    
    if (matches && matches.length > 0) {
        let bonbun = '0000';
        let bubun = '0000';
        
        if (isSan) {
            // 산 지번 처리
            const sanMatch = /산\s*(\d+)(?:-(\d+))?/.exec(address);
            if (sanMatch) {
                bonbun = sanMatch[1] ? sanMatch[1].padStart(4, '0') : '0000';
                bubun = sanMatch[2] ? sanMatch[2].padStart(4, '0') : '0000';
            }
        } else {
            // 일반 지번 처리 - 마지막 매치 사용
            const lastMatch = matches[matches.length - 1];
            const numberPattern = /(\d+)(?:-(\d+))?/;
            const parts = lastMatch.match(numberPattern);
            if (parts) {
                bonbun = parts[1] ? parts[1].padStart(4, '0') : '0000';
                bubun = parts[2] ? parts[2].padStart(4, '0') : '0000';
            }
        }
        
        return {
            본번: bonbun,
            부번: bubun,
            isSan: isSan
        };
    }
    
    return { 본번: '0000', 부번: '0000', isSan: false };
}

// 카카오 API로 우편번호 조회 (지번 주소 포함)
async function getZipCodeFromKakao(address) {
    if (typeof kakao === 'undefined' || !kakao.maps || !kakao.maps.services) {
        return '';
    }
    
    try {
        const geocoder = new kakao.maps.services.Geocoder();
        
        const result = await new Promise((resolve) => {
            geocoder.addressSearch(address, function(addressResult, status) {
                if (status === kakao.maps.services.Status.OK && addressResult && addressResult.length > 0) {
                    resolve(addressResult[0]);
                } else {
                    resolve(null);
                }
            });
        });
        
        if (result) {
            // 도로명 주소 우편번호
            if (result.road_address && result.road_address.zone_no) {
                return result.road_address.zone_no;
            }
            // 지번 주소 우편번호 (address 객체의 zone_no)
            if (result.address && result.address.zone_no) {
                return result.address.zone_no;
            }
        }
    } catch (error) {
        console.warn('카카오 우편번호 조회 실패:', error);
    }
    
    return '';
}

// VWorld API로 토지 정보 조회 (JSONP 방식 - CORS 우회)
async function getLandInfoFromVWorld(pnuCode) {
    if (!pnuCode || pnuCode.length < 19) {
        return { jimok: '', area: '' };
    }
    
    try {
        // HTTPS로 통일하여 호출
        const url = 'https://api.vworld.kr/ned/data/getIndvdLandPriceAttr?key=' + VWORLD_API_KEY + '&pnu=' + pnuCode + '&stdrYear=2024&format=json&domain=';
        
        console.log('VWorld 토지정보 조회 (JSONP):', url);
        
        const data = await vworldJsonp(url);
        
        console.log('VWorld 토지정보 응답:', data);
        
        if (data && data.indvdLandPriceAttrs && data.indvdLandPriceAttrs.field) {
            const field = data.indvdLandPriceAttrs.field;
            
            let jimok = '';
            let area = '';
            
            // 지목
            if (field.ldCodeNm) {
                jimok = field.ldCodeNm;
            } else if (field.lndcgrCodeNm) {
                jimok = field.lndcgrCodeNm;
            }
            
            // 면적
            if (field.lndpclAr) {
                const areaNum = parseFloat(field.lndpclAr);
                if (!isNaN(areaNum)) {
                    area = areaNum.toFixed(2) + '㎡';
                }
            }
            
            if (jimok || area) {
                console.log('✅ 토지정보 수집 성공:', { 지목: jimok, 면적: area });
                return { jimok: jimok, area: area };
            }
        }
        
        // 2024년 실패 시 2023년 시도
        const url2023 = 'https://api.vworld.kr/ned/data/getIndvdLandPriceAttr?key=' + VWORLD_API_KEY + '&pnu=' + pnuCode + '&stdrYear=2023&format=json&domain=';
        const data2023 = await vworldJsonp(url2023);
        
        if (data2023 && data2023.indvdLandPriceAttrs && data2023.indvdLandPriceAttrs.field) {
            const field = data2023.indvdLandPriceAttrs.field;
            
            let jimok = field.ldCodeNm || field.lndcgrCodeNm || '';
            let area = '';
            
            if (field.lndpclAr) {
                const areaNum = parseFloat(field.lndpclAr);
                if (!isNaN(areaNum)) {
                    area = areaNum.toFixed(2) + '㎡';
                }
            }
            
            if (jimok || area) {
                console.log('✅ 토지정보 수집 성공 (2023년):', { 지목: jimok, 면적: area });
                return { jimok: jimok, area: area };
            }
        }
        
    } catch (error) {
        console.warn('VWorld 토지정보 조회 실패:', error.message);
    }
    
    return { jimok: '', area: '' };
}

// 국토교통부 API (JSONP 방식)
async function getLandInfoFromMOLIT(pnuCode) {
    try {
        // HTTPS로 통일
        const serviceKey = VWORLD_API_KEY;
        const url = 'https://apis.data.go.kr/1611000/nsdi/LandCharacteristicsService/attr/getLandCharacteristics?ServiceKey=' + serviceKey + '&pnu=' + pnuCode + '&format=json&numOfRows=1&pageNo=1';
        
        console.log('국토부 API 조회 (JSONP):', url);
        
        const data = await vworldJsonp(url);
        
        console.log('국토부 응답:', data);
        
        if (data && data.landCharacteristics && data.landCharacteristics.field) {
            const field = data.landCharacteristics.field;
            
            let jimok = field.lndcgrCodeNm || field.jimokNm || '';
            let area = '';
            
            if (field.lndpclAr) {
                const areaNum = parseFloat(field.lndpclAr);
                if (!isNaN(areaNum)) {
                    area = areaNum.toFixed(2) + '㎡';
                }
            }
            
            if (jimok || area) {
                console.log('✅ 국토부 토지정보 수집 성공:', { 지목: jimok, 면적: area });
                return { jimok: jimok, area: area };
            }
        }
    } catch (error) {
        console.warn('국토부 API 조회 실패:', error.message);
    }
    
    return { jimok: '', area: '' };
}

// 주소로 상세 정보 조회 (개선 버전 - 다중 API 사용)
async function getAddressDetailInfo(address) {
    try {
        console.log('=== 주소 조회 시작 ===');
        console.log('주소:', address);
        
        let result = {
            lon: null,
            lat: null,
            zipCode: '',
            bjdCode: '',
            pnuCode: '',
            대장구분: '토지',
            본번: '0000',
            부번: '0000',
            jimok: '',
            area: ''
        };
        
        // 1단계: 카카오 API로 기본 정보 획득
        if (typeof kakao !== 'undefined' && kakao.maps && kakao.maps.services) {
            const geocoder = new kakao.maps.services.Geocoder();
            
            const kakaoResult = await new Promise((resolve) => {
                geocoder.addressSearch(address, function(addressResult, status) {
                    if (status === kakao.maps.services.Status.OK && addressResult && addressResult.length > 0) {
                        resolve(addressResult[0]);
                    } else {
                        resolve(null);
                    }
                });
            });
            
            if (kakaoResult) {
                result.lon = parseFloat(kakaoResult.x);
                result.lat = parseFloat(kakaoResult.y);
                
                console.log('카카오 좌표:', { lon: result.lon, lat: result.lat });
                
                // 우편번호 (도로명 주소 우선)
                if (kakaoResult.road_address && kakaoResult.road_address.zone_no) {
                    result.zipCode = kakaoResult.road_address.zone_no;
                } else if (kakaoResult.address && kakaoResult.address.zip_code) {
                    result.zipCode = kakaoResult.address.zip_code;
                }
                
                // 법정동코드
                if (kakaoResult.address && kakaoResult.address.b_code) {
                    result.bjdCode = kakaoResult.address.b_code;
                }
                
                // 지번 주소에서 본번, 부번 추출
                let jibunAddress = address; // 원본 주소 사용
                if (kakaoResult.address && kakaoResult.address.address_name) {
                    jibunAddress = kakaoResult.address.address_name;
                }
                
                if (jibunAddress) {
                    const jibunInfo = extractJibun(jibunAddress);
                    result.본번 = jibunInfo.본번;
                    result.부번 = jibunInfo.부번;
                    
                    // "산" 지번이면 대장구분을 임야로 설정
                    if (jibunInfo.isSan) {
                        result.대장구분 = '임야';
                    }
                }
                
                console.log('카카오 정보:', { 
                    우편번호: result.zipCode, 
                    법정동코드: result.bjdCode,
                    본번: result.본번,
                    부번: result.부번,
                    대장구분: result.대장구분
                });
            }
        }
        
        // 2단계: 우편번호 보완 (카카오에서 못 찾은 경우)
        if (!result.zipCode && address) {
            result.zipCode = await getZipCodeFromKakao(address);
            console.log('카카오 재조회 우편번호:', result.zipCode);
        }
        
        // PNU 코드 생성
        if (result.bjdCode && result.bjdCode.length === 10) {
            const 대장구분코드 = result.대장구분 === '임야' ? '2' : '1';
            result.pnuCode = result.bjdCode + 대장구분코드 + result.본번 + result.부번;
            console.log('생성된 PNU:', result.pnuCode);
        }
        
        // 3단계: VWorld JSONP로 지목, 면적 조회 (HTTPS 통일)
        if (result.pnuCode && result.pnuCode.length === 19) {
            console.log('🔍 토지정보 조회 시작 (PNU: ' + result.pnuCode + ')');
            
            // VWorld API로 시도
            let landInfo = await getLandInfoFromVWorld(result.pnuCode);
            
            // 실패 시 국토부 API로 재시도
            if (!landInfo.jimok && !landInfo.area) {
                console.log('VWorld 실패, 국토부 API 시도...');
                landInfo = await getLandInfoFromMOLIT(result.pnuCode);
            }
            
            if (landInfo.jimok) {
                result.jimok = landInfo.jimok;
            }
            
            if (landInfo.area) {
                result.area = landInfo.area;
            }
            
            console.log('📊 최종 토지정보:', {
                지목: result.jimok || '❌ 수집 실패',
                면적: result.area || '❌ 수집 실패'
            });
            
            // 수집 결과가 없으면 사용자에게 안내
            if (!result.jimok && !result.area) {
                console.warn('⚠️ 해당 PNU의 토지정보를 찾을 수 없습니다.');
                console.log('💡 토지이음(eum.go.kr)에서 수동으로 확인하세요.');
            }
        }
        
        console.log('=== 최종 결과 ===');
        console.log(result);
        
        return result;
        
    } catch (error) {
        console.error('주소 상세 정보 조회 오류:', error);
    }
    
    return null;
}

// 지번 외곽선 레이어 추가
var parcelBoundaryLayer = null;

// 지번 외곽선 레이어 추가
var parcelBoundaryLayer = null;

// VWorld 기본 지번도 사용
function showParcelBoundaries() {
    if (!vworldMap) {
        console.error('VWorld map not initialized for parcel boundaries');
        return;
    }
    
    // 이미 레이어가 있으면 제거
    if (parcelBoundaryLayer) {
        vworldMap.removeLayer(parcelBoundaryLayer);
        parcelBoundaryLayer = null;
    }
    
    try {
        console.log('🗺️ Adding VWorld default parcel layer...');
        
        // VWorld에서 제공하는 기본 지적도 레이어
        parcelBoundaryLayer = new ol.layer.Tile({
            source: new ol.source.XYZ({
                url: 'https://api.vworld.kr/req/wmts/1.0.0/' + VWORLD_API_KEY + '/gray/{z}/{y}/{x}.png',
                crossOrigin: 'anonymous'
            }),
            opacity: 0.4,
            zIndex: 1,
            visible: true
        });
        
        vworldMap.addLayer(parcelBoundaryLayer);
        console.log('✅ VWorld default parcel layer added');
        
    } catch (error) {
        console.error('❌ Failed to add parcel layer:', error);
    }
}

// initVWorldMap 함수 수정 (지번 외곽선 자동 표시)
function initVWorldMap() {
    const mapContainer = document.getElementById('vworldMap');
    if (!mapContainer) {
        console.error('vworldMap element not found');
        return;
    }

    if (vworldMap) {
        vworldMap.setTarget(null);
        vworldMap = null;
    }

    try {
        vworldMap = new ol.Map({
            target: 'vworldMap',
            layers: [
                // 위성 영상
                new ol.layer.Tile({
                    source: new ol.source.XYZ({
                        url: 'https://api.vworld.kr/req/wmts/1.0.0/' + VWORLD_API_KEY + '/Satellite/{z}/{y}/{x}.jpeg'
                    })
                }),
                // 라벨(지명) 레이어
                new ol.layer.Tile({
                    source: new ol.source.XYZ({
                        url: 'https://api.vworld.kr/req/wmts/1.0.0/' + VWORLD_API_KEY + '/Hybrid/{z}/{y}/{x}.png'
                    }),
                    opacity: 0.8
                })
            ],
            view: new ol.View({
                center: ol.proj.fromLonLat([126.978, 37.5665]),
                zoom: 12
            }),
            controls: [
                new ol.control.Zoom(),
                new ol.control.Attribution(),
                new ol.control.FullScreen(),
                new ol.control.ScaleLine()
            ]
        });

        console.log('VWorld map initialized successfully');

        // 지도 초기화 완료 후 지번 외곽선 표시
        vworldMap.once('rendercomplete', function() {
            console.log('🗺️ VWorld map render complete');
            setTimeout(() => {
                console.log('Adding parcel boundaries...');
                showParcelBoundaries();
            }, 500);
        });
        
        // 지도 이동/줌 시에도 지번 외곽선 유지
        vworldMap.on('moveend', function() {
            if (parcelBoundaryLayer && !parcelBoundaryLayer.getVisible()) {
                parcelBoundaryLayer.setVisible(true);
            }
        });
        
    } catch (error) {
        console.error('Failed to initialize VWorld map:', error);
    }
}