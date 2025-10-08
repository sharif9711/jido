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
            // 기존 지도가 있으면 relayout 호출
            kakaoMap.relayout();
        }
    }, 300);
}

function hideMapView() {
    document.getElementById('mapView').style.display = 'none';
    document.getElementById('normalView').style.display = 'block';
}