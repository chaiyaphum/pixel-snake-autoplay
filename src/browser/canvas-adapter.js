const SIZE = 21;
const CELL_SIZE = 20;

export const DEFAULT_SELECTORS = Object.freeze({
  canvas: '#arcadeCv',
  score: '#arcadeScore',
  replay: '#arcadeAgain',
  dialog: '#arcadeDlg',
});

/** Read the game's public canvas and controls without accessing private game state. */
export function createCanvasAdapter({ window, document, selectors = {} }) {
  const selected = { ...DEFAULT_SELECTORS, ...selectors };
  const elements = {};
  for (const [name, selector] of Object.entries(selected)) {
    elements[name] = document.querySelector(selector);
    if (!elements[name]) throw new Error(`Missing game element: ${name} (${selector})`);
  }
  const { canvas, score, replay, dialog } = elements;
  if (canvas.width !== 420 || canvas.height !== 420) {
    throw new Error('Expected a 420 x 420 canvas containing a 21 x 21 board');
  }
  const context = canvas.getContext('2d');
  if (!context) throw new Error('A readable 2D canvas context is required');

  function isVisible() {
    return dialog.classList.contains('show');
  }

  function isPlaying() {
    return replay.style.display === 'none';
  }

  function readScore() {
    const value = Number(score.textContent);
    if (!Number.isInteger(value) || value < 0 || value % 10 !== 0) {
      throw new Error('The score label is not a non-negative multiple of 10');
    }
    return value;
  }

  function read() {
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let head = null;
    let food = null;
    const occupied = new Set();
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const offset = ((y * CELL_SIZE + 10) * canvas.width + x * CELL_SIZE + 10) * 4;
        const [r, g, b] = pixels.subarray(offset, offset + 3);
        const cell = y * SIZE + x;
        if (r === 187 && g === 247 && b === 208) {
          if (head !== null) throw new Error('Multiple snake heads detected');
          head = cell;
          occupied.add(cell);
        } else if (r === 74 && g === 222 && b === 128) {
          occupied.add(cell);
        } else if (r === 248 && g === 113 && b === 113) {
          if (food !== null) throw new Error('Multiple food cells detected');
          food = cell;
        }
      }
    }
    if (head === null || food === null) throw new Error('Unable to read snake head and food');
    return { head, food, occupied, score: readScore() };
  }

  function sendDirection(code) {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
      throw new Error('Unsupported movement key');
    }
    for (const type of ['keydown', 'keyup']) {
      window.dispatchEvent(
        new window.KeyboardEvent(type, { key: code, code, bubbles: true, cancelable: true }),
      );
    }
  }

  return {
    read,
    readScore,
    isPlaying,
    isVisible,
    sendDirection,
    replay() {
      if (!isVisible()) throw new Error('Open the game dialog before starting');
      replay.click();
    },
  };
}
