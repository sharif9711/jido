const mainView = document.getElementById("mainView");
const detailView = document.getElementById("detailView");
const projectTitle = document.getElementById("projectTitle");
const backBtn = document.getElementById("backBtn");
const mapBtn = document.getElementById("mapBtn");

function openDetail(p) {
  mainView.classList.add("hidden");
  detailView.classList.remove("hidden");
  projectTitle.textContent = p.name;
  loadMenu("input");
}

backBtn.onclick = () => {
  detailView.classList.add("hidden");
  mainView.classList.remove("hidden");
};

mapBtn.onclick = () => {
  renderKakaoMap();
};
