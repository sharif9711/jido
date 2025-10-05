// ✅ 메뉴 전환 제어
const content = document.getElementById("projectContent");
document.getElementById("menuInput").onclick = () => loadMenu("input");
document.getElementById("menuLog").onclick = () => loadMenu("log");
document.getElementById("menuResult").onclick = () => loadMenu("result");

window.projectData = [];

// -------------------------------
// 메뉴 로드 스위치
// -------------------------------
function loadMenu(menu) {
  switch (menu) {
    case "input":
      renderInputMenu();
      break;
    case "log":
      renderLogMenu();
      break;
    case "result":
      content.innerHTML = `<div class='p-4 text-gray-600'>결과 탭은 추후 추가됩니다.</div>`;
      break;
  }
}

// -------------------------------
// [입력] 메뉴
// -------------------------------
function renderInputMenu() {
  content.innerHTML = `
    <div class="p-0 h-[calc(100vh-200px)] overflow-auto">
      <table id="inputTable" class="w-full border border-gray-300 text-sm">
        <thead class="bg-blue-100 sticky top-0">
          <tr>
            <th class="border p-1 w-12">순번</th>
            <th class="border p-1">이름</th>
            <th class="border p-1">연락처</th>
            <th class="border p-1">주소</th>
            <th class="border p-1">품목</th>
          </tr>
        </thead>
        <tbody id="inputTableBody"></tbody>
      </table>
    </div>
  `;

  const body = document.getElementById("inputTableBody");

  // ✅ 1500행 자동 생성
  for (let i = 1; i <= 1500; i++) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="border p-1 text-center text-gray-500">${i}</td>
      <td class="border p-1"><input type="text" class="cell w-full outline-none px-1" data-row="${i}" data-col="name"/></td>
      <td class="border p-1"><input type="text" class="cell w-full outline-none px-1" data-row="${i}" data-col="phone"/></td>
      <td class="border p-1"><input type="text" class="cell w-full outline-none px-1" data-row="${i}" data-col="address"/></td>
      <td class="border p-1"><input type="text" class="cell w-full outline-none px-1" data-row="${i}" data-col="item"/></td>
    `;
    body.appendChild(row);
  }

  // ✅ 입력 즉시 저장
  document.querySelectorAll(".cell").forEach((cell) => {
    cell.addEventListener("input", (e) => {
      const row = parseInt(e.target.dataset.row);
      const col = e.target.dataset.col;
      if (!window.projectData[row - 1]) {
        window.projectData[row - 1] = { no: row, name: "", phone: "", address: "", item: "" };
      }
      window.projectData[row - 1][col] = e.target.value;
    });

    // ✅ 엑셀 붙여넣기 지원
    cell.addEventListener("paste", (e) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");

      const columns = ["name", "phone", "address", "item"];
      let currentRow = parseInt(cell.dataset.row);
      let currentCol = cell.dataset.col;
      let startColIndex = columns.indexOf(currentCol);

      lines.forEach((line, lineIdx) => {
        const values = line.split(/\t/);
        const rowNumber = currentRow + lineIdx;

        if (!window.projectData[rowNumber - 1]) {
          window.projectData[rowNumber - 1] = { no: rowNumber, name: "", phone: "", address: "", item: "" };
        }

        values.forEach((v, colIdx) => {
          const colName = columns[startColIndex + colIdx];
          if (colName) {
            window.projectData[rowNumber - 1][colName] = v.trim();
          }
        });

        const tr = body.querySelectorAll("tr")[rowNumber - 1];
        if (tr) {
          values.forEach((v, colIdx) => {
            const colName = columns[startColIndex + colIdx];
            const input = tr.querySelector(`input[data-col='${colName}']`);
            if (input) input.value = v.trim();
          });
        }
      });
    });
  });
}

// -------------------------------
// [기록] 메뉴
// -------------------------------
function renderLogMenu() {
  const filtered = window.projectData.filter(Boolean);
  if (filtered.length === 0) {
    content.innerHTML = `<div class='p-4 text-gray-600'>입력된 데이터가 없습니다.</div>`;
    return;
  }

  content.innerHTML = `
    <div class="p-0 h-[calc(100vh-200px)] overflow-x-auto overflow-y-auto">
      <table class="min-w-[1000px] border border-gray-300 text-sm">
        <thead class="bg-blue-100 sticky top-0">
          <tr>
            <th class="border p-1">순번</th>
            <th class="border p-1">이름</th>
            <th class="border p-1">연락처</th>
            <th class="border p-1">주소</th>
            <th class="border p-1">품목</th>
          </tr>
        </thead>
        <tbody id="logTableBody"></tbody>
      </table>
    </div>
  `;

  const body = document.getElementById("logTableBody");
  filtered.forEach((d) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="border p-1 text-center">${d.no}</td>
      <td class="border p-1">${d.name}</td>
      <td class="border p-1">${d.phone}</td>
      <td class="border p-1 whitespace-nowrap">${d.address}</td>
      <td class="border p-1">${d.item}</td>
    `;
    body.appendChild(row);
  });
}

// -------------------------------
// [지도] 메뉴
// -------------------------------
function renderKakaoMap() {
  const filtered = window.projectData.filter((d) => d && d.address);
  if (filtered.length === 0) {
    alert("기록된 주소 데이터가 없습니다.");
    return;
  }

  content.innerHTML = `<div id="map" class="w-full h-[calc(100vh-180px)]"></div>`;

  // ✅ Kakao SDK 안전 로드
  if (window.kakao && window.kakao.maps) {
    kakao.maps.load(() => initMap(filtered));
  } else {
    const check = setInterval(() => {
      if (window.kakao && window.kakao.maps) {
        clearInterval(check);
        kakao.maps.load(() => initMap(filtered));
      }
    }, 300);
  }
}

// ✅ 실제 지도 생성 로직
function initMap(data) {
  const mapContainer = document.getElementById("map");
  const map = new kakao.maps.Map(mapContainer, {
    center: new kakao.maps.LatLng(37.5665, 126.9780),
    level: 5,
  });

  const geocoder = new kakao.maps.services.Geocoder();
  const bounds = new kakao.maps.LatLngBounds();

  data.forEach((d) => {
    geocoder.addressSearch(d.address, function (result, status) {
      if (status === kakao.maps.services.Status.OK) {
        const coords = new kakao.maps.LatLng(result[0].y, result[0].x);
        new kakao.maps.Marker({ map, position: coords });
        bounds.extend(coords);
        map.setBounds(bounds);
      }
    });
  });
}
