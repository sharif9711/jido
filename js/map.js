let map, vectorLayer, markerLayer;
let markers = [];
let polygons = [];
let currentPos = null;
let currentFilter = { 예정: true, 완료: true, 보류: true };

function renderVWorldMap() {
  const content = document.getElementById("projectContent");
  content.innerHTML = `<div id="vmap"></div>`;
  document.getElementById("mapControls").classList.remove("hidden");
  document.getElementById("bottomMenu").classList.add("hidden");

  // 지도 초기화
  vw.ol3.MapOptions = {
    basemapType: vw.ol3.BasemapType.GRAPHIC,
    controlDensity: vw.ol3.DensityType.EMPTY,
    interactionDensity: vw.ol3.DensityType.FULL,
    controlsAutoArrange: true,
    homePosition: vw.ol3.CameraPosition,
  };
  map = new vw.ol3.Map("vmap", vw.ol3.MapOptions);

  vectorLayer = new vw.ol3.layer.Vector("PolygonLayer");
  markerLayer = new vw.ol3.layer.Marker("MarkerLayer");
  map.addLayer(vectorLayer);
  map.addLayer(markerLayer);

  markers = [];
  polygons = [];

  // 데이터 기반 마커 및 폴리곤 생성
  window.projectData.forEach((d) => createMarkerAndPolygon(d));

  setupMapControls();
}

function createMarkerAndPolygon(d) {
  const color = getStatusColor(d.status);

  // 임의 좌표 (테스트용)
  const lat = 37.56 + Math.random() * 0.02;
  const lon = 126.97 + Math.random() * 0.02;
  const pos = new vw.ol3.Coordinate(lon, lat);

  // 마커
  const marker = new vw.ol3.marker.Marker(pos, {
    iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
    width: 32,
    height: 32,
  });
  markerLayer.addMarker(marker);

  // 이름 라벨
  const label = new vw.ol3.label.Label(`${d.no}. ${d.name}`, pos, {
    fontColor: "#000",
    fontSize: 12,
    strokeColor: "#fff",
  });
  map.addLayer(label);

  // 외곽 폴리곤 (데모용 사각형)
  const coords = [
    [lon - 0.001, lat - 0.001],
    [lon + 0.001, lat - 0.001],
    [lon + 0.001, lat + 0.001],
    [lon - 0.001, lat + 0.001],
  ];
  const poly = new vw.ol3.feature.Polygon(
    new vw.ol3.geom.Polygon([coords]),
    {
      fillColor: color,
      fillOpacity: 0.3,
      strokeColor: color,
      strokeWidth: 2,
    }
  );

  vectorLayer.addFeature(poly);

  marker.onClick(() => openInfoPanel(d));
  poly.onClick(() => openInfoPanel(d));

  markers.push({ marker, data: d });
  polygons.push({ poly, data: d });
}

function setupMapControls() {
  const btnList = document.getElementById("btnList");
  const btnGPS = document.getElementById("btnGPS");
  const btnRoute = document.getElementById("btnRoute");
  const listPanel = document.getElementById("listPanel");

  // 목록
  btnList.onclick = () => {
    if (listPanel.classList.contains("hidden")) {
      renderListPanel();
      listPanel.classList.remove("hidden");
    } else {
      listPanel.classList.add("hidden");
    }
  };

  // GPS
  btnGPS.onclick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        currentPos = new vw.ol3.Coordinate(lon, lat);

        const gpsMarker = new vw.ol3.marker.Marker(currentPos, {
          iconUrl: "https://cdn-icons-png.flaticon.com/512/61/61168.png",
          width: 28,
          height: 28,
        });
        markerLayer.addMarker(gpsMarker);
        map.setCenter(currentPos);
      });
    } else alert("GPS를 지원하지 않습니다.");
  };

  // 최적경로
  btnRoute.onclick = async () => {
    if (!currentPos) {
      alert("먼저 GPS 버튼을 눌러 내 위치를 설정하세요.");
      return;
    }

    const 예정지 = window.projectData.filter((d) => d.status === "예정");
    if (예정지.length === 0) {
      alert("예정 상태의 위치가 없습니다.");
      return;
    }

    const coords = 예정지.map(
      () => `${126.97 + Math.random() * 0.02},${37.56 + Math.random() * 0.02}`
    );
    const start = `${currentPos.x},${currentPos.y}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${start};${coords.join(
      ";"
    )}?overview=full&geometries=geojson`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.routes && data.routes[0]) {
      const line = data.routes[0].geometry.coordinates.map(([x, y]) => [x, y]);
      const routeGeom = new vw.ol3.geom.LineString(line);
      const routeFeature = new vw.ol3.feature.Line(routeGeom, {
        strokeColor: "#ff6600",
        strokeWidth: 3,
      });
      vectorLayer.addFeature(routeFeature);
    }
  };

  // 상태 필터
  document.querySelectorAll(".filterBtn").forEach((btn) => {
    btn.onclick = () => {
      const status = btn.dataset.status;
      currentFilter[status] = !currentFilter[status];
      btn.classList.toggle("opacity-40");
      updateVisibility();
    };
  });
}

function renderListPanel() {
  const listPanel = document.getElementById("listPanel");
  listPanel.innerHTML = window.projectData
    .map(
      (d) =>
        `<div class="border-b p-1 hover:bg-blue-100 cursor-pointer" data-no="${d.no}">
          ${d.no}. ${d.name} (${d.address})
        </div>`
    )
    .join("");

  listPanel.querySelectorAll("div").forEach((el) => {
    el.onclick = () => {
      const no = parseInt(el.dataset.no);
      const m = markers.find((mk) => mk.data.no === no);
      if (m) map.setCenter(m.marker.getPosition());
    };
  });
}

function updateVisibility() {
  markers.forEach((m) => {
    const visible = currentFilter[m.data.status];
    m.marker.setVisible(visible);
  });
  polygons.forEach((p) => {
    const visible = currentFilter[p.data.status];
    p.poly.setVisible(visible);
  });
}
