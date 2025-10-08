window.onload = () => {
  dataStore.loadInput();

  document.getElementById("mapBtn").addEventListener("click", () => {
    document.querySelectorAll(".tab-content").forEach(t => t.classList.add("hidden"));
    document.getElementById("mapSection").classList.remove("hidden");
    initMap();
  });

  document.getElementById("toggleName").addEventListener("click", (e) => {
    labelVisible = !labelVisible;
    e.target.classList.toggle('on', labelVisible);
    renderMarkers();
  });
};
