// 지도 뷰 전환 함수

function showMapView() {
    document.getElementById('normalView').style.display = 'none';
    document.getElementById('mapView').style.display = 'block';
    
    // 지도 초기화
    setTimeout(() => {
        if (!kakaoMap) {
            initKakaoMap();
        }
    }, 100);
}

function hideMapView() {
    document.getElementById('mapView').style.display = 'none';
    document.getElementById('normalView').style.display = 'block';
}