import { dataStore } from "./dataStore.js";

let map, userMarker;
let nameVisible = true;
let gpsActive = false;
let routeActive = false;

export function initMap() {
  const container = document.getElementById("map");
  const options = { center: new kakao.maps.LatLng(37.5665, 126.978), level: 5 };
  map = new kakao.maps.Map(container, options);

  // 카카오 기본 컨트롤
  const mapTypeControl = new kakao.maps.MapTypeControl();
  map.addControl(mapTypeControl, kakao.maps.ControlPosition.TOPRIGHT);
  const zoomControl = new kakao.maps.ZoomControl();
  map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);

  // 버튼 등록
  document.getElementById("gpsBtn").onclick = toggleGPS;
  document.getElementById("routeBtn").onclick = toggleRoute;
  document.getElementById("toggleNameBtn").onclick = toggleName;

  renderMarkers();
}

// 마커 렌더링
function renderMarkers() {
  const list = dataStore.getAll().filter(r => r.이름 && r.주소);

  // 🔹 중복 주소 감지
  const addrCount = {};
  list.forEach(item => {
    const addr = item.주소.trim();
    addrCount[addr] = (addrCount[addr] || 0) + 1;
  });

  const geocoder = new kakao.maps.services.Geocoder();

  list.forEach((item, idx) => {
    geocoder.addressSearch(item.주소, (result, status) => {
      if (status !== kakao.maps.services.Status.OK) return;
      const pos = new kakao.maps.LatLng(result[0].y, result[0].x);

      // 🔹 중복 주소면 보라색 마커
      const isDup = addrCount[item.주소.trim()] > 1;
      const markerColor = isDup ? "#8b5cf6" : "#2563eb"; // 보라 or 파랑

      // 숫자 마커 (SVG)
      const markerSvg = `
        <svg width="28" height="28" xmlns="http://www.w3.org/2000/svg">
          <circle cx="14" cy="14" r="10" fill="${markerColor}" stroke="white" stroke-width="2"/>
          <text x="14" y="18" text-anchor="middle" font-size="12" fill="white" font-weight="bold">${item.순번}</text>
        </svg>`;
      const markerImg = new kakao.maps.MarkerImage(
        `data:image/svg+xml;base64,${btoa(markerSvg)}`,
        new kakao.maps.Size(28, 28)
      );

      const marker = new kakao.maps.Marker({
        map,
        position: pos,
        image: markerImg
      });

      // 캡슐 라벨
      const label = document.createElement("div");
      label.className = "labelCapsule";
      label.innerHTML = `${item.순번}. ${item.이름}`;
      label.style.cssText = `
        background: ${isDup ? "rgba(139,92,246,0.9)" : "rgba(0,123,255,0.9)"};
        color: #fff;
        padding: 2px 8px;
        border-radius: 9999px;
        font-size: 11px;
        white-space: nowrap;
        box-shadow: 0 0 4px rgba(0,0,0,0.3);
      `;
      const customOverlay = new kakao.maps.CustomOverlay({
        map,
        position: pos,
        content: label,
        yAnchor: 1.5
      });

      // 정보창
      const iwContent = `
        <div style="padding:8px;font-size:13px;">
          <b>${item.이름}</b><br/>
          ${item.주소}<br/>
          ${item.연락처 || ""}
        </div>`;
      const infowindow = new kakao.maps.InfoWindow({ content: iwContent });

      kakao.maps.event.addListener(marker, "click", () => {
        infowindow.open(map, marker);
      });
    });
  });
}

// GPS 토글
function toggleGPS(e) {
  gpsActive = !gpsActive;
  e.target.textContent = gpsActive ? "GPS On" : "GPS Off";
  e.target.classList.toggle("bg-blue-600", gpsActive);
  e.target.classList.toggle("bg-gray-500", !gpsActive);
  if (gpsActive) showMyLocation();
  else if (userMarker) userMarker.setMap(null);
}

function showMyLocation() {
  if (!navigator.geolocation) {
    alert("GPS를 지원하지 않습니다.");
    return;
  }
  navigator.geolocation.getCurrentPosition((pos) => {
    const loc = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
    if (userMarker) userMarker.setMap(null);
    userMarker = new kakao.maps.Marker({
      map,
      position: loc,
      image: new kakao.maps.MarkerImage(
        "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png",
        new kakao.maps.Size(24, 35)
      ),
    });
    map.setCenter(loc);
  });
}

// 이름 토글
function toggleName(e) {
  nameVisible = !nameVisible;
  e.target.textContent = nameVisible ? "이름 On" : "이름 Off";
  e.target.classList.toggle("bg-blue-600", nameVisible);
  e.target.classList.toggle("bg-gray-500", !nameVisible);
  document.querySelectorAll(".labelCapsule").forEach(el => {
    el.style.display = nameVisible ? "block" : "none";
  });
}

// 경로 토글 (기본상태)
function toggleRoute(e) {
  routeActive = !routeActive;
  e.target.textContent = routeActive ? "경로 On" : "경로 Off";
  e.target.classList.toggle("bg-blue-600", routeActive);
  e.target.classList.toggle("bg-gray-500", !routeActive);
}
