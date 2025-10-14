const sky = document.getElementById("sky");
const statusText = document.getElementById("statusText");

function setBackground(bg) {
  sky.setAttribute("src", "#" + bg);
  const labelMap = {
    Park360: "Park Steps 360",
    Forrest360: "Forest 360",
    Futurecity360: "Future City 360",
    Neonnightclub: "Neon Nightclub 360",
    floating_sky_monastery_upscaled_8: "Floating Sky Monastery 8K",
  };
  statusText.textContent = "Using 360 image: " + labelMap[bg];
}

function enterVR() {
  document.querySelector("a-scene").enterVR();
}

function enterAR() {
  document.querySelector("a-scene").enterAR();
}