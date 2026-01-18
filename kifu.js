function formatMove(sel, x, y, pieceBefore, boardBefore, moveNumber) {
  const files = ["９","８","７","６","５","４","３","２","１"];
  const ranks = ["一","二","三","四","五","六","七","八","九"];

  const toFile = files[x];
  const toRank = ranks[y];

  const isDrop = sel.fromHand;
  const fromX = sel.x;
  const fromY = sel.y;

  const isSameSquare = lastMoveTo && lastMoveTo.x === x && lastMoveTo.y === y;

  const base = pieceBefore.replace("+", "").toUpperCase();

  const pieceNames = {
    "P": "歩", "L": "香", "N": "桂", "S": "銀",
    "G": "金", "B": "角", "R": "飛", "K": "玉"
  };

  const mark = (moveNumber % 2 === 1) ? "▲" : "△";
  let move = `${moveNumber}手目：${mark}`;

  // 同
  if (isSameSquare) {
    move += "同";
  } else {
    move += toFile + toRank;
  }

  move += pieceNames[base];

  // 打
  if (isDrop) {
    move += "打";
    return move;
  }

  // ★ 分岐表記
  const others = findOtherSamePieceMoves(sel, x, y, boardBefore);
  if (others.length > 0) {
    move += getDisambiguation(sel, x, y, others);
  }

  // ★ 成・不成
  const player = pieceBefore === pieceBefore.toLowerCase() ? "white" : "black";
  const wasPromoted = pieceBefore.includes("+");

  if (!wasPromoted && canPromote(base) &&
      (isInPromotionZone(fromY, player) || isInPromotionZone(y, player))) {
    if (sel.promoted) {
      move += "成";
    } else if (sel.unpromoted) {
      move += "不成";
    }
  }

  return move;
}




function showKifu() {
  const kifuDiv = document.getElementById("kifu");
  kifuDiv.innerHTML = "<h3>棋譜</h3>" + kifu.join("<br>");
}


function findOtherSamePieceMoves(sel, x, y, boardBefore) {
  const result = [];
  const piece = boardBefore[sel.y][sel.x];
  const base = piece.replace("+","").toUpperCase();
  const player = piece === piece.toLowerCase() ? "white" : "black";

  for (let yy = 0; yy < 9; yy++) {
    for (let xx = 0; xx < 9; xx++) {
      if (xx === sel.x && yy === sel.y) continue;
      const p = boardBefore[yy][xx];
      if (!p) continue;
      if (p.replace("+","").toUpperCase() !== base) continue;

      const isWhite = p === p.toLowerCase();
      if ((player === "black" && isWhite) || (player === "white" && !isWhite)) continue;

      const moves = getLegalMovesFromBoard(xx, yy, boardBefore);
      if (moves.some(m => m.x === x && m.y === y)) {
        result.push({ x: xx, y: yy });
      }
    }
  }

  return result;
}


function getLegalMovesFromBoard(x, y, board) {
  const piece = board[y][x];
  const isWhite = piece === piece.toLowerCase();
  const player = isWhite ? "white" : "black";
  const raw = getRawLegalMovesFromBoard(x, y, board);

  return raw.filter(m => {
    const fromPiece = board[y][x];
    const toPiece = board[m.y][m.x];

    board[m.y][m.x] = fromPiece;
    board[y][x] = "";

    const inCheck = isKingInCheckFromBoard(player, board);

    board[y][x] = fromPiece;
    board[m.y][m.x] = toPiece;

    return !inCheck;
  });
}


function getRawLegalMovesFromBoard(x, y, board) {
  const piece = board[y][x];
  const isWhite = piece === piece.toLowerCase();
  const player = isWhite ? "white" : "black";
  const dir = player === "black" ? -1 : 1;
  const base = piece.replace("+","").toUpperCase();
  const promoted = piece.startsWith("+");
  const moves = [];

  function add(nx, ny) {
    if (nx < 0 || nx > 8 || ny < 0 || ny > 8) return false;
    const target = board[ny][nx];
    if (target && (target === target.toLowerCase()) === isWhite) return false;
    moves.push({ x: nx, y: ny });
    return !target;
  }
  function slide(dx, dy) {
    let nx = x + dx, ny = y + dy;
    while (add(nx, ny)) {
      nx += dx;
      ny += dy;
    }
  }

  if (!promoted) {
    switch (base) {
      case "P": add(x, y + dir); break;
      case "L": slide(0, dir); break;
      case "N": add(x - 1, y + 2 * dir); add(x + 1, y + 2 * dir); break;
      case "S":
        add(x - 1, y + dir); add(x, y + dir); add(x + 1, y + dir);
        add(x - 1, y - dir); add(x + 1, y - dir); break;
      case "G":
        add(x - 1, y + dir); add(x, y + dir); add(x + 1, y + dir);
        add(x - 1, y); add(x + 1, y); add(x, y - dir); break;
      case "K":
        for (let dx = -1; dx <= 1; dx++)
          for (let dy = -1; dy <= 1; dy++)
            if (dx || dy) add(x + dx, y + dy);
        break;
      case "B": slide(1,1); slide(-1,1); slide(1,-1); slide(-1,-1); break;
      case "R": slide(1,0); slide(-1,0); slide(0,1); slide(0,-1); break;
    }
  } else {
    if (base === "B") {
      slide(1,1); slide(-1,1); slide(1,-1); slide(-1,-1);
      add(x-1,y); add(x+1,y); add(x,y-1); add(x,y+1);
    } else if (base === "R") {
      slide(1,0); slide(-1,0); slide(0,1); slide(0,-1);
      add(x-1,y-1); add(x+1,y-1); add(x-1,y+1); add(x+1,y+1);
    } else {
      add(x - 1, y + dir); add(x, y + dir); add(x + 1, y + dir);
      add(x - 1, y); add(x + 1, y); add(x, y - dir);
    }
  }
  return moves;
}


function isKingInCheckFromBoard(player, board) {
  const k = player === "black" ? "K" : "k";
  let king = null;

  for (let y = 0; y < 9; y++)
    for (let x = 0; x < 9; x++)
      if (board[y][x] === k) king = {x, y};

  if (!king) return false;

  const opponent = player === "black" ? "white" : "black";

  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const p = board[y][x];
      if (!p) continue;
      const isWhite = p === p.toLowerCase();
      if ((opponent === "white" && isWhite) || (opponent === "black" && !isWhite)) {
        const moves = getRawLegalMovesFromBoard(x, y, board);
        if (moves.some(m => m.x === king.x && m.y === king.y)) return true;
      }
    }
  }
  return false;
}


function getDisambiguation(sel, x, y, others) {
  const fromX = sel.x;
  const fromY = sel.y;

  const dx = x - fromX;
  const dy = y - fromY;

  const isForward = (dy < 0 && turn === "black") || (dy > 0 && turn === "white");
  const isBackward = !isForward;

  // 直（縦移動）
  if (dx === 0) {
    return "直";
  }

  // 右・左（先手視点）
  const isRight = (turn === "black" && dx < 0) || (turn === "white" && dx > 0);
  const isLeft  = !isRight;

  // 上・引・寄
  if (isForward) {
    return isRight ? "右上" : "左上";
  } else if (isBackward) {
    return isRight ? "右引" : "左引";
  } else {
    return isRight ? "右寄" : "左寄";
  }
}



positionHistory[getPositionKey()] = 1;

render();
showKifu();

