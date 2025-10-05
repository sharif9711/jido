document.getElementById("mapBtn").addEventListener("click", () => {
  document.querySelector("nav").style.display = "none";
  document.getElementById("projectContent").innerHTML = `
    <div id="mapContainer" class="w-full h-[calc(100vh-64px)] relative">
      <div id="map" class="w-full h-full"></div>
      <div id="mapControls" class="absolute top-4 left-4 flex flex-col gap-2 z-50">
        <button id="listBtn" class="map-btn">📋 목록</button>
        <button id="gpsBtn" class="map-btn">📍 GPS</button>
        <button id="routeBtn" class="map-btn">🧭 경로</button>
        <div class="flex gap-1 mt-2">
          <button id="filterPlan" class="filter-btn active">예정</button>
          <button id="filterDone" class="filter-btn active">완료</button>
          <button id="filterHold" class="filter-btn active">보류</button>
        </div>
      </div>
      <div id="listPanel" class="hidden absolute top-4 left-24 bg-white shadow-lg rounded-md p-2 max-h-80 overflow-auto w-64 z-40"></div>
      <div id="infoPanel" class="hidden absolute bottom-0 left-0 right-0 bg-white shadow-inner border-t rounded-t-2xl p-4 z-50"></div>
    </div>
  `;
  initializeMapModule();
});

function initializeMapModule() {
  const map = new kakao.maps.Map(document.getElementById("map"), {
    center: new kakao.maps.LatLng(37.5665, 126.9780),
    level: 5,
  });
  window.activeMap = map;
  renderVworldPolygons(map);
  setupMapControls(map);
}
