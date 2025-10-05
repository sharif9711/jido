const content = document.getElementById("projectContent");
document.getElementById("menuInput").onclick = () => loadMenu("input");
document.getElementById("menuLog").onclick = () => loadMenu("log");
document.getElementById("menuResult").onclick = () => loadMenu("result");
window.projectData = [];

function loadMenu(menu) {
  if (menu === "input") renderInputMenu();
  if (menu === "log") renderLogMenu();
  if (menu === "result")
    content.innerHTML = `<div class='p-4 text-gray-600'>결과 탭은 추후 추가됩니다.</div>`;
}

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
    </div>`;
  
  const body = document.getElementById("inputTableBody");
  for (let i = 1; i <= 1500; i++) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="border text-center text-gray-500">${i}</td>
      ${["name", "phone", "address", "item"].map(
        (col) => `<td class="border p-1"><input data-row="${i}" data-col="${col}" class="cell w-full outline-none px-1" /></td>`
      ).join("")}`;
    body.appendChild(row);
  }

  document.querySelectorAll(".cell").forEach((c) => {
    // 입력 시 실시간 반영
    c.addEventListener("input", (e) => {
      const r = parseInt(e.target.dataset.row),
        col = e.target.dataset.col;
      window.projectData[r - 1] ??= { no: r, name: "", phone: "", address: "", item: "" };
      window.projectData[r - 1][col] = e.target.value;
    });

    // ✅ 엑셀에서 복사한 내용 붙여넣기 (행·열 자동 인식)
    c.addEventListener("paste", (e) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      const rows = text.trim().split(/\r?\n/);
      const cols = ["name", "phone", "address", "item"];
      let startRow = parseInt(c.dataset.row);
      let startCol = cols.indexOf(c.dataset.col);

      rows.forEach((line, i) => {
        const values = line.split(/\t/);
        const currentRow = startRow + i;
        window.projectData[currentRow - 1] ??= { no: currentRow };
        values.forEach((val, j) => {
          const colName = cols[startCol + j];
          if (colName) {
            const clean = val.trim();
            window.projectData[currentRow - 1][colName] = clean;
            const target = document.querySelector(
              `input[data-row='${currentRow}'][data-col='${colName}']`
            );
            if (target) target.value = clean;
          }
        });
      });
    });
  });
}

function renderLogMenu() {
  const f = window.projectData.filter(Boolean);
  if (!f.length)
    return (content.innerHTML = `<div class='p-4 text-gray-600'>입력된 데이터가 없습니다.</div>`);

  content.innerHTML = `
    <div class="p-0 h-[calc(100vh-200px)] overflow-x-auto overflow-y-auto">
      <table class="min-w-[1000px] border border-gray-300 text-sm">
        <thead class="bg-blue-100 sticky top-0">
          <tr>
            ${["순번","이름","연락처","주소","품목","상태","PNU","지목","면적","메모"]
              .map((h) => `<th class='border p-1'>${h}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${f.map((d) => `
            <tr>
              <td class="border text-center">${d.no}</td>
              <td class="border">${d.name||""}</td>
              <td class="border">${d.phone||""}</td>
              <td class="border">${d.address||""}</td>
              <td class="border">${d.item||""}</td>
              <td class="border text-center">${d.status||"예정"}</td>
              <td class="border">${d.pnu||""}</td>
              <td class="border">${d.jimok||""}</td>
              <td class="border">${d.area||""}</td>
              <td class="border">${(d.memo||[]).map((m)=>m.text).join(", ")}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}
