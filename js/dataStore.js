export const dataStore = (() => {
  let data = [];
  let subscribers = [];

  function subscribe(callback) {
    subscribers.push(callback);
  }

  function notify() {
    subscribers.forEach((cb) => cb());
  }

  function addRow() {
    data.push({
      순번: data.length + 1,
      이름: "",
      연락처: "",
      주소: "",
      품목: "",
      상태: "예정",
      PNU: "",
      지목: "",
      면적: "",
      메모: "",
    });
    notify();
  }

  function update(index, key, value) {
    if (data[index]) {
      data[index][key] = value;
      notify();
    }
  }

  function getAll() {
    return data;
  }

  function updateByName(name, key, value) {
    const item = data.find((d) => d.이름 === name);
    if (item) {
      item[key] = value;
      notify();
    }
  }

  return { subscribe, notify, addRow, update, getAll, updateByName };
})();
