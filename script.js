// Helper: shorter, cleaner URL label (but keep full URL for opening)
function trimUrlForDisplay(u, max = 36) {
  try {
    const url = new URL(u);
    const base = url.host; // domain only
    const path = (url.pathname + url.search).replace(/\/+$/,'');
    const shown = (base + path);
    return shown.length > max ? shown.slice(0, max - 1) + '…' : shown;
  } catch { return u.length > max ? u.slice(0, max - 1) + '…' : u; }
}

/* ---------- Orb → Floating Panel (raised higher, safer close) ---------- */
function expandOrbToPanel(orbEl, link) {
  // save state once for restore
  if (!orbEl.__vlifeOriginal) {
    orbEl.__vlifeOriginal = {
      geom:  orbEl.getAttribute('geometry'),
      mat:   orbEl.getAttribute('material'),
      scale: orbEl.getAttribute('scale') || '1 1 1',
      pos:   Object.assign({}, orbEl.getAttribute('position'))
    };
  }

  // reset timers
  clearTimeout(orbEl.__autoCloseTimer);
  clearTimeout(orbEl.__lookAwayTimer);

  // lift ABOVE the orb line a bit more
  const lift = 0.9; // metres
  const p = orbEl.__vlifeOriginal.pos;
  orbEl.setAttribute('position', `${p.x} ${p.y + lift} ${p.z}`);

  // clear old children
  while (orbEl.firstChild) orbEl.removeChild(orbEl.firstChild);

  // make a container so enter/leave events are clean
  const panelRoot = document.createElement('a-entity');
  panelRoot.setAttribute('position', '0 0 0'); // parent is the orb entity itself
  orbEl.appendChild(panelRoot);

  const panelW = 1.20, panelH = 0.46;

  // background
  const bg = document.createElement('a-entity');
  bg.setAttribute('geometry', `primitive: plane; width: ${panelW}; height: ${panelH}`);
  bg.setAttribute('material', 'color: #000; opacity: 0.82; transparent: true');
  bg.setAttribute('position', '0 0 0.005');
  panelRoot.appendChild(bg);

  // header bar
  const header = document.createElement('a-entity');
  header.setAttribute('geometry', `primitive: plane; width: ${panelW}; height: 0.09`);
  header.setAttribute('material', 'color: #ffd100; opacity: 0.96');
  header.setAttribute('position', `0 ${panelH/2 - 0.045} 0.01`);
  panelRoot.appendChild(header);

  // title text (depth-safe)
  const title = document.createElement('a-entity');
  title.setAttribute('text', 'align: center; color: #111; width: 2');
  title.setAttribute('text', `value: ${link.title}`);
  title.setAttribute('position', `0 ${panelH/2 - 0.045} 0.015`);
  title.setAttribute('text', 'zOffset: 0.01;');
  panelRoot.appendChild(title);

  // URL (short display), tighter wrap, depth-safe
  const shownUrl = trimUrlForDisplay(link.url, 36);
  const urlTxt = document.createElement('a-entity');
  urlTxt.setAttribute('text', 'align: center; color: #fff; width: 1.6; wrapCount: 24; zOffset: 0.01;');
  urlTxt.setAttribute('text', `value: ${shownUrl}`);
  urlTxt.setAttribute('position', '0 0.05 0.015');
  panelRoot.appendChild(urlTxt);

  // Open button
  const openBtn = document.createElement('a-entity');
  openBtn.setAttribute('class', 'linkbtn');
  openBtn.setAttribute('geometry', 'primitive: plane; width: 0.46; height: 0.16');
  openBtn.setAttribute('material', 'color: #0f2353; opacity: 0.96');
  openBtn.setAttribute('position', '0 -0.13 0.02');
  const label = document.createElement('a-entity');
  label.setAttribute('text', 'value: Open; align: center; color: #fff; width: 1; zOffset: 0.01;');
  label.setAttribute('position', '0 0 0.01');
  openBtn.appendChild(label);
  openBtn.addEventListener('click', () => {
    try { window.open(link.url, '_blank'); } catch(e) { location.href = link.url; }
  });
  panelRoot.appendChild(openBtn);

  // Close (top-right)
  const closeBtn = document.createElement('a-entity');
  closeBtn.setAttribute('class', 'linkbtn');
  closeBtn.setAttribute('geometry', 'primitive: plane; width: 0.12; height: 0.12');
  closeBtn.setAttribute('material', 'color: #000; opacity: 0.001; transparent: true');
  closeBtn.setAttribute('position', `${panelW/2 - 0.08} ${panelH/2 - 0.08} 0.03`);
  const closeGlyph = document.createElement('a-entity');
  closeGlyph.setAttribute('text', 'value: ✕; align: center; color: #fff; width: 1.2; zOffset: 0.01;');
  closeGlyph.setAttribute('position', '0 0 0.01');
  closeBtn.appendChild(closeGlyph);
  closeBtn.addEventListener('click', () => restoreOrb(orbEl));
  panelRoot.appendChild(closeBtn);

  /* --- Auto-close + look-away, with a short lockout after open --- */
  orbEl.__autoCloseTimer = setTimeout(() => restoreOrb(orbEl), 8000);

  let lookAwayArmed = false;
  // arm look-away after 300ms so initial gaze jitter doesn't insta-close
  setTimeout(() => { lookAwayArmed = true; }, 300);

  const cancelLookAway = () => {
    if (!lookAwayArmed) return;
    clearTimeout(orbEl.__lookAwayTimer);
  };
  const startLookAway  = () => {
    if (!lookAwayArmed) return;
    clearTimeout(orbEl.__lookAwayTimer);
    orbEl.__lookAwayTimer = setTimeout(() => restoreOrb(orbEl), 1200);
  };

  // listen on the container, so children count as the same surface
  panelRoot.addEventListener('mouseenter', cancelLookAway);
  panelRoot.addEventListener('mouseleave', startLookAway);
}

function restoreOrb(orbEl) {
  if (!orbEl?.__vlifeOriginal) return;
  clearTimeout(orbEl.__autoCloseTimer);
  clearTimeout(orbEl.__lookAwayTimer);

  // remove panel contents
  while (orbEl.firstChild) orbEl.removeChild(orbEl.firstChild);

  // restore sphere + position
  orbEl.setAttribute('geometry', orbEl.__vlifeOriginal.geom);
  orbEl.setAttribute('material', orbEl.__vlifeOriginal.mat);
  orbEl.setAttribute('scale',    orbEl.__vlifeOriginal.scale);
  const p = orbEl.__vlifeOriginal.pos;
  orbEl.setAttribute('position', `${p.x} ${p.y} ${p.z}`);
}