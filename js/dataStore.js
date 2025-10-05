export const dataStore = (() => {
  let data = [];
  const listeners = [];

  for (let i = 0; i < 1500; i++) {
    data.push({
      순번: i + 1, 이름: "", 연락처: "", 주소: "", 품목: "",
      상태: "", PNU: "", 지목: "", 면적: "", 메모: ""
    });
  }

  function update(index, key, value) {
    if (data[index]) {
      data[index][key] = value;
      notify();
    }
  }

  function getAll() { return data; }

  function subscribe(fn) { listeners.push(fn); }

  function notify() { listeners.forEach(fn => fn()); }

  return { update, getAll, subscribe };
})();
