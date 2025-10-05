export function showSection(id) {
  document.querySelectorAll("section, main").forEach((el) => (el.style.display = "none"));
  document.getElementById(id).style.display = "block";
}
