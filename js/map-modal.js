// 지도 뷰 전환 함수

function showMapView() {
    document.getElementById('normalView').style.display = 'none';
    document.getElementById('mapView').style.display = 'block';
    
    // 지도 초기화 (충분한 지연 시간)
    setTimeout(() => {
        console.log('Initializing Kakao Map...');
        if (!kakaoMap) {
            initKakaoMap();
        } else {
            // 기존 지도가 있으면 relayout 호출 (안전하게)
            if (kakaoMap && typeof kakaoMap.relayout === 'function') {
                kakaoMap.relayout();
            }
        }
        
        // 지도 초기화 후 자동으로 마커 표시
        setTimeout(() => {
            if (currentProject && currentProject.data) {
                console.log('Auto-displaying markers on map...');
                displayProjectOnKakaoMap(currentProject.data);
            }
        }, 500);
    }, 300);
}

function hideMapView() {
    document.getElementById('mapView').style.display = 'none';
    document.getElementById('normalView').style.display = 'block';
}