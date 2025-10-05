import { dataStore } from "./dataStore.js";

let map, userMarker;
let nameVisible = true;
let gpsActive = false;

export function initMap() {
  const container = document.getElementById("map");
  const options = { center: new kakao.maps.LatLng(37.5665, 126.978), level: 5 };
  map = new kakao.maps.Map(container, options);

  // 컨트롤
  map.addControl(new kakao.maps.MapTypeControl(), kakao.maps.ControlPosition.TOPRIGHT);
  map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);

  // 버튼 이벤트
  document.getElementById("gpsBtn").onclick = toggleGPS;
  document.getElementById("toggleNameBtn").onclick = toggleName;

  renderMarkers();
}

function renderMarkers() {
  const list = dataStore.getAll().filter(r => r.이름 && r.주소);
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
      const isDup = addrCount[item.주소.trim()] > 1;
      const color = isDup ? "#8b5cf6" : "#2563eb";

      const svg = `
        <svg width="28" height="28" xmlns="http://www.w3.org/2000/svg">
          <circle cx="14" cy="14" r="10" fill="${color}" stroke="white" stroke-width="2"/>
          <text x="14" y="18" text-anchor="middle" font-size="12" fill="white" font-weight="bold">${item.순번}</text>
        </svg>`;
      const marker = new kakao.maps.Marker({
        map,
        position: pos,
        image: new kakao.maps.MarkerImage(`data:image/svg+xml;base64,${btoa(svg)}`, new kakao.maps.Size(28, 28)),
      });

      const label = document.createElement("div");
      label.className = "labelCapsule";
      label.innerHTML = `${item.순번}. ${item.이름}`;
      label.style.cssText = `
        background:${isDup ? "rgba(139,92,246,0.9)" : "rgba(0,123,255,0.9)"};
        color:#fff;padding:2px 8px;border-radius:9999px;font-size:11px;white-space:nowrap;
      `;
      new kakao.maps.CustomOverlay({ map, position: pos, content: label, yAnchor: 1.5 });
    });
  });
}

function toggleGPS(e) {
  gpsActive = !gpsActive;
  e.target.textContent = gpsActive ? "GPS On" : "GPS Off";
  e.target.classList.toggle("bg-blue-600", gpsActive);
  e.target.classList.toggle("bg-gray-500", !gpsActive);
  if (gpsActive) showMyLocation();
  else if (userMarker) userMarker.setMap(null);
}

function showMyLocation() {
  if (!navigator.geolocation) return alert("GPS 미지원");
  navigator.geolocation.getCurrentPosition(pos => {
    const loc = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
    if (userMarker) userMarker.setMap(null);
    userMarker = new kakao.maps.Marker({
      map,
      position: loc,
      image: new kakao.maps.MarkerImage("https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png", new kakao.maps.Size(24, 35)),
    });
    map.setCenter(loc);
  });
}

function toggleName(e) {
  nameVisible = !nameVisible;
  e.target.textContent = nameVisible ? "이름 On" : "이름 Off";
  e.target.classList.toggle("bg-blue-600", nameVisible);
  e.target.classList.toggle("bg-gray-500", !nameVisible);
  document.querySelectorAll(".labelCapsule").forEach(el => el.style.display = nameVisible ? "block" : "none");
}
