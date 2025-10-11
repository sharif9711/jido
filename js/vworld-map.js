// VWorld 지도 관련 함수

var vworldMap = null;
var markers = [];
const VWORLD_API_KEY = 'BE552462-0744-32DB-81E7-1B7317390D68';

// JSONP 콜백 카운터
let jsonpCallbackCounter = 0;

// 지도 초기화
function initVWorldMap() {
    if (!document.getElementById('vworldMap')) {
        console.error('vworldMap element not found');
        return;
    }

    // 기존 지도가 있으면 제거
    if (vworldMap) {
        vworldMap.remove();
        vworldMap = null;
    }

    // VWorld 지도 생성 (기본 위치: 서울시청)
    vworldMap = new ol.Map({
        target: 'vworldMap',
        layers: [
            new ol.layer.Tile({
                source: new ol.source.XYZ({
                    url: `https://api.vworld.kr/req/wmts/1.0.0/${VWORLD_API_KEY}/Base/{z}/{y}/{x}.png`
                })
            })
        ],
        view: new ol.View({
            center: ol.proj.fromLonLat([126.978, 37.5665]), // 서울시청
            zoom: 12
        })
    });

    console.log('VWorld map initialized');
}

// 주소를 좌표로 변환
async function geocodeAddress(address) {
    if (!address || address.trim() === '') {
        return null;
    }

    try {
        const url = `https://api.vworld.kr/req/address?service=address&request=getcoord&version=2.0&crs=epsg:4326&address=${encodeURIComponent(address)}&refine=true&simple=false&format=json&type=road&key=${VWORLD_API_KEY}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.response.status === 'OK' && data.response.result) {
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

// 마커 추가
function addMarker(coordinate, label, status) {
    const marker = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([coordinate.lon, coordinate.lat])),
        name: label,
        address: coordinate.address,
        status: status
    });

    // 상태별 마커 색상
    let markerColor = '#3b82f6'; // 예정 - 파란색
    if (status === '완료') markerColor = '#10b981'; // 초록색
    if (status === '보류') markerColor = '#f59e0b'; // 주황색

    const markerStyle = new ol.style.Style({
        image: new ol.style.Circle({
            radius: 8,
            fill: new ol.style.Fill({ color: markerColor }),
            stroke: new ol.style.Stroke({
                color: '#fff',
                width: 2
            })
        }),
        text: new ol.style.Text({
            text: label,
            offsetY: -20,
            fill: new ol.style.Fill({ color: '#000' }),
            stroke: new ol.style.Stroke({
                color: '#fff',
                width: 3
            }),
            font: '12px sans-serif'
        })
    });

    marker.setStyle(markerStyle);
    
    const vectorSource = new ol.source.Vector({
        features: [marker]
    });

    const vectorLayer = new ol.layer.Vector({
        source: vectorSource
    });

    vworldMap.addLayer(vectorLayer);
    markers.push(vectorLayer);

    return marker;
}

// 모든 마커 제거
function clearMarkers() {
    markers.forEach(layer => {
        vworldMap.removeLayer(layer);
    });
    markers = [];
}

// 프로젝트 데이터로 지도에 마커 표시
async function displayProjectOnMap(projectData) {
    if (!vworldMap) {
        initVWorldMap();
        // 지도 초기화 후 약간의 지연
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    clearMarkers();

    const addressesWithData = projectData.filter(row => 
        row.주소 && row.주소.trim() !== ''
    );

    if (addressesWithData.length === 0) {
        alert('표시할 주소가 없습니다. 자료입력 메뉴에서 주소를 입력해주세요.');
        return;
    }

    document.getElementById('mapLoadingStatus').style.display = 'block';
    document.getElementById('mapLoadingStatus').textContent = `주소 검색 중... (0/${addressesWithData.length})`;

    const coordinates = [];
    let successCount = 0;

    for (let i = 0; i < addressesWithData.length; i++) {
        const row = addressesWithData[i];
        const coord = await geocodeAddress(row.주소);
        
        if (coord) {
            addMarker(coord, row.이름 || `#${row.순번}`, row.상태);
            coordinates.push([coord.lon, coord.lat]);
            successCount++;
        }

        document.getElementById('mapLoadingStatus').textContent = 
            `주소 검색 중... (${i + 1}/${addressesWithData.length}) - 성공: ${successCount}개`;
        
        // API 호출 제한을 위한 지연
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    document.getElementById('mapLoadingStatus').style.display = 'none';

    // 모든 마커가 보이도록 지도 범위 조정
    if (coordinates.length > 0) {
        const extent = ol.extent.boundingExtent(
            coordinates.map(coord => ol.proj.fromLonLat(coord))
        );
        vworldMap.getView().fit(extent, {
            padding: [50, 50, 50, 50],
            maxZoom: 16
        });
    }

    alert(`총 ${addressesWithData.length}개 주소 중 ${successCount}개를 지도에 표시했습니다.`);
}

// 지도 탭이 활성화될 때 호출
function onMapTabActivated() {
    if (!vworldMap && currentProject) {
        initVWorldMap();
    }
}

// 주소로 지도 검색
async function searchAddressOnMap(address) {
    const coord = await geocodeAddress(address);
    if (coord && vworldMap) {
        vworldMap.getView().animate({
            center: ol.proj.fromLonLat([coord.lon, coord.lat]),
            zoom: 17,
            duration: 1000
        });
    }
}

// JSONP 요청 함수
function jsonpRequest(url) {
    return new Promise((resolve, reject) => {
        const callbackName = `vworld_callback_${jsonpCallbackCounter++}`;
        const script = document.createElement('script');
        
        window[callbackName] = function(data) {
            delete window[callbackName];
            document.body.removeChild(script);
            resolve(data);
        };
        
        script.src = `${url}&callback=${callbackName}`;
        script.onerror = () => {
            delete window[callbackName];
            document.body.removeChild(script);
            reject(new Error('JSONP request failed'));
        };
        
        document.body.appendChild(script);
        
        // 타임아웃 설정 (10초)
        setTimeout(() => {
            if (window[callbackName]) {
                delete window[callbackName];
                document.body.removeChild(script);
                reject(new Error('JSONP request timeout'));
            }
        }, 10000);
    });
}

// 좌표로 법정동코드 조회
async function getBjdCode(lon, lat) {
    try {
        const url = `https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LT_C_ADEMD_INFO&key=${VWORLD_API_KEY}&domain=http://localhost&geomFilter=POINT(${lon} ${lat})&geometry=false&size=1&format=json`;
        
        const data = await jsonpRequest(url);
        
        if (data.response && data.response.status === 'OK' && data.response.result && data.response.result.featureCollection) {
            const features = data.response.result.featureCollection.features;
            if (features && features.length > 0) {
                return features[0].properties.full_nm || '';
            }
        }
    } catch (error) {
        console.error('법정동코드 조회 오류:', error);
    }
    return '';
}

// 좌표로 토지 정보 조회 (PNU코드, 지목, 면적)
async function getLandInfo(lon, lat) {
    try {
        // WFS 서비스를 통한 토지 정보 조회
        const url = `https://api.vworld.kr/req/wfs?service=WFS&request=GetFeature&typename=lp_pa_cbnd_bubun&key=${VWORLD_API_KEY}&domain=http://localhost&version=1.0.0&format=json&srsname=EPSG:4326&bbox=${lon-0.0001},${lat-0.0001},${lon+0.0001},${lat+0.0001}`;
        
        const data = await jsonpRequest(url);
        
        if (data.features && data.features.length > 0) {
            const feature = data.features[0];
            const props = feature.properties;
            
            return {
                pnuCode: props.pnu || '',
                jimok: props.jimok_text || props.lndcgr_nm || '',
                area: props.lndpclr || props.ar || ''
            };
        }
    } catch (error) {
        console.error('토지 정보 조회 오류:', error);
    }
    
    // 대체 방법: 개별공시지가 서비스 이용
    try {
        const url2 = `https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LP_PA_CBND_BUBUN&key=${VWORLD_API_KEY}&domain=http://localhost&geomFilter=POINT(${lon} ${lat})&geometry=false&size=1&format=json`;
        
        const data2 = await jsonpRequest(url2);
        
        if (data2.response && data2.response.status === 'OK' && data2.response.result && data2.response.result.featureCollection) {
            const features = data2.response.result.featureCollection.features;
            if (features && features.length > 0) {
                const props = features[0].properties;
                return {
                    pnuCode: props.pnu || '',
                    jimok: props.lndcgr_nm || props.jimok || '',
                    area: props.lndpclr || props.ar || ''
                };
            }
        }
    } catch (error) {
        console.error('토지 정보 조회 오류 (대체 방법):', error);
    }
    
    return {
        pnuCode: '',
        jimok: '',
        area: ''
    };
}

// 주소로 상세 정보 조회 (법정동코드, PNU, 지목, 면적 포함)
async function getAddressDetailInfo(address) {
    try {
        // 먼저 좌표 획득
        const url = `https://api.vworld.kr/req/address?service=address&request=getcoord&version=2.0&crs=epsg:4326&address=${encodeURIComponent(address)}&refine=true&simple=false&format=json&type=road&key=${VWORLD_API_KEY}&domain=http://localhost`;
        
        const data = await jsonpRequest(url);
        
        if (data.response && data.response.status === 'OK' && data.response.result) {
            const point = data.response.result.point;
            const lon = parseFloat(point.x);
            const lat = parseFloat(point.y);
            
            // 법정동코드 조회
            const bjdCode = await getBjdCode(lon, lat);
            
            // 토지 정보 조회
            const landInfo = await getLandInfo(lon, lat);
            
            // 우편번호 추출
            let zipCode = '';
            if (data.response.result.zipcode) {
                zipCode = data.response.result.zipcode;
            }
            
            return {
                lon: lon,
                lat: lat,
                zipCode: zipCode,
                bjdCode: bjdCode,
                pnuCode: landInfo.pnuCode,
                jimok: landInfo.jimok,
                area: landInfo.area
            };
        }
    } catch (error) {
        console.error('주소 상세 정보 조회 오류:', error);
    }
    
    return null;
}