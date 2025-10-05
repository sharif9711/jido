document.addEventListener("DOMContentLoaded", () => {
  const mapBtn = document.getElementById("mapBtn");
  
  // 버튼이 실제 존재할 때만 연결
  if (mapBtn) {
    mapBtn.addEventListener("click", () => {
      renderVWorldMap();
    });
  } else {
    console.warn("⚠️ mapBtn not found — 페이지가 아직 렌더링되지 않았습니다.");
  }
});
