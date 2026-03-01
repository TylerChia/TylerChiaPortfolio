(function () {
  var canvas = document.getElementById("rpgCanvas");
  var ctx = canvas.getContext("2d");
  var W = 800, H = 500;
  var TILE = 20;
  var COLS = W / TILE, ROWS = H / TILE; // 40 x 25

  // Pokemon GBA-style colors
  var C = {
    grass1: "#48a848",
    grass2: "#58b858",
    grass3: "#68c868",
    tallGrass: "#2d8a2d",
    tallGrassLight: "#3ca03c",
    path: "#d4a85c",
    pathEdge: "#c09848",
    pathLight: "#e0bc78",
    tree: "#208020",
    treeLight: "#30a030",
    treeDark: "#106010",
    treeTrunk: "#886644",
    fence: "#c8a870",
    fenceDark: "#a08050",
    wallWhite: "#f8f8f0",
    wallGray: "#d0d0c8",
    roofRed: "#c83830",
    roofRedLight: "#e04840",
    roofBlue: "#3860b0",
    roofBlueLight: "#5080d0",
    roofGreen: "#38a038",
    roofGreenLight: "#50c050",
    roofYellow: "#d0a020",
    roofYellowLight: "#e8c040",
    roofPurple: "#8848a8",
    roofPurpleLight: "#a868c8",
    door: "#604020",
    doorLight: "#785830",
    doorMat: "#c83830",
    windowBlue: "#80c0e8",
    windowShine: "#c0e8f8",
    signPost: "#886644",
    signBoard: "#e8d8a0",
    signBorder: "#886644",
    playerHat: "#c83830",
    playerHatBrim: "#a02820",
    playerHair: "#402010",
    playerSkin: "#f8c898",
    playerShirt: "#3060b0",
    playerShirtLight: "#4878c8",
    playerPants: "#404040",
    playerShoes: "#282828",
    textDark: "#383838",
    textWhite: "#f8f8f8",
    flower1: "#f86060",
    flower2: "#f8f860",
    flower3: "#6090f8",
    flowerCenter: "#f8f860"
  };

  // Building roof colors per building
  var roofColors = [
    { main: C.roofRed, light: C.roofRedLight },
    { main: C.roofBlue, light: C.roofBlueLight },
    { main: C.roofGreen, light: C.roofGreenLight },
    { main: C.roofYellow, light: C.roofYellowLight },
    { main: C.roofPurple, light: C.roofPurpleLight }
  ];

  // Buildings
  var buildings = [
    { name: "Employment", col: 3,  row: 7,  w: 6, h: 5, doorOff: 2, href: "employment.html",
      desc: "ML Engineer, Data Scientist,", desc2: "NSF Fellow, UCSB Baseball", icon: "briefcase" },
    { name: "Research",   col: 10, row: 3,  w: 6, h: 5, doorOff: 2, href: "research.html",
      desc: "Published papers and academic", desc2: "research in data science", icon: "flask" },
    { name: "GIS Work",   col: 24, row: 3,  w: 6, h: 5, doorOff: 2, href: "gis_work.html",
      desc: "Geospatial analysis, mapping,", desc2: "and spatial data projects", icon: "map" },
    { name: "Contact",    col: 31, row: 7,  w: 6, h: 5, doorOff: 2, href: "contact.html",
      desc: "Get in touch via LinkedIn,", desc2: "GitHub, or email", icon: "mail" },
    { name: "Projects",   col: 17, row: 14, w: 6, h: 5, doorOff: 2, href: "projects.html",
      desc: "ML models, web apps, APIs,", desc2: "and data visualizations", icon: "code" }
  ];

  // Tile types: 0=grass, 1=path, 2=tree, 3=wall, 4=door, 5=tallGrass, 6=fence
  var map = [];
  for (var r = 0; r < ROWS; r++) {
    map[r] = [];
    for (var c = 0; c < COLS; c++) {
      map[r][c] = 0;
      // Border trees
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) map[r][c] = 2;
      if (r === 1 && (c < 3 || c > COLS - 4)) map[r][c] = 2;
      if (r === ROWS - 2 && (c < 3 || c > COLS - 4)) map[r][c] = 2;
    }
  }

  // Place buildings
  buildings.forEach(function (b) {
    b.doorCol = b.col + b.doorOff;
    b.doorRow = b.row + b.h - 1;
    for (var r = b.row; r < b.row + b.h; r++) {
      for (var c = b.col; c < b.col + b.w; c++) {
        if (r === b.doorRow && (c === b.doorCol || c === b.doorCol + 1)) {
          map[r][c] = 4;
        } else {
          map[r][c] = 3;
        }
      }
    }
  });

  // Paths
  var centerCol = 20, centerRow = 12;
  function carvePath(c1, r1, c2, r2) {
    var c = c1, r = r1;
    while (c !== c2) {
      if (map[r][c] === 0) map[r][c] = 1;
      if (r + 1 < ROWS && map[r + 1][c] === 0) map[r + 1][c] = 1;
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

  // Add tall grass patches (walkable but decorative)
  var rng = { seed: 42 };
  function seededRandom() {
    rng.seed = (rng.seed * 16807 + 0) % 2147483647;
    return (rng.seed - 1) / 2147483646;
  }
  // Create tall grass clusters
  var grassCenters = [
    {c: 15, r: 8}, {c: 35, r: 15}, {c: 7, r: 18},
    {c: 28, r: 20}, {c: 22, r: 6}, {c: 36, r: 4}
  ];
  grassCenters.forEach(function(gc) {
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        var gr = gc.r + dr, gcc = gc.c + dc;
        if (gr > 1 && gr < ROWS - 2 && gcc > 1 && gcc < COLS - 2 && map[gr][gcc] === 0) {
          map[gr][gcc] = 5;
        }
      }
    }
  });

  // Add fences near some buildings
  function placeFence(col, row) {
    if (row > 0 && row < ROWS && col > 0 && col < COLS && map[row][col] === 0) {
      map[row][col] = 6;
    }
  }
  // Fences along bottom edge of map
  for (var fc = 2; fc < COLS - 2; fc++) {
    if (map[ROWS - 2][fc] === 0) placeFence(fc, ROWS - 2);
  }

  // Scatter trees
  for (var i = 0; i < 25; i++) {
    var tc = 2 + Math.floor(seededRandom() * (COLS - 4));
    var tr = 2 + Math.floor(seededRandom() * (ROWS - 4));
    if (map[tr][tc] === 0) {
      map[tr][tc] = 2;
    }
  }

  // Flower positions (decorative, placed on grass tiles)
  var flowers = [];
  for (var fi = 0; fi < 20; fi++) {
    var fc2 = 2 + Math.floor(seededRandom() * (COLS - 4));
    var fr = 2 + Math.floor(seededRandom() * (ROWS - 4));
    if (map[fr][fc2] === 0) {
      flowers.push({ c: fc2, r: fr, type: Math.floor(seededRandom() * 3) });
    }
  }

  // Player
  var player = {
    x: centerCol * TILE + 2,
    y: centerRow * TILE - 4,
    w: 14,
    h: 18,
    speed: 2.5,
    dir: 0,
    frame: 0,
    frameTimer: 0,
    moving: false
  };

  // Gengar follower - follows player's trail but keeps distance
  var trail = []; // breadcrumb waypoints
  var TRAIL_STEP = 6; // record a waypoint every N pixels moved
  var MIN_DIST = 24; // minimum distance from player (about 1.2 tiles)
  var lastTrailX = player.x;
  var lastTrailY = player.y;
  var gengar = {
    x: player.x - 24,
    y: player.y,
    dir: 0
  };

  // Input
  var keys = {};
  document.addEventListener("keydown", function (e) {
    keys[e.key] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].indexOf(e.key) !== -1) {
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

  function canWalk(px, py) {
    var margin = 2;
    var corners = [
      [px + margin, py + 10],
      [px + player.w - margin, py + 10],
      [px + margin, py + player.h],
      [px + player.w - margin, py + player.h]
    ];
    for (var i = 0; i < corners.length; i++) {
      var tc = Math.floor(corners[i][0] / TILE);
      var tr = Math.floor(corners[i][1] / TILE);
      if (tc < 0 || tc >= COLS || tr < 0 || tr >= ROWS) return false;
      var t = map[tr][tc];
      if (t === 2 || t === 3 || t === 6) return false;
    }
    return true;
  }

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

  var animTick = 0;

  function update() {
    var dx = 0, dy = 0;
    player.moving = false;

    if (keys["ArrowUp"] || keys["w"] || keys["W"]) { dy = -player.speed; player.dir = 3; player.moving = true; }
    if (keys["ArrowDown"] || keys["s"] || keys["S"]) { dy = player.speed; player.dir = 0; player.moving = true; }
    if (keys["ArrowLeft"] || keys["a"] || keys["A"]) { dx = -player.speed; player.dir = 1; player.moving = true; }
    if (keys["ArrowRight"] || keys["d"] || keys["D"]) { dx = player.speed; player.dir = 2; player.moving = true; }

    if (dx !== 0 && canWalk(player.x + dx, player.y)) player.x += dx;
    if (dy !== 0 && canWalk(player.x, player.y + dy)) player.y += dy;

    if (player.moving) {
      player.frameTimer++;
      if (player.frameTimer > 8) { player.frameTimer = 0; player.frame = (player.frame + 1) % 4; }
    } else {
      player.frame = 0;
      player.frameTimer = 0;
    }

    if (keys[" "]) {
      var b = nearbyBuilding();
      if (b) {
        keys[" "] = false;
        window.location.href = b.href;
      }
    }

    // Record breadcrumb trail for Gengar
    var tdx = player.x - lastTrailX;
    var tdy = player.y - lastTrailY;
    if (Math.sqrt(tdx * tdx + tdy * tdy) >= TRAIL_STEP) {
      trail.push({ x: lastTrailX, y: lastTrailY, dir: player.dir });
      lastTrailX = player.x;
      lastTrailY = player.y;
    }

    // Move Gengar along trail, but stop when too close to player
    if (trail.length > 0) {
      var gpx = player.x - gengar.x;
      var gpy = player.y - gengar.y;
      var playerDist = Math.sqrt(gpx * gpx + gpy * gpy);

      if (playerDist > MIN_DIST) {
        var wp = trail[0];
        var wx = wp.x - gengar.x;
        var wy = wp.y - gengar.y;
        var wDist = Math.sqrt(wx * wx + wy * wy);
        if (wDist < 3) {
          gengar.dir = wp.dir;
          trail.shift();
        } else {
          gengar.x += (wx / wDist) * player.speed;
          gengar.y += (wy / wDist) * player.speed;
          gengar.dir = wp.dir;
        }
      }
    }

    animTick++;
  }

  function drawGrass(x, y, c, r) {
    ctx.fillStyle = (c + r) % 2 === 0 ? C.grass1 : C.grass2;
    ctx.fillRect(x, y, TILE, TILE);
    // Subtle grass texture lines
    ctx.fillStyle = C.grass3;
    if ((c * 3 + r * 7) % 5 === 0) {
      ctx.fillRect(x + 4, y + 14, 2, 4);
      ctx.fillRect(x + 12, y + 6, 2, 4);
    }
  }

  function drawPath(x, y, c, r) {
    ctx.fillStyle = C.path;
    ctx.fillRect(x, y, TILE, TILE);
    // Path texture
    ctx.fillStyle = C.pathLight;
    ctx.fillRect(x + 3, y + 3, 4, 2);
    ctx.fillRect(x + 12, y + 12, 3, 2);
    // Edge darkening
    ctx.fillStyle = C.pathEdge;
    // Check neighbors for grass
    if (r > 0 && map[r - 1][c] !== 1 && map[r - 1][c] !== 4) ctx.fillRect(x, y, TILE, 2);
    if (r < ROWS - 1 && map[r + 1][c] !== 1 && map[r + 1][c] !== 4) ctx.fillRect(x, y + TILE - 2, TILE, 2);
    if (c > 0 && map[r][c - 1] !== 1 && map[r][c - 1] !== 4) ctx.fillRect(x, y, 2, TILE);
    if (c < COLS - 1 && map[r][c + 1] !== 1 && map[r][c + 1] !== 4) ctx.fillRect(x + TILE - 2, y, 2, TILE);
  }

  function drawTree(x, y) {
    // Draw grass underneath
    ctx.fillStyle = C.grass1;
    ctx.fillRect(x, y, TILE, TILE);
    // Trunk
    ctx.fillStyle = C.treeTrunk;
    ctx.fillRect(x + 7, y + 12, 6, 8);
    // Round canopy - main circle (approximated with rects)
    ctx.fillStyle = C.treeDark;
    ctx.fillRect(x + 2, y + 4, 16, 10);
    ctx.fillRect(x + 4, y + 2, 12, 14);
    // Canopy highlight
    ctx.fillStyle = C.tree;
    ctx.fillRect(x + 3, y + 3, 12, 10);
    ctx.fillRect(x + 5, y + 2, 8, 12);
    // Light spot
    ctx.fillStyle = C.treeLight;
    ctx.fillRect(x + 5, y + 4, 6, 5);
    ctx.fillRect(x + 6, y + 3, 4, 7);
  }

  function drawTallGrass(x, y, c, r) {
    // Base grass
    drawGrass(x, y, c, r);
    // Tall grass blades - animated wave
    var waveOff = Math.sin((animTick * 0.05) + c * 0.5) * 1;
    ctx.fillStyle = C.tallGrass;
    ctx.fillRect(x + 2 + waveOff, y + 2, 3, 14);
    ctx.fillRect(x + 8 + waveOff, y + 4, 3, 12);
    ctx.fillRect(x + 14 + waveOff, y + 2, 3, 14);
    // Lighter tips
    ctx.fillStyle = C.tallGrassLight;
    ctx.fillRect(x + 2 + waveOff, y + 2, 3, 4);
    ctx.fillRect(x + 8 + waveOff, y + 4, 3, 4);
    ctx.fillRect(x + 14 + waveOff, y + 2, 3, 4);
  }

  function drawFence(x, y) {
    drawGrass(x, y, Math.floor(x / TILE), Math.floor(y / TILE));
    // Fence post
    ctx.fillStyle = C.fence;
    ctx.fillRect(x + 2, y + 4, 4, 14);
    ctx.fillRect(x + 14, y + 4, 4, 14);
    // Horizontal bars
    ctx.fillRect(x, y + 6, TILE, 3);
    ctx.fillRect(x, y + 13, TILE, 3);
    // Shading
    ctx.fillStyle = C.fenceDark;
    ctx.fillRect(x, y + 9, TILE, 1);
    ctx.fillRect(x, y + 16, TILE, 1);
  }

  function drawFlower(x, y, type) {
    var colors = [C.flower1, C.flower2, C.flower3];
    var fx = x * TILE + 8, fy = y * TILE + 8;
    // Stem
    ctx.fillStyle = "#40a040";
    ctx.fillRect(fx, fy + 2, 2, 6);
    // Petals
    ctx.fillStyle = colors[type];
    ctx.fillRect(fx - 2, fy - 2, 3, 3);
    ctx.fillRect(fx + 1, fy - 2, 3, 3);
    ctx.fillRect(fx - 2, fy + 1, 3, 3);
    ctx.fillRect(fx + 1, fy + 1, 3, 3);
    // Center
    ctx.fillStyle = C.flowerCenter;
    ctx.fillRect(fx, fy, 2, 2);
  }

  function drawPreviewIcon(x, y, s, type) {
    var p = s / 8; // pixel unit
    if (type === "briefcase") {
      // Briefcase
      ctx.fillStyle = "#5a4020";
      ctx.fillRect(x + p * 1, y + p * 3, p * 6, p * 4);
      ctx.fillStyle = "#7a5830";
      ctx.fillRect(x + p * 1, y + p * 3, p * 6, p * 2);
      ctx.fillStyle = "#5a4020";
      ctx.fillRect(x + p * 3, y + p * 1, p * 2, p * 2);
      // Handle
      ctx.fillStyle = "#402810";
      ctx.fillRect(x + p * 2, y + p * 1, p * 1, p * 1);
      ctx.fillRect(x + p * 5, y + p * 1, p * 1, p * 1);
      // Clasp
      ctx.fillStyle = "#d4a020";
      ctx.fillRect(x + p * 3.5, y + p * 4, p * 1, p * 1);
    } else if (type === "flask") {
      // Flask / beaker
      ctx.fillStyle = "#a0a0a0";
      ctx.fillRect(x + p * 3, y + p * 1, p * 2, p * 2);
      ctx.fillStyle = "#c0c0c0";
      ctx.fillRect(x + p * 2, y + p * 0.5, p * 4, p * 1);
      ctx.fillStyle = "#50b0d0";
      ctx.fillRect(x + p * 2, y + p * 3, p * 4, p * 4);
      ctx.fillRect(x + p * 1, y + p * 5, p * 6, p * 2);
      // Bubbles
      ctx.fillStyle = "#80d8f0";
      ctx.fillRect(x + p * 3, y + p * 4, p * 1, p * 1);
      ctx.fillRect(x + p * 4, y + p * 5.5, p * 1, p * 1);
    } else if (type === "map") {
      // Folded map
      ctx.fillStyle = "#e8d8a0";
      ctx.fillRect(x + p * 1, y + p * 1, p * 6, p * 6);
      ctx.fillStyle = "#c8b880";
      ctx.fillRect(x + p * 3, y + p * 1, p * 1, p * 6);
      // Map lines
      ctx.fillStyle = "#c83830";
      ctx.fillRect(x + p * 1.5, y + p * 2, p * 1.5, p * 0.5);
      ctx.fillRect(x + p * 1.5, y + p * 3.5, p * 2, p * 0.5);
      // Map pin
      ctx.fillStyle = "#c83830";
      ctx.fillRect(x + p * 5, y + p * 3, p * 1, p * 1.5);
      ctx.fillRect(x + p * 4.5, y + p * 2.5, p * 2, p * 1);
    } else if (type === "mail") {
      // Envelope
      ctx.fillStyle = "#e0e0d8";
      ctx.fillRect(x + p * 1, y + p * 2, p * 6, p * 4);
      ctx.fillStyle = "#c0c0b8";
      // Flap triangles (simplified)
      ctx.fillRect(x + p * 1, y + p * 2, p * 1, p * 1);
      ctx.fillRect(x + p * 6, y + p * 2, p * 1, p * 1);
      ctx.fillRect(x + p * 2, y + p * 3, p * 1, p * 1);
      ctx.fillRect(x + p * 5, y + p * 3, p * 1, p * 1);
      ctx.fillRect(x + p * 3, y + p * 4, p * 2, p * 1);
      // Seal
      ctx.fillStyle = "#c83830";
      ctx.fillRect(x + p * 3.5, y + p * 4, p * 1, p * 1);
    } else if (type === "code") {
      // Code brackets < / >
      ctx.fillStyle = "#3060b0";
      // Left bracket <
      ctx.fillRect(x + p * 2, y + p * 3.5, p * 1, p * 1);
      ctx.fillRect(x + p * 1, y + p * 4.5, p * 1, p * 1);
      ctx.fillRect(x + p * 2, y + p * 5.5, p * 1, p * 1);
      // Right bracket >
      ctx.fillRect(x + p * 5, y + p * 3.5, p * 1, p * 1);
      ctx.fillRect(x + p * 6, y + p * 4.5, p * 1, p * 1);
      ctx.fillRect(x + p * 5, y + p * 5.5, p * 1, p * 1);
      // Slash /
      ctx.fillStyle = "#40a040";
      ctx.fillRect(x + p * 4, y + p * 2, p * 1, p * 1);
      ctx.fillRect(x + p * 3.5, y + p * 3.5, p * 1, p * 1);
      ctx.fillRect(x + p * 3, y + p * 5, p * 1, p * 1);
    }
  }

  function draw() {
    // Sky-colored background
    ctx.fillStyle = "#48a848";
    ctx.fillRect(0, 0, W, H);

    // Draw tiles
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var x = c * TILE, y = r * TILE;
        var t = map[r][c];
        if (t === 0) drawGrass(x, y, c, r);
        else if (t === 1) drawPath(x, y, c, r);
        else if (t === 2) drawTree(x, y);
        else if (t === 5) drawTallGrass(x, y, c, r);
        else if (t === 6) drawFence(x, y);
      }
    }

    // Draw flowers on grass tiles
    flowers.forEach(function(f) {
      drawFlower(f.c, f.r, f.type);
    });

    // Draw buildings
    buildings.forEach(function (b, idx) {
      var bx = b.col * TILE, by = b.row * TILE;
      var bw = b.w * TILE, bh = b.h * TILE;
      var rc = roofColors[idx % roofColors.length];

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.fillRect(bx + 3, by + 3, bw, bh);

      // Main wall - white like Pokemon houses
      ctx.fillStyle = C.wallWhite;
      ctx.fillRect(bx, by, bw, bh);

      // Wall bottom half slightly gray
      ctx.fillStyle = C.wallGray;
      ctx.fillRect(bx, by + bh * 0.6, bw, bh * 0.4);

      // Wall border
      ctx.strokeStyle = "#a0a098";
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, bh);

      // Roof - triangular-ish (colored top portion with overhang)
      var roofH = TILE + 6;
      // Roof overhang
      ctx.fillStyle = rc.main;
      ctx.fillRect(bx - 4, by - 4, bw + 8, roofH);
      // Roof highlight strip
      ctx.fillStyle = rc.light;
      ctx.fillRect(bx - 4, by - 4, bw + 8, 6);
      // Roof shadow at bottom
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.fillRect(bx - 4, by + roofH - 6, bw + 8, 3);

      // Door
      var doorX = b.doorCol * TILE;
      var doorY = b.doorRow * TILE;
      // Door mat
      ctx.fillStyle = C.doorMat;
      ctx.fillRect(doorX - 2, doorY + TILE - 4, TILE * 2 + 4, 4);
      // Door frame
      ctx.fillStyle = C.door;
      ctx.fillRect(doorX, doorY, TILE * 2, TILE);
      // Door panels
      ctx.fillStyle = C.doorLight;
      ctx.fillRect(doorX + 2, doorY + 2, TILE - 3, TILE - 4);
      ctx.fillRect(doorX + TILE + 1, doorY + 2, TILE - 3, TILE - 4);
      // Door knob
      ctx.fillStyle = "#f8d848";
      ctx.fillRect(doorX + TILE - 4, doorY + TILE / 2, 3, 3);
      ctx.fillRect(doorX + TILE + 1, doorY + TILE / 2, 3, 3);

      // Windows
      var winY = by + roofH + 6;
      // Left window
      ctx.fillStyle = "#a0a098";
      ctx.fillRect(bx + 6, winY, 18, 16);
      ctx.fillStyle = C.windowBlue;
      ctx.fillRect(bx + 8, winY + 2, 14, 12);
      // Window cross
      ctx.fillStyle = C.wallWhite;
      ctx.fillRect(bx + 14, winY + 2, 2, 12);
      ctx.fillRect(bx + 8, winY + 7, 14, 2);
      // Window shine
      ctx.fillStyle = C.windowShine;
      ctx.fillRect(bx + 9, winY + 3, 4, 3);

      // Right window
      ctx.fillStyle = "#a0a098";
      ctx.fillRect(bx + bw - 24, winY, 18, 16);
      ctx.fillStyle = C.windowBlue;
      ctx.fillRect(bx + bw - 22, winY + 2, 14, 12);
      ctx.fillStyle = C.wallWhite;
      ctx.fillRect(bx + bw - 16, winY + 2, 2, 12);
      ctx.fillRect(bx + bw - 22, winY + 7, 14, 2);
      ctx.fillStyle = C.windowShine;
      ctx.fillRect(bx + bw - 21, winY + 3, 4, 3);

      // Building name sign
      ctx.font = "bold 10px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      var nameW = ctx.measureText(b.name).width + 14;
      var signX = bx + bw / 2 - nameW / 2;
      ctx.fillStyle = C.signBoard;
      ctx.fillRect(signX, by - 20, nameW, 14);
      ctx.strokeStyle = C.signBorder;
      ctx.lineWidth = 1;
      ctx.strokeRect(signX, by - 20, nameW, 14);
      ctx.fillStyle = C.textDark;
      ctx.fillText(b.name, bx + bw / 2, by - 10);
    });

    // Town sign at center (Pokemon style)
    var sx = centerCol * TILE - 30, sy = (centerRow - 3) * TILE;
    // Post
    ctx.fillStyle = C.signPost;
    ctx.fillRect(sx + 28, sy + 18, 4, 16);
    // Sign board
    ctx.fillStyle = C.signBoard;
    ctx.fillRect(sx, sy, 60, 18);
    ctx.strokeStyle = C.signBorder;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx, sy, 60, 18);
    // Sign text
    ctx.fillStyle = C.textDark;
    ctx.font = "bold 9px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PORTFOLIO", sx + 30, sy + 9);
    ctx.font = "7px 'Segoe UI', sans-serif";
    ctx.fillText("TOWN", sx + 30, sy + 16);

    // Draw Gengar (behind player)
    drawGengar();

    // Draw player
    drawPlayer();

    // Nearby building preview panel (Pokemon menu style)
    var nb = nearbyBuilding();
    if (nb) {
      var pw = 240, ph = 90;
      var px = W / 2 - pw / 2;
      var py = H - ph - 10;

      // Outer box
      ctx.fillStyle = C.wallWhite;
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = "#404040";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(px, py, pw, ph);
      // Inner border (double-border Pokemon style)
      ctx.strokeStyle = "#a0a098";
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 3, py + 3, pw - 6, ph - 6);

      // Icon area
      var iconX = px + 16, iconY = py + 14;
      var iconSize = 32;
      // Icon background circle
      ctx.fillStyle = "#e8f5e9";
      ctx.fillRect(iconX - 2, iconY - 2, iconSize + 4, iconSize + 4);
      ctx.strokeStyle = "#a0a098";
      ctx.lineWidth = 1;
      ctx.strokeRect(iconX - 2, iconY - 2, iconSize + 4, iconSize + 4);

      // Draw pixel icon based on type
      drawPreviewIcon(iconX, iconY, iconSize, nb.icon);

      // Building name
      ctx.fillStyle = C.textDark;
      ctx.font = "bold 14px 'Segoe UI', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(nb.name, iconX + iconSize + 12, iconY + 10);

      // Description lines
      ctx.font = "11px 'Segoe UI', sans-serif";
      ctx.fillStyle = "#606060";
      ctx.fillText(nb.desc, iconX + iconSize + 12, iconY + 24);
      ctx.fillText(nb.desc2, iconX + iconSize + 12, iconY + 37);

      // "SPACE to enter" prompt at bottom
      ctx.font = "bold 10px 'Segoe UI', sans-serif";
      ctx.fillStyle = "#808080";
      ctx.textAlign = "center";
      ctx.fillText("[ SPACE ] to enter", px + pw / 2, py + ph - 10);

      // Bouncing arrow indicator
      var arrowBob = Math.sin(animTick * 0.1) * 2;
      ctx.fillStyle = C.textDark;
      ctx.fillRect(px + pw - 16, py + ph - 18 + arrowBob, 6, 3);
      ctx.fillRect(px + pw - 15, py + ph - 15 + arrowBob, 4, 2);
      ctx.fillRect(px + pw - 14, py + ph - 13 + arrowBob, 2, 1);
    }
  }

  function drawPlayer() {
    var x = Math.round(player.x);
    var y = Math.round(player.y);
    var bobY = player.moving ? (player.frame % 2 === 0 ? 0 : -1) : 0;
    var stepOff = player.moving ? (player.frame < 2 ? -1 : 1) : 0;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(x + 1, y + player.h - 2, player.w - 2, 3);

    if (player.dir === 0) { // Facing down
      // Shoes
      ctx.fillStyle = C.playerShoes;
      ctx.fillRect(x + 2, y + 15 + bobY + Math.abs(stepOff), 4, 3);
      ctx.fillRect(x + 8, y + 15 + bobY, 4, 3);
      // Pants
      ctx.fillStyle = C.playerPants;
      ctx.fillRect(x + 2, y + 11 + bobY, 4, 5);
      ctx.fillRect(x + 8, y + 11 + bobY, 4, 5);
      // Shirt
      ctx.fillStyle = C.playerShirt;
      ctx.fillRect(x + 1, y + 6 + bobY, 12, 6);
      // Shirt detail
      ctx.fillStyle = C.playerShirtLight;
      ctx.fillRect(x + 5, y + 7 + bobY, 4, 4);
      // Head / skin
      ctx.fillStyle = C.playerSkin;
      ctx.fillRect(x + 3, y + 2 + bobY, 8, 5);
      // Hair
      ctx.fillStyle = C.playerHair;
      ctx.fillRect(x + 3, y + 1 + bobY, 8, 2);
      // Hat
      ctx.fillStyle = C.playerHat;
      ctx.fillRect(x + 2, y - 1 + bobY, 10, 3);
      ctx.fillStyle = C.playerHatBrim;
      ctx.fillRect(x + 1, y + 2 + bobY, 12, 2);
      // Eyes
      ctx.fillStyle = "#202020";
      ctx.fillRect(x + 4, y + 4 + bobY, 2, 2);
      ctx.fillRect(x + 8, y + 4 + bobY, 2, 2);
      // Arms
      ctx.fillStyle = C.playerSkin;
      ctx.fillRect(x, y + 7 + bobY + stepOff, 2, 4);
      ctx.fillRect(x + 12, y + 7 + bobY - stepOff, 2, 4);

    } else if (player.dir === 3) { // Facing up
      ctx.fillStyle = C.playerShoes;
      ctx.fillRect(x + 2, y + 15 + bobY + Math.abs(stepOff), 4, 3);
      ctx.fillRect(x + 8, y + 15 + bobY, 4, 3);
      ctx.fillStyle = C.playerPants;
      ctx.fillRect(x + 2, y + 11 + bobY, 4, 5);
      ctx.fillRect(x + 8, y + 11 + bobY, 4, 5);
      ctx.fillStyle = C.playerShirt;
      ctx.fillRect(x + 1, y + 6 + bobY, 12, 6);
      // Head from behind - hair visible
      ctx.fillStyle = C.playerHair;
      ctx.fillRect(x + 3, y + 1 + bobY, 8, 6);
      // Hat
      ctx.fillStyle = C.playerHat;
      ctx.fillRect(x + 2, y - 1 + bobY, 10, 3);
      ctx.fillStyle = C.playerHatBrim;
      ctx.fillRect(x + 3, y + 2 + bobY, 8, 1);
      // Arms
      ctx.fillStyle = C.playerSkin;
      ctx.fillRect(x, y + 7 + bobY - stepOff, 2, 4);
      ctx.fillRect(x + 12, y + 7 + bobY + stepOff, 2, 4);

    } else if (player.dir === 1) { // Facing left
      ctx.fillStyle = C.playerShoes;
      ctx.fillRect(x + 3, y + 15 + bobY, 4, 3);
      ctx.fillRect(x + 7, y + 15 + bobY + Math.abs(stepOff), 4, 3);
      ctx.fillStyle = C.playerPants;
      ctx.fillRect(x + 3, y + 11 + bobY, 4, 5);
      ctx.fillRect(x + 7, y + 11 + bobY, 4, 5);
      ctx.fillStyle = C.playerShirt;
      ctx.fillRect(x + 2, y + 6 + bobY, 10, 6);
      ctx.fillStyle = C.playerShirtLight;
      ctx.fillRect(x + 8, y + 7 + bobY, 3, 4);
      // Head
      ctx.fillStyle = C.playerSkin;
      ctx.fillRect(x + 3, y + 2 + bobY, 7, 5);
      // Hair
      ctx.fillStyle = C.playerHair;
      ctx.fillRect(x + 7, y + 1 + bobY, 3, 5);
      // Hat
      ctx.fillStyle = C.playerHat;
      ctx.fillRect(x + 2, y - 1 + bobY, 9, 3);
      ctx.fillStyle = C.playerHatBrim;
      ctx.fillRect(x + 1, y + 2 + bobY, 6, 2);
      // Eye
      ctx.fillStyle = "#202020";
      ctx.fillRect(x + 4, y + 4 + bobY, 2, 2);
      // Arm
      ctx.fillStyle = C.playerSkin;
      ctx.fillRect(x + 1, y + 7 + bobY + stepOff, 2, 4);

    } else { // Facing right
      ctx.fillStyle = C.playerShoes;
      ctx.fillRect(x + 3, y + 15 + bobY + Math.abs(stepOff), 4, 3);
      ctx.fillRect(x + 7, y + 15 + bobY, 4, 3);
      ctx.fillStyle = C.playerPants;
      ctx.fillRect(x + 3, y + 11 + bobY, 4, 5);
      ctx.fillRect(x + 7, y + 11 + bobY, 4, 5);
      ctx.fillStyle = C.playerShirt;
      ctx.fillRect(x + 2, y + 6 + bobY, 10, 6);
      ctx.fillStyle = C.playerShirtLight;
      ctx.fillRect(x + 2, y + 7 + bobY, 3, 4);
      // Head
      ctx.fillStyle = C.playerSkin;
      ctx.fillRect(x + 4, y + 2 + bobY, 7, 5);
      // Hair
      ctx.fillStyle = C.playerHair;
      ctx.fillRect(x + 4, y + 1 + bobY, 3, 5);
      // Hat
      ctx.fillStyle = C.playerHat;
      ctx.fillRect(x + 3, y - 1 + bobY, 9, 3);
      ctx.fillStyle = C.playerHatBrim;
      ctx.fillRect(x + 7, y + 2 + bobY, 6, 2);
      // Eye
      ctx.fillStyle = "#202020";
      ctx.fillRect(x + 8, y + 4 + bobY, 2, 2);
      // Arm
      ctx.fillStyle = C.playerSkin;
      ctx.fillRect(x + 11, y + 7 + bobY - stepOff, 2, 4);
    }
  }

  function drawGengar() {
    var x = Math.round(gengar.x);
    var y = Math.round(gengar.y);
    // Ghostly float bob
    var floatY = Math.sin(animTick * 0.08) * 3;
    y = y + floatY;

    var gw = 16, gh = 16;

    // Ghost shadow on ground
    ctx.fillStyle = "rgba(80,40,120,0.25)";
    ctx.fillRect(x - 1, Math.round(gengar.y) + gh + 1, gw + 2, 3);

    // Semi-transparent ghost aura
    ctx.fillStyle = "rgba(88,40,120,0.15)";
    ctx.fillRect(x - 3, y - 2, gw + 6, gh + 4);

    // Main body - round purple shape
    var bodyColor = "#704898";
    var bodyLight = "#8860b0";
    var bodyDark = "#503070";

    // Body base (wide round shape)
    ctx.fillStyle = bodyColor;
    ctx.fillRect(x + 1, y + 2, 14, 12);
    ctx.fillRect(x + 3, y + 1, 10, 14);
    ctx.fillRect(x, y + 4, 16, 8);

    // Body highlight (left side lighter)
    ctx.fillStyle = bodyLight;
    ctx.fillRect(x + 2, y + 3, 5, 6);
    ctx.fillRect(x + 3, y + 2, 4, 8);

    // Body dark shadow (right/bottom)
    ctx.fillStyle = bodyDark;
    ctx.fillRect(x + 11, y + 8, 4, 5);
    ctx.fillRect(x + 4, y + 13, 8, 2);

    // Spiky bottom edge (ghost tail)
    ctx.fillStyle = bodyColor;
    ctx.fillRect(x + 1, y + 13, 3, 3);
    ctx.fillRect(x + 6, y + 14, 3, 2);
    ctx.fillRect(x + 12, y + 13, 3, 3);

    // Pointed ears
    ctx.fillStyle = bodyColor;
    // Left ear
    ctx.fillRect(x + 1, y - 1, 4, 4);
    ctx.fillRect(x + 2, y - 2, 2, 2);
    // Right ear
    ctx.fillRect(x + 11, y - 1, 4, 4);
    ctx.fillRect(x + 12, y - 2, 2, 2);

    // Ear inner highlight
    ctx.fillStyle = bodyLight;
    ctx.fillRect(x + 2, y, 2, 2);
    ctx.fillRect(x + 12, y, 2, 2);

    if (gengar.dir !== 3) { // Not facing up - show face
      // Eyes - red with white shine
      ctx.fillStyle = "#e02020";
      // Left eye
      ctx.fillRect(x + 3, y + 4, 4, 4);
      // Right eye
      ctx.fillRect(x + 9, y + 4, 4, 4);
      // Eye whites/shine
      ctx.fillStyle = "#f8f8f8";
      ctx.fillRect(x + 3, y + 4, 2, 2);
      ctx.fillRect(x + 9, y + 4, 2, 2);
      // Pupils
      ctx.fillStyle = "#200808";
      if (gengar.dir === 1) { // looking left
        ctx.fillRect(x + 3, y + 5, 2, 2);
        ctx.fillRect(x + 9, y + 5, 2, 2);
      } else if (gengar.dir === 2) { // looking right
        ctx.fillRect(x + 5, y + 5, 2, 2);
        ctx.fillRect(x + 11, y + 5, 2, 2);
      } else { // looking down
        ctx.fillRect(x + 4, y + 6, 2, 2);
        ctx.fillRect(x + 10, y + 6, 2, 2);
      }

      // Grinning mouth
      ctx.fillStyle = "#f8f8f8";
      // Wide grin
      ctx.fillRect(x + 3, y + 9, 10, 3);
      // Teeth points
      ctx.fillStyle = bodyColor;
      ctx.fillRect(x + 3, y + 9, 2, 1);
      ctx.fillRect(x + 6, y + 9, 1, 2);
      ctx.fillRect(x + 9, y + 9, 1, 2);
      ctx.fillRect(x + 11, y + 9, 2, 1);
      // Mouth interior
      ctx.fillStyle = "#c03050";
      ctx.fillRect(x + 5, y + 10, 6, 2);
    } else {
      // Facing away - show back spikes
      ctx.fillStyle = bodyDark;
      ctx.fillRect(x + 5, y + 2, 2, 3);
      ctx.fillRect(x + 9, y + 2, 2, 3);
      ctx.fillRect(x + 7, y + 1, 2, 3);
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
