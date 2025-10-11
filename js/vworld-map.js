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

    if (vworldMap) {
        vworldMap.remove();
        vworldMap = null;
    }

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
            center: ol.proj.fromLonLat([126.978, 37.5665]),
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

    let markerColor = '#3b82f6';
    if (status === '완료') markerColor = '#10b981';
    if (status === '보류') markerColor = '#f59e0b';

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
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    document.getElementById('mapLoadingStatus').style.display = 'none';

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

function onMapTabActivated() {
    if (!vworldMap && currentProject) {
        initVWorldMap();
    }
}

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
function jsonpRequest(url, timeout = 20000) {
    return new Promise((resolve, reject) => {
        const callbackName = `vworld_callback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const script = document.createElement('script');
        let timeoutId;
        let resolved = false;
        
        window[callbackName] = function(data) {
            if (resolved) return;
            resolved = true;
            clearTimeout(timeoutId);
            delete window[callbackName];
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            resolve(data);
        };
        
        script.src = `${url}&callback=${callbackName}`;
        script.onerror = () => {
            if (resolved) return;
            resolved = true;
            clearTimeout(timeoutId);
            delete window[callbackName];
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            reject(new Error('JSONP request failed'));
        };
        
        document.head.appendChild(script);
        
        timeoutId = setTimeout(() => {
            if (resolved) return;
            resolved = true;
            if (window[callbackName]) {
                delete window[callbackName];
            }
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            reject(new Error('JSONP request timeout'));
        }, timeout);
    });
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
        // PNU 코드 구조: 법정동코드(10) + 대장구분(1) + 본번(4) + 부번(4)
        const daejangCode = pnuCode.substr(10, 1);
        const bonStr = pnuCode.substr(11, 4);
        const buStr = pnuCode.substr(15, 4);
        
        // 대장구분 변환
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

// 주소로 상세 정보 조회 (가장 개선된 버전)
async function getAddressDetailInfo(address) {
    try {
        console.log('=== 주소 조회 시작 ===');
        console.log('주소:', address);
        
        let lon = null;
        let lat = null;
        let zipCode = '';
        let bjdCode = '';
        
        // 1단계: 카카오 API로 기본 정보 획득
        if (typeof kakao !== 'undefined' && kakao.maps && kakao.maps.services) {
            const geocoder = new kakao.maps.services.Geocoder();
            
            const kakaoResult = await new Promise((resolve) => {
                geocoder.addressSearch(address, function(result, status) {
                    if (status === kakao.maps.services.Status.OK && result && result.length > 0) {
                        resolve(result[0]);
                    } else {
                        resolve(null);
                    }
                });
            });
            
            if (kakaoResult) {
                lon = parseFloat(kakaoResult.x);
                lat = parseFloat(kakaoResult.y);
                
                console.log('카카오 좌표:', { lon, lat });
                
                // 우편번호 (카카오에서 가장 정확)
                if (kakaoResult.road_address && kakaoResult.road_address.zone_no) {
                    zipCode = kakaoResult.road_address.zone_no;
                } else if (kakaoResult.address && kakaoResult.address.zip_code) {
                    zipCode = kakaoResult.address.zip_code;
                }
                
                // 법정동코드
                if (kakaoResult.address && kakaoResult.address.b_code) {
                    bjdCode = kakaoResult.address.b_code;
                }
                
                console.log('우편번호:', zipCode);
                console.log('법정동코드:', bjdCode);
            }
        }
        
        // 좌표가 없으면 VWorld로 시도
        if (!lon || !lat) {
            const vworldAddrUrl = `https://api.vworld.kr/req/address?service=address&request=getcoord&version=2.0&crs=epsg:4326&address=${encodeURIComponent(address)}&refine=true&simple=false&format=json&type=road&key=${VWORLD_API_KEY}&output=json&errorformat=json`;
            
            const addrData = await jsonpRequest(vworldAddrUrl, 15000);
            
            if (addrData && addrData.response && addrData.response.status === 'OK' && addrData.response.result) {
                const point = addrData.response.result.point;
                lon = parseFloat(point.x);
                lat = parseFloat(point.y);
                
                if (addrData.response.result.zipcode) {
                    zipCode = addrData.response.result.zipcode;
                }
                
                console.log('VWorld 좌표:', { lon, lat });
            }
        }
        
        if (!lon || !lat) {
            console.log('좌표 획득 실패');
            return null;
        }
        
        // 2단계: VWorld WMS를 통한 필지 정보 조회
        let pnuCode = '';
        let jimok = '';
        let area = '';
        
        // 시도 1: 연속지적도 (가장 정확)
        try {
            console.log('--- 연속지적도 API 호출 ---');
            const lpUrl = `https://api.vworld.kr/req/wms?service=WMS&request=GetFeatureInfo&version=1.3.0&layers=lp_pa_cbnd_bubun&styles=lp_pa_cbnd_bubun&format=image/png&transparent=true&query_layers=lp_pa_cbnd_bubun&width=101&height=101&crs=EPSG:4326&bbox=${lat-0.0001},${lon-0.0001},${lat+0.0001},${lon+0.0001}&i=50&j=50&info_format=application/json&key=${VWORLD_API_KEY}`;
            
            const response = await fetch(lpUrl);
            const lpData = await response.json();
            
            console.log('연속지적도 응답:', lpData);
            
            if (lpData && lpData.features && lpData.features.length > 0) {
                const props = lpData.features[0].properties;
                console.log('필지 속성:', props);
                
                pnuCode = props.pnu || '';
                jimok = props.lndcgr_nm || props.jimok_text || '';
                
                // 면적 (여러 필드 시도)
                if (props.lndpclr) {
                    const areaNum = parseFloat(props.lndpclr);
                    area = areaNum.toFixed(2) + '㎡';
                } else if (props.ar) {
                    const areaNum = parseFloat(props.ar);
                    area = areaNum.toFixed(2) + '㎡';
                }
                
                console.log('수집 정보:', { pnuCode, jimok, area });
            }
        } catch (error) {
            console.error('연속지적도 오류:', error);
        }
        
        // 시도 2: 토지특성정보 (지목, 면적 보완)
        if (!jimok || !area) {
            try {
                console.log('--- 토지특성 API 호출 ---');
                const landUrl = `https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LT_C_SPJIJIGA&key=${VWORLD_API_KEY}&domain=&geomFilter=POINT(${lon} ${lat})&geometry=false&size=1&format=json&errorformat=json&output=json`;
                
                const landData = await jsonpRequest(landUrl, 15000);
                console.log('토지특성 응답:', landData);
                
                if (landData && landData.response && landData.response.status === 'OK') {
                    const features = landData.response.result?.featureCollection?.features;
                    if (features && features.length > 0) {
                        const props = features[0].properties;
                        
                        if (!pnuCode) pnuCode = props.pnu || '';
                        if (!jimok) jimok = props.ladUseSittn || props.lndcgr || '';
                        if (!area && props.pblntfPclnd) {
                            const areaNum = parseFloat(props.pblntfPclnd);
                            area = areaNum.toFixed(2) + '㎡';
                        }
                    }
                }
            } catch (error) {
                console.error('토지특성 오류:', error);
            }
        }
        
        // 시도 3: 지적도 (PNU 보완)
        if (!pnuCode) {
            try {
                console.log('--- 지적도 API 호출 ---');
                const cadastralUrl = `https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LP_PA_CBND_BUBUN&key=${VWORLD_API_KEY}&domain=&geomFilter=POINT(${lon} ${lat})&geometry=false&size=1&format=json&errorformat=json&output=json`;
                
                const cadastralData = await jsonpRequest(cadastralUrl, 15000);
                console.log('지적도 응답:', cadastralData);
                
                if (cadastralData && cadastralData.response && cadastralData.response.status === 'OK') {
                    const features = cadastralData.response.result?.featureCollection?.features;
                    if (features && features.length > 0) {
                        const props = features[0].properties;
                        if (!pnuCode) pnuCode = props.pnu || '';
                        if (!jimok) jimok = props.lndcgr_nm || '';
                        if (!area && props.lndpclr) {
                            const areaNum = parseFloat(props.lndpclr);
                            area = areaNum.toFixed(2) + '㎡';
                        }
                    }
                }
            } catch (error) {
                console.error('지적도 오류:', error);
            }
        }
        
        // PNU 분석 (대장구분, 본번, 부번)
        const pnuInfo = analyzePNU(pnuCode);
        
        console.log('=== 최종 결과 ===');
        const result = {
            lon: lon,
            lat: lat,
            zipCode: zipCode,
            bjdCode: bjdCode,
            pnuCode: pnuCode,
            대장구분: pnuInfo.대장구분,
            본번: pnuInfo.본번,
            부번: pnuInfo.부번,
            jimok: jimok,
            area: area
        };
        console.log(result);
        
        return result;
        
    } catch (error) {
        console.error('주소 상세 정보 조회 오류:', error);
    }
    
    return null;
}