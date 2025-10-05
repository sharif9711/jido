// js/dataStore.js
export const dataStore = (() => {
  let data = [];
  const listeners = [];

  // 초기 행 생성 (최대 1500행)
  function addRow(row = {}) {
    const idx = data.length + 1;
    data.push({
      순번: idx,
      이름: "",
      연락처: "",
      주소: "",
      품목: "",
      상태: "",
      PNU: "",
      지목: "",
      면적: "",
      메모: "",
      ...row,
    });
  }

  // 값 변경
  function update(index, key, value) {
    if (data[index]) {
      data[index][key] = value;
      notify();
    }
  }

  // 전체 데이터 반환
  function getAll() {
    return data;
  }

  // 상태 구독
  function subscribe(fn) {
    listeners.push(fn);
  }

  // 변경 알림
  function notify() {
    listeners.forEach((fn) => fn());
  }

  // 초기화
  function clear() {
    data = [];
    notify();
  }

  return { addRow, update, getAll, subscribe, clear };
})();
