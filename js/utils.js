function getStatusColor(status) {
  switch (status) {
    case "예정": return "#00c853";
    case "완료": return "#2979ff";
    case "보류": return "#d50000";
    default: return "#9e9e9e";
  }
}

function formatDate(d = new Date()) {
  const y = d.getFullYear();
  const m = ("0" + (d.getMonth() + 1)).slice(-2);
  const day = ("0" + d.getDate()).slice(-2);
  const h = ("0" + d.getHours()).slice(-2);
  const min = ("0" + d.getMinutes()).slice(-2);
  return `${y}.${m}.${day} ${h}:${min}`;
}
