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

// PNU코드에서 본번, 부번 추출 (4자리 형식)
function extractBonBuFromPNU(pnuCode) {
    if (!pnuCode || pnuCode.length < 19) {
        return { 본번: '0000', 부번: '0000' };
    }
    
    try {
        // PNU 코드 형식: 법정동코드(10) + 산여부(1) + 본번(4) + 부번(4)
        const bonStr = pnuCode.substr(11, 4); // 본번 4자리
        const buStr = pnuCode.substr(15, 4);  // 부번 4자리
        
        return {
            본번: bonStr || '0000',
            부번: buStr || '0000'
        };
    } catch (error) {
        console.error('PNU 파싱 오류:', error);
        return { 본번: '0000', 부번: '0000' };
    }
}

// 지목 코드를 한글로 변환
function convertJimokCode(jimokCode) {
    const jimokMap = {
        '01': '전', '02': '답', '03': '과', '04': '목', 
        '05': '임', '06': '광', '07': '염', '08': '대',
        '09': '공', '10': '도', '11': '철', '12': '제',
        '13': '학', '14': '주', '15': '창', '16': '수',
        '17': '유', '18': '양', '19': '체', '20': '사',
        '21': '묘', '22': '잡', '23': '구', '24': '유지',
        '25': '종', '26': '사적지', '27': '공원', '28': '하천'
    };
    
    return jimokMap[jimokCode] || jimokCode;
}

// 주소로 상세 정보 조회 (개선된 버전)
async function getAddressDetailInfo(address) {
    try {
        console.log('주소 조회 시작:', address);
        
        // 1단계: 카카오 API로 좌표 및 기본 정보 획득
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
                const lon = parseFloat(kakaoResult.x);
                const lat = parseFloat(kakaoResult.y);
                
                console.log('카카오 좌표:', lon, lat);
                
                // 우편번호
                let zipCode = '';
                if (kakaoResult.road_address && kakaoResult.road_address.zone_no) {
                    zipCode = kakaoResult.road_address.zone_no;
                } else if (kakaoResult.address && kakaoResult.address.zip_code) {
                    zipCode = kakaoResult.address.zip_code;
                }
                
                // 법정동코드
                let bjdCode = '';
                if (kakaoResult.address && kakaoResult.address.b_code) {
                    bjdCode = kakaoResult.address.b_code;
                }
                
                // 2단계: VWorld API로 PNU 및 토지정보 조회
                let pnuCode = '';
                let jimok = '';
                let area = '';
                let 본번 = '0000';
                let 부번 = '0000';
                
                // 시도 1: 연속지적도 API (가장 정확)
                try {
                    console.log('VWorld API 호출 시작...');
                    const vworldUrl = `https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LP_PA_CBND_BUBUN&key=${VWORLD_API_KEY}&domain=&geomFilter=POINT(${lon} ${lat})&geometry=false&size=1&format=json&errorformat=json&output=json`;
                    
                    const vworldData = await jsonpRequest(vworldUrl, 15000);
                    console.log('VWorld 응답:', vworldData);
                    
                    if (vworldData && vworldData.response && vworldData.response.status === 'OK') {
                        const features = vworldData.response.result?.featureCollection?.features;
                        if (features && features.length > 0) {
                            const props = features[0].properties;
                            console.log('토지 속성:', props);
                            
                            pnuCode = props.pnu || '';
                            jimok = props.lndcgr_nm || props.jibun || '';
                            
                            // 면적 (㎡)
                            if (props.lndpclr) {
                                area = props.lndpclr + '㎡';
                            } else if (props.ar) {
                                area = props.ar + '㎡';
                            }
                            
                            // PNU에서 본번, 부번 추출
                            if (pnuCode) {
                                const bonBu = extractBonBuFromPNU(pnuCode);
                                본번 = bonBu.본번;
                                부번 = bonBu.부번;
                            }
                        }
                    }
                } catch (error) {
                    console.error('VWorld API 오류:', error);
                }
                
                // 시도 2: 개별공시지가 API
                if (!pnuCode) {
                    try {
                        const landPriceUrl = `https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LT_C_SPJIJIGA&key=${VWORLD_API_KEY}&domain=&geomFilter=POINT(${lon} ${lat})&geometry=false&size=1&format=json&errorformat=json&output=json`;
                        
                        const landPriceData = await jsonpRequest(landPriceUrl, 15000);
                        
                        if (landPriceData && landPriceData.response && landPriceData.response.status === 'OK') {
                            const features = landPriceData.response.result?.featureCollection?.features;
                            if (features && features.length > 0) {
                                const props = features[0].properties;
                                
                                pnuCode = props.pnu || '';
                                jimok = props.ladUseSittn || props.lndcgr || '';
                                area = props.pblntfPclnd ? props.pblntfPclnd + '㎡' : '';
                                
                                if (pnuCode) {
                                    const bonBu = extractBonBuFromPNU(pnuCode);
                                    본번 = bonBu.본번;
                                    부번 = bonBu.부번;
                                }
                            }
                        }
                    } catch (error) {
                        console.error('개별공시지가 API 오류:', error);
                    }
                }
                
                // 시도 3: 필지별 주소 API
                if (!pnuCode) {
                    try {
                        const parcelUrl = `https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LT_C_ADSIDO_INFO&key=${VWORLD_API_KEY}&domain=&geomFilter=POINT(${lon} ${lat})&geometry=false&size=1&format=json&errorformat=json&output=json`;
                        
                        const parcelData = await jsonpRequest(parcelUrl, 15000);
                        
                        if (parcelData && parcelData.response && parcelData.response.status === 'OK') {
                            const features = parcelData.response.result?.featureCollection?.features;
                            if (features && features.length > 0) {
                                const props = features[0].properties;
                                pnuCode = props.pnu || '';
                                
                                if (pnuCode) {
                                    const bonBu = extractBonBuFromPNU(pnuCode);
                                    본번 = bonBu.본번;
                                    부번 = bonBu.부번;
                                }
                            }
                        }
                    } catch (error) {
                        console.error('필지 주소 API 오류:', error);
                    }
                }
                
                console.log('최종 결과:', { pnuCode, 본번, 부번, jimok, area });
                
                return {
                    lon: lon,
                    lat: lat,
                    zipCode: zipCode,
                    bjdCode: bjdCode,
                    pnuCode: pnuCode,
                    본번: 본번,
                    부번: 부번,
                    jimok: jimok,
                    area: area
                };
            }
        }
        
        console.log('카카오 API 사용 불가, VWorld만 사용');
        
        // 카카오 실패시 VWorld 주소검색만 사용
        const url = `https://api.vworld.kr/req/address?service=address&request=getcoord&version=2.0&crs=epsg:4326&address=${encodeURIComponent(address)}&refine=true&simple=false&format=json&type=road&key=${VWORLD_API_KEY}&output=json&errorformat=json`;
        
        const data = await jsonpRequest(url, 15000);
        
        if (data && data.response && data.response.status === 'OK' && data.response.result) {
            const point = data.response.result.point;
            const lon = parseFloat(point.x);
            const lat = parseFloat(point.y);
            
            let zipCode = data.response.result.zipcode || '';
            
            return {
                lon: lon,
                lat: lat,
                zipCode: zipCode,
                bjdCode: '',
                pnuCode: '',
                본번: '0000',
                부번: '0000',
                jimok: '',
                area: ''
            };
        }
    } catch (error) {
        console.error('주소 상세 정보 조회 오류:', error);
    }
    
    return null;
}