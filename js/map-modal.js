// 지도 전체화면 모달 관련 함수

function showMapFullScreen() {
    const modal = document.getElementById('mapFullScreenModal');
    if (modal) {
        modal.style.display = 'flex';
        // 모달이 표시된 후 지도 초기화
        setTimeout(() => {
            if (!kakaoMap) {
                initKakaoMap();
            }
        }, 100);
    }
}

function closeMapFullScreen() {
    const modal = document.getElementById('mapFullScreenModal');
    if (modal) {
        modal.style.display = 'none';
    }
}