import { dataStore } from "./dataStore.js";
import { showSection } from "./ui.js";
import { initializeMap, renderMapMarkers } from "./mapMain.js";

document.addEventListener("DOMContentLoaded", () => {
  const inputBody = document.getElementById("inputTableBody");
  const recordBody = document.getElementById("recordTableBody");
  const mapBtn = document.getElementById("mapBtn");

  // ✅ 엑셀에서 복사한 데이터 붙여넣기 핸들러
  function handlePaste(e, startRow, startCol) {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    const rows = text.split(/\r?\n/).filter(r => r.trim() !== "");

    rows.forEach((row, i) => {
      const cells = row.split("\t");
      cells.forEach((cell, j) => {
        const value = cell.trim();
        const rIndex = startRow + i;
        const cIndex = startCol + j;
        const key = ["이름", "연락처", "주소", "품목"][cIndex];
        if (key && dataStore.getAll()[rIndex]) {
          dataStore.update(rIndex, key, value);
        }
      });
    });
  }

  // ✅ 입력 테이블 렌더링
  function renderInput() {
    inputBody.innerHTML = "";
    dataStore.getAll().forEach((row, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${row.순번}</td>
        <td contenteditable="true">${row.이름}</td>
        <td contenteditable="true">${row.연락처}</td>
        <td contenteditable="true">${row.주소}</td>
        <td contenteditable="true">${row.품목}</td>
      `;

      // 입력 이벤트 (수정 시)
      tr.querySelectorAll("td[contenteditable]").forEach((cell, colIdx) => {
        const key = ["이름", "연락처", "주소", "품목"][colIdx];
        cell.addEventListener("input", e => dataStore.update(i, key, e.target.textContent.trim()));

        // ✅ 붙여넣기 이벤트 (엑셀 복사 대응)
        cell.addEventListener("paste", e => handlePaste(e, i, colIdx));
      });
      inputBody.appendChild(tr);
    });
  }

  // ✅ 기록 테이블 렌더링
  function renderRecord() {
    recordBody.innerHTML = "";
    dataStore.getAll()
      .filter(r => r.이름 && r.주소)
      .forEach(r => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${r.순번}</td><td>${r.이름}</td><td>${r.연락처}</td><td>${r.주소}</td>
          <td>${r.품목}</td><td>${r.상태 || "예정"}</td>
          <td>${r.PNU || ""}</td><td>${r.지목 || ""}</td><td>${r.면적 || ""}</td><td>${r.메모 || ""}</td>`;
        recordBody.appendChild(tr);
      });
  }

  // ✅ 탭 이동 및 지도 버튼
  document.getElementById("inputTab").onclick = () => showSection("inputSection");
  document.getElementById("recordTab").onclick = () => showSection("recordSection");
  document.getElementById("resultTab").onclick = () => showSection("mapSection");
  mapBtn.onclick = () => { showSection("mapSection"); initializeMap(); renderMapMarkers(); };

  dataStore.subscribe(() => { renderInput(); renderRecord(); });
  renderInput();
  renderRecord();
});
