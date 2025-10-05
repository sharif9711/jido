import { dataStore } from "./dataStore.js";

let map, infoWindow;
let overlays = [];
let markers = [];
let showNames = true;
let gpsActive = false;
let routeActive = false;
let userMarker = null;
let routeLine = null;

export function initMap() {
  const container = document.getElementById("map");
  const options = { center: new kakao.maps.LatLng(37.5665, 126.978), level: 5 };
  map = new kakao.maps.Map(container, options);
  infoWindow = new kakao.maps.InfoWindow({ zIndex: 1 });

  map.addControl(new kakao.maps.MapTypeControl(), kakao.maps.ControlPosition.TOPRIGHT);
  map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);

  document.getElementById("btnMap").onclick = () => map.setMapTypeId(kakao.maps.MapTypeId.ROADMAP);
  document.getElementById("btnSky").onclick = () => map.setMapTypeId(kakao.maps.MapTypeId.HYBRID);

  document.getElementById("toggleNameBtn").onclick = (e) => {
    showNames = !showNames;
    e.target.textContent = showNames ? "이름 On" : "이름 Off";
    e.target.classList.toggle("bg-blue-600", showNames);
    e.target.classList.toggle("bg-gray-500", !showNames);
    updateMarkers();
  };

  document.getElementById("gpsBtn").onclick = (e) => toggleGPS(e);
  document.getElementById("routeBtn").onclick = (e) => toggleRoute(e);

  dataStore.subscribe(updateMarkers);
}

function updateMarkers() {
  clearMap();
  const dataList = dataStore.getAll();
  const geocoder = new kakao.maps.services.Geocoder();
  const addressCount = {};

  dataList.forEach((d) => {
    if (!d.주소) return;
    addressCount[d.주소] = (addressCount[d.주소] || 0) + 1;
  });

  dataList.forEach((item, index) => {
    if (!item.주소) return;

    geocoder.addressSearch(item.주소, (result, status) => {
      if (status === kakao.maps.services.Status.OK) {
        const coords = new kakao.maps.LatLng(result[0].y, result[0].x);
        const baseColor = getColor(item.상태);
        const color = addressCount[item.주소] > 1 ? "purple" : baseColor;

        const markerHtml = `
          <div style="width:28px;height:28px;border-radius:50%;background:${color};
            color:white;font-weight:bold;font-size:12px;display:flex;align-items:center;justify-content:center;
            box-shadow:0 2px 5px rgba(0,0,0,0.3);border:2px solid white;">${index + 1}</div>`;
        const marker = new kakao.maps.CustomOverlay({ position: coords, content: markerHtml, yAnchor: 1.2 });
        marker.setMap(map);
        markers.push(marker);

        if (showNames) {
          const label = `<div class="capsule-label">${index + 1}. ${item.이름}</div>`;
          const overlay = new kakao.maps.CustomOverlay({ position: coords, content: label, yAnchor: 1.7 });
          overlay.setMap(map);
          overlays.push(overlay);
        }

        const clickDiv = document.createElement("div");
        clickDiv.innerHTML = markerHtml;
        clickDiv.onclick = () => showInfoWindow(item, coords);
        const clickableMarker = new kakao.maps.CustomOverlay({
          position: coords,
          content: clickDiv,
          yAnchor: 1.2,
        });
        clickableMarker.setMap(map);
        markers.push(clickableMarker);
      }
    });
  });
}

function getColor(state) {
  if (state === "예정") return "#22c55e";
  if (state === "완료") return "#3b82f6";
  if (state === "보류") return "#ef4444";
  return "gray";
}

function clearMap() {
  markers.forEach((m) => m.setMap(null));
  overlays.forEach((o) => o.setMap(null));
  markers = [];
  overlays = [];
}

function showInfoWindow(item, position) {
  const content = `
    <div class="info-window">
      <b>${item.이름}</b><br/>
      ${item.주소}<br/>
      <small>${item.연락처}</small>
      <div style="margin-top:6px;">
        <button class="info-btn green" onclick="window.open('tel:${item.연락처}')">전화</button>
        <button class="info-btn gray" onclick="addMemo('${item.이름}')">메모</button>
      </div>
      <div style="margin-top:6px;">
        <button class="info-btn green" onclick="changeState('${item.이름}','예정')">예정</button>
        <button class="info-btn blue" onclick="changeState('${item.이름}','완료')">완료</button>
        <button class="info-btn red" onclick="changeState('${item.이름}','보류')">보류</button>
      </div>
      <div style="margin-top:8px;font-size:11px;color:#555;">
        PNU: ${item.PNU || '(추후연결)'}<br/>
        지목: ${item.지목 || '(추후연결)'}<br/>
        면적: ${item.면적 || '(추후연결)'}
      </div>
      <div style="margin-top:6px;font-size:12px;color:#333;">메모: ${item.메모 || ''}</div>
    </div>`;
  infoWindow.setContent(content);
  infoWindow.setPosition(position);
  infoWindow.open(map);
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

function toggleRoute(e) {
  routeActive = !routeActive;
  e.target.textContent = routeActive ? "경로 On" : "경로 Off";
  e.target.classList.toggle("bg-blue-600", routeActive);
  e.target.classList.toggle("bg-gray-500", !routeActive);
  if (routeActive) drawOptimalRoute();
  else if (routeLine) routeLine.setMap(null);
}

async function drawOptimalRoute() {
  const points = [];
  const geocoder = new kakao.maps.services.Geocoder();
  const list = dataStore.getAll().filter((x) => x.상태 === "예정" && x.주소);

  for (const item of list) {
    const coords = await new Promise((res) => {
      geocoder.addressSearch(item.주소, (result, status) => {
        if (status === kakao.maps.services.Status.OK)
          res([parseFloat(result[0].x), parseFloat(result[0].y)]);
        else res(null);
      });
    });
    if (coords) points.push(coords);
  }

  if (points.length < 2) {
    alert("경로를 표시할 예정 위치가 2개 이상 필요합니다.");
    return;
  }

  const url = `https://router.project-osrm.org/route/v1/driving/${points
    .map((p) => p.join(","))
    .join(";")}?overview=full&geometries=geojson`;

  const res = await fetch(url);
  const data = await res.json();
  const coords = data.routes[0].geometry.coordinates;
  const path = coords.map((c) => new kakao.maps.LatLng(c[1], c[0]));

  if (routeLine) routeLine.setMap(null);
  routeLine = new kakao.maps.Polyline({
    map,
    path,
    strokeWeight: 4,
    strokeColor: "#2563eb",
    strokeOpacity: 0.9,
  });
  map.setCenter(path[0]);

  addDirectionArrows(path, "#93c5fd");
}

function addDirectionArrows(path, color = "#93c5fd") {
  const arrowInterval = 200;
  let prev = path[0];
  let distance = 0;
  for (let i = 1; i < path.length; i++) {
    const curr = path[i];
    const dx = curr.getLng() - prev.getLng();
    const dy = curr.getLat() - prev.getLat();
    const segDist = kakao.maps.geometry.spherical.computeDistanceBetween(prev, curr);
    distance += segDist;
    if (distance >= arrowInterval) {
      const radians = Math.atan2(dy, dx);
      const angle = (radians * 180) / Math.PI;
      const svg = `
        <svg width="28" height="28" style="transform: rotate(${angle}deg)">
          <path d="M4,14 L24,14 M18,8 L24,14 L18,20"
                stroke="${color}" stroke-width="3"
                fill="none" stroke-linecap="round"
                stroke-linejoin="round"/>
        </svg>`;
      new kakao.maps.CustomOverlay({
        map,
        position: curr,
        content: svg,
        yAnchor: 0.5,
        xAnchor: 0.5,
      });
      distance = 0;
    }
    prev = curr;
  }
}

// 지도 <-> 데이터 연동 함수
window.changeState = (name, state) => dataStore.updateByName(name, "상태", state);
window.addMemo = (name) => {
  const memo = prompt(`${name}의 메모를 입력하세요.`);
  if (memo) dataStore.updateByName(name, "메모", memo);
};
