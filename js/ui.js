document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.remove('hidden');

    if (btn.dataset.tab === 'record') {
      dataStore.collectData();
      renderRecordTable();
    }
  });
});

function renderRecordTable() {
  const tbody = document.getElementById('recordTableBody');
  tbody.innerHTML = '';
  dataStore.inputData.forEach(d => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${d.no}</td><td>${d.name}</td><td>${d.phone}</td>
      <td>${d.addr}</td><td>${d.item}</td>
      <td>${d.status}</td><td></td><td></td><td></td><td></td>`;
    tbody.appendChild(row);
  });
}
