function trimUrlForDisplay(u, max = 34) {
  try {
    const url = new URL(u);
    const base = url.origin.replace(/^https?:\/\//,'');
    const path = (url.pathname + url.search).replace(/\/+$/,'');
    const shown = (base + path);
    return shown.length > max ? shown.slice(0, max - 1) + '…' : shown;
  } catch { return u.length > max ? u.slice(0, max - 1) + '…' : u; }
}

function expandOrbToPanel(orbEl, link) {
  if (!orbEl.__vlifeOriginal) {
    orbEl.__vlifeOriginal = {
      geom: orbEl.getAttribute('geometry'),
      mat:  orbEl.getAttribute('material'),
      scale: orbEl.getAttribute('scale') || '1 1 1',
      pos:  Object.assign({}, orbEl.getAttribute('position'))
    };
  }
  clearTimeout(orbEl.__autoCloseTimer);
  clearTimeout(orbEl.__lookAwayTimer);

  // ↑ lift more so it’s above the orb line
  const lift = 0.8;
  const p = orbEl.__vlifeOriginal.pos;
  orbEl.setAttribute('position', `${p.x} ${p.y + lift} ${p.z}`);

  while (orbEl.firstChild) orbEl.removeChild(orbEl.firstChild);

  // neater proportions + padding
  const panelW = 1.20, panelH = 0.46;
  orbEl.setAttribute('geometry', `primitive: plane; width: ${panelW}; height: ${panelH}`);
  orbEl.setAttribute('material', 'color: #000; opacity: 0.82; transparent: true');

  // header bar
  const header = document.createElement('a-entity');
  header.setAttribute('geometry', `primitive: plane; width: ${panelW}; height: 0.09`);
  header.setAttribute('material', 'color: #ffd100; opacity: 0.96');
  header.setAttribute('position', `0 ${panelH/2 - 0.045} 0.01`);
  orbEl.appendChild(header);

  // title
  const title = document.createElement('a-entity');
  title.setAttribute('text', `value: ${link.title}; align: center; color: #111; width: 2`);
  title.setAttribute('position', `0 ${panelH/2 - 0.045} 0.02`);
  orbEl.appendChild(title);

  // URL — shortened for display; tighter wrap so it stays inside
  const shownUrl = trimUrlForDisplay(link.url, 38);
  const url = document.createElement('a-entity');
  url.setAttribute('text', `value: ${shownUrl}; align: center; color: #fff; width: 1.6; wrapCount: 24`);
  url.setAttribute('position', '0 0.05 0.02'); // a bit higher
  orbEl.appendChild(url);

  // Open button
  const openBtn = document.createElement('a-entity');
  openBtn.setAttribute('class', 'linkbtn');
  openBtn.setAttribute('geometry', 'primitive: plane; width: 0.46; height: 0.16');
  openBtn.setAttribute('material', 'color: #0f2353; opacity: 0.96');
  openBtn.setAttribute('position', '0 -0.12 0.02');
  const label = document.createElement('a-entity');
  label.setAttribute('text', 'value: Open; align: center; color: #fff; width: 1');
  label.setAttribute('position', '0 0 0.01');
  openBtn.appendChild(label);
  openBtn.addEventListener('click', () => {
    try { window.open(link.url, '_blank'); } catch (e) { location.href = link.url; }
  });
  orbEl.appendChild(openBtn);

  // Close (top-right)
  const closeBtn = document.createElement('a-entity');
  closeBtn.setAttribute('class', 'linkbtn');
  closeBtn.setAttribute('geometry', 'primitive: plane; width: 0.12; height: 0.12');
  closeBtn.setAttribute('material', 'color: #000; opacity: 0.001; transparent: true');
  closeBtn.setAttribute('position', `${panelW/2 - 0.08} ${panelH/2 - 0.08} 0.03`);
  const closeGlyph = document.createElement('a-entity');
  closeGlyph.setAttribute('text', 'value: ✕; align: center; color: #fff; width: 1.2');
  closeGlyph.setAttribute('position', '0 0 0.01');
  closeBtn.appendChild(closeGlyph);
  closeBtn.addEventListener('click', () => restoreOrb(orbEl));
  orbEl.appendChild(closeBtn);

  /* Auto-close + look-away close */
  orbEl.__autoCloseTimer = setTimeout(() => restoreOrb(orbEl), 8000);
  const cancelLookAway = () => { clearTimeout(orbEl.__lookAwayTimer); };
  const startLookAway  = () => {
    clearTimeout(orbEl.__lookAwayTimer);
    orbEl.__lookAwayTimer = setTimeout(() => restoreOrb(orbEl), 1200);
  };
  orbEl.addEventListener('mouseenter', cancelLookAway);
  orbEl.addEventListener('mouseleave', startLookAway);
}