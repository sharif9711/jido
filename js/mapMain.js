let map, markers = [], polylines = [], labelVisible = true;

function initMap() {
  dataStore.collectData();
  const first = dataStore.inputData[0];
  if (!first) return alert("주소 데이터가 없습니다.");

  const geocoder = new kakao.maps.services.Geocoder();
  geocoder.addressSearch(first.addr, (result, status) => {
    if (status === kakao.maps.services.Status.OK) {
      const center = new kakao.maps.LatLng(result[0].y, result[0].x);
      map = new kakao.maps.Map(document.getElementById("map"), { center, level: 5 });
      renderMarkers();
    }
  });
}

function renderMarkers() {
  const geocoder = new kakao.maps.services.Geocoder();
  const addresses = {};

  dataStore.inputData.forEach((d, i) => {
    geocoder.addressSearch(d.addr, (result, status) => {
      if (status === kakao.maps.services.Status.OK) {
        const pos = new kakao.maps.LatLng(result[0].y, result[0].x);
        const marker = new kakao.maps.Marker({ map, position: pos });
        markers.push(marker);

        const isDup = addresses[d.addr];
        addresses[d.addr] = true;

        const label = document.createElement('div');
        label.className = `capsule-label ${isDup ? 'duplicate' : ''}`;
        label.innerText = `${d.no}. ${d.name}`;
        const customOverlay = new kakao.maps.CustomOverlay({ position: pos, content: label, yAnchor: 1.5 });
        customOverlay.setMap(labelVisible ? map : null);

        kakao.maps.event.addListener(marker, 'click', () => {
          showInfoPanel(d);
        });
      }
    });
  });
}

function showInfoPanel(data) {
  const panel = document.getElementById('infoPanel');
  panel.innerHTML = `
    <div><strong>${data.name}</strong> (${data.phone})</div>
    <div class="text-gray-600">${data.addr}</div>
    <div class="mt-2 flex gap-2">
      <button class="bg-green-500 text-white px-3 py-1 rounded">예정</button>
      <button class="bg-blue-500 text-white px-3 py-1 rounded">완료</button>
      <button class="bg-red-500 text-white px-3 py-1 rounded">보류</button>
    </div>
  `;
  panel.classList.remove('hidden');
}
