window.pnuCache = {}; // ✅ PNU 데이터 캐시
window.mapObjects = []; // ✅ 마커·폴리곤 통합관리

async function renderVworldPolygons(map) {
  let delay = 0;
  for (const d of window.projectData) {
    if (!d.address) continue;
    delay += 300; // 0.3초 간격으로 비동기 호출

    setTimeout(async () => {
      const pnu = await getPnuFromAddress(d.address);
      if (!pnu) return;
      d.pnu = pnu;

      // ✅ 캐싱 처리
      if (window.pnuCache[pnu]) {
        drawPolygonFromCache(map, d, window.pnuCache[pnu]);
        return;
      }

      const url = `https://api.vworld.kr/req/data?service=data&request=getfeature&data=LP_PA_CBND_BUBUN&key=${VWORLD_KEY}&attrfilter=pnu:=${pnu}`;
      const res = await fetch(url);
      const json = await res.json();
      const feature = json?.response?.result?.featureCollection?.features?.[0];
      if (!feature) return;
      const coords = feature.geometry.coordinates[0].map(
        (c) => new kakao.maps.LatLng(c[1], c[0])
      );

      // ✅ 캐시 저장
      window.pnuCache[pnu] = coords;
      drawPolygonFromCache(map, d, coords);
    }, delay);
  }

  kakao.maps.event.addListener(map, "zoom_changed", () => {
    const level = map.getLevel();
    toggleLabelVisibility(level);
  });
}

function drawPolygonFromCache(map, d, coords) {
  const poly = new kakao.maps.Polygon({
    path: coords,
    strokeWeight: getStrokeWeight(d.status),
    strokeColor: getStatusColor(d.status),
    strokeOpacity: getStrokeOpacity(d.status),
    fillColor: getFillColor(d.status),
    fillOpacity: 0.3,
  });
  poly.setMap(map);

  const centroid = getPolygonCenter(coords);
  const label = new kakao.maps.CustomOverlay({
    position: centroid,
    content: `<div class='text-xs bg-white/80 px-1 rounded border text-gray-700'>${d.no}. ${d.name}</div>`,
    yAnchor: 0.5,
  });
  label.setMap(map);

  window.mapObjects.push({ d, poly, label });

  kakao.maps.event.addListener(poly, "click", () => openInfoPanel(d));
}

function toggleLabelVisibility(level) {
  const visible = level <= 5;
  window.mapObjects.forEach((o) => o.label.setVisible(visible));
}

function getPolygonCenter(coords) {
  let x = 0, y = 0;
  coords.forEach((c) => {
    x += c.La; y += c.Ma;
  });
  return new kakao.maps.LatLng(y / coords.length, x / coords.length);
}

function getStatusColor(s) { return s==="예정"?"#22c55e":s==="완료"?"#3b82f6":"#ef4444"; }
function getFillColor(s) { return s==="예정"?"#bbf7d0":s==="완료"?"#dbeafe":"#fecaca"; }
function getStrokeWeight(s) { return s==="예정"?2:s==="완료"?3:4; }
function getStrokeOpacity(s) { return s==="예정"?0.25:s==="완료"?0.35:0.45; }
