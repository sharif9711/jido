const dataStore = {
  inputData: [],
  loadInput() {
    const tbody = document.getElementById('inputTableBody');
    tbody.innerHTML = '';
    for (let i = 1; i <= 1500; i++) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="border text-center">${i}</td>
        <td contenteditable="true" class="border p-1"></td>
        <td contenteditable="true" class="border p-1"></td>
        <td contenteditable="true" class="border p-1"></td>
        <td contenteditable="true" class="border p-1"></td>
      `;
      tbody.appendChild(row);
    }
  },
  collectData() {
    const rows = document.querySelectorAll('#inputTableBody tr');
    this.inputData = [];
    rows.forEach(r => {
      const cells = r.querySelectorAll('td');
      const obj = {
        no: cells[0].innerText.trim(),
        name: cells[1].innerText.trim(),
        phone: cells[2].innerText.trim(),
        addr: cells[3].innerText.trim(),
        item: cells[4].innerText.trim(),
        status: cells[3].innerText ? '예정' : ''
      };
      if (obj.name || obj.phone || obj.addr || obj.item) {
        this.inputData.push(obj);
      }
    });
  }
};
