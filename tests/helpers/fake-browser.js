// An independent, in-memory implementation of the observable game contract.
// It has no network, storage, real browser, or dependency on the production planner.
export function createFakeBrowser({ seed = 7 } = {}) {
  let now = 0;
  let nextHandle = 1;
  let gameHandle;
  let randomState = seed;
  const timers = new Map();
  const inputs = [];
  const submittedScores = [];
  const frame = new Uint8ClampedArray(420 * 420 * 4);
  const game = {
    body: [220, 219, 218],
    food: 225,
    score: 0,
    direction: 1,
    next: 1,
    over: true,
    steps: 0,
  };
  const window = {
    performance: { now: () => now },
    KeyboardEvent: class {
      constructor(type, options) {
        this.type = type;
        Object.assign(this, options);
      }
    },
    setInterval(callback, delay, ...args) {
      const handle = nextHandle++;
      timers.set(handle, { callback, delay, due: now + delay, args });
      return handle;
    },
    clearInterval(handle) {
      timers.delete(handle);
    },
    dispatchEvent(event) {
      inputs.push(event);
      if (event.type !== 'keydown') return true;
      const move = { ArrowUp: -21, ArrowDown: 21, ArrowLeft: -1, ArrowRight: 1 }[event.code];
      if (move !== -game.direction) game.next = move;
      return true;
    },
  };
  function random() {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return randomState / 2 ** 32;
  }
  const score = { textContent: '0' };
  const dialog = { visible: true, classList: { contains: () => dialog.visible } };
  const replay = {
    style: { display: '' },
    clicks: 0,
    click() {
      this.clicks++;
      window.clearInterval(gameHandle);
      Object.assign(game, {
        body: [220, 219, 218],
        food: 225,
        score: 0,
        direction: 1,
        next: 1,
        over: false,
        steps: 0,
      });
      score.textContent = '0';
      replay.style.display = 'none';
      gameHandle = window.setInterval(step, 110);
    },
  };
  function step() {
    if (game.over) return;
    game.direction = game.next;
    const head = game.body[0];
    const next = head + game.direction;
    const wrapped =
      Math.abs(game.direction) === 1 && Math.floor(head / 21) !== Math.floor(next / 21);
    if (next < 0 || next > 440 || wrapped || game.body.includes(next)) {
      game.over = true;
      replay.style.display = '';
      window.clearInterval(gameHandle);
      if (game.score > 0) submittedScores.push(game.score);
      return;
    }
    game.body.unshift(next);
    game.steps++;
    if (next === game.food) {
      game.score += 10;
      score.textContent = String(game.score);
      if (game.body.length === 441) throw new Error('The fixture refuses full-board food spawning');
      do {
        game.food = Math.floor(random() * 441);
      } while (game.body.includes(game.food));
    } else game.body.pop();
  }
  function paint(cell, color) {
    const offset = ((Math.floor(cell / 21) * 20 + 10) * 420 + (cell % 21) * 20 + 10) * 4;
    frame.set([...color, 255], offset);
  }
  const context = {
    getImageData() {
      frame.fill(0);
      paint(game.food, [248, 113, 113]);
      game.body.forEach((cell, index) => paint(cell, index ? [74, 222, 128] : [187, 247, 208]));
      return { data: frame };
    },
  };
  const canvas = { width: 420, height: 420, getContext: () => context };
  const elements = {
    '#arcadeCv': canvas,
    '#arcadeScore': score,
    '#arcadeAgain': replay,
    '#arcadeDlg': dialog,
  };
  const document = { querySelector: (selector) => elements[selector] ?? null };
  window.document = document;
  function advance(count = 1) {
    for (let index = 0; index < count && timers.size; index++) {
      const [id, timer] = [...timers.entries()].sort((a, b) => a[1].due - b[1].due)[0];
      now = timer.due;
      timer.due += timer.delay;
      if (timers.has(id)) timer.callback(...timer.args);
    }
  }
  return {
    window,
    document,
    game,
    elements,
    canvas,
    context,
    dialog,
    replay,
    score,
    timers,
    inputs,
    submittedScores,
    advance,
    now: () => now,
  };
}
