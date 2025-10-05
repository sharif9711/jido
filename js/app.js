import { dataStore } from "./dataStore.js";
import { initMap } from "./mapMain.js";
import { showSection } from "./ui.js";

window.addEventListener("DOMContentLoaded", () => {
  const inputTable = document.getElementById("inputTable");
  const recordTable = document.getElementById("recordTable");

  // 1500행 미리 생성
  for (let i = 0; i < 1500; i++) {
    dataStore.addRow();
  }

  // 입력 화면 렌더링
  const renderInput = () => {
    inputTable.innerHTML = "";
    dataStore.getAll().forEach((row, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="border px-2 py-1 text-center">${row.순번}</td>
        <td class="border px-2 py-1"><input value="${row.이름 || ""}" class="w-full border-none outline-none p-1 text-sm" oninput="dataStore.update(${i}, '이름', this.value)" /></td>
        <td class="border px-2 py-1"><input value="${row.연락처 || ""}" class="w-full border-none outline-none p-1 text-sm" oninput="dataStore.update(${i}, '연락처', this.value)" /></td>
        <td class="border px-2 py-1"><input value="${row.주소 || ""}" class="w-full border-none outline-none p-1 text-sm" oninput="dataStore.update(${i}, '주소', this.value)" /></td>
        <td class="border px-2 py-1"><input value="${row.품목 || ""}" class="w-full border-none outline-none p-1 text-sm" oninput="dataStore.update(${i}, '품목', this.value)" /></td>
      `;
      inputTable.appendChild(tr);
    });
  };

  // 기록 화면 렌더링
  const renderRecord = () => {
    recordTable.innerHTML = "";
    dataStore.getAll().forEach((row, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="border px-2 py-1 text-center">${row.순번}</td>
        <td class="border px-2 py-1">${row.이름}</td>
        <td class="border px-2 py-1">${row.연락처}</td>
        <td class="border px-2 py-1">${row.주소}</td>
        <td class="border px-2 py-1">${row.품목}</td>
        <td class="border px-2 py-1">
          <select onchange="dataStore.update(${i}, '상태', this.value)" class="w-full border-none outline-none">
            <option ${row.상태 === "예정" ? "selected" : ""}>예정</option>
            <option ${row.상태 === "완료" ? "selected" : ""}>완료</option>
            <option ${row.상태 === "보류" ? "selected" : ""}>보류</option>
          </select>
        </td>
        <td class="border px-2 py-1">${row.PNU}</td>
        <td class="border px-2 py-1">${row.지목}</td>
        <td class="border px-2 py-1">${row.면적}</td>
        <td class="border px-2 py-1"><input value="${row.메모}" class="w-full border-none outline-none" oninput="dataStore.update(${i}, '메모', this.value)" /></td>
      `;
      recordTable.appendChild(tr);
    });
  };

  dataStore.subscribe(renderInput);
  dataStore.subscribe(renderRecord);
  renderInput();
  renderRecord();

  // 엑셀 붙여넣기 이벤트
  inputTable.addEventListener("paste", (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    const rows = text.split("\n").filter((r) => r.trim() !== "");

    rows.forEach((rowText, rowIndex) => {
      const cells = rowText.split("\t");
      cells.forEach((cellText, colIndex) => {
        const key = ["이름", "연락처", "주소", "품목"][colIndex];
        if (key) {
          dataStore.update(rowIndex, key, cellText.trim());
        }
      });
    });
  });

  document.getElementById("inputTab").onclick = () => showSection("inputSection");
  document.getElementById("recordTab").onclick = () => showSection("recordSection");
  document.getElementById("mapBtn").onclick = () => {
    showSection("mapSection");
    initMap();
  };
});
