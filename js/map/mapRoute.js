async function drawOptimalRoute(map) {
  if (!navigator.geolocation) return alert("GPS를 지원하지 않습니다.");
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const geocoder = new kakao.maps.services.Geocoder();

    const waypoints = await Promise.all(window.projectData
      .filter((d) => d.status === "예정")
      .map(
        (d) =>
          new Promise((resolve) =>
            geocoder.addressSearch(d.address, (r, s) => {
              s === kakao.maps.services.Status.OK ? resolve([r[0].x, r[0].y]) : resolve(null);
            })
          )
      ));

    const valid = waypoints.filter(Boolean);
    const coordsStr = [[lng, lat], ...valid].map((c) => c.join(",")).join(";");
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`);
    const data = await res.json();
    const lineCoords = data.routes[0].geometry.coordinates.map((c) => new kakao.maps.LatLng(c[1], c[0]));
    new kakao.maps.Polyline({ map, path: lineCoords, strokeWeight: 5, strokeColor: "#000", strokeOpacity: 0.8 });
  });
}
