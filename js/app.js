document.addEventListener("DOMContentLoaded", () => {
  const inputBody = document.getElementById("inputBody");
  if (!inputBody) return;

  // 1500행 생성
  for (let i = 1; i <= 1500; i++) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="border p-2 text-center">${i}</td>
      <td class="border p-2" contenteditable="true"></td>
      <td class="border p-2" contenteditable="true"></td>
      <td class="border p-2" contenteditable="true"></td>
      <td class="border p-2" contenteditable="true"></td>
    `;
    inputBody.appendChild(tr);
  }

  // 엑셀에서 복사한 데이터 붙여넣기
  inputBody.addEventListener("paste", (event) => {
    event.preventDefault();

    const clipboard = event.clipboardData.getData("text/plain");
    const rows = clipboard.split(/\r?\n/).filter(r => r.trim() !== "");
    const startCell = document.activeElement;
    const startRow = startCell.closest("tr");
    if (!startRow) return;

    const startRowIndex = Array.from(inputBody.children).indexOf(startRow);
    let currentRowIndex = startRowIndex;

    rows.forEach(rowText => {
      const cols = rowText.split("\t");
      const row = inputBody.children[currentRowIndex];
      if (!row) return;

      const editableCells = row.querySelectorAll("td[contenteditable]");
      cols.forEach((colText, colIndex) => {
        if (editableCells[colIndex]) {
          editableCells[colIndex].innerText = colText.trim();
        }
      });

      currentRowIndex++;
    });
  });

  console.log("입력 테이블 초기화 완료 ✅");
});
