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
      renderVWorldMap();
    };
  });

  document.getElementById("btnMemo").onclick = () => {
    const area = document.getElementById("memoArea");
    area.classList.toggle("hidden");
    renderMemoList(data);
  };

  document.getElementById("memoSaveBtn").onclick = () => {
    const val = document.getElementById("memoInput").value.trim();
    if (!val) return;
    const entry = { text: val, date: formatDate() };
    data.memo.push(entry);
    renderMemoList(data);
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
