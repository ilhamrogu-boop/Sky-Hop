
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const W = 360;
const H = 550;
const GROUND = 515;

let state = "menu";
let frame = 0;
let score = 0;
let best = Number(localStorage.getItem("skyHopBest")) || 0;
let soundOn = true;
let audio = null;

let bird = {
  x: 85,
  y: 250,
  velocity: 0
};

let pipes = [];

const characters = [
  { body: "#28c9bd", wing: "#139b98", beak: "#ffb347" },
  { body: "#ffca50", wing: "#ed9235", beak: "#ff7043" },
  { body: "#bd9cff", wing: "#8b6bd0", beak: "#ff9f70" }
];

let characterIndex = 0;

const gravity = 0.34;
const jump = -6.3;
const pipeSpeed = 2.3;
const pipeGap = 165;
const pipeWidth = 54;
const pipeSpacing = 235;

// SOUND SYSTEM
function playSound(freq, duration = 0.1) {
  if (!soundOn) return;

  try {
    audio = audio || new (
      window.AudioContext || window.webkitAudioContext
    )();

    if (audio.state === "suspended") audio.resume();

    const osc = audio.createOscillator();
    const gain = audio.createGain();

    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(audio.destination);

    gain.gain.setValueAtTime(0.06, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audio.currentTime + duration
    );

    osc.start();
    osc.stop(audio.currentTime + duration);
  } catch (e) {}
}

// DRAW ROUNDED RECTANGLE
function roundedRect(x, y, w, h, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

// BACKGROUND
function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);

  sky.addColorStop(0, "#68c9f0");
  sky.addColorStop(1, "#d5f5ed");

  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // SUN
  ctx.fillStyle = "#ffe9a1";
  ctx.beginPath();
  ctx.arc(290, 85, 34, 0, Math.PI * 2);
  ctx.fill();

  // CLOUDS
  ctx.fillStyle = "rgba(255,255,255,0.85)";

  for (let i = 0; i < 5; i++) {
    const x =
      ((i * 105 - frame * 0.3) % 460 + 460) % 460 - 50;

    const y = 100 + (i % 2) * 80;

    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.arc(x + 22, y - 10, 23, 0, Math.PI * 2);
    ctx.arc(x + 44, y, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  // BACK HILLS
  ctx.fillStyle = "#a1dfaa";
  ctx.beginPath();
  ctx.moveTo(0, 450);
  ctx.quadraticCurveTo(100, 350, 190, 450);
  ctx.quadraticCurveTo(280, 365, 360, 445);
  ctx.lineTo(360, 550);
  ctx.lineTo(0, 550);
  ctx.fill();

  // FRONT HILLS
  ctx.fillStyle = "#65c88a";
  ctx.beginPath();
  ctx.moveTo(0, 480);
  ctx.quadraticCurveTo(100, 410, 190, 480);
  ctx.quadraticCurveTo(280, 420, 360, 475);
  ctx.lineTo(360, 550);
  ctx.lineTo(0, 550);
  ctx.fill();

  // GROUND
  ctx.fillStyle = "#d6b878";
  ctx.fillRect(0, GROUND, W, 35);

  ctx.fillStyle = "#5bbf6c";
  ctx.fillRect(0, GROUND - 7, W, 8);

  ctx.fillStyle = "#ae9057";

  for (let i = 0; i < 15; i++) {
    let x = ((i * 35 - frame * 2) % W + W) % W;
    ctx.fillRect(x, 535, 15, 3);
  }
}

// BIRD CHARACTER
function drawBird() {
  const c = characters[characterIndex];

  ctx.save();
  ctx.translate(bird.x, bird.y);

  const angle = Math.max(
    -0.4,
    Math.min(0.65, bird.velocity * 0.06)
  );

  ctx.rotate(state === "menu" ? Math.sin(frame * 0.06) * 0.08 : angle);

  // SHADOW
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.beginPath();
  ctx.ellipse(0, 15, 17, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // WING
  const wingMove = Math.sin(frame * 0.35) * 4;

  ctx.fillStyle = c.wing;
  ctx.beginPath();
  ctx.ellipse(-7, 5 + wingMove, 12, 8, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // BODY
  ctx.fillStyle = c.body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 20, 17, 0, 0, Math.PI * 2);
  ctx.fill();

  // BELLY
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.65;
  ctx.beginPath();
  ctx.ellipse(5, 8, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // EYE
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(9, -7, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#253344";
  ctx.beginPath();
  ctx.arc(11, -7, 3, 0, Math.PI * 2);
  ctx.fill();

  // BEAK
  ctx.fillStyle = c.beak;
  ctx.beginPath();
  ctx.moveTo(17, 0);
  ctx.lineTo(29, 5);
  ctx.lineTo(17, 9);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// CREATE PIPE
function createPipe(x = W + 10) {
  const top = 65 + Math.random() * 180;

  pipes.push({
    x: x,
    top: top,
    bottom: top + pipeGap,
    passed: false
  });
}

// PIPE DESIGN
function drawPipes() {
  pipes.forEach(p => {
    // TOP PIPE
    roundedRect(p.x, -5, pipeWidth, p.top + 5, 5, "#248b59");
    roundedRect(p.x + 7, 0, 9, p.top - 18, 3, "#55c98a");

    roundedRect(
      p.x - 4, p.top - 18,
      pipeWidth + 8, 18, 5, "#176c49"
    );

    // BOTTOM PIPE
    roundedRect(
      p.x, p.bottom,
      pipeWidth, GROUND - p.bottom, 5, "#248b59"
    );

    roundedRect(
      p.x + 7, p.bottom + 18,
      9, GROUND - p.bottom - 18, 3, "#55c98a"
    );

    roundedRect(
      p.x - 4, p.bottom,
      pipeWidth + 8, 18, 5, "#176c49"
    );
  });
}

// SCORE DISPLAY
function drawScore() {
  ctx.textAlign = "center";
  ctx.font = "bold 32px Arial";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#28745d";
  ctx.strokeText(score, 180, 55);

  ctx.fillStyle = "white";
  ctx.fillText(score, 180, 55);
}

// BUTTON
function drawButton(x, y, w, h, label, color) {
  roundedRect(x, y + 4, w, h, 13, "rgba(0,0,0,0.18)");
  roundedRect(x, y, w, h, 13, color);

  ctx.fillStyle = "white";
  ctx.font = "bold 17px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + w / 2, y + h / 2);

  ctx.textBaseline = "alphabetic";
}

// MENU
function drawMenu() {
  // TITLE
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 43px Arial";
  ctx.shadowColor = "rgba(20,80,90,0.3)";
  ctx.shadowBlur = 8;
  ctx.fillText("SKY HOP", 180, 115);
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#286c72";
  ctx.font = "bold 13px Arial";
  ctx.fillText("A LITTLE ARCADE ADVENTURE", 180, 140);

  // BIRD PREVIEW
  bird.x = 180;
  bird.y = 205 + Math.sin(frame * 0.06) * 8;
  bird.velocity = 0;

  drawBird();

  // HIGH SCORE
  roundedRect(75, 270, 210, 42, 12, "rgba(255,255,255,0.75)");

  ctx.fillStyle = "#276b68";
  ctx.font = "bold 17px Arial";
  ctx.fillText("BEST SCORE: " + best, 180, 297);

  // PLAY BUTTON
  drawButton(90, 335, 180, 52, "PLAY", "#218f77");

  // CHARACTER BUTTON
  drawButton(50, 405, 260, 43, "CHANGE CHARACTER", "#4b9dba");

  // SOUND BUTTON
  drawButton(
    95, 465, 170, 40,
    soundOn ? "SOUND: ON" : "SOUND: OFF",
    "#527c9a"
  );
}

// GAME OVER
function drawGameOver() {
  ctx.fillStyle = "rgba(25,50,60,0.65)";
  ctx.fillRect(0, 0, W, H);

  roundedRect(35, 145, 290, 270, 22, "#f2fff6");

  ctx.textAlign = "center";
  ctx.fillStyle = "#26735d";
  ctx.font = "bold 29px Arial";
  ctx.fillText("GAME OVER", 180, 195);

  ctx.font = "bold 20px Arial";
  ctx.fillStyle = "#294d51";
  ctx.fillText("SCORE: " + score, 180, 245);

  ctx.font = "bold 16px Arial";
  ctx.fillText("BEST: " + best, 180, 278);

  drawButton(75, 310, 210, 45, "PLAY AGAIN", "#218f77");
  drawButton(75, 365, 210, 38, "MAIN MENU", "#527c9a");
}

// COLLISION
function checkCollision(p) {
  const hitX =
    bird.x + 14 > p.x - 4 &&
    bird.x - 14 < p.x + pipeWidth + 4;

  const hitY =
    bird.y - 12 < p.top ||
    bird.y + 12 > p.bottom;

  return hitX && hitY;
}

// START GAME
function startGame() {
  score = 0;
  pipes = [];

  bird.y = 250;
  bird.velocity = 0;

  createPipe();

  state = "playing";
  playSound(550);
}

// GAME OVER
function endGame() {
  if (state !== "playing") return;

  state = "over";
  playSound(180, 0.3);
}

// UPDATE
function update() {
  if (state !== "playing") return;

  bird.velocity += gravity;
  bird.y += bird.velocity;

  // MOVE PIPES
  pipes.forEach(p => {
    p.x -= pipeSpeed;

    if (!p.passed && p.x + pipeWidth < bird.x) {
      p.passed = true;
      score++;

      playSound(750);

      if (score > best) {
        best = score;
        localStorage.setItem("skyHopBest", best);
      }
    }

    if (checkCollision(p)) {
      endGame();
    }
  });

  // REMOVE OLD PIPES
  pipes = pipes.filter(p => p.x + pipeWidth + 10 > 0);

  // SPAWN PIPE AT FIXED DISTANCE
  if (
    pipes.length === 0 ||
    pipes[pipes.length - 1].x <= W - pipeSpacing
  ) {
    createPipe();
  }

  // GROUND AND CEILING
  if (bird.y + 13 >= GROUND || bird.y - 13 <= 0) {
    endGame();
  }
}

// INPUT
function handleInput(e) {
  const rect = canvas.getBoundingClientRect();

  const x = (e.clientX - rect.left) * W / rect.width;
  const y = (e.clientY - rect.top) * H / rect.height;

  if (state === "menu") {
    if (y >= 335 && y <= 390) {
      startGame();
    } else if (y >= 405 && y <= 450) {
      characterIndex = (characterIndex + 1) % characters.length;
      playSound(600);
    } else if (y >= 465 && y <= 510) {
      soundOn = !soundOn;
      playSound(600);
    }
    return;
  }

  if (state === "over") {
    if (y >= 305 && y <= 360) {
      startGame();
    } else if (y >= 360 && y <= 415) {
      state = "menu";
      bird.y = 250;
      bird.velocity = 0;
    }
    return;
  }

  if (state === "playing") {
    bird.velocity = jump;
    playSound(500);
  }
}

// DRAW LOOP
function draw() {
  drawBackground();

  if (state === "menu") {
    drawMenu();
  }

  if (state === "playing") {
    drawPipes();
    drawBird();
    drawScore();
  }

  if (state === "over") {
    drawPipes();
    drawBird();
    drawScore();
    drawGameOver();
  }
}

// MAIN LOOP
function loop() {
  frame++;

  update();
  draw();

  requestAnimationFrame(loop);
}

// START
canvas.addEventListener("pointerdown", handleInput);

loop();
      
