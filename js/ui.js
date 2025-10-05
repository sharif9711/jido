// js/ui.js

export function showSection(sectionId) {
  const sections = ["inputSection", "recordSection", "mapSection"];
  sections.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", id !== sectionId);
  });

  // 탭 버튼 상태 동기화
  const inputTab = document.getElementById("inputTab");
  const recordTab = document.getElementById("recordTab");
  const resultTab = document.getElementById("resultTab");

  [inputTab, recordTab, resultTab].forEach((tab) =>
    tab.classList.remove("text-blue-600", "font-semibold", "border-b-2", "border-blue-600")
  );

  if (sectionId === "inputSection")
    inputTab.classList.add("text-blue-600", "font-semibold", "border-b-2", "border-blue-600");
  else if (sectionId === "recordSection")
    recordTab.classList.add("text-blue-600", "font-semibold", "border-b-2", "border-blue-600");
  else if (sectionId === "mapSection")
    resultTab.classList.add("text-blue-600", "font-semibold", "border-b-2", "border-blue-600");
}
