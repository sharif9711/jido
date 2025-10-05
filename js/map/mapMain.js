let map;
let markers = [];
let overlays = [];
let infoWindow;
let showNames = true;
let mapType = "roadmap";
let duplicates = new Set();

// Kakao 지도 초기화
export function initializeMapModule(dataList) {
  const container = document.getElementById("map");
  const options = {
    center: new kakao.maps.LatLng(37.5665, 126.978),
    level: 5,
  };
  map = new kakao.maps.Map(container, options);
  infoWindow = new kakao.maps.InfoWindow({ zIndex: 2 });

  // 지도 컨트롤
  const mapTypeControl = new kakao.maps.MapTypeControl();
  map.addControl(mapTypeControl, kakao.maps.ControlPosition.TOPRIGHT);
  const zoomControl = new kakao.maps.ZoomControl();
  map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);

  // 지도/스카이뷰 버튼
  document.getElementById("btnMap").onclick = () => setMapType("roadmap");
  document.getElementById("btnSky").onclick = () => setMapType("skyview");
  document.getElementById("btnGps").onclick = () => moveToMyLocation();
  document.getElementById("toggleNames").onclick = toggleNames;

  renderMarkers(dataList);
}

// 지도 타입 전환
function setMapType(type) {
  mapType = type;
  if (type === "roadmap") {
    map.setMapTypeId(kakao.maps.MapTypeId.ROADMAP);
    toggleButton("btnMap", true);
    toggleButton("btnSky", false);
  } else {
    map.setMapTypeId(kakao.maps.MapTypeId.HYBRID);
    toggleButton("btnMap", false);
    toggleButton("btnSky", true);
  }
}

// 버튼 On/Off 색상
function toggleButton(id, state) {
  const btn = document.getElementById(id);
  btn.className = state
    ? "px-2 py-1 text-sm rounded bg-blue-500 text-white"
    : "px-2 py-1 text-sm rounded bg-gray-400 text-white";
}

// 이름 표시 토글
function toggleNames() {
  showNames = !showNames;
  const btn = document.getElementById("toggleNames");
  btn.textContent = showNames ? "이름 ON" : "이름 OFF";
  btn.className = showNames
    ? "px-3 py-1 rounded text-white bg-blue-500 shadow hover:bg-blue-600"
    : "px-3 py-1 rounded text-white bg-gray-400 shadow hover:bg-gray-500";
  refreshOverlays();
}

// 마커 갱신
export function updateMapData(dataList) {
  clearMap();
  renderMarkers(dataList);
}

// 지도 초기화
function clearMap() {
  markers.forEach((m) => m.setMap(null));
  overlays.forEach((o) => o.setMap(null));
  markers = [];
  overlays = [];
}

// 마커 및 라벨 표시
function renderMarkers(dataList) {
  const geocoder = new kakao.maps.services.Geocoder();
  duplicates.clear();

  // 주소 중복 체크
  const addrCount = {};
  dataList.forEach((d) => {
    addrCount[d.주소] = (addrCount[d.주소] || 0) + 1;
  });
  for (const addr in addrCount) {
    if (addrCount[addr] > 1) duplicates.add(addr);
  }

  dataList.forEach((item, idx) => {
    geocoder.addressSearch(item.주소, (result, status) => {
      if (status === kakao.maps.services.Status.OK) {
        const pos = new kakao.maps.LatLng(result[0].y, result[0].x);
        const isDup = duplicates.has(item.주소);

        const markerImage = makeNumberMarker(idx + 1, isDup);
        const marker = new kakao.maps.Marker({ map, position: pos, image: markerImage });
        markers.push(marker);

        if (showNames) {
          const content = `
            <div class="capsule-label ${isDup ? 'text-purple-600 font-semibold' : ''}">
              ${idx + 1}. ${item.이름}
            </div>`;
          const overlay = new kakao.maps.CustomOverlay({
            map,
            position: pos,
            content,
            yAnchor: 1.5,
          });
          overlays.push(overlay);
        }

        kakao.maps.event.addListener(marker, "click", () => showInfo(item, pos));
      }
    });
  });
}

// 커스텀 마커 (번호 포함)
function makeNumberMarker(num, isDup) {
  const color = isDup ? "#a855f7" : "#2563eb";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36">
      <circle cx="18" cy="18" r="16" fill="${color}" stroke="white" stroke-width="2"/>
      <text x="18" y="22" text-anchor="middle" font-size="14" font-weight="bold" fill="white">${num}</text>
    </svg>`;
  return new kakao.maps.MarkerImage(
    "data:image/svg+xml;base64," + btoa(svg),
    new kakao.maps.Size(36, 36),
    { offset: new kakao.maps.Point(18, 36) }
  );
}

// 정보창
function showInfo(item, pos) {
  const html = `
    <div style="width:250px;padding:10px;">
      <b>${item.이름}</b><br/>${item.주소}<br/>
      <small>${item.연락처}</small><br/>
      <div style="margin-top:8px;">
        <button onclick="window.open('tel:${item.연락처}')"
          style="background:#007aff;color:white;border:none;padding:4px 8px;border-radius:4px;">전화</button>
        <button onclick="alert('메모 기능 예정')"
          style="background:#6b7280;color:white;border:none;padding:4px 8px;border-radius:4px;">메모</button>
      </div>
    </div>`;
  infoWindow.setContent(html);
  infoWindow.setPosition(pos);
  infoWindow.open(map);
}

// GPS 이동
function moveToMyLocation() {
  if (!navigator.geolocation) return alert("GPS를 지원하지 않습니다.");
  navigator.geolocation.getCurrentPosition((pos) => {
    const loc = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
    map.setCenter(loc);
  });
}

// 라벨 새로고침
function refreshOverlays() {
  overlays.forEach((o) => o.setMap(null));
  overlays = [];
  if (showNames) {
    markers.forEach((m, idx) => {
      const pos = m.getPosition();
      const content = `
        <div class="capsule-label">${idx + 1}</div>`;
      const overlay = new kakao.maps.CustomOverlay({
        map,
        position: pos,
        content,
        yAnchor: 1.5,
      });
      overlays.push(overlay);
    });
  }
}
