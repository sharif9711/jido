// js/mapMain.js

let map, markers = [], infoWindow = null;
let currentPosition = null;
let mapType = "roadmap";

window.onload = function () {
  initializeMapModule();
};

export function initializeMapModule(dataList = sampleData()) {
  const container = document.getElementById("map");
  const options = {
    center: new kakao.maps.LatLng(37.5665, 126.9780), // 서울 시청
    level: 5,
  };

  map = new kakao.maps.Map(container, options);
  infoWindow = new kakao.maps.InfoWindow({ zIndex: 1 });

  // 지도/스카이뷰 버튼 이벤트
  const btnMap = document.getElementById("btnMap");
  const btnSky = document.getElementById("btnSky");

  btnMap.onclick = () => {
    map.setMapTypeId(kakao.maps.MapTypeId.ROADMAP);
    btnMap.classList.add("active");
    btnSky.classList.remove("active");
  };

  btnSky.onclick = () => {
    map.setMapTypeId(kakao.maps.MapTypeId.HYBRID);
    btnSky.classList.add("active");
    btnMap.classList.remove("active");
  };

  // 데이터 기반 마커 생성
  dataList.forEach((item, index) => {
    if (!item.주소) return;
    const geocoder = new kakao.maps.services.Geocoder();

    geocoder.addressSearch(item.주소, (result, status) => {
      if (status === kakao.maps.services.Status.OK) {
        const coords = new kakao.maps.LatLng(result[0].y, result[0].x);

        const marker = new kakao.maps.Marker({
          map,
          position: coords,
          title: `${item.이름}`,
        });

        markers.push(marker);

        const overlay = new kakao.maps.CustomOverlay({
          position: coords,
          content: `
            <div style="padding:3px 8px;background:white;border-radius:5px;border:1px solid #999;font-size:12px;">
              ${index + 1}. ${item.이름}
            </div>
          `,
          yAnchor: 1.5,
        });
        overlay.setMap(map);

        kakao.maps.event.addListener(marker, "click", () => {
          showInfoWindow(item, coords);
        });
      }
    });
  });
}

// 정보창 표시
function showInfoWindow(item, position) {
  const content = `
    <div style="width:250px;padding:10px;">
      <b>${item.이름}</b><br/>
      ${item.주소}<br/>
      <small>${item.연락처}</small><br/>
      <div style="margin-top:8px;">
        <button onclick="window.open('tel:${item.연락처}')"
          style="background:#007aff;color:white;border:none;padding:4px 8px;border-radius:4px;margin-right:5px;">전화</button>
        <button onclick="openMemo('${item.이름}')"
          style="background:#666;color:white;border:none;padding:4px 8px;border-radius:4px;margin-right:5px;">메모</button>
        <button onclick="changeStatus('${item.이름}')"
          style="background:#2ecc71;color:white;border:none;padding:4px 8px;border-radius:4px;">상태변경</button>
      </div>
      <hr style="margin:8px 0"/>
      <div style="font-size:12px;color:#555;">
        <b>PNU:</b> (추후 연결 예정)<br/>
        <b>지목:</b> (추후 연결 예정)<br/>
        <b>면적:</b> (추후 연결 예정)
      </div>
    </div>
  `;
  infoWindow.setContent(content);
  infoWindow.setPosition(position);
  infoWindow.open(map);
}

// 상태 변경 (예정 → 완료 → 보류)
window.changeStatus = function (name) {
  alert(`${name} 상태 변경: 예정 → 완료 → 보류 순환 예정`);
};

// 메모 작성 기능
window.openMemo = function (name) {
  const memo = prompt(`${name}에 대한 메모를 입력하세요:`);
  if (memo) {
    alert(`"${name}"의 메모가 기록 탭에 반영됩니다.`);
  }
};

// 샘플 데이터 (테스트용)
function sampleData() {
  return [
    {
      순번: 1,
      이름: "운남점",
      연락처: "010-1111-2222",
      주소: "광주 광산구 하남대로 282 금강빌딩 1층",
      품목: "테스트",
      상태: "예정",
    },
    {
      순번: 2,
      이름: "호남대점",
      연락처: "010-2222-3333",
      주소: "광주광역시 광산구 선암동 779 1층 101호",
      품목: "테스트",
      상태: "완료",
    },
  ];
}
