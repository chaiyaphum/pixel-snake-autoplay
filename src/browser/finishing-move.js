const directions = [
  { dx: 0, dy: -1, code: 'ArrowUp' },
  { dx: 0, dy: 1, code: 'ArrowDown' },
  { dx: -1, dy: 0, code: 'ArrowLeft' },
  { dx: 1, dy: 0, code: 'ArrowRight' },
];

export function directionBetween(from, to) {
  const dx = (to % 21) - (from % 21);
  const dy = Math.floor(to / 21) - Math.floor(from / 21);
  const direction = directions.find((item) => item.dx === dx && item.dy === dy);
  if (!direction) throw new Error('Movement must be between neighboring cells');
  return direction.code;
}

function neighbors(cell) {
  return directions.map((direction) => {
    const x = (cell % 21) + direction.dx;
    const y = Math.floor(cell / 21) + direction.dy;
    return { ...direction, id: y * 21 + x, inside: x >= 0 && x < 21 && y >= 0 && y < 21 };
  });
}

/** Find an ordinary collision route without eating additional food. Replan each tick. */
export function chooseFinishingDirection(body, food) {
  const occupied = new Set(body);
  for (const move of neighbors(body[0])) {
    if (move.inside && (move.id === body[1] || move.id === food)) continue;
    if (!move.inside || occupied.has(move.id)) return move.code;
  }
  const queue = [{ cell: body[0], previous: body[1], first: null }];
  const visited = new Set([body[0]]);
  let bodyRoute;
  for (let index = 0; index < queue.length; index++) {
    const { cell, previous, first } = queue[index];
    for (const move of neighbors(cell)) {
      if (move.inside && (move.id === previous || move.id === food)) continue;
      if (!move.inside) return first ?? move.code;
      if (occupied.has(move.id)) {
        bodyRoute ??= first ?? move.code;
        continue;
      }
      if (!visited.has(move.id)) {
        visited.add(move.id);
        queue.push({ cell: move.id, previous: cell, first: first ?? move.code });
      }
    }
  }
  if (bodyRoute) return bodyRoute;
  throw new Error('No route to end the round without eating additional food');
}
