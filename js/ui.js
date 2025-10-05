export function showSection(id) {
  const sections = ["inputSection", "recordSection", "mapSection"];
  sections.forEach(sec => {
    document.getElementById(sec).classList.toggle("hidden", sec !== id);
  });

  const tabs = ["inputTab", "recordTab", "resultTab"];
  tabs.forEach(tab => {
    const el = document.getElementById(tab);
    if (!el) return;
    el.classList.remove("text-blue-600", "font-semibold", "border-b-2", "border-blue-600");
  });

  if (id === "inputSection") document.getElementById("inputTab").classList.add("text-blue-600", "font-semibold", "border-b-2", "border-blue-600");
  if (id === "recordSection") document.getElementById("recordTab").classList.add("text-blue-600", "font-semibold", "border-b-2", "border-blue-600");
  if (id === "mapSection") document.getElementById("resultTab").classList.add("text-blue-600", "font-semibold", "border-b-2", "border-blue-600");
}
