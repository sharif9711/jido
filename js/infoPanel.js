function openInfoPanel(data) {
  const panel = document.getElementById("infoPanel");
  panel.classList.remove("hidden");
  document.getElementById("infoName").innerText = `${data.no}. ${data.name}`;
  document.getElementById("infoPhone").innerText = data.phone;
  document.getElementById("infoPhone").href = `tel:${data.phone}`;
  document.getElementById("infoAddress").innerText = data.address;

  document.querySelectorAll(".statusBtn").forEach((btn) => {
    btn.onclick = () => {
      data.status = btn.dataset.status;
      updateRecordStatus(data.no, data.status);
      panel.classList.add("hidden");
      renderVWorldMap();
    };
  });

  document.getElementById("btnMemo").onclick = () => {
    const memoArea = document.getElementById("memoArea");
    memoArea.classList.toggle("hidden");
    renderMemoList(data);
  };

  document.getElementById("memoSaveBtn").onclick = () => {
    const txt = document.getElementById("memoInput").value.trim();
    if (!txt) return;
    const entry = { text: txt, date: formatDate() };
    data.memo.push(entry);
    renderMemoList(data);
    updateRecordMemo(data.no, data.memo);
    document.getElementById("memoInput").value = "";
  };

  document.getElementById("btnNavi").onclick = () => {
    const addr = encodeURIComponent(data.address);
    if (/Mobi|Android/i.test(navigator.userAgent)) {
      location.href = `kakaonavi://navigate?name=${addr}&x=126.9780&y=37.5665`;
    } else {
      window.open(`https://map.kakao.com/?q=${addr}`, "_blank");
    }
  };
}

function renderMemoList(data) {
  const list = document.getElementById("memoList");
  list.innerHTML = data.memo.map((m, i) => `<div>${i + 1}. ${m.text} (${m.date})</div>`).join("");
}

function updateRecordStatus(no, status) {
  const rec = window.projectData.find((r) => r.no === no);
  if (rec) rec.status = status;
}

function updateRecordMemo(no, memo) {
  const rec = window.projectData.find((r) => r.no === no);
  if (rec) rec.memo = memo;
}
