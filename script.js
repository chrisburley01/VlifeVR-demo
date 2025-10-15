/* ==== helpers for display + marquee ==== */

// Trim for initial fit (we still run marquee if it overflows)
function trimUrlForDisplay(u, max = 44) {
  try {
    const url = new URL(u);
    const base = url.host;
    const path = (url.pathname + url.search).replace(/\/+$/,'');
    const shown = (base + path);
    return shown.length > max ? shown.slice(0, max - 1) + '…' : shown;
  } catch { return u.length > max ? u.slice(0, max - 1) + '…' : u; }
}

/**
 * Start a marquee that scrolls text inside a fixed-length window.
 * We simulate “clipping” by only rendering a substring of the full string.
 * Call stopMarquee(entity) to cancel.
 */
function startMarquee(textEntity, fullText, windowChars, stepMs = 120, spacer = '   •   ') {
  stopMarquee(textEntity);
  // If it fits, just set once and bail
  if (fullText.length <= windowChars) {
    textEntity.setAttribute('text', 'value', fullText);
    return;
  }
  const scroll = fullText + spacer + fullText; // loopable
  let i = 0;
  const tick = () => {
    const slice = scroll.slice(i, i + windowChars);
    textEntity.setAttribute('text', 'value', slice);
    i = (i + 1) % (fullText.length + spacer.length);
    textEntity.__marqueeTimer = setTimeout(tick, stepMs);
  };
  tick();
}
function stopMarquee(textEntity) {
  if (textEntity && textEntity.__marqueeTimer) {
    clearTimeout(textEntity.__marqueeTimer);
    textEntity.__marqueeTimer = null;
  }
}

/* ---------- Orb → BIG Floating Panel (raised higher, marquee text) ---------- */
function expandOrbToPanel(orbEl, link) {
  // save state once
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

  // raise panel above the orb line (higher so the orb line never overlaps)
  const lift = 1.2; // metres
  const p = orbEl.__vlifeOriginal.pos;
  orbEl.setAttribute('position', `${p.x} ${p.y + lift} ${p.z}`);

  // wipe old children / geometry
  while (orbEl.firstChild) orbEl.removeChild(orbEl.firstChild);

  // container so hover/leave applies to whole surface
  const panelRoot = document.createElement('a-entity');
  orbEl.appendChild(panelRoot);

  // >>> BIGGER BOXES <<<
  const panelW = 2.40, panelH = 0.84;         // ~2× previous size
  const headerH = 0.12;

  // background
  const bg = document.createElement('a-entity');
  bg.setAttribute('geometry', `primitive: plane; width: ${panelW}; height: ${panelH}`);
  bg.setAttribute('material', 'color: #000; opacity: 0.82; transparent: true');
  bg.setAttribute('position', '0 0 0.005');
  panelRoot.appendChild(bg);

  // header bar
  const header = document.createElement('a-entity');
  header.setAttribute('geometry', `primitive: plane; width: ${panelW}; height: ${headerH}`);
  header.setAttribute('material', 'color: #ffd100; opacity: 0.96');
  header.setAttribute('position', `0 ${panelH/2 - headerH/2} 0.01`);
  panelRoot.appendChild(header);

  // Title text (marquee if long)
  const titleEntity = document.createElement('a-entity');
  titleEntity.setAttribute('text', `value: ${link.title}; align: center; color: #111; width: 3.2; zOffset: 0.01`);
  titleEntity.setAttribute('position', `0 ${panelH/2 - headerH/2} 0.015`);
  panelRoot.appendChild(titleEntity);
  // Title window: ~34 chars at this size
  startMarquee(titleEntity, link.title, 34, 120);

  // URL area (two lines look nicer on big panel—use wrap + marquee window)
  const urlEntity = document.createElement('a-entity');
  urlEntity.setAttribute('text', `value: ${trimUrlForDisplay(link.url, 44)}; align: center; color: #fff; width: 2.6; wrapCount: 36; zOffset: 0.01`);
  urlEntity.setAttribute('position', '0 0.16 0.015');
  panelRoot.appendChild(urlEntity);
  // If the true URL is longer than our display window, run a marquee window too.
  startMarquee(urlEntity, link.url, 44, 90);

  // >>> BIGGER OPEN BUTTON <<<
  const openBtn = document.createElement('a-entity');
  openBtn.setAttribute('class', 'linkbtn');
  openBtn.setAttribute('geometry', 'primitive: plane; width: 0.80; height: 0.22');
  openBtn.setAttribute('material', 'color: #0f2353; opacity: 0.96');
  openBtn.setAttribute('position', '0 -0.22 0.02');
  const label = document.createElement('a-entity');
  label.setAttribute('text', 'value: Open; align: center; color: #fff; width: 1.4; zOffset: 0.01');
  label.setAttribute('position', '0 0 0.01');
  openBtn.appendChild(label);
  openBtn.addEventListener('click', () => {
    try { window.open(link.url, '_blank'); } catch(e) { location.href = link.url; }
  });
  panelRoot.appendChild(openBtn);

  // Close (top-right, bigger hit area)
  const closeBtn = document.createElement('a-entity');
  closeBtn.setAttribute('class', 'linkbtn');
  closeBtn.setAttribute('geometry', 'primitive: plane; width: 0.16; height: 0.16');
  closeBtn.setAttribute('material', 'color: #000; opacity: 0.001; transparent: true');
  closeBtn.setAttribute('position', `${panelW/2 - 0.11} ${panelH/2 - 0.11} 0.03`);
  const closeGlyph = document.createElement('a-entity');
  closeGlyph.setAttribute('text', 'value: ✕; align: center; color: #fff; width: 1.6; zOffset: 0.01');
  closeGlyph.setAttribute('position', '0 0 0.01');
  closeBtn.appendChild(closeGlyph);
  closeBtn.addEventListener('click', () => restoreOrb(orbEl));
  panelRoot.appendChild(closeBtn);

  // --- auto-close + look-away (with 300ms lockout to avoid jitter) ---
  orbEl.__autoCloseTimer = setTimeout(() => restoreOrb(orbEl), 8000);
  let lookAwayArmed = false;
  setTimeout(() => { lookAwayArmed = true; }, 300);

  const cancelLookAway = () => { if (lookAwayArmed) clearTimeout(orbEl.__lookAwayTimer); };
  const startLookAway  = () => {
    if (!lookAwayArmed) return;
    clearTimeout(orbEl.__lookAwayTimer);
    orbEl.__lookAwayTimer = setTimeout(() => restoreOrb(orbEl), 1200);
  };
  panelRoot.addEventListener('mouseenter', cancelLookAway);
  panelRoot.addEventListener('mouseleave', startLookAway);

  // Keep reference to clean up marquee timers on restore
  orbEl.__panelNodes = { titleEntity, urlEntity };
}

function restoreOrb(orbEl) {
  if (!orbEl?.__vlifeOriginal) return;
  clearTimeout(orbEl.__autoCloseTimer);
  clearTimeout(orbEl.__lookAwayTimer);

  // stop marquees if running
  if (orbEl.__panelNodes) {
    stopMarquee(orbEl.__panelNodes.titleEntity);
    stopMarquee(orbEl.__panelNodes.urlEntity);
    orbEl.__panelNodes = null;
  }

  while (orbEl.firstChild) orbEl.removeChild(orbEl.firstChild);

  // restore sphere + original position
  orbEl.setAttribute('geometry', orbEl.__vlifeOriginal.geom);
  orbEl.setAttribute('material', orbEl.__vlifeOriginal.mat);
  orbEl.setAttribute('scale',    orbEl.__vlifeOriginal.scale);
  const p = orbEl.__vlifeOriginal.pos;
  orbEl.setAttribute('position', `${p.x} ${p.y} ${p.z}`);
}