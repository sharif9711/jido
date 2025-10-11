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
    
    // 숫자 코드인 경우
    if (/^\d+$/.test(code)) {
        const paddedCode = code.padStart(2, '0');
        return jimokMap[paddedCode] || code;
    }
    
    // 이미 한글인 경우 그대로 반환
    return code;
}

// 주소에서 지번 추출
function extractJibun(address) {
    // 주소에서 숫자-숫자 패턴 찾기 (예: 76-17, 123-4)
    const jibunPattern = /(\d+)-(\d+)|(\d+)번지/g;
    const matches = address.match(jibunPattern);
    
    if (matches && matches.length > 0) {
        const lastMatch = matches[matches.length - 1];
        const parts = lastMatch.replace('번지', '').split('-');
        
        return {
            본번: parts[0] ? parts[0].padStart(4, '0') : '0000',
            부번: parts[1] ? parts[1].padStart(4, '0') : '0000'
        };
    }
    
    return { 본번: '0000', 부번: '0000' };
}

// 주소로 상세 정보 조회 (개선된 버전 - 카카오 API 중심)
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
            대장구분: '',
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
                
                // 우편번호
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
                let jibunAddress = '';
                if (kakaoResult.address && kakaoResult.address.address_name) {
                    jibunAddress = kakaoResult.address.address_name;
                } else if (kakaoResult.road_address && kakaoResult.road_address.address_name) {
                    jibunAddress = kakaoResult.road_address.address_name;
                }
                
                if (jibunAddress) {
                    const jibunInfo = extractJibun(jibunAddress);
                    result.본번 = jibunInfo.본번;
                    result.부번 = jibunInfo.부번;
                }
                
                console.log('카카오 정보:', { 
                    우편번호: result.zipCode, 
                    법정동코드: result.bjdCode,
                    본번: result.본번,
                    부번: result.부번
                });
            }
        }
        
        // 2단계: VWorld API로 PNU 및 토지정보 조회 (fetch 사용 - CORS 허용되는 엔드포인트)
        if (result.lon && result.lat) {
            try {
                // VWorld 주소API로 상세정보 조회
                const vworldUrl = `https://api.vworld.kr/req/address?service=address&request=getAddress&version=2.0&crs=epsg:4326&point=${result.lon},${result.lat}&type=both&zipcode=true&simple=false&key=${VWORLD_API_KEY}&format=json`;
                
                const vworldResponse = await fetch(vworldUrl);
                const vworldData = await vworldResponse.json();
                
                console.log('VWorld 주소 응답:', vworldData);
                
                if (vworldData.response && vworldData.response.status === 'OK' && vworldData.response.result) {
                    const vwResult = vworldData.response.result;
                    
                    // PNU 코드 (지번 주소에서)
                    if (vwResult.juso && vwResult.juso.parcel) {
                        const parcel = vwResult.juso.parcel;
                        
                        // 법정동코드 (10자리) + 대장구분(1) + 본번(4) + 부번(4) = PNU (19자리)
                        if (parcel.lnbrMnnm && parcel.lnbrSlno !== undefined) {
                            const 법정동코드 = result.bjdCode || parcel.ldCodeMnnm || '';
                            const 대장구분코드 = parcel.lnbrSlno === '0' ? '1' : '1'; // 기본값 토지
                            const 본번 = String(parcel.lnbrMnnm || 0).padStart(4, '0');
                            const 부번 = String(parcel.lnbrSlno || 0).padStart(4, '0');
                            
                            if (법정동코드.length === 10) {
                                result.pnuCode = 법정동코드 + 대장구분코드 + 본번 + 부번;
                                result.본번 = 본번;
                                result.부번 = 부번;
                            }
                        }
                    }
                    
                    // 우편번호 보완
                    if (!result.zipCode && vwResult.zipcode) {
                        result.zipCode = vwResult.zipcode;
                    }
                }
            } catch (error) {
                console.error('VWorld 주소 API 오류:', error);
            }
            
            // 3단계: 토지특성 API로 지목, 면적 조회
            try {
                const landUrl = `https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LT_C_SPJIJIGA&key=${VWORLD_API_KEY}&domain=&geomFilter=POINT(${result.lon} ${result.lat})&geometry=false&size=1&format=json`;
                
                const landResponse = await fetch(landUrl);
                const landData = await landResponse.json();
                
                console.log('토지특성 응답:', landData);
                
                if (landData.response && landData.response.status === 'OK') {
                    const features = landData.response.result?.featureCollection?.features;
                    if (features && features.length > 0) {
                        const props = features[0].properties;
                        
                        // PNU 보완
                        if (!result.pnuCode && props.pnu) {
                            result.pnuCode = props.pnu;
                        }
                        
                        // 지목
                        if (props.ladUseSittn) {
                            result.jimok = convertJimokCode(props.ladUseSittn);
                        } else if (props.lndcgr) {
                            result.jimok = convertJimokCode(props.lndcgr);
                        }
                        
                        // 면적
                        if (props.pblntfPclnd) {
                            const areaNum = parseFloat(props.pblntfPclnd);
                            result.area = areaNum.toFixed(2) + '㎡';
                        }
                    }
                }
            } catch (error) {
                console.error('토지특성 API 오류:', error);
            }
        }
        
        // PNU가 있으면 대장구분 분석
        if (result.pnuCode) {
            const pnuInfo = analyzePNU(result.pnuCode);
            result.대장구분 = pnuInfo.대장구분;
            
            // 본번, 부번이 없으면 PNU에서 추출
            if (result.본번 === '0000') {
                result.본번 = pnuInfo.본번;
                result.부번 = pnuInfo.부번;
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