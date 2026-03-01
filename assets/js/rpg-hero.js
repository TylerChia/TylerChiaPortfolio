(function () {
  var canvas = document.getElementById("rpgCanvas");
  var ctx = canvas.getContext("2d");
  var W = 800, H = 500;
  var TILE = 20;
  var COLS = W / TILE, ROWS = H / TILE; // 40 x 25

  // Colors
  var C = {
    grass1: "#1a472a",
    grass2: "#1e5232",
    path: "#8B7355",
    pathEdge: "#7a6548",
    tree: "#145a28",
    treeTrunk: "#5c3d2e",
    wallMain: "#102a2c",
    wallAccent: "#0d1b1e",
    roof: "#26a69a",
    door: "#4dd0e1",
    doorGlow: "rgba(77,208,225,0.3)",
    sign: "#5c3d2e",
    signFace: "#8B7355",
    playerBody: "#4dd0e1",
    playerHead: "#e0f2f1",
    playerFeet: "#0d1b1e",
    textLight: "#e0f2f1",
    textMuted: "#5a8a87",
    prompt: "#4dd0e1",
    bg: "#0d1b1e"
  };

  // Buildings: name, top-left tile col/row, width/height in tiles, door offset, link
  var buildings = [
    { name: "Employment", col: 3,  row: 7,  w: 6, h: 5, doorOff: 2, href: "employment.html" },
    { name: "Research",   col: 10, row: 3,  w: 6, h: 5, doorOff: 2, href: "research.html" },
    { name: "GIS Work",   col: 24, row: 3,  w: 6, h: 5, doorOff: 2, href: "gis_work.html" },
    { name: "Contact",    col: 31, row: 7,  w: 6, h: 5, doorOff: 2, href: "contact.html" },
    { name: "Projects",   col: 17, row: 14, w: 6, h: 5, doorOff: 2, href: "projects.html" }
  ];

  // Build tile map: 0=grass, 1=path, 2=tree, 3=wall, 4=door
  var map = [];
  for (var r = 0; r < ROWS; r++) {
    map[r] = [];
    for (var c = 0; c < COLS; c++) {
      // Default grass
      map[r][c] = 0;
      // Border trees
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) map[r][c] = 2;
      // Extra tree border
      if (r === 1 && (c < 3 || c > COLS - 4)) map[r][c] = 2;
      if (r === ROWS - 2 && (c < 3 || c > COLS - 4)) map[r][c] = 2;
    }
  }

  // Place buildings on map
  buildings.forEach(function (b) {
    // Calculate door position
    b.doorCol = b.col + b.doorOff;
    b.doorRow = b.row + b.h - 1;
    for (var r = b.row; r < b.row + b.h; r++) {
      for (var c = b.col; c < b.col + b.w; c++) {
        if (r === b.doorRow && (c === b.doorCol || c === b.doorCol + 1)) {
          map[r][c] = 4; // door
        } else {
          map[r][c] = 3; // wall
        }
      }
    }
  });

  // Paths: connect buildings to center
  var centerCol = 20, centerRow = 12;
  function carvePath(c1, r1, c2, r2) {
    var c = c1, r = r1;
    while (c !== c2) {
      if (map[r][c] === 0) map[r][c] = 1;
      if (r + 1 < ROWS && map[r + 1][c] === 0) map[r + 1][c] = 1; // 2-wide
      c += c < c2 ? 1 : -1;
    }
    while (r !== r2) {
      if (map[r][c] === 0) map[r][c] = 1;
      if (c + 1 < COLS && map[r][c + 1] === 0) map[r][c + 1] = 1;
      r += r < r2 ? 1 : -1;
    }
  }

  buildings.forEach(function (b) {
    carvePath(b.doorCol, b.doorRow + 1, centerCol, centerRow);
  });

  // Scatter some trees on grass
  var treeTiles = [];
  for (var i = 0; i < 30; i++) {
    var tc = 2 + Math.floor(Math.random() * (COLS - 4));
    var tr = 2 + Math.floor(Math.random() * (ROWS - 4));
    if (map[tr][tc] === 0) {
      map[tr][tc] = 2;
      treeTiles.push({ c: tc, r: tr });
    }
  }

  // Player
  var player = {
    x: centerCol * TILE + 2,
    y: centerRow * TILE - 4,
    w: 12,
    h: 16,
    speed: 2.5,
    dir: 0, // 0=down,1=left,2=right,3=up
    frame: 0,
    frameTimer: 0,
    moving: false
  };

  // Input
  var keys = {};
  document.addEventListener("keydown", function (e) {
    keys[e.key] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].indexOf(e.key) !== -1) {
      // Only prevent default if canvas is in view
      var rect = canvas.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        e.preventDefault();
      }
    }
  });
  document.addEventListener("keyup", function (e) { keys[e.key] = false; });

  // Touch controls
  var touchControls = document.getElementById("touchControls");
  if (touchControls) {
    var btns = touchControls.querySelectorAll(".rpg-btn");
    btns.forEach(function (btn) {
      var dir = btn.getAttribute("data-dir");
      btn.addEventListener("touchstart", function (e) {
        e.preventDefault();
        if (dir === "up") keys["ArrowUp"] = true;
        if (dir === "down") keys["ArrowDown"] = true;
        if (dir === "left") keys["ArrowLeft"] = true;
        if (dir === "right") keys["ArrowRight"] = true;
        if (dir === "action") keys[" "] = true;
      });
      btn.addEventListener("touchend", function (e) {
        e.preventDefault();
        if (dir === "up") keys["ArrowUp"] = false;
        if (dir === "down") keys["ArrowDown"] = false;
        if (dir === "left") keys["ArrowLeft"] = false;
        if (dir === "right") keys["ArrowRight"] = false;
        if (dir === "action") keys[" "] = false;
      });
    });
  }

  // Check if tile is walkable
  function canWalk(px, py) {
    // Check all 4 corners of player hitbox
    var margin = 2;
    var corners = [
      [px + margin, py + 8],
      [px + player.w - margin, py + 8],
      [px + margin, py + player.h],
      [px + player.w - margin, py + player.h]
    ];
    for (var i = 0; i < corners.length; i++) {
      var tc = Math.floor(corners[i][0] / TILE);
      var tr = Math.floor(corners[i][1] / TILE);
      if (tc < 0 || tc >= COLS || tr < 0 || tr >= ROWS) return false;
      var t = map[tr][tc];
      if (t === 2 || t === 3) return false; // tree or wall
    }
    return true;
  }

  // Find nearby building door
  function nearbyBuilding() {
    var pcx = player.x + player.w / 2;
    var pcy = player.y + player.h;
    for (var i = 0; i < buildings.length; i++) {
      var b = buildings[i];
      var dx = (b.doorCol * TILE + TILE) - pcx;
      var dy = (b.doorRow * TILE + TILE / 2) - pcy;
      if (Math.abs(dx) < TILE * 2 && Math.abs(dy) < TILE * 2) return b;
    }
    return null;
  }

  // Animation tick
  var animTick = 0;

  function update() {
    var dx = 0, dy = 0;
    player.moving = false;

    if (keys["ArrowUp"] || keys["w"] || keys["W"]) { dy = -player.speed; player.dir = 3; player.moving = true; }
    if (keys["ArrowDown"] || keys["s"] || keys["S"]) { dy = player.speed; player.dir = 0; player.moving = true; }
    if (keys["ArrowLeft"] || keys["a"] || keys["A"]) { dx = -player.speed; player.dir = 1; player.moving = true; }
    if (keys["ArrowRight"] || keys["d"] || keys["D"]) { dx = player.speed; player.dir = 2; player.moving = true; }

    // Try X then Y separately for sliding along walls
    if (dx !== 0 && canWalk(player.x + dx, player.y)) player.x += dx;
    if (dy !== 0 && canWalk(player.x, player.y + dy)) player.y += dy;

    // Walk animation
    if (player.moving) {
      player.frameTimer++;
      if (player.frameTimer > 8) { player.frameTimer = 0; player.frame = (player.frame + 1) % 4; }
    } else {
      player.frame = 0;
      player.frameTimer = 0;
    }

    // Space to enter building
    if (keys[" "]) {
      var b = nearbyBuilding();
      if (b) {
        keys[" "] = false;
        window.location.href = b.href;
      }
    }

    animTick++;
  }

  function draw() {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    // Draw tiles
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var x = c * TILE, y = r * TILE;
        var t = map[r][c];
        if (t === 0) {
          // Grass with checkerboard
          ctx.fillStyle = (c + r) % 2 === 0 ? C.grass1 : C.grass2;
          ctx.fillRect(x, y, TILE, TILE);
        } else if (t === 1) {
          // Path
          ctx.fillStyle = C.path;
          ctx.fillRect(x, y, TILE, TILE);
        } else if (t === 2) {
          // Tree on grass
          ctx.fillStyle = (c + r) % 2 === 0 ? C.grass1 : C.grass2;
          ctx.fillRect(x, y, TILE, TILE);
          // Trunk
          ctx.fillStyle = C.treeTrunk;
          ctx.fillRect(x + 7, y + 10, 6, 10);
          // Canopy
          ctx.fillStyle = C.tree;
          ctx.fillRect(x + 2, y + 2, 16, 12);
          ctx.fillStyle = "#1e7a38";
          ctx.fillRect(x + 4, y + 4, 12, 8);
        }
      }
    }

    // Draw buildings
    buildings.forEach(function (b) {
      var bx = b.col * TILE, by = b.row * TILE;
      var bw = b.w * TILE, bh = b.h * TILE;

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(bx + 4, by + 4, bw, bh);

      // Main wall
      ctx.fillStyle = C.wallMain;
      ctx.fillRect(bx, by, bw, bh);

      // Wall border
      ctx.strokeStyle = C.roof;
      ctx.lineWidth = 2;
      ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);

      // Roof (top portion)
      ctx.fillStyle = C.roof;
      ctx.fillRect(bx, by, bw, TILE);
      // Roof highlight
      ctx.fillStyle = C.door;
      ctx.fillRect(bx + 4, by + 2, bw - 8, 4);

      // Door
      var doorX = (b.doorCol) * TILE;
      var doorY = (b.doorRow) * TILE;
      // Door glow
      ctx.fillStyle = C.doorGlow;
      ctx.fillRect(doorX - 4, doorY - 4, TILE * 2 + 8, TILE + 8);
      // Door
      ctx.fillStyle = C.door;
      ctx.fillRect(doorX, doorY, TILE * 2, TILE);
      // Door detail
      ctx.fillStyle = C.wallAccent;
      ctx.fillRect(doorX + TILE - 1, doorY, 2, TILE);

      // Windows
      var winY = by + TILE + 8;
      ctx.fillStyle = "#1a6068";
      ctx.fillRect(bx + 8, winY, 14, 10);
      ctx.fillRect(bx + bw - 22, winY, 14, 10);
      // Window glare
      ctx.fillStyle = "rgba(77,208,225,0.3)";
      ctx.fillRect(bx + 10, winY + 2, 5, 6);
      ctx.fillRect(bx + bw - 20, winY + 2, 5, 6);

      // Label above building
      ctx.fillStyle = C.textLight;
      ctx.font = "bold 12px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(b.name, bx + bw / 2, by - 6);
    });

    // Welcome sign at center
    var sx = centerCol * TILE - 20, sy = (centerRow - 2) * TILE;
    // Post
    ctx.fillStyle = C.sign;
    ctx.fillRect(sx + 18, sy + 14, 4, 12);
    // Sign board
    ctx.fillStyle = C.signFace;
    ctx.fillRect(sx - 4, sy, 48, 16);
    ctx.strokeStyle = C.sign;
    ctx.lineWidth = 1;
    ctx.strokeRect(sx - 4, sy, 48, 16);
    ctx.fillStyle = C.textLight;
    ctx.font = "8px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("WELCOME!", sx + 20, sy + 11);

    // Draw player
    drawPlayer();

    // Nearby building prompt
    var nb = nearbyBuilding();
    if (nb) {
      ctx.fillStyle = "rgba(13,27,30,0.85)";
      var pw = ctx.measureText("Press SPACE to enter " + nb.name).width + 20;
      ctx.fillRect(W / 2 - pw / 2, H - 40, pw, 28);
      ctx.strokeStyle = C.prompt;
      ctx.lineWidth = 1;
      ctx.strokeRect(W / 2 - pw / 2, H - 40, pw, 28);
      ctx.fillStyle = C.prompt;
      ctx.font = "bold 13px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Press SPACE to enter " + nb.name, W / 2, H - 22);
    }
  }

  function drawPlayer() {
    var x = Math.round(player.x);
    var y = Math.round(player.y);
    var bobY = player.moving ? (player.frame % 2 === 0 ? 0 : -1) : 0;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(x, y + player.h - 2, player.w, 4);

    // Body
    ctx.fillStyle = C.playerBody;
    ctx.fillRect(x + 1, y + 6 + bobY, 10, 8);

    // Head
    ctx.fillStyle = C.playerHead;
    ctx.fillRect(x + 2, y + bobY, 8, 7);

    // Eyes based on direction
    ctx.fillStyle = C.bg;
    if (player.dir === 0) { // down
      ctx.fillRect(x + 3, y + 4 + bobY, 2, 2);
      ctx.fillRect(x + 7, y + 4 + bobY, 2, 2);
    } else if (player.dir === 3) { // up
      // no eyes visible from behind
      ctx.fillStyle = C.playerBody;
      ctx.fillRect(x + 3, y + 2 + bobY, 6, 3);
    } else if (player.dir === 1) { // left
      ctx.fillRect(x + 2, y + 4 + bobY, 2, 2);
    } else { // right
      ctx.fillRect(x + 8, y + 4 + bobY, 2, 2);
    }

    // Feet with walk animation
    ctx.fillStyle = C.playerFeet;
    if (player.moving) {
      if (player.frame < 2) {
        ctx.fillRect(x + 2, y + 14 + bobY, 3, 3);
        ctx.fillRect(x + 7, y + 15 + bobY, 3, 2);
      } else {
        ctx.fillRect(x + 2, y + 15 + bobY, 3, 2);
        ctx.fillRect(x + 7, y + 14 + bobY, 3, 3);
      }
    } else {
      ctx.fillRect(x + 2, y + 14, 3, 3);
      ctx.fillRect(x + 7, y + 14, 3, 3);
    }
  }

  // Game loop
  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  loop();
})();
