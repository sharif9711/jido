import { dataStore } from "./dataStore.js";
import { showSection } from "./ui.js";
import { initializeMap, renderMapMarkers, drawOptimalRoute } from "./mapMain.js";

const inputBody = document.getElementById("inputTableBody");
const recordBody = document.getElementById("recordTableBody");
const mapBtn = document.getElementById("mapBtn");

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
    tr.querySelectorAll("td[contenteditable]").forEach((cell, idx) => {
      const key = ["이름", "연락처", "주소", "품목"][idx];
      cell.addEventListener("input", e => dataStore.update(i, key, e.target.textContent.trim()));
    });
    inputBody.appendChild(tr);
  });
}

function renderRecord() {
  recordBody.innerHTML = "";
  dataStore.getAll()
    .filter(r => r.이름 && r.주소)
    .forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.순번}</td><td>${r.이름}</td><td>${r.연락처}</td><td>${r.주소}</td>
        <td>${r.품목}</td><td>${r.상태 || "예정"}</td>
        <td>${r.PNU || ""}</td><td>${r.지목 || ""}</td><td>${r.면적 || ""}</td>
        <td>${r.메모 || ""}</td>`;
      recordBody.appendChild(tr);
    });
}

document.getElementById("inputTab").onclick = () => showSection("inputSection");
document.getElementById("recordTab").onclick = () => showSection("recordSection");
document.getElementById("resultTab").onclick = () => showSection("mapSection");
mapBtn.onclick = () => { showSection("mapSection"); initializeMap(); renderMapMarkers(); };

dataStore.subscribe(() => { renderInput(); renderRecord(); });
renderInput();
renderRecord();
