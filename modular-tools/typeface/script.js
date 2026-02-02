// ========================================
// CONFIGURACIÓN Y FORMAS DISPONIBLES
// ========================================

const STROKE_WIDTH = 12; // Grosor del trazo en porcentaje del tamaño de celda

const SHAPES = {
  empty: {
    name: 'Vacío',
    rotations: 1,
    draw: () => {}
  },
  
  line: {
    name: 'Línea',
    rotations: 4,
    draw: (ctx, x, y, s, rotation) => {
      const w = s * (STROKE_WIDTH / 100);
      ctx.save();
      ctx.translate(x + s/2, y + s/2);
      ctx.rotate((rotation * Math.PI) / 2);
      ctx.translate(-s/2, -s/2);
      
      // Línea alineada al borde superior (relleno para mejor control)
      ctx.fillRect(0, 0, s, w);
      
      ctx.restore();
    }
  },
  
  quarter: {
    name: '1/4 Círculo',
    rotations: 4,
    draw: (ctx, x, y, s, rotation) => {
      const w = s * (STROKE_WIDTH / 100);
      ctx.save();
      ctx.translate(x + s/2, y + s/2);
      ctx.rotate((rotation * Math.PI) / 2);
      ctx.translate(-s/2, -s/2);
      
      // Cuarto de círculo con trazo alineado al interior
      const radius = s - w/2;
      
      ctx.beginPath();
      ctx.arc(s, s, radius, Math.PI, Math.PI * 1.5);
      ctx.lineWidth = w;
      ctx.lineCap = 'butt';
      ctx.stroke();
      
      ctx.restore();
    }
  },
  
  half: {
    name: '1/2 Círculo',
    rotations: 4,
    draw: (ctx, x, y, s, rotation) => {
      const w = s * (STROKE_WIDTH / 100);
      ctx.save();
      ctx.translate(x + s/2, y + s/2);
      ctx.rotate((rotation * Math.PI) / 2);
      ctx.translate(-s/2, -s/2);
      
      // Medio círculo alineado al interior
      const radius = (s/2) - w/2;
      
      ctx.beginPath();
      ctx.arc(s/2, s, radius, Math.PI, 0);
      ctx.lineWidth = w;
      ctx.lineCap = 'butt';
      ctx.stroke();
      
      ctx.restore();
    }
  },
  
  circle: {
    name: 'Círculo',
    rotations: 1,
    draw: (ctx, x, y, s, rotation) => {
      const w = s * (STROKE_WIDTH / 100);
      
      // Círculo completo alineado al interior
      const radius = (s/2) - w/2;
      
      ctx.beginPath();
      ctx.arc(x + s/2, y + s/2, radius, 0, Math.PI * 2);
      ctx.lineWidth = w;
      ctx.stroke();
    }
  },
  
  diagonal: {
    name: 'Diagonal',
    rotations: 4,
    draw: (ctx, x, y, s, rotation) => {
      const w = s * (STROKE_WIDTH / 100);
      ctx.save();
      ctx.translate(x + s/2, y + s/2);
      ctx.rotate((rotation * Math.PI) / 2);
      ctx.translate(-s/2, -s/2);
      
      // Diagonal de esquina a esquina
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(s, s);
      ctx.lineWidth = w;
      ctx.lineCap = 'butt';
      ctx.stroke();
      
      ctx.restore();
    }
  }
};

// ========================================
// ESTADO GLOBAL
// ========================================

const state = {
  currentLetter: 'A',
  letters: {}, // { 'A': { grid: [[{shape, rotation}, ...], ...], cols: 2, rows: 2 } }
  hoveredCell: null,
  selectedCell: null, // {row, col}
  gridCols: 2,
  gridRows: 2,
  // Proporciones tipográficas (en unidades de grilla)
  xHeight: 2,      // Altura de minúsculas
  ascender: 1,     // Espacio sobre x-height
  descender: 1,    // Espacio bajo baseline
  showGuides: false, // Mostrar líneas guía
};

// Clasificación de letras por tipo
const LETTER_TYPES = {
  ascender: ['b', 'd', 'f', 'h', 'k', 'l'],
  descender: ['g', 'j', 'p', 'q', 'y'],
  xheight: ['a', 'c', 'e', 'i', 'm', 'n', 'o', 'r', 's', 't', 'u', 'v', 'w', 'x', 'z'],
  cap: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')
};

function getLetterType(letter) {
  if (LETTER_TYPES.ascender.includes(letter)) return 'ascender';
  if (LETTER_TYPES.descender.includes(letter)) return 'descender';
  if (LETTER_TYPES.xheight.includes(letter)) return 'xheight';
  if (LETTER_TYPES.cap.includes(letter)) return 'cap';
  return 'xheight'; // default
}

function getLetterHeight(letter) {
  const type = getLetterType(letter);
  switch(type) {
    case 'ascender':
      return state.xHeight + state.ascender;
    case 'descender':
      return state.xHeight + state.descender;
    case 'xheight':
      return state.xHeight;
    case 'cap':
      return state.xHeight + state.ascender;
    default:
      return state.xHeight;
  }
}

// Alfabeto completo
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');

// Inicializar letras vacías con altura automática
function initLetter(letter, cols = 2) {
  const rows = getLetterHeight(letter);
  const grid = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push({ shape: 'empty', rotation: 0 });
    }
    grid.push(row);
  }
  return { grid, cols, rows };
}

ALPHABET.forEach(letter => {
  state.letters[letter] = initLetter(letter);
});

// ========================================
// ELEMENTOS DEL DOM
// ========================================

const editorCanvas = document.getElementById('editorCanvas');
const editorCtx = editorCanvas.getContext('2d');
const previewCanvas = document.getElementById('previewCanvas');
const previewCtx = previewCanvas.getContext('2d');
const letterSelect = document.getElementById('letterSelect');
const currentLetterLabel = document.getElementById('currentLetterLabel');
const gridInfo = document.getElementById('gridInfo');
const previewText = document.getElementById('previewText');
const alphabetGrid = document.getElementById('alphabetGrid');
const contextMenu = document.getElementById('contextMenu');
const contextMenuContent = contextMenu.querySelector('.context-menu-content');

const btnDecCols = document.getElementById('btnDecCols');
const btnIncCols = document.getElementById('btnIncCols');
const btnDecRows = document.getElementById('btnDecRows');
const btnIncRows = document.getElementById('btnIncRows');
const colsValue = document.getElementById('colsValue');
const rowsValue = document.getElementById('rowsValue');

const cellControls = document.getElementById('cellControls');
const noCellSelected = document.getElementById('noCellSelected');
const shapeSelect = document.getElementById('shapeSelect');
const btnRotate = document.getElementById('btnRotate');

const alphabetPanel = document.getElementById('alphabetPanel');
const alphabetToggle = document.getElementById('alphabetToggle');

const btnDecXHeight = document.getElementById('btnDecXHeight');
const btnIncXHeight = document.getElementById('btnIncXHeight');
const btnDecAscender = document.getElementById('btnDecAscender');
const btnIncAscender = document.getElementById('btnIncAscender');
const btnDecDescender = document.getElementById('btnDecDescender');
const btnIncDescender = document.getElementById('btnIncDescender');
const xHeightValue = document.getElementById('xHeightValue');
const ascenderValue = document.getElementById('ascenderValue');
const descenderValue = document.getElementById('descenderValue');
const toggleGuides = document.getElementById('toggleGuides');

// ========================================
// INICIALIZACIÓN
// ========================================

function init() {
  setupCanvas();
  populateLetterSelect();
  populateShapeSelect();
  updateGridInfo();
  renderAlphabetGrid();
  renderEditor();
  renderPreview();
  setupEventListeners();
}

function setupCanvas() {
  const dpr = window.devicePixelRatio || 1;
  
  // Editor canvas
  editorCanvas.width = 480 * dpr;
  editorCanvas.height = 480 * dpr;
  editorCtx.scale(dpr, dpr);
  
  // Preview canvas
  previewCanvas.width = 800 * dpr;
  previewCanvas.height = 120 * dpr;
  previewCtx.scale(dpr, dpr);
}

function populateLetterSelect() {
  letterSelect.innerHTML = '';
  ALPHABET.forEach(letter => {
    const option = document.createElement('option');
    option.value = letter;
    option.textContent = letter;
    letterSelect.appendChild(option);
  });
  letterSelect.value = state.currentLetter;
}

function populateShapeSelect() {
  shapeSelect.innerHTML = '';
  Object.entries(SHAPES).forEach(([shapeId, shape]) => {
    const option = document.createElement('option');
    option.value = shapeId;
    option.textContent = shape.name;
    shapeSelect.appendChild(option);
  });
}

function updateGridInfo() {
  const letter = state.letters[state.currentLetter];
  colsValue.textContent = letter.cols;
  rowsValue.textContent = letter.rows;
  gridInfo.textContent = `Grilla ${letter.cols}×${letter.rows}`;
  
  // Actualizar valores de proporciones
  xHeightValue.textContent = state.xHeight;
  ascenderValue.textContent = state.ascender;
  descenderValue.textContent = state.descender;
}

function adjustLetterHeight(letter) {
  const letterData = state.letters[letter];
  const newHeight = getLetterHeight(letter);
  
  if (letterData.rows !== newHeight) {
    resizeGrid(letterData.cols, newHeight, letter);
  }
}

function adjustAllLetterHeights() {
  ALPHABET.forEach(letter => {
    adjustLetterHeight(letter);
  });
}

// ========================================
// RENDERIZADO
// ========================================

function renderEditor() {
  const canvas = editorCanvas;
  const ctx = editorCtx;
  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);
  
  // Limpiar
  ctx.clearRect(0, 0, w, h);
  
  const letter = state.letters[state.currentLetter];
  const gridCols = letter.cols;
  const gridRows = letter.rows;
  
  // Calcular tamaño de celda - usar todo el espacio disponible
  const cellSizeW = w / gridCols;
  const cellSizeH = h / gridRows;
  const cellSize = Math.min(cellSizeW, cellSizeH);
  
  // Centrar la grilla
  const gridWidth = cellSize * gridCols;
  const gridHeight = cellSize * gridRows;
  const offsetX = (w - gridWidth) / 2;
  const offsetY = (h - gridHeight) / 2;
  
  // Dibujar grilla de fondo
  ctx.strokeStyle = '#d0d0d0';
  ctx.lineWidth = 1;
  for (let i = 0; i <= gridCols; i++) {
    ctx.beginPath();
    ctx.moveTo(offsetX + i * cellSize, offsetY);
    ctx.lineTo(offsetX + i * cellSize, offsetY + gridHeight);
    ctx.stroke();
  }
  for (let i = 0; i <= gridRows; i++) {
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY + i * cellSize);
    ctx.lineTo(offsetX + gridWidth, offsetY + i * cellSize);
    ctx.stroke();
  }
  
  // Configurar estilo de trazo para formas
  ctx.strokeStyle = '#000000';
  ctx.fillStyle = '#000000';
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  
  // Dibujar líneas guía si están activadas
  if (state.showGuides) {
    const type = getLetterType(state.currentLetter);
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    
    // Baseline
    let baselineY = offsetY;
    if (type === 'descender') {
      baselineY = offsetY + state.descender * cellSize;
    }
    
    ctx.beginPath();
    ctx.moveTo(offsetX, baselineY);
    ctx.lineTo(offsetX + gridWidth, baselineY);
    ctx.stroke();
    
    // X-height line
    const xHeightY = baselineY - state.xHeight * cellSize;
    ctx.beginPath();
    ctx.moveTo(offsetX, xHeightY);
    ctx.lineTo(offsetX + gridWidth, xHeightY);
    ctx.stroke();
    
    // Cap height / Ascender line (si aplica)
    if (type === 'ascender' || type === 'cap') {
      const capY = baselineY - (state.xHeight + state.ascender) * cellSize;
      ctx.beginPath();
      ctx.moveTo(offsetX, capY);
      ctx.lineTo(offsetX + gridWidth, capY);
      ctx.stroke();
    }
    
    // Descender line (si aplica)
    if (type === 'descender') {
      const descY = baselineY + state.descender * cellSize;
      ctx.beginPath();
      ctx.moveTo(offsetX, descY);
      ctx.lineTo(offsetX + gridWidth, descY);
      ctx.stroke();
    }
    
    ctx.setLineDash([]);
    ctx.strokeStyle = '#000000';
  }
  
  // Dibujar formas
  letter.grid.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const shape = SHAPES[cell.shape];
      if (shape && cell.shape !== 'empty') {
        const x = offsetX + colIndex * cellSize;
        const y = offsetY + rowIndex * cellSize;
        shape.draw(ctx, x, y, cellSize, cell.rotation);
      }
    });
  });
  
  // Highlight celda seleccionada
  if (state.selectedCell) {
    const { row, col } = state.selectedCell;
    const x = offsetX + col * cellSize;
    const y = offsetY + row * cellSize;
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
  }
  
  // Dibujar sugerencia si hay hover
  if (state.hoveredCell && !state.selectedCell) {
    const { row, col } = state.hoveredCell;
    const x = offsetX + col * cellSize;
    const y = offsetY + row * cellSize;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(x + 4, y + 4, cellSize - 8, cellSize - 8);
  }
  
  // Actualizar label
  currentLetterLabel.textContent = state.currentLetter;
}

function renderPreview() {
  const canvas = previewCanvas;
  const ctx = previewCtx;
  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);
  
  ctx.clearRect(0, 0, w, h);
  
  const text = previewText.value.toUpperCase();
  const letterHeight = 60;
  const spacing = 8;
  
  // Calcular ancho total
  let totalWidth = 0;
  text.split('').forEach(char => {
    if (state.letters[char]) {
      const letter = state.letters[char];
      const letterWidth = (letterHeight / letter.rows) * letter.cols;
      totalWidth += letterWidth + spacing;
    }
  });
  totalWidth -= spacing; // Quitar último espacio
  
  const offsetX = (w - totalWidth) / 2;
  const offsetY = (h - letterHeight) / 2;
  
  ctx.strokeStyle = '#000000';
  ctx.fillStyle = '#000000';
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  
  let currentX = offsetX;
  
  text.split('').forEach((char) => {
    if (!state.letters[char]) return;
    
    const letter = state.letters[char];
    const cellSize = letterHeight / letter.rows;
    const letterWidth = cellSize * letter.cols;
    
    letter.grid.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const shape = SHAPES[cell.shape];
        if (shape && cell.shape !== 'empty') {
          const x = currentX + colIndex * cellSize;
          const y = offsetY + rowIndex * cellSize;
          shape.draw(ctx, x, y, cellSize, cell.rotation);
        }
      });
    });
    
    currentX += letterWidth + spacing;
  });
}

function renderAlphabetGrid() {
  alphabetGrid.innerHTML = '';
  
  ALPHABET.forEach(letter => {
    const card = document.createElement('div');
    card.className = 'letter-card';
    if (letter === state.currentLetter) {
      card.classList.add('active');
    }
    
    const header = document.createElement('div');
    header.className = 'letter-card-header';
    
    const name = document.createElement('span');
    name.className = 'letter-name';
    name.textContent = letter;
    
    const status = document.createElement('span');
    status.className = 'letter-status';
    const letterData = state.letters[letter];
    const hasContent = letterData.grid.some(row => 
      row.some(cell => cell.shape !== 'empty')
    );
    status.textContent = hasContent ? '●' : '○';
    
    header.appendChild(name);
    header.appendChild(status);
    
    const canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = 80;
    renderLetterThumbnail(canvas, letter);
    
    card.appendChild(header);
    card.appendChild(canvas);
    
    card.addEventListener('click', () => {
      state.currentLetter = letter;
      state.selectedCell = null;
      letterSelect.value = letter;
      updateGridInfo();
      updateCellControls();
      renderEditor();
      renderAlphabetGrid();
    });
    
    alphabetGrid.appendChild(card);
  });
}

function renderLetterThumbnail(canvas, letter) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  
  ctx.clearRect(0, 0, w, h);
  
  const letterData = state.letters[letter];
  const cellSizeW = w / letterData.cols;
  const cellSizeH = h / letterData.rows;
  const cellSize = Math.min(cellSizeW, cellSizeH);
  
  const offsetX = (w - cellSize * letterData.cols) / 2;
  const offsetY = (h - cellSize * letterData.rows) / 2;
  
  ctx.strokeStyle = '#000000';
  ctx.fillStyle = '#000000';
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  
  letterData.grid.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const shape = SHAPES[cell.shape];
      if (shape && cell.shape !== 'empty') {
        const x = offsetX + colIndex * cellSize;
        const y = offsetY + rowIndex * cellSize;
        shape.draw(ctx, x, y, cellSize, cell.rotation);
      }
    });
  });
}

// ========================================
// MENÚ CONTEXTUAL
// ========================================

function showContextMenu(x, y, row, col) {
  contextMenuContent.innerHTML = '';
  
  // Agregar opción vacío
  const emptyItem = createContextMenuItem('empty', 0);
  emptyItem.addEventListener('click', () => {
    const letter = state.letters[state.currentLetter];
    letter.grid[row][col] = { shape: 'empty', rotation: 0 };
    hideContextMenu();
    renderEditor();
    renderPreview();
    renderAlphabetGrid();
  });
  contextMenuContent.appendChild(emptyItem);
  
  // Agregar cada forma con sus rotaciones
  Object.entries(SHAPES).forEach(([shapeId, shape]) => {
    if (shapeId === 'empty') return;
    
    for (let rotation = 0; rotation < shape.rotations; rotation++) {
      const item = createContextMenuItem(shapeId, rotation);
      item.addEventListener('click', () => {
        const letter = state.letters[state.currentLetter];
        letter.grid[row][col] = { shape: shapeId, rotation };
        hideContextMenu();
        state.selectedCell = { row, col };
        updateCellControls();
        renderEditor();
        renderPreview();
        renderAlphabetGrid();
      });
      contextMenuContent.appendChild(item);
    }
  });
  
  contextMenu.style.display = 'block';
  contextMenu.style.left = x + 'px';
  contextMenu.style.top = y + 'px';
  
  // Ajustar si se sale de la pantalla
  const rect = contextMenu.getBoundingClientRect();
  if (rect.right > window.innerWidth) {
    contextMenu.style.left = (x - rect.width) + 'px';
  }
  if (rect.bottom > window.innerHeight) {
    contextMenu.style.top = (y - rect.height) + 'px';
  }
}

function createContextMenuItem(shapeId, rotation) {
  const item = document.createElement('div');
  item.className = 'context-menu-item';
  
  const canvas = document.createElement('canvas');
  canvas.width = 50;
  canvas.height = 50;
  const ctx = canvas.getContext('2d');
  
  ctx.strokeStyle = '#000000';
  ctx.fillStyle = '#000000';
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  
  const shape = SHAPES[shapeId];
  if (shape) {
    shape.draw(ctx, 5, 5, 40, rotation);
  }
  
  item.appendChild(canvas);
  return item;
}

function hideContextMenu() {
  contextMenu.style.display = 'none';
}

// ========================================
// CONTROLES DE CELDA
// ========================================

function updateCellControls() {
  if (state.selectedCell) {
    const { row, col } = state.selectedCell;
    const letter = state.letters[state.currentLetter];
    const cell = letter.grid[row][col];
    
    cellControls.style.display = 'flex';
    noCellSelected.style.display = 'none';
    
    shapeSelect.value = cell.shape;
  } else {
    cellControls.style.display = 'none';
    noCellSelected.style.display = 'block';
  }
}

// ========================================
// GRILLA DINÁMICA
// ========================================

function resizeGrid(newCols, newRows, targetLetter = null) {
  const letter = targetLetter || state.currentLetter;
  const letterData = state.letters[letter];
  const oldGrid = letterData.grid;
  const newGrid = [];
  
  for (let r = 0; r < newRows; r++) {
    const row = [];
    for (let c = 0; c < newCols; c++) {
      if (r < oldGrid.length && c < oldGrid[r].length) {
        row.push(oldGrid[r][c]);
      } else {
        row.push({ shape: 'empty', rotation: 0 });
      }
    }
    newGrid.push(row);
  }
  
  letterData.grid = newGrid;
  letterData.cols = newCols;
  letterData.rows = newRows;
  
  // Deseleccionar si está fuera de rango y es la letra actual
  if (letter === state.currentLetter && state.selectedCell) {
    const { row, col } = state.selectedCell;
    if (row >= newRows || col >= newCols) {
      state.selectedCell = null;
    }
  }
}

// ========================================
// EVENT LISTENERS
// ========================================

function setupEventListeners() {
  // Selector de letra
  letterSelect.addEventListener('change', (e) => {
    state.currentLetter = e.target.value;
    state.selectedCell = null;
    updateGridInfo();
    updateCellControls();
    renderEditor();
    renderAlphabetGrid();
  });
  
  // Preview text
  previewText.addEventListener('input', renderPreview);
  
  // Editor canvas - clic derecho para menú contextual
  editorCanvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const cell = getCellFromEvent(e);
    if (cell) {
      showContextMenu(e.pageX, e.pageY, cell.row, cell.col);
    }
  });
  
  // Editor canvas - click para seleccionar celda
  editorCanvas.addEventListener('click', (e) => {
    const cell = getCellFromEvent(e);
    if (cell) {
      state.selectedCell = cell;
      updateCellControls();
      renderEditor();
    } else {
      state.selectedCell = null;
      updateCellControls();
      renderEditor();
    }
  });
  
  // Editor canvas - hover
  editorCanvas.addEventListener('mousemove', (e) => {
    const cell = getCellFromEvent(e);
    if (cell) {
      state.hoveredCell = cell;
      renderEditor();
    } else {
      if (state.hoveredCell) {
        state.hoveredCell = null;
        renderEditor();
      }
    }
  });
  
  editorCanvas.addEventListener('mouseleave', () => {
    state.hoveredCell = null;
    renderEditor();
  });
  
  // Cerrar menú contextual al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target) && e.target !== editorCanvas) {
      hideContextMenu();
    }
  });
  
  // Controles de grilla
  btnIncCols.addEventListener('click', () => {
    const letter = state.letters[state.currentLetter];
    if (letter.cols < 6) {
      resizeGrid(letter.cols + 1, letter.rows);
      updateGridInfo();
      renderEditor();
      renderPreview();
      renderAlphabetGrid();
    }
  });
  
  btnDecCols.addEventListener('click', () => {
    const letter = state.letters[state.currentLetter];
    if (letter.cols > 1) {
      resizeGrid(letter.cols - 1, letter.rows);
      updateGridInfo();
      updateCellControls();
      renderEditor();
      renderPreview();
      renderAlphabetGrid();
    }
  });
  
  btnIncRows.addEventListener('click', () => {
    const letter = state.letters[state.currentLetter];
    if (letter.rows < 6) {
      resizeGrid(letter.cols, letter.rows + 1);
      updateGridInfo();
      renderEditor();
      renderPreview();
      renderAlphabetGrid();
    }
  });
  
  btnDecRows.addEventListener('click', () => {
    const letter = state.letters[state.currentLetter];
    if (letter.rows > 1) {
      resizeGrid(letter.cols, letter.rows - 1);
      updateGridInfo();
      updateCellControls();
      renderEditor();
      renderPreview();
      renderAlphabetGrid();
    }
  });
  
  // Controles de celda
  shapeSelect.addEventListener('change', (e) => {
    if (state.selectedCell) {
      const { row, col } = state.selectedCell;
      const letter = state.letters[state.currentLetter];
      letter.grid[row][col].shape = e.target.value;
      letter.grid[row][col].rotation = 0;
      renderEditor();
      renderPreview();
      renderAlphabetGrid();
    }
  });
  
  btnRotate.addEventListener('click', () => {
    if (state.selectedCell) {
      const { row, col } = state.selectedCell;
      const letter = state.letters[state.currentLetter];
      const cell = letter.grid[row][col];
      const shape = SHAPES[cell.shape];
      
      if (shape && shape.rotations > 1) {
        cell.rotation = (cell.rotation + 1) % shape.rotations;
        renderEditor();
        renderPreview();
        renderAlphabetGrid();
      }
    }
  });
  
  // Botones
  document.getElementById('btnClearLetter').addEventListener('click', () => {
    const letter = state.letters[state.currentLetter];
    letter.grid = letter.grid.map(row => 
      row.map(() => ({ shape: 'empty', rotation: 0 }))
    );
    state.selectedCell = null;
    updateCellControls();
    renderEditor();
    renderPreview();
    renderAlphabetGrid();
  });
  
  document.getElementById('btnReset').addEventListener('click', () => {
    if (confirm('¿Resetear todas las letras?')) {
      state.xHeight = 2;
      state.ascender = 1;
      state.descender = 1;
      ALPHABET.forEach(letter => {
        state.letters[letter] = initLetter(letter);
      });
      state.selectedCell = null;
      updateGridInfo();
      updateCellControls();
      renderEditor();
      renderPreview();
      renderAlphabetGrid();
    }
  });
  
  document.getElementById('btnExport').addEventListener('click', exportJSON);
  document.getElementById('fileImport').addEventListener('change', importJSON);
  
  // Toggle abecedario
  alphabetToggle.addEventListener('click', () => {
    alphabetPanel.classList.toggle('collapsed');
  });
  
  // Controles de proporciones tipográficas
  btnIncXHeight.addEventListener('click', () => {
    if (state.xHeight < 6) {
      state.xHeight++;
      adjustAllLetterHeights();
      updateGridInfo();
      renderEditor();
      renderPreview();
      renderAlphabetGrid();
    }
  });
  
  btnDecXHeight.addEventListener('click', () => {
    if (state.xHeight > 1) {
      state.xHeight--;
      adjustAllLetterHeights();
      updateGridInfo();
      renderEditor();
      renderPreview();
      renderAlphabetGrid();
    }
  });
  
  btnIncAscender.addEventListener('click', () => {
    if (state.ascender < 4) {
      state.ascender++;
      adjustAllLetterHeights();
      updateGridInfo();
      renderEditor();
      renderPreview();
      renderAlphabetGrid();
    }
  });
  
  btnDecAscender.addEventListener('click', () => {
    if (state.ascender > 0) {
      state.ascender--;
      adjustAllLetterHeights();
      updateGridInfo();
      renderEditor();
      renderPreview();
      renderAlphabetGrid();
    }
  });
  
  btnIncDescender.addEventListener('click', () => {
    if (state.descender < 4) {
      state.descender++;
      adjustAllLetterHeights();
      updateGridInfo();
      renderEditor();
      renderPreview();
      renderAlphabetGrid();
    }
  });
  
  btnDecDescender.addEventListener('click', () => {
    if (state.descender > 0) {
      state.descender--;
      adjustAllLetterHeights();
      updateGridInfo();
      renderEditor();
      renderPreview();
      renderAlphabetGrid();
    }
  });
  
  // Toggle guías
  toggleGuides.addEventListener('change', (e) => {
    state.showGuides = e.target.checked;
    renderEditor();
  });
}

function getCellFromEvent(e) {
  const rect = editorCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const w = rect.width;
  const h = rect.height;
  
  const letter = state.letters[state.currentLetter];
  const gridCols = letter.cols;
  const gridRows = letter.rows;
  
  const cellSizeW = w / gridCols;
  const cellSizeH = h / gridRows;
  const cellSize = Math.min(cellSizeW, cellSizeH);
  
  const gridWidth = cellSize * gridCols;
  const gridHeight = cellSize * gridRows;
  const offsetX = (w - gridWidth) / 2;
  const offsetY = (h - gridHeight) / 2;
  
  const col = Math.floor((x - offsetX) / cellSize);
  const row = Math.floor((y - offsetY) / cellSize);
  
  if (row >= 0 && row < gridRows && col >= 0 && col < gridCols) {
    return { row, col };
  }
  
  return null;
}

// ========================================
// IMPORTAR/EXPORTAR
// ========================================

function exportJSON() {
  const data = JSON.stringify(state.letters, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tipografia-modular.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      state.letters = imported;
      renderEditor();
      renderPreview();
      renderAlphabetGrid();
    } catch (err) {
      alert('Error al importar: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// ========================================
// INICIO
// ========================================

init();