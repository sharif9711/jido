function openInfoPanel(d) {
  const p = document.getElementById("infoPanel");
  p.classList.remove("hidden");
  p.innerHTML = `
    <div class="font-semibold text-lg">${d.no}. ${d.name}</div>
    <div class="text-sm text-gray-700"><a href="tel:${d.phone}">${d.phone}</a></div>
    <div class="text-sm text-gray-500 mb-2">${d.address}</div>
    <div class="flex gap-2 mb-3">
      <button onclick="openMemoPanel(${d.no})" class="panel-btn">메모</button>
      <button onclick="openKakaoNavi('${d.address}','${d.name}')" class="panel-btn">카카오내비</button>
    </div>
    <div class="flex gap-2 mb-3">
      ${["예정","완료","보류"].map(s=>`<button onclick="updateStatus(${d.no},'${s}')" class="status-btn ${d.status===s?"active":""}">${s}</button>`).join("")}
    </div>
    <div id="memoList" class="max-h-24 overflow-auto mb-2 text-sm text-gray-600">${(d.memo||[]).map((m,i)=>`<div>${i+1}. ${m.text} (${m.date})</div>`).join("")}</div>
    <div class="flex gap-2"><input id="memoInput" class="flex-1 border rounded p-1 text-sm" placeholder="메모 입력..." /><button onclick="saveMemo(${d.no})" class="px-3 py-1 bg-blue-500 text-white rounded">저장</button></div>`;
}

function updateStatus(no, s) {
  const d = window.projectData.find(x=>x.no===no);
  d.status = s; renderLogMenu(); openInfoPanel(d);
}
function saveMemo(no){
  const d=window.projectData.find(x=>x.no===no); if(!d.memo)d.memo=[];
  const txt=document.getElementById("memoInput").value.trim(); if(!txt)return;
  d.memo.push({text:txt,date:new Date().toLocaleString("ko-KR",{hour12:false})});
  openInfoPanel(d); renderLogMenu();
}
function openKakaoNavi(addr,name){
  const url=`https://map.kakao.com/link/to/${encodeURIComponent(name)},${encodeURIComponent(addr)}`;
  window.open(url,"_blank");
}
