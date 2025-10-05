function setupMapControls(map) {
  const listBtn = document.getElementById("listBtn");
  const listPanel = document.getElementById("listPanel");

  listBtn.onclick = () => {
    listPanel.classList.toggle("hidden");
    if (!listPanel.classList.contains("hidden")) {
      listPanel.innerHTML = window.projectData
        .map(
          (d) => `
          <div class="hover:bg-blue-50 p-2 border-b cursor-pointer" data-no="${d.no}">
            <b>${d.no}. ${d.name}</b><br>
            <span class="text-xs text-gray-600">${d.address}</span>
          </div>`
        )
        .join("");
      listPanel.querySelectorAll("[data-no]").forEach((el) => {
        el.onclick = () => focusMarker(map, parseInt(el.dataset.no));
      });
    }
  };

  document.getElementById("gpsBtn").onclick = () => {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition((pos) => {
        const loc = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
        map.setCenter(loc);
        new kakao.maps.Marker({ map, position: loc });
      });
  };

  document.getElementById("routeBtn").onclick = () => drawOptimalRoute(map);

  // ✅ 상태필터
  const filters = {
    예정: document.getElementById("filterPlan"),
    완료: document.getElementById("filterDone"),
    보류: document.getElementById("filterHold"),
  };

  Object.keys(filters).forEach((key) => {
    filters[key].onclick = () => {
      filters[key].classList.toggle("active");
      applyMarkerFilter(map, filters);
    };
  });
}

function applyMarkerFilter(map, filters) {
  window.mapObjects.forEach((o) => {
    const visible = filters[o.d.status].classList.contains("active");
    o.poly.setMap(visible ? map : null);
    o.label.setMap(visible && map.getLevel() <= 5 ? map : null);
  });
}
