let state = "idle";
let started = false;
let debugMode = false;

let evidence = 0;
let tension = 0;
let instability = 0;
let verdictClock = 0;
let collapseClock = 0;
let flash = 0;
let sessionTime = 0;
let lastBurstFrame = -999;

let previousEvidenceBand = 0;
let alarmClock = 0;
let lockAmount = 0;
let warningFlash = 0;

let fragments = [];
let particles = [];
let windowsData = [];
let traces = [];
let rings = [];
let waveform = [];
let archiveBars = [];
let debrisBursts = [];
let timelineMarks = [];

let labels = [
  "EVIDENCE", "TRACE", "SIGNAL", "WITNESS", "CASE", "NOISE",
  "SUBJECT", "FILE", "ERROR", "ARCHIVE", "MOTION", "TESTIMONY",
  "ZONE-A", "ZONE-B", "PROTOCOL", "FRAME", "UNSTABLE", "SCAN"
];

let heroWords = [
  "WITNESS",
  "EVIDENCE",
  "PROTOCOL",
  "VERDICT",
  "ARCHIVE",
  "MACHINE",
  "TRACE",
  "UNSTABLE"
];

let drone, drone2, pulse, hiss, hissFilter, burstOsc, burstEnv, bass;

let stems = {};
let stemReady = {};
let stemsRequested = false;

let stemList = [
  "idle_bed",
  "sub_bass",
  "scan_ticks",
  "scan_noise",
  "archive_perc",
  "build_pulse",
  "build_synth_low",
  "build_synth_high",
  "verdict_alarm",
  "collapse_noise"
];

// ---------- Hand tracking ----------
let gestureRecognizer = null;
let videoInput = null;
let mpReady = false;
let handReady = false;
let lastVideoTime = -1;

let handSeen = false;
let handPoints = [];
let handednessLabel = "";
let palmCenter = { x: 0, y: 0 };
let prevPalmCenter = { x: 0, y: 0 };
let interactionX = 0;
let interactionY = 0;
let interactionTargetX = 0;
let interactionTargetY = 0;

let pinchStrength = 0;
let handOpen = 0;
let handSpeed = 0;
let pinchHold = 0;
let handPresence = 0;

const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17]
];

// ---------- Setup ----------
function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  textFont("Rajdhani");
  textStyle(BOLD);
  noCursor();
  rectMode(CENTER);

  interactionX = width / 2;
  interactionY = height / 2;
  interactionTargetX = width / 2;
  interactionTargetY = height / 2;
  palmCenter.x = width / 2;
  palmCenter.y = height / 2;
  prevPalmCenter.x = width / 2;
  prevPalmCenter.y = height / 2;

  initWorld();
  initAudio();
  initCamera();
  initHandTracking();
  bindStartOverlay();
}

function bindStartOverlay() {
  const overlay = document.getElementById("overlay");
  if (!overlay) return;

  overlay.addEventListener("click", handleStartInteraction);
  overlay.addEventListener("touchstart", handleStartInteraction, { passive: true });
}

function handleStartInteraction() {
  if (!started) startSystem();
}

function initCamera() {
  videoInput = createCapture(
    {
      audio: false,
      video: {
        facingMode: "user"
      }
    },
    () => {
      // ready callback
    }
  );
  videoInput.size(640, 480);
  videoInput.hide();
}

async function initHandTracking() {
  try {
    const vision = await window.mpReadyPromise;
    const { FilesetResolver, GestureRecognizer } = vision;

    const filesetResolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    gestureRecognizer = await GestureRecognizer.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task"
      },
      runningMode: "VIDEO",
      numHands: 1,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    mpReady = true;
    handReady = true;
  } catch (err) {
    console.error("Hand tracking failed to initialise:", err);
  }
}

// ---------- Audio stems ----------
function requestStems() {
  if (stemsRequested) return;
  stemsRequested = true;

  soundFormats("mp3", "wav");

  for (let name of stemList) {
    stemReady[name] = false;
    stems[name] = loadSound(
      `assets/${name}.mp3`,
      () => {
        stemReady[name] = true;

        if (started && stems[name] && !stems[name].isPlaying()) {
          stems[name].setLoop(true);
          stems[name].play();
          stems[name].setVolume(0);
        }
      },
      () => {
        stems[name] = null;
        stemReady[name] = false;
      }
    );
  }
}

// ---------- World ----------
function initWorld() {
  initFragments();
  initParticles();
  initWindows();
  initRings();
  initWaveform();
  initArchiveBars();
  traces = [];
  debrisBursts = [];
  timelineMarks = [];
}

function initFragments() {
  fragments = [];
  for (let i = 0; i < 320; i++) {
    fragments.push({
      x: random(width),
      y: random(height),
      vx: random(-0.8, 0.8),
      vy: random(0.15, 1.3),
      s: random(10, 24),
      phase: random(TWO_PI),
      label: random(labels)
    });
  }
}

function initParticles() {
  particles = [];
  for (let i = 0; i < 360; i++) {
    particles.push(makeParticle(random(width), random(height), true));
  }
}

function makeParticle(x, y, randomize) {
  return {
    x,
    y,
    vx: randomize ? random(-1.2, 1.2) : random(-2.5, 2.5),
    vy: randomize ? random(-1.2, 1.2) : random(-2.5, 2.5),
    r: random(1, 4),
    life: random(50, 220),
    maxLife: random(50, 220)
  };
}

function initWindows() {
  windowsData = [];
  for (let i = 0; i < 12; i++) {
    windowsData.push({
      anchorX: random(0.14, 0.86),
      anchorY: random(0.18, 0.82),
      w: random(120, 240),
      h: random(80, 170),
      seed: random(1000),
      tag: random(labels)
    });
  }
}

function initRings() {
  rings = [];
  for (let i = 0; i < 6; i++) {
    rings.push({
      r: 120 + i * 65,
      speed: random(0.002, 0.008),
      phase: random(TWO_PI)
    });
  }
}

function initWaveform() {
  waveform = [];
  for (let i = 0; i < 72; i++) waveform.push(random(-1, 1));
}

function initArchiveBars() {
  archiveBars = [];
  for (let i = 0; i < 48; i++) {
    archiveBars.push({
      v: random(0.1, 1),
      speed: random(0.01, 0.04),
      phase: random(TWO_PI)
    });
  }
}

// ---------- Audio ----------
function initAudio() {
  drone = new p5.Oscillator("triangle");
  drone2 = new p5.Oscillator("sine");
  pulse = new p5.Oscillator("square");
  bass = new p5.Oscillator("sine");
  hiss = new p5.Noise("white");
  hissFilter = new p5.BandPass();
  burstOsc = new p5.Oscillator("sawtooth");
  burstEnv = new p5.Envelope();

  burstEnv.setADSR(0.005, 0.08, 0.14, 0.4);
  burstEnv.setRange(0.4, 0);

  drone.amp(0);
  drone2.amp(0);
  pulse.amp(0);
  bass.amp(0);
  hiss.amp(0);
  burstOsc.amp(0);
}

function startSystem() {
  if (started) return;

  userStartAudio();

  drone.start();
  drone2.start();
  pulse.start();
  bass.start();
  hiss.start();
  burstOsc.start();

  hiss.disconnect();
  hiss.connect(hissFilter);

  requestStems();

  started = true;
  flash = 120;

  const overlay = document.getElementById("overlay");
  if (overlay) overlay.classList.add("hidden");
}

// ---------- Main draw ----------
function draw() {
  background(0, 42);

  if (started) sessionTime++;

  updateHandTracking();
  updateHandControl();

  const centerDist = dist(interactionX, interactionY, width / 2, height / 2);
  const centerFactor = 1 - constrain(centerDist / (min(width, height) * 0.48), 0, 1);
  const collecting = handSeen && handOpen > 0.5;

  updateState();
  updateSimulation();
  updateDebris();

  drawBackdrop();
  drawTopStatusBar();
  drawDataRain();
  drawSpatialGrid();
  drawMonumentFrame();
  drawCentralArchitecture();
  drawRings();
  drawArchivePanels();
  drawEvidenceWindows();
  drawWaveformPanel();
  drawTimelineBar();
  drawJudgementCore();
  drawFragments();
  drawParticles();
  drawDebris();
  drawScanBeam();
  drawTraces();
  drawSideMonitors();
  drawMegaTypography();
  drawHud(collecting, centerFactor);
  drawHandSkeleton();
  drawCameraPreview();
  drawCrosshair();
  drawLockOverlay();
  drawTestifyPrompt();

  if (!started) drawStartScreen();
  if (flash > 0.5) drawFlash();

  updateAudio(centerFactor);
  updateStemMix(collecting);
}

// ---------- Hand tracking logic ----------
function updateHandTracking() {
  if (!handReady || !gestureRecognizer || !videoInput) return;
  if (!videoInput.elt || videoInput.elt.readyState < 2) return;
  if (videoInput.elt.currentTime === lastVideoTime) return;

  lastVideoTime = videoInput.elt.currentTime;

  const results = gestureRecognizer.recognizeForVideo(videoInput.elt, performance.now());

  if (results.landmarks && results.landmarks.length > 0) {
    handSeen = true;
    handPresence = lerp(handPresence, 1, 0.2);

    const raw = results.landmarks[0];
    handPoints = raw.map((lm) => ({
      x: (1 - lm.x) * width,
      y: lm.y * height,
      z: lm.z
    }));

    handednessLabel = results.handednesses?.[0]?.[0]?.displayName || "";

    const wrist = handPoints[0];
    const iMcp = handPoints[5];
    const mMcp = handPoints[9];
    const rMcp = handPoints[13];
    const pMcp = handPoints[17];

    const cx = (wrist.x + iMcp.x + mMcp.x + rMcp.x + pMcp.x) / 5;
    const cy = (wrist.y + iMcp.y + mMcp.y + rMcp.y + pMcp.y) / 5;

    prevPalmCenter.x = palmCenter.x;
    prevPalmCenter.y = palmCenter.y;

    palmCenter.x = cx;
    palmCenter.y = cy;

    interactionTargetX = cx;
    interactionTargetY = cy;

    handSpeed = lerp(
      handSpeed,
      dist(palmCenter.x, palmCenter.y, prevPalmCenter.x, prevPalmCenter.y),
      0.25
    );

    const pinchDist = dist(handPoints[4].x, handPoints[4].y, handPoints[8].x, handPoints[8].y);
    pinchStrength = lerp(
      pinchStrength,
      constrain(map(pinchDist, width * 0.015, width * 0.09, 1, 0), 0, 1),
      0.25
    );

    const palmSpan = max(
      30,
      dist(handPoints[5].x, handPoints[5].y, handPoints[17].x, handPoints[17].y)
    );

    const opennessRaw =
      (
        dist(handPoints[8].x, handPoints[8].y, wrist.x, wrist.y) +
        dist(handPoints[12].x, handPoints[12].y, wrist.x, wrist.y) +
        dist(handPoints[16].x, handPoints[16].y, wrist.x, wrist.y) +
        dist(handPoints[20].x, handPoints[20].y, wrist.x, wrist.y)
      ) / 4 / palmSpan;

    handOpen = lerp(
      handOpen,
      constrain(map(opennessRaw, 1.2, 2.4, 0, 1), 0, 1),
      0.2
    );
  } else {
    handSeen = false;
    handPresence = lerp(handPresence, 0, 0.15);
    handOpen = lerp(handOpen, 0, 0.15);
    pinchStrength = lerp(pinchStrength, 0, 0.2);
    handSpeed = lerp(handSpeed, 0, 0.1);
    interactionTargetX = width / 2;
    interactionTargetY = height / 2;
    handPoints = [];
  }

  interactionX = lerp(interactionX, interactionTargetX, 0.18);
  interactionY = lerp(interactionY, interactionTargetY, 0.18);
}

function updateHandControl() {
  if (!started) return;

  const centerDist = dist(interactionX, interactionY, width / 2, height / 2);
  const centerFactor = 1 - constrain(centerDist / (min(width, height) * 0.48), 0, 1);
  const edgeBias = abs(interactionX / width - 0.5) * 2;
  const moveEnergy = constrain(map(handSpeed, 0, 36, 0, 1), 0, 1);

  instability = lerp(instability, moveEnergy * 0.7 + (1 - centerFactor) * 0.3 + edgeBias * 0.1, 0.08);

  let gain = 0;
  if (handSeen) {
    const collectIntent = handOpen * centerFactor * (1 - moveEnergy * 0.45);
    gain = 0.009 * collectIntent;

    if (state === "build") gain += 0.0025 * collectIntent;
    if (state === "assemble") gain += 0.0032 * collectIntent;
  }

  evidence = constrain(evidence + gain - (handSeen ? 0.0026 : 0.0065), 0, 1);
  if (state === "collapse") evidence = max(0, evidence - 0.012);

  let targetTension = evidence * 0.72 + instability * 0.28;
  if (handSeen && handOpen > 0.5) targetTension += 0.06;
  if (state === "verdict") targetTension = 1;
  if (state === "collapse") targetTension = 0.42;
  tension = lerp(tension, constrain(targetTension, 0, 1), 0.08);

  // Pinch to testify
  if (evidence > 0.62 && pinchStrength > 0.72 && handSeen) {
    pinchHold++;
  } else {
    pinchHold = max(0, pinchHold - 2);
  }

  if (pinchHold > 16) {
    triggerVerdict();
    pinchHold = 0;
  }

  // Trace history
  if (handSeen) {
    traces.push({ x: interactionX, y: interactionY, life: 26 + evidence * 24 });
    if (traces.length > 42) traces.shift();
  }

  for (let i = traces.length - 1; i >= 0; i--) {
    traces[i].life -= 1;
    if (traces[i].life <= 0) traces.splice(i, 1);
  }
}

// ---------- State logic ----------
function getEvidenceBand(v) {
  if (v < 0.18) return 0;
  if (v < 0.36) return 1;
  if (v < 0.55) return 2;
  if (v < 0.75) return 3;
  return 4;
}

function updateState() {
  if (state === "idle" && evidence > 0.04) state = "scan";
  if (state === "scan" && evidence > 0.22) state = "collect";
  if (state === "collect" && evidence > 0.45) state = "build";
  if (state === "build" && evidence > 0.7) state = "assemble";

  if (["scan", "collect", "build", "assemble"].includes(state) && evidence < 0.03) state = "idle";
  if (["build", "assemble"].includes(state) && evidence < 0.42) state = "collect";
  if (["collect", "build", "assemble"].includes(state) && evidence < 0.2) state = "scan";

  let currentBand = getEvidenceBand(evidence);
  if (currentBand > previousEvidenceBand && started) {
    triggerThresholdEvent(currentBand);
  }
  previousEvidenceBand = currentBand;

  if (state === "assemble") {
    alarmClock++;
    if (alarmClock % 40 === 0) {
      warningFlash = 160;
      triggerBurst(260 + random(-30, 40), 0.22);
      spawnDebris(18);
      timelineMarks.push({
        x: random(width * 0.22, width * 0.78),
        life: 80
      });
    }
  } else {
    alarmClock = 0;
  }

  if (state === "verdict") {
    verdictClock++;
    flash = min(220, flash + 22);
    lockAmount = lerp(lockAmount, 1, 0.08);

    if (frameCount - lastBurstFrame > 10 && verdictClock % 14 === 0) {
      triggerBurst(180 + random(-40, 140), 0.32 + random(0.08));
      spawnDebris(26);
      lastBurstFrame = frameCount;
      warningFlash = 180;
    }

    if (verdictClock > 110) {
      state = "collapse";
      verdictClock = 0;
      collapseClock = 0;
    }
  }

  if (state === "collapse") {
    collapseClock++;
    lockAmount = lerp(lockAmount, 0, 0.05);

    if (collapseClock % 18 === 0) {
      spawnDebris(14);
    }

    if (collapseClock > 170) {
      resetSystem(false);
    }
  }

  if (!["verdict", "collapse"].includes(state)) {
    lockAmount = lerp(lockAmount, 0, 0.08);
  }
}

function triggerThresholdEvent(level) {
  warningFlash = 120 + level * 18;
  triggerBurst(170 + level * 35, 0.18 + level * 0.03);
  spawnDebris(10 + level * 4);
}

function spawnDebris(count) {
  for (let i = 0; i < count; i++) {
    debrisBursts.push({
      x: width / 2 + random(-width * 0.18, width * 0.18),
      y: height / 2 + random(-height * 0.14, height * 0.14),
      vx: random(-4, 4),
      vy: random(-4, 4),
      life: random(20, 60),
      size: random(4, 16)
    });
  }
}

function updateDebris() {
  for (let i = debrisBursts.length - 1; i >= 0; i--) {
    let d = debrisBursts[i];
    d.x += d.vx;
    d.y += d.vy;
    d.vx *= 0.98;
    d.vy *= 0.98;
    d.life--;

    if (d.life <= 0) debrisBursts.splice(i, 1);
  }

  for (let i = timelineMarks.length - 1; i >= 0; i--) {
    timelineMarks[i].life--;
    if (timelineMarks[i].life <= 0) timelineMarks.splice(i, 1);
  }

  warningFlash *= 0.88;
}

// ---------- Simulation ----------
function updateSimulation() {
  updateWaveform();

  for (let p of particles) {
    let attractX = width / 2 + map(interactionX / width, 0, 1, -width * 0.1, width * 0.1);
    let attractY = height / 2 + map(interactionY / height, 0, 1, -height * 0.08, height * 0.08);

    p.x += p.vx;
    p.y += p.vy;

    let dx = attractX - p.x;
    let dy = attractY - p.y;
    let d = max(12, sqrt(dx * dx + dy * dy));
    let force = 0.02 + evidence * 0.06;

    if (state === "collapse") force *= -1.8;

    p.vx += (dx / d) * force;
    p.vy += (dy / d) * force;
    p.vx *= 0.985;
    p.vy *= 0.985;

    if (state === "verdict") {
      p.vx += random(-0.8, 0.8);
      p.vy += random(-0.8, 0.8);
    }

    p.life--;
    if (
      p.life <= 0 ||
      p.x < -40 || p.x > width + 40 ||
      p.y < -40 || p.y > height + 40
    ) {
      Object.assign(p, makeParticle(random(width), random(height), false));
    }
  }

  for (let f of fragments) {
    let speedBoost = state === "collapse" ? 2.6 : 1;
    f.x += (f.vx + map(interactionX / width, 0, 1, -0.5, 0.5)) * speedBoost;
    f.y += f.vy * speedBoost;

    if (state === "verdict") {
      f.x += random(-2, 2);
      f.y += random(-1, 2);
    }

    if (f.x < -180) f.x = width + 60;
    if (f.x > width + 180) f.x = -60;
    if (f.y > height + 40) {
      f.y = -20;
      f.x = random(width);
      f.label = random(labels);
    }
  }
}

function updateWaveform() {
  for (let i = 0; i < waveform.length; i++) {
    let t = frameCount * 0.04 + i * 0.2;
    let v = sin(t) * (0.2 + evidence * 0.45) + cos(t * 0.7) * 0.15;
    if (state === "verdict") v += random(-0.6, 0.6);
    if (state === "collapse") v *= 1.2;
    waveform[i] = lerp(waveform[i], v, 0.25);
  }
}

// ---------- Drawing ----------
function drawBackdrop() {
  noStroke();

  fill(255, 6 + evidence * 12);
  ellipse(width / 2, height / 2, width * (0.2 + evidence * 0.55), height * (0.18 + evidence * 0.55));

  fill(255, 4 + evidence * 10);
  ellipse(
    width / 2 + map(interactionX / width, 0, 1, -110, 110),
    height / 2 + map(interactionY / height, 0, 1, -80, 80),
    width * (0.24 + evidence * 0.64),
    height * (0.22 + evidence * 0.64)
  );

  for (let i = 0; i < 14; i++) {
    let a = map(i, 0, 13, 10, 0) + evidence * 6;
    fill(255, a);
    ellipse(width / 2, height / 2, width * (0.1 + i * 0.11), height * (0.08 + i * 0.09));
  }
}

function drawTopStatusBar() {
  let w = width * 0.36;
  let h = 10;
  let x = width / 2 - w / 2;
  let y = 28;

  rectMode(CORNER);
  noFill();
  stroke(255, 100);
  rect(x, y, w, h);

  noStroke();
  fill(255, 220);
  rect(x, y, w * tension, h);

  rectMode(CENTER);
}

function drawDataRain() {
  textAlign(LEFT, TOP);
  textFont("Rajdhani");
  textStyle(BOLD);
  textSize(16);

  let cols = 8;
  for (let c = 0; c < cols; c++) {
    let x = map(c, 0, cols - 1, width * 0.06, width * 0.94);
    let yOffset = (frameCount * (1.2 + c * 0.2)) % (height + 260);

    for (let r = 0; r < 16; r++) {
      let y = -220 + yOffset + r * 44;
      let v = nf(noise(c * 0.2, r * 0.3, frameCount * 0.01 + interactionX / width + interactionY / height), 1, 3);
      fill(255, 8 + evidence * 26);
      noStroke();
      text(v, x, y);
    }
  }
}

function drawSpatialGrid() {
  let spacing = map(evidence, 0, 1, 64, 20);
  let horizonY = height * 0.22;
  let vanishX = width / 2;
  let shake = 0;

  if (state === "verdict") shake = random(-6, 6);
  if (state === "collapse") shake = random(-16, 16) * (1 - collapseClock / 170);

  stroke(255, 18 + evidence * 35);
  strokeWeight(1);

  for (let x = -width; x <= width * 2; x += spacing) {
    line(x + shake, height, vanishX + shake, horizonY);
  }

  for (let y = horizonY; y <= height + spacing; y += spacing) {
    let w = map(y, horizonY, height, width * 0.08, width * 1.4);
    line(vanishX - w / 2 + shake, y, vanishX + w / 2 + shake, y);
  }

  for (let y = 0; y <= height; y += spacing * 2) {
    line(0, y + shake * 0.2, width, y - shake * 0.2);
  }
}

function drawMonumentFrame() {
  let pad = 18;
  let pad2 = 42;

  noFill();
  stroke(255, 70 + evidence * 90);
  strokeWeight(2);

  rectMode(CORNER);
  rect(pad, pad, width - pad * 2, height - pad * 2);

  stroke(255, 30 + evidence * 70);
  rect(pad2, pad2, width - pad2 * 2, height - pad2 * 2);

  for (let i = 0; i < 14; i++) {
    let x = map(i, 0, 13, width * 0.08, width * 0.92);
    line(x, 0, x, 10 + evidence * 24);
    line(x, height, x, height - 10 - evidence * 24);
  }

  for (let i = 0; i < 8; i++) {
    let y = map(i, 0, 7, height * 0.12, height * 0.88);
    line(0, y, 12 + evidence * 28, y);
    line(width, y, width - 12 - evidence * 28, y);
  }

  rectMode(CENTER);
}

function drawCentralArchitecture() {
  let cx = width / 2 + map(interactionX / width, 0, 1, -18, 18);
  let cy = height * 0.58 + map(interactionY / height, 0, 1, -14, 14);
  let coreW = map(evidence, 0, 1, width * 0.16, width * 0.72);
  let coreH = map(evidence, 0, 1, height * 0.12, height * 0.54);
  let roofH = coreH * 0.2;
  let shake = state === "verdict" ? random(-10, 10) : 0;

  if (state === "collapse") shake = random(-22, 22) * (1 - collapseClock / 170);

  noFill();
  stroke(255, 70 + evidence * 120);
  strokeWeight(2);

  line(cx - coreW / 2 + shake, cy - coreH / 2, cx + shake, cy - coreH / 2 - roofH);
  line(cx + shake, cy - coreH / 2 - roofH, cx + coreW / 2 + shake, cy - coreH / 2);
  rect(cx + shake, cy, coreW, coreH);
  rect(cx + shake, cy + coreH * 0.39, coreW * 1.04, coreH * 0.15);

  let cols = 5;
  let colW = coreW * 0.07;
  let gap = coreW / (cols + 1);

  for (let i = 1; i <= cols; i++) {
    let x = cx - coreW / 2 + gap * i + shake;
    rect(x, cy + coreH * 0.03, colW, coreH * 0.72);
    line(x - colW / 2, cy - coreH * 0.34, x + colW / 2, cy - coreH * 0.34);
    line(x - colW / 2, cy + coreH * 0.40, x + colW / 2, cy + coreH * 0.40);
  }

  for (let i = 0; i < 8; i++) {
    let inset = i * 18;
    stroke(255, 12 + evidence * 55 - i * 4);
    rect(cx + shake, cy, coreW + inset * 1.1, coreH + inset * 0.75);
  }

  stroke(255, 40 + evidence * 120);
  for (let i = 0; i < 10; i++) {
    let y = cy - coreH * 0.45 + i * (coreH / 9);
    line(cx - coreW * 0.5 + shake, y, cx + coreW * 0.5 + shake, y + sin(frameCount * 0.02 + i) * 4);
  }

  if (state === "assemble" || state === "verdict" || state === "collapse") {
    for (let i = 0; i < 5; i++) {
      let rx = cx + random(-coreW * 0.4, coreW * 0.4);
      let ry = cy + random(-coreH * 0.35, coreH * 0.35);
      rect(rx, ry, random(20, 80), random(10, 40));
    }
  }
}

function drawRings() {
  let cx = width / 2 + map(interactionX / width, 0, 1, -45, 45);
  let cy = height / 2 + map(interactionY / height, 0, 1, -35, 35);

  noFill();

  for (let ring of rings) {
    let rr = ring.r + evidence * 180 + sin(frameCount * ring.speed * 60 + ring.phase) * 18;
    stroke(255, 16 + evidence * 80);
    ellipse(cx, cy, rr, rr * (0.78 + evidence * 0.2));

    let segments = 20;
    for (let i = 0; i < segments; i++) {
      let a1 = (TWO_PI / segments) * i + frameCount * ring.speed;
      let a2 = a1 + 0.16 + evidence * 0.1;
      if ((i + floor(frameCount * 0.03)) % 3 === 0) {
        stroke(255, 40 + evidence * 120);
        arc(cx, cy, rr, rr * (0.78 + evidence * 0.2), a1, a2);
      }
    }
  }
}

function drawArchivePanels() {
  let panelW = width * 0.18;
  let panelH = height * 0.46;
  let margin = 34;

  drawArchivePanel(margin, height * 0.18, panelW, panelH, true, interactionX / width);
  drawArchivePanel(width - panelW - margin, height * 0.18, panelW, panelH, false, interactionY / height);
}

function drawArchivePanel(x, y, w, h, leftSide, driver) {
  noFill();
  stroke(255, 55 + evidence * 90);

  rectMode(CORNER);
  rect(x, y, w, h);

  let rows = archiveBars.length;
  for (let i = 0; i < rows; i++) {
    let yy = y + 16 + i * ((h - 30) / rows);
    let value = archiveBars[i].v * (0.25 + evidence * 0.8) * (0.55 + abs(sin(frameCount * archiveBars[i].speed + archiveBars[i].phase)));
    let barW = map(value, 0, 1.2, 14, w - 28);

    stroke(255, 18 + i * 2);
    line(x + 14, yy, x + w - 14, yy);

    noStroke();
    fill(255, 26 + evidence * 70);
    rect(x + 14, yy - 3, barW, 6);
  }

  fill(255, 160);
  noStroke();
  textSize(12);
  textAlign(LEFT, TOP);
  textFont("Rajdhani");
  textStyle(BOLD);
  text(leftSide ? "ARCHIVE / INPUT" : "TRACE / MEMORY", x + 14, y + 10);
  text(nf(driver, 1, 3), x + w - 66, y + 10);

  rectMode(CENTER);
}

function drawEvidenceWindows() {
  if (evidence < 0.15) return;

  for (let i = 0; i < windowsData.length; i++) {
    let wData = windowsData[i];
    let openAmt = constrain(map(evidence, 0.12 + i * 0.04, 0.56 + i * 0.025, 0, 1), 0, 1);
    if (openAmt <= 0) continue;

    let x = wData.anchorX * width + map(interactionX / width, 0, 1, -30, 30) * (i % 2 === 0 ? 1 : -1);
    let y = wData.anchorY * height + sin(frameCount * 0.02 + wData.seed) * 12;
    let ww = wData.w * (0.65 + openAmt * 0.7);
    let hh = wData.h * (0.65 + openAmt * 0.7);

    noFill();
    stroke(255, 40 + openAmt * 110);
    rect(x, y, ww, hh);

    stroke(255, 18 + openAmt * 70);
    line(x - ww / 2, y - hh / 2 + 18, x + ww / 2, y - hh / 2 + 18);
    line(x - ww * 0.18, y - hh / 2, x - ww * 0.18, y + hh / 2);

    let rows = 6;
    for (let r = 0; r < rows; r++) {
      let yy = y - hh * 0.25 + r * (hh * 0.1);
      let len = map(noise(wData.seed, r, frameCount * 0.03), 0, 1, ww * 0.18, ww * 0.82);
      line(x - ww * 0.38, yy, x - ww * 0.38 + len, yy);
    }

    let cols = 8;
    for (let c = 0; c < cols; c++) {
      let xx = x - ww * 0.36 + c * (ww * 0.09);
      let bh = map(noise(wData.seed + c * 0.2, frameCount * 0.02), 0, 1, 6, hh * 0.28);
      noStroke();
      fill(255, 26 + openAmt * 90);
      rect(xx, y + hh * 0.22, ww * 0.05, bh);
    }

    noStroke();
    fill(255, 180);
    textSize(11);
    textAlign(LEFT, TOP);
    textFont("Rajdhani");
    textStyle(BOLD);
    text(wData.tag, x - ww * 0.45, y - hh * 0.42);
  }
}

function drawWaveformPanel() {
  let x = width * 0.24;
  let y = height * 0.78;
  let w = width * 0.52;
  let h = height * 0.12;

  noFill();
  stroke(255, 50 + evidence * 80);

  rectMode(CORNER);
  rect(x, y, w, h);

  stroke(255, 120);
  noFill();
  beginShape();
  for (let i = 0; i < waveform.length; i++) {
    let xx = map(i, 0, waveform.length - 1, x + 8, x + w - 8);
    let yy = y + h / 2 + waveform[i] * h * 0.35;
    vertex(xx, yy);
  }
  endShape();

  fill(255, 160);
  noStroke();
  textSize(11);
  textAlign(LEFT, TOP);
  textFont("Rajdhani");
  textStyle(BOLD);
  text("ACOUSTIC INFERENCE", x + 10, y + 8);

  rectMode(CENTER);
}

function drawTimelineBar() {
  let x = width * 0.2;
  let y = height * 0.92;
  let w = width * 0.6;
  let h = 12;

  rectMode(CORNER);
  noFill();
  stroke(255, 90);
  rect(x, y, w, h);

  noStroke();
  fill(255, 220);
  rect(x, y, w * evidence, h);

  for (let mark of timelineMarks) {
    fill(255, map(mark.life, 0, 80, 0, 180));
    rect(mark.x, y - 8, 3, 28);
  }

  rectMode(CENTER);
}

function drawJudgementCore() {
  let cx = width / 2;
  let cy = height * 0.52;
  let s = map(evidence, 0, 1, 80, 260);

  noFill();
  stroke(255, 50 + evidence * 130);
  strokeWeight(2);
  rect(cx, cy, s, s * 0.55);

  for (let i = 0; i < 5; i++) {
    let inset = i * 12;
    stroke(255, 18 + evidence * 70 - i * 4);
    rect(cx, cy, s + inset, s * 0.55 + inset * 0.35);
  }

  stroke(255, 90 + evidence * 80);
  line(cx - s * 0.5, cy, cx + s * 0.5, cy);
  line(cx, cy - s * 0.28, cx, cy + s * 0.28);

  if (state === "verdict") {
    stroke(255, 180);
    ellipse(cx, cy, s * 1.1, s * 1.1);
  }
}

function drawFragments() {
  let alphaBase = state === "idle" ? 18 : 35 + evidence * 80;
  if (state === "verdict") alphaBase += 30;

  noStroke();
  textFont("Rajdhani");
  textStyle(BOLD);

  for (let f of fragments) {
    fill(255, alphaBase);
    textSize(f.s);
    text(f.label, f.x, f.y);
  }
}

function drawParticles() {
  noStroke();
  for (let p of particles) {
    let a = map(p.life, 0, p.maxLife, 0, 140) + evidence * 40;
    fill(255, a);
    circle(p.x, p.y, p.r + evidence * 1.8);
  }

  if (state === "assemble" || state === "verdict") {
    stroke(255, 36 + evidence * 90);
    strokeWeight(1);
    for (let i = 0; i < particles.length; i += 6) {
      let a = particles[i];
      let b = particles[(i + 11) % particles.length];
      let d = dist(a.x, a.y, b.x, b.y);
      if (d < 110 + evidence * 120) line(a.x, a.y, b.x, b.y);
    }
  }
}

function drawDebris() {
  noStroke();
  for (let d of debrisBursts) {
    fill(255, map(d.life, 0, 60, 0, 160));
    rect(d.x, d.y, d.size, d.size * 0.5);
  }
}

function drawScanBeam() {
  if (!started) return;
  if (state === "idle" && handOpen < 0.3 && evidence < 0.02) return;

  let beamY = map(sin(frameCount * 0.035 + interactionY / height * PI), -1, 1, height * 0.16, height * 0.84);
  let beamH = 18 + evidence * 58;

  noStroke();
  fill(255, 16 + evidence * 40);
  rect(width / 2, beamY, width, beamH);

  fill(255, 10 + evidence * 18);
  rect(width / 2, beamY + beamH * 0.9, width, beamH * 0.4);

  noFill();
  stroke(255, 100 + evidence * 100);
  rect(interactionX, interactionY, 54 + evidence * 100, 54 + evidence * 100);
  rect(interactionX, interactionY, 88 + evidence * 120, 88 + evidence * 70);

  stroke(255, 70);
  line(interactionX - 24, interactionY, interactionX + 24, interactionY);
  line(interactionX, interactionY - 24, interactionX, interactionY + 24);
}

function drawTraces() {
  noFill();
  beginShape();
  for (let t of traces) {
    stroke(255, map(t.life, 0, 50, 0, 120));
    strokeWeight(1.4);
    vertex(t.x, t.y);
  }
  endShape();
}

function drawSideMonitors() {
  let a = 18 + evidence * 55;
  stroke(255, a);
  strokeWeight(1);

  line(width * 0.12, height * 0.1, width * 0.12, height * 0.9);
  line(width * 0.88, height * 0.1, width * 0.88, height * 0.9);

  for (let i = 0; i < 12; i++) {
    let y = map(i, 0, 11, height * 0.14, height * 0.86);
    line(width * 0.095, y, width * 0.145, y);
    line(width * 0.855, y, width * 0.905, y);
  }
}

function drawMegaTypography() {
  let big = heroWords[floor((frameCount * 0.03 + evidence * 10)) % heroWords.length];
  let a = 8 + evidence * 28;

  textAlign(CENTER, CENTER);

  textFont("Orbitron");
  textStyle(BOLD);

  noStroke();
  fill(255, a);
  textSize(min(width, height) * 0.11);
  text(big, width / 2, height * 0.16);

  fill(255, 10 + evidence * 16);
  textSize(min(width, height) * 0.075);
  text("THE MACHINE WILL TESTIFY", width / 2, height * 0.9);

  textFont("Rajdhani");
  textSize(18);
  fill(255, 70 + evidence * 70);
  text(state.toUpperCase(), width / 2, height * 0.24);
}

function drawHud(collecting, centerFactor) {
  let title = "IDLE";
  if (state === "scan") title = "SCAN";
  if (state === "collect") title = "COLLECT";
  if (state === "build") title = "BUILD";
  if (state === "assemble") title = "ASSEMBLE";
  if (state === "verdict") title = "UNSTABLE VERDICT";
  if (state === "collapse") title = "COLLAPSE / RESET";

  textAlign(LEFT, TOP);

  textFont("Orbitron");
  textStyle(BOLD);
  fill(255, 220);
  noStroke();
  textSize(24);
  text("THE MACHINE WILL TESTIFY", 26, 20);

  fill(255, 180);
  textSize(15);
  text(title, 28, 54);

  drawMeter(28, 94, 280, 12, evidence, "EVIDENCE LEVEL");
  drawMeter(28, 140, 280, 12, tension, "SYSTEM TENSION");
  drawMeter(28, 186, 280, 12, centerFactor, "SUBJECT ALIGNMENT");
  drawMeter(28, 232, 280, 12, handOpen, "HAND OPEN");
  drawMeter(28, 278, 280, 12, pinchStrength, "PINCH FORCE");

  fill(255, 135);
  textFont("Rajdhani");
  textSize(14);
  text("OPEN HAND = COLLECT / FAST MOVE = DESTABILISE / PINCH = TESTIFY", 28, height - 36);

  if (debugMode) {
    const info = [
      `state: ${state}`,
      `evidence: ${nf(evidence, 1, 3)}`,
      `tension: ${nf(tension, 1, 3)}`,
      `instability: ${nf(instability, 1, 3)}`,
      `collecting: ${collecting}`,
      `handSeen: ${handSeen}`,
      `speed: ${nf(handSpeed, 1, 2)}`,
      `session: ${sessionTime}`
    ];
    fill(255, 170);
    textSize(13);
    let yy = 330;
    for (let lineText of info) {
      text(lineText, 28, yy);
      yy += 18;
    }
  }
}

function drawMeter(x, y, w, h, v, label) {
  stroke(255, 110);
  noFill();

  rectMode(CORNER);
  rect(x, y, w, h);

  noStroke();
  fill(255, 220);
  rect(x, y, w * constrain(v, 0, 1), h);

  fill(255, 120);
  textSize(11);
  textAlign(LEFT, TOP);
  textFont("Rajdhani");
  textStyle(BOLD);
  text(label, x, y + 14);

  rectMode(CENTER);
}

function drawHandSkeleton() {
  if (!handSeen || handPoints.length !== 21) return;

  // Connections
  stroke(255, 130);
  strokeWeight(2);
  noFill();
  for (let [a, b] of HAND_CONNECTIONS) {
    line(handPoints[a].x, handPoints[a].y, handPoints[b].x, handPoints[b].y);
  }

  // Joints
  noStroke();
  for (let i = 0; i < handPoints.length; i++) {
    const p = handPoints[i];
    if (i === 4 || i === 8) {
      fill(255, 220);
      circle(p.x, p.y, 10);
    } else {
      fill(255, 140);
      circle(p.x, p.y, 6);
    }
  }

  // Palm centre
  fill(255, 240);
  circle(palmCenter.x, palmCenter.y, 12);
}

function drawCameraPreview() {
  if (!videoInput) return;

  const vw = 220;
  const vh = 165;
  const x = width - vw - 24;
  const y = height - vh - 24;

  push();
  rectMode(CORNER);
  noFill();
  stroke(255, 100);
  rect(x, y, vw, vh);

  translate(x + vw, y);
  scale(-1, 1);
  tint(255, 70);
  image(videoInput, 0, 0, vw, vh);
  noTint();
  pop();

  if (handSeen) {
    fill(255, 160);
    noStroke();
    textAlign(LEFT, TOP);
    textFont("Rajdhani");
    textSize(12);
    text(`HAND: ${handednessLabel || "DETECTED"}`, x + 10, y + 8);
  }
}

function drawTestifyPrompt() {
  if (evidence < 0.62 || state === "verdict" || state === "collapse") return;

  const cx = width * 0.5;
  const cy = height * 0.33;
  const pulse = map(sin(frameCount * 0.08), -1, 1, 0.9, 1.08);
  const r = 52 * pulse;

  noFill();
  stroke(255, 180);
  strokeWeight(2);
  ellipse(cx, cy, r * 2, r * 2);

  fill(255, 220);
  noStroke();
  textAlign(CENTER, CENTER);
  textFont("Orbitron");
  textSize(18);
  text("TESTIFY", cx, cy - 2);

  if (pinchStrength > 0.72 && handSeen) {
    noFill();
    stroke(255, 220);
    arc(cx, cy, 140, 140, -HALF_PI, -HALF_PI + TWO_PI * constrain(pinchHold / 16, 0, 1));
  }
}

function drawLockOverlay() {
  if (lockAmount < 0.01 && warningFlash < 1) return;

  noFill();
  stroke(255, 90 * max(lockAmount, 0.2));
  rect(width / 2, height / 2, width * (0.86 + lockAmount * 0.06), height * (0.86 + lockAmount * 0.06));

  for (let i = 0; i < 12; i++) {
    let yy = map(i, 0, 11, height * 0.12, height * 0.88);
    line(width * 0.1, yy, width * 0.9, yy);
  }

  if (warningFlash > 1) {
    noStroke();
    fill(255, warningFlash * 0.25);
    rect(width / 2, height / 2, width, height);
  }
}

function drawCrosshair() {
  if (!started) return;

  stroke(255, 110);
  strokeWeight(1);
  line(interactionX - 8, interactionY, interactionX + 8, interactionY);
  line(interactionX, interactionY - 8, interactionX, interactionY + 8);
}

function drawStartScreen() {
  textAlign(CENTER, CENTER);

  textFont("Orbitron");
  textStyle(BOLD);
  fill(255, 210);
  noStroke();
  textSize(min(width, height) * 0.06);
  text("CLICK TO INITIATE", width / 2, height * 0.72);

  textFont("Rajdhani");
  fill(255, 130);
  textSize(20);
  text("CAMERA-DRIVEN AUDIOVISUAL JUDGEMENT SYSTEM", width / 2, height * 0.79);

  if (!handReady) {
    fill(255, 110);
    textSize(16);
    text("LOADING HAND TRACKING...", width / 2, height * 0.84);
  }
}

function drawFlash() {
  noStroke();
  fill(255, flash);
  rect(width / 2, height / 2, width, height);
  flash *= 0.82;
}

// ---------- Audio mapping ----------
function updateAudio(centerFactor) {
  if (!started) return;

  let gate = pow(max(0, sin(frameCount * (0.09 + evidence * 0.22))), 8);
  let verdictBoost = state === "verdict" ? 0.12 : 0;

  drone.freq(48 + evidence * 30 + sin(frameCount * 0.01) * 3);
  drone.amp(0.04 + evidence * 0.08, 0.08);

  drone2.freq(96 + instability * 220 + tension * 40);
  drone2.amp(0.012 + evidence * 0.035 + verdictBoost * 0.2, 0.08);

  bass.freq(42 + evidence * 18);
  bass.amp(0.02 + evidence * 0.05, 0.08);

  pulse.freq(150 + interactionY / height * 120 + evidence * 250);
  pulse.amp(gate * (0.015 + evidence * 0.14 + verdictBoost), 0.03);

  hissFilter.freq(600 + evidence * 3600 + instability * 2000 + centerFactor * 600);
  hissFilter.res(9 - evidence * 4);

  let hissAmp = 0.006 + evidence * 0.045 + verdictBoost;
  if (state === "collapse") hissAmp += 0.03;
  hiss.amp(hissAmp, 0.05);

  if (state === "idle" && evidence < 0.02) {
    pulse.amp(0, 0.1);
    hiss.amp(0.007, 0.1);
  }

  if (state === "collapse") {
    drone.amp(0.03, 0.12);
    bass.amp(0.015, 0.12);
    pulse.amp(0, 0.05);
  }
}

function updateStemMix(collecting) {
  if (!started) return;

  let verdictPulse = map(sin(frameCount * 0.18), -1, 1, 0.14, 0.5);
  let assemblePulse = map(sin(frameCount * 0.11), -1, 1, 0.06, 0.22);

  let idleVol = map(1 - evidence, 0, 1, 0.02, 0.6, true);
  let subVol = map(evidence, 0.06, 1, 0.02, 0.42, true);

  let scanTicksVol = 0;
  if (state === "scan" || state === "collect") {
    scanTicksVol = map(evidence, 0.04, 0.45, 0.08, 0.55, true);
  }
  if (collecting) scanTicksVol += 0.05;

  let scanNoiseVol = 0;
  if (["scan", "collect", "build", "assemble"].includes(state)) {
    scanNoiseVol = 0.08 + instability * 0.26 + tension * 0.08;
  }

  let archiveVol = 0;
  if (state === "build") archiveVol = map(evidence, 0.42, 0.72, 0.08, 0.38, true);
  if (state === "assemble") archiveVol = 0.28 + assemblePulse;
  if (state === "verdict") archiveVol = 0.32;

  let buildPulseVol = 0;
  if (state === "build") buildPulseVol = map(evidence, 0.45, 0.7, 0.12, 0.5, true);
  if (state === "assemble") buildPulseVol = 0.42 + assemblePulse * 0.6;
  if (state === "verdict") buildPulseVol = 0.5;

  let buildLowVol = 0;
  if (state === "build") buildLowVol = map(evidence, 0.48, 0.75, 0.08, 0.32, true);
  if (state === "assemble") buildLowVol = 0.28 + assemblePulse * 0.4;
  if (state === "verdict") buildLowVol = 0.36;

  let buildHighVol = 0;
  if (state === "assemble") buildHighVol = map(evidence, 0.68, 1, 0.08, 0.35, true);
  if (state === "verdict") buildHighVol = 0.28 + instability * 0.16;

  let verdictVol = 0;
  if (state === "verdict") verdictVol = verdictPulse;

  let collapseVol = 0;
  if (state === "collapse") collapseVol = map(collapseClock, 0, 170, 0.48, 0.08, true);

  setStemVolume("idle_bed", idleVol, 0.12);
  setStemVolume("sub_bass", subVol, 0.12);
  setStemVolume("scan_ticks", constrain(scanTicksVol, 0, 0.65), 0.08);
  setStemVolume("scan_noise", constrain(scanNoiseVol, 0, 0.42), 0.08);
  setStemVolume("archive_perc", archiveVol, 0.08);
  setStemVolume("build_pulse", buildPulseVol, 0.08);
  setStemVolume("build_synth_low", buildLowVol, 0.08);
  setStemVolume("build_synth_high", buildHighVol, 0.08);
  setStemVolume("verdict_alarm", verdictVol, 0.04);
  setStemVolume("collapse_noise", collapseVol, 0.08);
}

function setStemVolume(name, vol, ramp = 0.08) {
  if (stemReady[name] && stems[name]) {
    stems[name].setVolume(vol, ramp);
  }
}

function triggerBurst(freq, ampValue) {
  burstOsc.freq(freq);
  burstEnv.setRange(ampValue, 0);
  burstEnv.play(burstOsc);
}

function triggerVerdict() {
  if (!started) return;
  if (evidence < 0.62) return;
  if (state === "verdict" || state === "collapse") return;

  state = "verdict";
  verdictClock = 0;
  flash = 160;
  triggerBurst(180 + random(-50, 80), 0.35);
  spawnDebris(28);
  warningFlash = 180;
}

function resetSystem(hardReset) {
  state = "idle";
  evidence = 0;
  tension = 0;
  instability = 0;
  verdictClock = 0;
  collapseClock = 0;
  flash = 0;
  traces = [];
  debrisBursts = [];
  timelineMarks = [];
  lockAmount = 0;
  warningFlash = 0;
  previousEvidenceBand = 0;
  alarmClock = 0;
  pinchHold = 0;

  if (hardReset) initWorld();
}

// ---------- Keys ----------
function keyPressed() {
  if (key === "r" || key === "R") resetSystem(true);
  if (key === "d" || key === "D") debugMode = !debugMode;
  if (key === "f" || key === "F") fullscreen(!fullscreen());
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initWorld();
}