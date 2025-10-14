// Elements
const sky = document.getElementById("sky");
const statusText = document.getElementById("statusText");
const menuPanel = document.getElementById("menuPanel");
const hamburger = document.getElementById("hamburger");

// Label map for UI
const labelMap = {
  Park360: "Park Steps 360",
  Forrest360: "Forest 360",
  Futurecity360: "Future City 360",
  Neonnightclub: "Neon Nightclub 360",
  floating_sky_monastery_upscaled_8: "Floating Sky Monastery 8K",
};

// Set sky, update status, collapse panel to hamburger after first pick
function setBackground(bg) {
  sky.setAttribute("src", "#" + bg);
  statusText.textContent = "Using 360 image: " + (labelMap[bg] || bg);

  // Collapse panel to hamburger (first selection or any time user chooses)
  menuPanel.classList.add("hidden");
  hamburger.classList.remove("hidden");
}

function toggleMenu() {
  const isHidden = menuPanel.classList.toggle("hidden");
  if (isHidden) {
    // if closing, keep hamburger visible
    hamburger.classList.remove("hidden");
  } else {
    // if opening, keep hamburger visible (so user can close again)
    hamburger.classList.remove("hidden");
  }
}

function enterVR() { document.querySelector("a-scene").enterVR(); }
function enterAR() { document.querySelector("a-scene").enterAR(); }

// ----- ORB INTERACTION -----
// Attach click handlers to all .hotspot orbs to switch backgrounds.
AFRAME.registerComponent("billboard", {
  tick: function () {
    // Always face the camera
    const cam = document.querySelector("a-camera");
    if (!cam) return;
    this.el.object3D.lookAt(cam.object3D.position);
  }
});

window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".hotspot").forEach((el) => {
    el.addEventListener("click", () => {
      const bg = el.getAttribute("data-bg");
      if (bg) setBackground(bg);
    });
  });
});