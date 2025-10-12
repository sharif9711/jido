// 지도 뷰 전환 함수

function showMapView() {
    document.getElementById('normalView').style.display = 'none';
    document.getElementById('mapView').style.display = 'block';
    
    // 지도 초기화 (충분한 지연 시간)
    setTimeout(() => {
        const mapType = currentProject.mapType || 'kakao';
        
        console.log('Initializing map, type:', mapType);
        
        if (mapType === 'kakao') {
            if (!kakaoMap) {
                initKakaoMap();
            } else {
                if (kakaoMap && typeof kakaoMap.relayout === 'function') {
                    kakaoMap.relayout();
                }
            }
            
            // 지도 초기화 후 자동으로 마커 표시
            setTimeout(() => {
                if (currentProject && currentProject.data && typeof displayProjectOnKakaoMap === 'function') {
                    console.log('Auto-displaying markers on Kakao map...');
                    displayProjectOnKakaoMap(currentProject.data);
                }
            }, 500);
        } else if (mapType === 'vworld') {
            if (!vworldMap) {
                initVWorldMap();
            }
            
            // VWorld 지도 마커 표시
            setTimeout(() => {
                if (currentProject && currentProject.data && typeof displayProjectOnMap === 'function') {
                    console.log('Auto-displaying markers on VWorld map...');
                    displayProjectOnMap(currentProject.data);
                }
            }, 500);
        }
    }, 300);
}

function hideMapView() {
    document.getElementById('mapView').style.display = 'none';
    document.getElementById('normalView').style.display = 'block';
}