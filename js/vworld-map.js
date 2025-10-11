// VWorld 지도 관련 함수

var vworldMap = null;
var markers = [];
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
        
        // 타임아웃 설정 (10초)
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
                    url: 'https://api.vworld.kr/req/wmts/1.0.0/' + VWORLD_API_KEY + '/Base/{z}/{y}/{x}.png'
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
        const url = 'https://api.vworld.kr/req/address?service=address&request=getcoord&version=2.0&crs=epsg:4326&address=' + encodeURIComponent(address) + '&refine=true&simple=false&format=json&type=road&key=' + VWORLD_API_KEY;
        
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
    document.getElementById('mapLoadingStatus').textContent = '주소 검색 중... (0/' + addressesWithData.length + ')';

    const coordinates = [];
    let successCount = 0;

    for (let i = 0; i < addressesWithData.length; i++) {
        const row = addressesWithData[i];
        const coord = await geocodeAddress(row.주소);
        
        if (coord) {
            addMarker(coord, row.이름 || '#' + row.순번, row.상태);
            coordinates.push([coord.lon, coord.lat]);
            successCount++;
        }

        document.getElementById('mapLoadingStatus').textContent = 
            '주소 검색 중... (' + (i + 1) + '/' + addressesWithData.length + ') - 성공: ' + successCount + '개';
        
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

    alert('이 ' + addressesWithData.length + '개 주소 중 ' + successCount + '개를 지도에 표시했습니다.');
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
            // 지번 주소 우편번호
            if (result.address && result.address.zip_code) {
                return result.address.zip_code;
            }
        }
    } catch (error) {
        console.warn('카카오 우편번호 조회 실패:', error);
    }
    
    return '';
}

// 공공데이터포털 API로 토지 정보 조회 (일반 fetch 시도)
async function getLandInfoFromPublicAPI(pnuCode) {
    // 여러 년도로 시도
    const years = ['2024', '2023', '2022'];
    
    for (const year of years) {
        try {
            // 개별공시지가 조회
            const url = 'https://api.vworld.kr/ned/data/getIndvdLandPriceAttr?key=' + VWORLD_API_KEY + '&pnu=' + pnuCode + '&stdrYear=' + year + '&format=json&domain=https://sharif9711.github.io';
            
            console.log('공공데이터 조회 URL:', url);
            
            const response = await fetch(url);
            const data = await response.json();
            
            console.log('공공데이터 응답 (' + year + '):', data);
            
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
                    console.log('토지정보 추출 성공:', { jimok: jimok, area: area });
                    return { jimok: jimok, area: area };
                }
            }
        } catch (error) {
            console.warn('공공데이터 조회 실패 (' + year + '):', error.message);
        }
    }
    
    return { jimok: '', area: '' };
}

// 국토교통부 토지대장 정보 조회 (면적, 지목)
async function getLandInfoFromMOLIT(pnuCode) {
    try {
        // PNU에서 정보 추출
        const sigunguCd = pnuCode.substring(0, 5);
        const bjdongCd = pnuCode.substring(5, 10);
        const bun = pnuCode.substring(11, 15);
        const ji = pnuCode.substring(15, 19);
        
        // 국토교통부 토지대장 API
        const serviceKey = 'BE552462-0744-32DB-81E7-1B7317390D68';
        const url = 'http://apis.data.go.kr/1611000/nsdi/LandCharacteristicsService/attr/getLandCharacteristics?ServiceKey=' + serviceKey + '&pnu=' + pnuCode + '&format=json&numOfRows=1&pageNo=1';
        
        console.log('국토부 토지특성 조회:', url);
        
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('국토부 응답:', data);
        
        if (data && data.landCharacteristics && data.landCharacteristics.field) {
            const field = data.landCharacteristics.field;
            
            let jimok = '';
            let area = '';
            
            // 지목
            if (field.lndcgrCodeNm) {
                jimok = field.lndcgrCodeNm;
            } else if (field.jimokNm) {
                jimok = field.jimokNm;
            }
            
            // 면적
            if (field.lndpclAr) {
                const areaNum = parseFloat(field.lndpclAr);
                if (!isNaN(areaNum)) {
                    area = areaNum.toFixed(2) + '㎡';
                }
            } else if (field.area) {
                const areaNum = parseFloat(field.area);
                if (!isNaN(areaNum)) {
                    area = areaNum.toFixed(2) + '㎡';
                }
            }
            
            console.log('국토부 토지정보:', { jimok: jimok, area: area });
            return { jimok: jimok, area: area };
        }
    } catch (error) {
        console.warn('국토부 API 조회 실패:', error.message);
    }
    
    return { jimok: '', area: '' };
}

// LX 한국국토정보공사 부동산정보 조회 (대체)
async function getLandInfoFromLX(bjdCode, bonbun, bubun) {
    try {
        // 법정동코드 분해
        const sigunguCd = bjdCode.substring(0, 5);
        const bjdongCd = bjdCode.substring(5, 10);
        
        const bun = parseInt(bonbun);
        const ji = parseInt(bubun);
        
        // 공공데이터포털 - 토지특성정보서비스
        const serviceKey = 'BE552462-0744-32DB-81E7-1B7317390D68';
        const url = 'http://openapi.nsdi.go.kr/nsdi/LandCharacteristicsService/attr/getLandCharacteristics?authkey=' + serviceKey + '&pnu=' + bjdCode + '1' + bonbun + bubun + '&format=json';
        
        console.log('LX 토지정보 조회:', url);
        
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('LX 응답:', data);
        
        if (data && data.field) {
            let jimok = data.field.lndcgrCodeNm || data.field.jimok || '';
            let area = '';
            
            if (data.field.lndpclAr) {
                const areaNum = parseFloat(data.field.lndpclAr);
                if (!isNaN(areaNum)) {
                    area = areaNum.toFixed(2) + '㎡';
                }
            }
            
            return { jimok: jimok, area: area };
        }
    } catch (error) {
        console.warn('LX API 조회 실패:', error.message);
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
        
        // 3단계: 다중 API로 지목, 면적 조회
        if (result.pnuCode && result.pnuCode.length === 19) {
            // 1차 시도: VWorld 공공데이터
            let landInfo = await getLandInfoFromPublicAPI(result.pnuCode);
            
            // 2차 시도: 국토교통부 토지대장
            if (!landInfo.jimok && !landInfo.area) {
                landInfo = await getLandInfoFromMOLIT(result.pnuCode);
            }
            
            // 3차 시도: LX 한국국토정보공사
            if (!landInfo.jimok && !landInfo.area && result.bjdCode) {
                landInfo = await getLandInfoFromLX(result.bjdCode, result.본번, result.부번);
            }
            
            if (landInfo.jimok) {
                result.jimok = landInfo.jimok;
            }
            
            if (landInfo.area) {
                result.area = landInfo.area;
            }
            
            console.log('최종 토지정보:', {
                지목: result.jimok,
                면적: result.area
            });
        }
        
        console.log('=== 최종 결과 ===');
        console.log(result);
        
        return result;
        
    } catch (error) {
        console.error('주소 상세 정보 조회 오류:', error);
    }
    
    return null;
}