import { dataStore } from "./dataStore.js";

let map, geocoder;
let overlays = [];
let showNames = true;

export function initializeMap() {
  const container = document.getElementById("map");
  geocoder = new kakao.maps.services.Geocoder();
  const data = dataStore.getAll().filter(d => d.주소);

  if (data.length === 0) return;
  geocoder.addressSearch(data[0].주소, (result, status) => {
    const center = (status === kakao.maps.services.Status.OK)
      ? new kakao.maps.LatLng(result[0].y, result[0].x)
      : new kakao.maps.LatLng(37.5665, 126.9780);
    map = new kakao.maps.Map(container, { center, level: 5 });
  });

  document.getElementById("toggleName").onclick = toggleName;
  document.getElementById("gpsBtn").onclick = toggleGPS;
  document.getElementById("routeBtn").onclick = drawOptimalRoute;
}

export function renderMapMarkers() {
  if (!map) return;
  const data = dataStore.getAll().filter(d => d.주소);
  const nameCount = {};
  data.forEach(d => nameCount[d.주소] = (nameCount[d.주소] || 0) + 1);

  data.forEach(item => {
    geocoder.addressSearch(item.주소, (result, status) => {
      if (status === kakao.maps.services.Status.OK) {
        const pos = new kakao.maps.LatLng(result[0].y, result[0].x);
        const marker = new kakao.maps.Marker({ position: pos, map });

        const isDup = nameCount[item.주소] > 1;
        const capsule = document.createElement("div");
        capsule.className = "labelCapsule";
        capsule.style.background = isDup ? "rgba(147,51,234,0.6)" : "rgba(59,130,246,0.6)";
        capsule.style.color = "white";
        capsule.innerText = `${item.순번}. ${item.이름}`;
        if (!showNames) capsule.style.display = "none";

        const overlay = new kakao.maps.CustomOverlay({ content: capsule, position: pos, yAnchor: 1.5 });
        overlay.setMap(map);
        overlays.push(overlay);

        kakao.maps.event.addListener(marker, "click", () => {
          const box = document.getElementById("infoBox");
          box.classList.remove("hidden");
          box.innerHTML = `
            <div class="p-3">
              <h3 class="font-semibold">${item.이름}</h3>
              <p>${item.주소}</p>
              <p>연락처: ${item.연락처}</p>
            </div>`;
        });
      }
    });
  });
}

function toggleName() {
  showNames = !showNames;
  document.getElementById("toggleName").innerText = showNames ? "이름 On" : "이름 Off";
  overlays.forEach(o => o.getContent().style.display = showNames ? "block" : "none");
}

function toggleGPS() {
  const btn = document.getElementById("gpsBtn");
  if (btn.innerText.includes("Off")) {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const loc = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
        map.setCenter(loc);
      });
    }
    btn.innerText = "GPS On";
    btn.className = "bg-blue-600 text-white px-3 py-1 rounded shadow";
  } else {
    btn.innerText = "GPS Off";
    btn.className = "bg-gray-600 text-white px-3 py-1 rounded shadow";
  }
}

export async function drawOptimalRoute() {
  const btn = document.getElementById("routeBtn");
  const data = dataStore.getAll().filter(d => d.주소 && (d.상태 === "" || d.상태 === "예정"));
  if (btn.innerText.includes("Off")) {
    if (data.length < 2) return;
    const coords = [];
    for (const d of data) {
      await new Promise(res => {
        geocoder.addressSearch(d.주소, (result, status) => {
          if (status === kakao.maps.services.Status.OK)
            coords.push({ lat: result[0].y, lng: result[0].x });
          res();
        });
      });
    }
    const coordStr = coords.map(c => `${c.lng},${c.lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const dataRes = await res.json();
    const points = dataRes.routes[0].geometry.coordinates.map(c => new kakao.maps.LatLng(c[1], c[0]));

    const polyline = new kakao.maps.Polyline({
      path: points,
      strokeWeight: 4,
      strokeColor: "#2563eb",
      strokeOpacity: 0.8
    });
    polyline.setMap(map);
    btn.innerText = "경로 On";
    btn.className = "bg-blue-600 text-white px-3 py-1 rounded shadow";
  } else {
    btn.innerText = "경로 Off";
    btn.className = "bg-gray-600 text-white px-3 py-1 rounded shadow";
  }
}
