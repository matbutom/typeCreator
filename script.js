/* Modular Type MVP — sin librerías, GitHub Pages friendly */

(() => {
  const STORAGE_KEY = "modular_type_mvp_v1";

  const editorCanvas = document.getElementById("editorCanvas");
  const ectx = editorCanvas.getContext("2d");

  const previewCanvas = document.getElementById("previewCanvas");
  const pctx = previewCanvas.getContext("2d");

  const letterSelect = document.getElementById("letterSelect");
  const gridSizeSelect = document.getElementById("gridSize");
  const toggleGridLines = document.getElementById("toggleGridLines");

  const shapeSelect = document.getElementById("shape");
  const colorInput = document.getElementById("color");

  const modePaintBtn = document.getElementById("modePaint");
  const modeEraseBtn = document.getElementById("modeErase");

  const alphabetGrid = document.getElementById("alphabetGrid");

  const btnClearLetter = document.getElementById("btnClearLetter");
  const btnExport = document.getElementById("btnExport");
  const fileImport = document.getElementById("fileImport");
  const btnReset = document.getElementById("btnReset");

  const previewText = document.getElementById("previewText");

  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  // Estado
  let state = loadState() || createEmptyState(12);
  let currentLetter = state.currentLetter || "A";

  let mouseDown = false;
  let mode = "paint"; // "paint" | "erase"

  function createEmptyState(gridSize) {
    const glyphs = {};
    for (const L of LETTERS) glyphs[L] = emptyGlyph(gridSize);
    return { version: 1, gridSize, currentLetter: "A", glyphs };
  }

  function emptyGlyph(gridSize) {
    return {
      gridSize,
      cells: new Array(gridSize * gridSize).fill(null) // null o {shape,color}
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.glyphs) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function saveState() {
    state.currentLetter = currentLetter;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function setMode(nextMode) {
    mode = nextMode;
    modePaintBtn.classList.toggle("on", mode === "paint");
    modeEraseBtn.classList.toggle("on", mode === "erase");
  }

  function setupLetterSelect() {
    letterSelect.innerHTML = "";
    for (const L of LETTERS) {
      const opt = document.createElement("option");
      opt.value = L;
      opt.textContent = L;
      letterSelect.appendChild(opt);
    }
    letterSelect.value = currentLetter;
  }

  function ensureGlyphGridSize(glyph, gridSize) {
    if (!glyph || glyph.gridSize === gridSize) return glyph;
    // Si cambió tamaño global, reseteamos la letra (MVP simple)
    return emptyGlyph(gridSize);
  }

  function getGlyph(letter) {
    const g = state.glyphs[letter];
    state.glyphs[letter] = ensureGlyphGridSize(g, state.gridSize);
    return state.glyphs[letter];
  }

  function countFilled(glyph) {
    let c = 0;
    for (const cell of glyph.cells) if (cell) c++;
    return c;
  }

  function fitCanvasToCSS(canvas) {
    // Mantener resolución nativa acorde al tamaño real en CSS para evitar blur
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return { dpr, w, h };
  }

  function drawGrid(ctx, w, h, gridSize, showLines) {
    ctx.clearRect(0, 0, w, h);

    // fondo
    ctx.fillStyle = "rgba(0,0,0,0.10)";
    ctx.fillRect(0, 0, w, h);

    const pad = Math.round(Math.min(w, h) * 0.06);
    const inner = Math.min(w, h) - pad * 2;

    const cell = inner / gridSize;
    const ox = (w - inner) / 2;
    const oy = (h - inner) / 2;

    if (showLines) {
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = Math.max(1, Math.round(cell * 0.03));
      for (let i = 0; i <= gridSize; i++) {
        const x = ox + i * cell;
        const y = oy + i * cell;

        ctx.beginPath();
        ctx.moveTo(x, oy);
        ctx.lineTo(x, oy + inner);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(ox, y);
        ctx.lineTo(ox + inner, y);
        ctx.stroke();
      }

      // marco
      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = Math.max(1, Math.round(cell * 0.05));
      ctx.strokeRect(ox, oy, inner, inner);
    }

    return { pad, inner, cell, ox, oy };
  }

  function drawShape(ctx, x, y, s, shape, color) {
    ctx.fillStyle = color;

    const inset = s * 0.12;
    const ix = x + inset;
    const iy = y + inset;
    const is = s - inset * 2;

    if (shape === "square") {
      ctx.fillRect(ix, iy, is, is);
      return;
    }

    if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(x + s / 2, y + s / 2, is / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (shape === "triangle") {
      ctx.beginPath();
      ctx.moveTo(x + s / 2, iy);
      ctx.lineTo(ix + is, iy + is);
      ctx.lineTo(ix, iy + is);
      ctx.closePath();
      ctx.fill();
      return;
    }

    if (shape === "diamond") {
      ctx.beginPath();
      ctx.moveTo(x + s / 2, iy);
      ctx.lineTo(ix + is, y + s / 2);
      ctx.lineTo(x + s / 2, iy + is);
      ctx.lineTo(ix, y + s / 2);
      ctx.closePath();
      ctx.fill();
      return;
    }

    // fallback
    ctx.fillRect(ix, iy, is, is);
  }

  function drawGlyphOnContext(ctx, w, h, glyph, options = {}) {
    const showLines = !!options.showLines;
    const gridSize = glyph.gridSize;
    const metrics = drawGrid(ctx, w, h, gridSize, showLines);

    const { cell, ox, oy, inner } = metrics;

    // dibujar celdas
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const idx = r * gridSize + c;
        const data = glyph.cells[idx];
        if (!data) continue;

        const x = ox + c * cell;
        const y = oy + r * cell;
        drawShape(ctx, x, y, cell, data.shape, data.color);
      }
    }

    // ligera sombra/overlay
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.fillRect(ox, oy + inner, inner, Math.max(0, (h - (oy + inner))));

    return metrics;
  }

  function renderEditor() {
    const { w, h } = fitCanvasToCSS(editorCanvas);

    const glyph = getGlyph(currentLetter);

    ectx.save();
    // normalize scaling by resetting transform
    ectx.setTransform(1, 0, 0, 1, 0, 0);
    drawGlyphOnContext(ectx, w, h, glyph, { showLines: toggleGridLines.checked });
    ectx.restore();

    renderAlphabetThumbs();
    renderPreview();
  }

  function cellFromPointer(evt) {
    const rect = editorCanvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    const px = (evt.clientX - rect.left) * dpr;
    const py = (evt.clientY - rect.top) * dpr;

    const glyph = getGlyph(currentLetter);
    const gridSize = glyph.gridSize;

    // Recalcular métricas como en drawGrid
    const w = editorCanvas.width;
    const h = editorCanvas.height;
    const pad = Math.round(Math.min(w, h) * 0.06);
    const inner = Math.min(w, h) - pad * 2;
    const cell = inner / gridSize;
    const ox = (w - inner) / 2;
    const oy = (h - inner) / 2;

    if (px < ox || py < oy || px > ox + inner || py > oy + inner) return null;

    const c = Math.floor((px - ox) / cell);
    const r = Math.floor((py - oy) / cell);

    if (r < 0 || c < 0 || r >= gridSize || c >= gridSize) return null;

    return { r, c, idx: r * gridSize + c };
  }

  function applyBrush(cellInfo, eraseOverride = false) {
    const glyph = getGlyph(currentLetter);
    const idx = cellInfo.idx;

    const shouldErase = eraseOverride || mode === "erase";
    if (shouldErase) {
      glyph.cells[idx] = null;
    } else {
      glyph.cells[idx] = {
        shape: shapeSelect.value,
        color: colorInput.value
      };
    }

    saveState();
    renderEditor();
  }

  function setupAlphabetGrid() {
    alphabetGrid.innerHTML = "";

    for (const L of LETTERS) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "letterCard";
      card.dataset.letter = L;

      const top = document.createElement("div");
      top.className = "letterTop";

      const name = document.createElement("div");
      name.className = "letterName";
      name.textContent = L;

      const meta = document.createElement("div");
      meta.className = "letterMeta";
      meta.id = `meta_${L}`;
      meta.textContent = "0";

      top.appendChild(name);
      top.appendChild(meta);

      const thumb = document.createElement("canvas");
      thumb.className = "thumb";
      thumb.width = 160;
      thumb.height = 160;
      thumb.id = `thumb_${L}`;

      card.appendChild(top);
      card.appendChild(thumb);

      card.addEventListener("click", () => {
        currentLetter = L;
        letterSelect.value = L;
        saveState();
        renderEditor();
      });

      alphabetGrid.appendChild(card);
    }
  }

  function renderAlphabetThumbs() {
    for (const L of LETTERS) {
      const card = alphabetGrid.querySelector(`.letterCard[data-letter="${L}"]`);
      if (!card) continue;

      card.classList.toggle("active", L === currentLetter);

      const glyph = getGlyph(L);
      const filled = countFilled(glyph);

      const meta = document.getElementById(`meta_${L}`);
      if (meta) meta.textContent = `${filled}`;

      const canvas = document.getElementById(`thumb_${L}`);
      if (!canvas) continue;

      const ctx = canvas.getContext("2d");
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      drawGlyphOnContext(ctx, canvas.width, canvas.height, glyph, { showLines: false });
    }
  }

  function renderPreview() {
    const text = (previewText.value || "").toUpperCase();
    const { w, h } = { w: previewCanvas.width, h: previewCanvas.height };

    pctx.setTransform(1, 0, 0, 1, 0, 0);
    pctx.clearRect(0, 0, w, h);

    pctx.fillStyle = "rgba(0,0,0,0.10)";
    pctx.fillRect(0, 0, w, h);

    const gridSize = state.gridSize;
    const glyphSize = Math.min(110, h - 20);
    const gap = Math.max(10, Math.round(glyphSize * 0.12));
    const startX = 14;
    const startY = Math.round((h - glyphSize) / 2);

    let x = startX;

    for (const ch of text) {
      if (x + glyphSize > w - 10) break;

      if (LETTERS.includes(ch)) {
        const glyph = getGlyph(ch);

        // Render del glyph en una “caja”
        const tmp = document.createElement("canvas");
        tmp.width = glyphSize;
        tmp.height = glyphSize;
        const tctx = tmp.getContext("2d");
        tctx.setTransform(1, 0, 0, 1, 0, 0);

        drawGlyphOnContext(tctx, tmp.width, tmp.height, glyph, { showLines: false });
        pctx.drawImage(tmp, x, startY);
      } else {
        // espacio u otro
        pctx.fillStyle = "rgba(255,255,255,0.08)";
        pctx.fillRect(x, startY + glyphSize * 0.4, glyphSize * 0.4, glyphSize * 0.08);
      }

      x += glyphSize + gap;
    }

    // texto guía
    pctx.fillStyle = "rgba(255,255,255,0.55)";
    pctx.font = "12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial";
    pctx.fillText("Preview (usa tus módulos):", 14, 16);
  }

  function exportJSON() {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "modular-type.json";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        if (!parsed || !parsed.glyphs) throw new Error("JSON inválido");

        // Normalizar a nuestro formato mínimo
        const gridSize = Number(parsed.gridSize) || state.gridSize || 12;
        const next = createEmptyState(gridSize);

        for (const L of LETTERS) {
          if (parsed.glyphs[L] && Array.isArray(parsed.glyphs[L].cells)) {
            // Clonar con seguridad
            const g = parsed.glyphs[L];
            const gs = Number(g.gridSize) || gridSize;
            const cells = g.cells.slice(0, gs * gs).map(cell => {
              if (!cell) return null;
              return {
                shape: String(cell.shape || "square"),
                color: String(cell.color || "#111111")
              };
            });

            next.glyphs[L] = { gridSize: gs, cells: padCells(cells, gs * gs) };
          }
        }

        next.currentLetter = parsed.currentLetter && LETTERS.includes(parsed.currentLetter)
          ? parsed.currentLetter
          : "A";

        state = next;
        currentLetter = state.currentLetter;

        gridSizeSelect.value = String(state.gridSize);
        letterSelect.value = currentLetter;

        saveState();
        renderEditor();
      } catch (e) {
        alert("No pude importar ese JSON. Revisa el archivo.");
      }
    };
    reader.readAsText(file);
  }

  function padCells(cells, len) {
    const out = cells.slice(0, len);
    while (out.length < len) out.push(null);
    return out;
  }

  function resetAll() {
    state = createEmptyState(Number(gridSizeSelect.value) || 12);
    currentLetter = "A";
    saveState();
    setupLetterSelect();
    setupAlphabetGrid();
    renderEditor();
  }

  // Eventos UI
  function bindEvents() {
    window.addEventListener("resize", () => renderEditor());

    letterSelect.addEventListener("change", () => {
      currentLetter = letterSelect.value;
      saveState();
      renderEditor();
    });

    gridSizeSelect.addEventListener("change", () => {
      const nextSize = Number(gridSizeSelect.value) || 12;

      // MVP: cambiar tamaño resetea todo (más simple y consistente)
      const ok = confirm("Cambiar el tamaño de grilla reiniciará el abecedario. ¿Continuar?");
      if (!ok) {
        gridSizeSelect.value = String(state.gridSize);
        return;
      }

      state = createEmptyState(nextSize);
      currentLetter = "A";
      setupLetterSelect();
      saveState();
      renderEditor();
    });

    toggleGridLines.addEventListener("change", () => renderEditor());

    modePaintBtn.addEventListener("click", () => setMode("paint"));
    modeEraseBtn.addEventListener("click", () => setMode("erase"));

    btnClearLetter.addEventListener("click", () => {
      state.glyphs[currentLetter] = emptyGlyph(state.gridSize);
      saveState();
      renderEditor();
    });

    btnExport.addEventListener("click", exportJSON);

    fileImport.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      importJSON(file);
      fileImport.value = "";
    });

    btnReset.addEventListener("click", () => {
      const ok = confirm("Esto borrará TODO (localStorage). ¿Seguro?");
      if (!ok) return;
      localStorage.removeItem(STORAGE_KEY);
      resetAll();
    });

    previewText.addEventListener("input", () => renderPreview());

    // Pintar en canvas
    editorCanvas.addEventListener("contextmenu", (e) => e.preventDefault());

    editorCanvas.addEventListener("pointerdown", (e) => {
      mouseDown = true;
      editorCanvas.setPointerCapture(e.pointerId);

      const cell = cellFromPointer(e);
      if (!cell) return;

      const eraseOverride = e.shiftKey || (e.button === 2);
      applyBrush(cell, eraseOverride);
    });

    editorCanvas.addEventListener("pointermove", (e) => {
      if (!mouseDown) return;
      const cell = cellFromPointer(e);
      if (!cell) return;

      const eraseOverride = e.shiftKey || (e.buttons === 2);
      applyBrush(cell, eraseOverride);
    });

    editorCanvas.addEventListener("pointerup", (e) => {
      mouseDown = false;
      try { editorCanvas.releasePointerCapture(e.pointerId); } catch {}
    });

    editorCanvas.addEventListener("pointerleave", () => {
      mouseDown = false;
    });

    // atajos
    window.addEventListener("keydown", (e) => {
      if (e.key === "e" || e.key === "E") setMode("erase");
      if (e.key === "b" || e.key === "B") setMode("paint");
      if (e.key === "ArrowRight") stepLetter(1);
      if (e.key === "ArrowLeft") stepLetter(-1);
    });
  }

  function stepLetter(dir) {
    const idx = LETTERS.indexOf(currentLetter);
    if (idx < 0) return;
    const next = (idx + dir + LETTERS.length) % LETTERS.length;
    currentLetter = LETTERS[next];
    letterSelect.value = currentLetter;
    saveState();
    renderEditor();
  }

  // Init
  function init() {
    // Fix: asegurar gridSize consistente
    state.gridSize = Number(state.gridSize) || 12;

    currentLetter = state.currentLetter && LETTERS.includes(state.currentLetter)
      ? state.currentLetter
      : "A";

    gridSizeSelect.value = String(state.gridSize);

    setupLetterSelect();
    setupAlphabetGrid();

    setMode("paint");
    bindEvents();

    renderEditor();
  }

  init();
})();
