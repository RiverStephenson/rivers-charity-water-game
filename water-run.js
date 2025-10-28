// --- Game Constants ---
const LANES_DESKTOP = 5;
const LANES_MOBILE = 3;
const DROPLET_RADIUS = 18;
const AVATAR_WIDTH = 48;
const AVATAR_HEIGHT = 32;
const AVATAR_Y_OFFSET = 24;
const DROPLET_TYPES = ['blue', 'green', 'black'];
const COLORS = {
  blue: '#2196f3',
  green: '#43a047',
  black: '#222'
};
const DROPLET_SCORES = {
  blue: 1,
  green: -1,
  black: 0
};
// --- Game State ---
let canvas, ctx, width, height, lanes, laneWidth;
let avatarLane, isMobile, isHorizontal, running, paused, gameover;
let droplets = [];
let dropletPool = [];
let score = 0, highscore = 0;
let blueStreak = 0, greenStreak = 0;
let blueMultiplier = 1, greenMultiplier = 1;
let greenRow = 0;
let spawnTimer = 0, spawnInterval = 800;
let speed = 2.2, speedInc = 0.02, minInterval = 250;
let lastFrame = 0;
let animatingScore = false;
let hasRecordCelebration = false;
// --- DOM Elements ---
const $ = sel => document.querySelector(sel);
// --- Utility ---
function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
function lerp(a, b, t) { return a + (b - a) * t; }
// --- Responsive Setup ---
function setupCanvasSize() {
  let container = $('#game-container');
  let topBar = $('#top-bar');
  let pauseBtn = $('#pause-btn');
  let scoreElement = $('#score');
  let highscoreElement = $('#highscore-value');
  
  // Check if we should use horizontal layout
  isHorizontal = window.innerWidth >= 1024 && window.innerHeight >= 600;
  
  if (isHorizontal) {
    // Horizontal layout: smaller canvas size
    let w = Math.min(window.innerWidth * 0.8, window.innerWidth - 100);
    let h = Math.min(window.innerHeight * 0.7, window.innerHeight - 150);
    
    // Debug logging
    console.log('Horizontal layout:', { windowWidth: window.innerWidth, windowHeight: window.innerHeight, canvasWidth: w, canvasHeight: h });
    
    // Set canvas dimensions
    canvas.width = w;
    canvas.height = h;
    
    // Use a simpler centering approach with margin calculations
    let marginLeft = (window.innerWidth - w) / 2;
    let marginTop = (window.innerHeight - h) / 2;
    
    container.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      margin: 0 !important;
      padding: 0 !important;
      z-index: 1000 !important;
      display: block !important;
    `;
    
    // Use margin-based centering instead of transform
    canvas.style.cssText = `
      position: absolute !important;
      top: ${marginTop}px !important;
      left: ${marginLeft}px !important;
      width: ${w}px !important;
      height: ${h}px !important;
      display: block !important;
      margin: 0 !important;
      padding: 0 !important;
      max-width: none !important;
      max-height: none !important;
      transform: none !important;
    `;
    
    // Position top bar above the canvas
    if (topBar) {
      topBar.style.cssText = `
        position: absolute !important;
        top: ${marginTop - 50}px !important;
        left: ${marginLeft}px !important;
        width: ${w}px !important;
        height: 40px !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        background: rgba(0, 0, 0, 0.2) !important;
        border-radius: 5px !important;
        padding: 0 15px !important;
        color: white !important;
        font-size: 16px !important;
        font-weight: bold !important;
        z-index: 1001 !important;
        box-sizing: border-box !important;
      `;
      
      // Update the top bar HTML to include both score and pause button with icon
      topBar.innerHTML = `
        <div class="score-display">Current Score: <span id="score">${score}</span>&nbsp;&nbsp;&nbsp;Highscore: <span id="highscore-value">${highscore}</span></div>
        <button id="pause-btn" onclick="pauseGame()">⏸</button>
      `;
    }
    
    // Style the pause button
    let newPauseBtn = $('#pause-btn');
    if (newPauseBtn) {
      newPauseBtn.style.cssText = `
        background: rgba(255, 255, 255, 0.2) !important;
        border: 2px solid rgba(255, 255, 255, 0.5) !important;
        border-radius: 5px !important;
        color: white !important;
        padding: 8px 12px !important;
        font-size: 16px !important;
        font-weight: bold !important;
        cursor: pointer !important;
        transition: background 0.3s ease !important;
        line-height: 1 !important;
      `;
      
      // Add hover effect
      newPauseBtn.addEventListener('mouseenter', () => {
        newPauseBtn.style.background = 'rgba(255, 255, 255, 0.3) !important';
      });
      newPauseBtn.addEventListener('mouseleave', () => {
        newPauseBtn.style.background = 'rgba(255, 255, 255, 0.2) !important';
      });
    }
    
    container.classList.add('horizontal-layout');
  } else {
    // Vertical layout: reset and center normally
    let w = Math.min(window.innerWidth - 40, container.offsetWidth || window.innerWidth - 40);
    let h = window.innerHeight - 150;
    
    canvas.width = w;
    canvas.height = h;
    
    // Reset container completely
    container.style.cssText = `
      position: relative !important;
      width: 100% !important;
      height: auto !important;
      margin: 0 auto !important;
      padding: 20px 0 !important;
      z-index: auto !important;
      display: flex !important;
      justify-content: center !important;
    `;
    
    // Reset canvas styles
    canvas.style.cssText = `
      display: block !important;
      margin: 0 auto !important;
      max-width: 100% !important;
      max-height: 100% !important;
      position: relative !important;
      transform: none !important;
    `;
    
    // Reset top bar styles for vertical layout
    if (topBar) {
      topBar.style.cssText = '';
      topBar.innerHTML = ''; // Clear the custom HTML
    }
    
    container.classList.remove('horizontal-layout');
  }
  
  width = canvas.width;
  height = canvas.height;
  isMobile = window.innerWidth < 700;
  lanes = (isMobile && !isHorizontal) ? LANES_MOBILE : LANES_DESKTOP;
  laneWidth = isHorizontal ? height / lanes : width / lanes;
}
// --- Droplet Pool ---
function getDroplet() {
  return dropletPool.length ? dropletPool.pop() : {};
}
function releaseDroplet(d) {
  dropletPool.push(d);
}
// --- Game Reset ---
function resetGame() {
  avatarLane = Math.floor(lanes / 2);
  droplets.length = 0;
  score = 0;
  blueStreak = 0;
  greenStreak = 0;
  blueMultiplier = 1;
  greenMultiplier = 1;
  greenRow = 0;
  spawnTimer = 0;
  spawnInterval = 800;
  speed = 2.2;
  gameover = false;
  paused = false;
  hasRecordCelebration = false;
  
  // Update score display
  let scoreElement = $('#score');
  if (scoreElement) {
    scoreElement.textContent = score;
  }
  
  $('#top-bar').style.display = '';
  hideModal('#pause-modal');
  hideModal('#gameover-modal');
  hideOverlay('#home-overlay');
  canvas.focus();
}
// --- Droplet Spawning ---
function spawnDroplet() {
  let d = getDroplet();
  d.type = DROPLET_TYPES[Math.random() < 0.7 ? 0 : (Math.random() < 0.7 ? 1 : 2)];
  d.lane = Math.floor(Math.random() * lanes);
  d.speed = lerp(speed, speed * 1.3, Math.random() * 0.5);
  
  if (isHorizontal) {
    d.x = width + DROPLET_RADIUS * 2; // Start from right side
    d.y = d.lane * laneWidth + laneWidth / 2;
  } else {
    d.y = -DROPLET_RADIUS * 2;
    d.x = d.lane * laneWidth + laneWidth / 2;
  }
  
  droplets.push(d);
}
// --- Game Loop ---
function gameLoop(ts) {
  if (!running || paused || gameover) return;
  let dt = ts - lastFrame;
  lastFrame = ts;
  ctx.clearRect(0, 0, width, height);
  
  // Draw lane lines (dashed white road lines)
  for (let i = 1; i < lanes; ++i) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.setLineDash([30, 25]); // 30px dashes with 25px gaps
    ctx.beginPath();
    if (isHorizontal) {
      // Horizontal lanes
      ctx.moveTo(0, i * laneWidth);
      ctx.lineTo(width, i * laneWidth);
    } else {
      // Vertical lanes
      ctx.moveTo(i * laneWidth, 0);
      ctx.lineTo(i * laneWidth, height);
    }
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash for other drawing
  }
  
  // Draw avatar
  drawAvatar(avatarLane);
  
  // Move and draw droplets
  for (let i = droplets.length - 1; i >= 0; --i) {
    let d = droplets[i];
    
    if (isHorizontal) {
      d.x -= d.speed; // Move left in horizontal mode
    } else {
      d.y += d.speed; // Move vertically in vertical mode
    }
    
    drawDroplet(d);
    
    // Collision detection
    let collision = false;
    if (isHorizontal) {
      collision = d.lane === avatarLane &&
        d.x - DROPLET_RADIUS < AVATAR_WIDTH + AVATAR_Y_OFFSET &&
        d.x + DROPLET_RADIUS > AVATAR_Y_OFFSET;
    } else {
      collision = d.lane === avatarLane &&
        d.y + DROPLET_RADIUS > height - AVATAR_HEIGHT - AVATAR_Y_OFFSET &&
        d.y - DROPLET_RADIUS < height - AVATAR_Y_OFFSET;
    }
    
    if (collision) {
      handleDroplet(d);
      droplets.splice(i, 1);
      releaseDroplet(d);
      continue;
    }
    
    // Out of bounds
    let outOfBounds = false;
    if (isHorizontal) {
      outOfBounds = d.x + DROPLET_RADIUS < 0; // Off left side
    } else {
      outOfBounds = d.y - DROPLET_RADIUS > height;
    }
    
    if (outOfBounds) {
      droplets.splice(i, 1);
      releaseDroplet(d);
    }
  }
  
  // Animate score
  if (animatingScore) {
    $('#score-anim').style.display = '';
  } else {
    $('#score-anim').style.display = 'none';
  }
  // Spawn new droplets
  spawnTimer += dt;
  if (spawnTimer > spawnInterval) {
    spawnDroplet();
    // 30% chance to spawn an additional droplet for more challenge
    if (Math.random() < 0.3) {
      spawnDroplet();
    }
    spawnTimer = 0;
    // Increase difficulty
    speed = Math.min(speed + speedInc, 8);
    spawnInterval = Math.max(spawnInterval - 7, minInterval);
  }
  requestAnimationFrame(gameLoop);
}
// --- Drawing ---
function drawAvatar(lane) {
  let x, y;
  
  if (isHorizontal) {
    x = AVATAR_Y_OFFSET + AVATAR_WIDTH / 2; // Position on left side
    y = lane * laneWidth + laneWidth / 2;
  } else {
    x = lane * laneWidth + laneWidth / 2;
    y = height - AVATAR_HEIGHT / 2 - AVATAR_Y_OFFSET;
  }
  
  ctx.save();
  ctx.translate(x, y);
  
  // Don't rotate avatar - keep it upright in both orientations
  
  // Draw person
  ctx.strokeStyle = '#333';
  ctx.fillStyle = '#FFB366'; // Skin tone
  ctx.lineWidth = 3;
  
  // Head (transparent)
  ctx.beginPath();
  ctx.arc(0, -25, 8, 0, Math.PI * 2);
  ctx.stroke();
  
  // Body
  ctx.beginPath();
  ctx.moveTo(0, -17);
  ctx.lineTo(0, 5);
  ctx.stroke();
  
  // Left arm
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(-8, -5);
  ctx.stroke();
  
  // Right arm extending to hold bucket
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(15, -8);
  ctx.stroke();
  
  // Legs
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.lineTo(-8, 20);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.lineTo(8, 20);
  ctx.stroke();
  
  // Draw bucket in the right hand
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  
  // Bucket body - outer shell
  ctx.fillStyle = '#355E3B';
  ctx.beginPath();
  ctx.ellipse(15, -8, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  
  // Bucket interior (blue water)
  ctx.fillStyle = '#2196f3';
  ctx.beginPath();
  ctx.ellipse(15, -8, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Bucket bottom (darker for depth)
  ctx.fillStyle = '#2A4A2A';
  ctx.beginPath();
  ctx.ellipse(15, -2, 11, 3, 0, 0, Math.PI);
  ctx.fill();
  ctx.stroke();
  
  // Bucket handle
  ctx.beginPath();
  ctx.arc(15, -8, 9, Math.PI * 0.7, Math.PI * 0.3);
  ctx.strokeStyle = '#F57E25';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  ctx.restore();
}

function drawDroplet(d) {
  let x, y;
  
  if (isHorizontal) {
    x = d.x;
    y = d.y;
  } else {
    x = d.x;
    y = d.y;
  }
  
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, DROPLET_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = COLORS[d.type];
  ctx.globalAlpha = d.type === 'black' ? 0.85 : 1;
  ctx.shadowColor = COLORS[d.type];
  ctx.shadowBlur = d.type === 'black' ? 8 : 4;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  // Droplet shine
  ctx.beginPath();
  ctx.arc(-6, -6, 5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fill();
  ctx.restore();
}
// --- Droplet Handling ---
function handleDroplet(d) {
  if (d.type === 'blue') {
    playSound('blue');
    blueStreak++;
    greenStreak = 0;
    score += 1 * blueMultiplier;
    showScoreAnim('+' + (1 * blueMultiplier), COLORS.blue);
    if (blueStreak % 5 === 0) {
      blueMultiplier *= 2;
      showScoreAnim('Blue Streak! x' + blueMultiplier, COLORS.blue);
    }
  } else if (d.type === 'green') {
    playSound('green');
    greenStreak++;
    // Check if we're ending a blue streak
    if (blueStreak > 0 && blueMultiplier > 1) {
      showScoreAnim('Streak Ended!', COLORS.green);
    }
    blueStreak = 0;
    blueMultiplier = 1;
    greenMultiplier += 1;
    score -= greenMultiplier;
    showScoreAnim('-' + greenMultiplier, COLORS.green);
    if (greenMultiplier > 1) {
      showScoreAnim('Green Penalty -' + greenMultiplier, COLORS.green);
    }
    if (greenStreak >= 5) {
      endGame();
      return;
    }
  } else if (d.type === 'black') {
    playSound('black');
    endGame();
    return;
  }
  
  // Check for new high score during gameplay
  if (score > highscore && !hasRecordCelebration) {
    highscore = score;
    localStorage.setItem('waterrun-highscore', highscore);
    let highscoreElement = $('#highscore-value');
    if (highscoreElement) {
      highscoreElement.textContent = highscore;
    }
    hasRecordCelebration = true;
    showHighScoreCelebration();
    playSound('highscore');
  }
  
  // Update score display
  let scoreElement = $('#score');
  if (scoreElement) {
    scoreElement.textContent = score;
  }
}
// --- Score Animation ---
function showScoreAnim(text, color) {
  let el = $('#score-anim');
  el.textContent = text;
  el.style.color = color;
  animatingScore = true;
  el.style.display = '';
  setTimeout(() => {
    animatingScore = false;
    el.style.display = 'none';
  }, 700);
}

// --- High Score Celebration ---
function showHighScoreCelebration() {
  // Clear any existing animations
  animatingScore = false;
  let el = $('#score-anim');
  if (el) {
    el.style.display = 'none';
    
    // Create confetti effect
    createConfetti();
    
    // Show celebration message with special styling
    el.innerHTML = '🎉 NEW HIGH SCORE! 🎉';
    el.style.color = '#F8C10E';
    el.style.fontSize = '2.5rem';
    el.style.fontWeight = 'bold';
    el.style.textShadow = '2px 2px 4px rgba(0,0,0,0.3)';
    el.style.animation = 'pulse 0.6s ease-in-out infinite alternate';
    el.style.display = '';
    
    setTimeout(() => {
      if (el) {
        el.style.display = 'none';
        el.style.fontSize = '';
        el.style.fontWeight = '';
        el.style.textShadow = '';
        el.style.animation = '';
        el.innerHTML = '';
      }
    }, 3000); // Show for 3 seconds
  }
}

function createConfetti() {
  try {
    const colors = ['#F8C10E', '#2196f3', '#43a047', '#F57E25'];
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      confetti.style.position = 'absolute';
      confetti.style.width = '10px';
      confetti.style.height = '10px';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.top = '-10px';
      confetti.style.zIndex = '1000';
      confetti.style.pointerEvents = 'none';
      confetti.style.borderRadius = '50%';
      
      document.body.appendChild(confetti);
      
      // Animate confetti falling
      const duration = Math.random() * 3000 + 2000; // 2-5 seconds
      const drift = (Math.random() - 0.5) * 200; // Random horizontal drift
      
      const animation = confetti.animate([
        { transform: 'translateY(-10px) translateX(0px) rotate(0deg)', opacity: 1 },
        { transform: `translateY(${window.innerHeight + 10}px) translateX(${drift}px) rotate(720deg)`, opacity: 0 }
      ], {
        duration: duration,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      });
      
      animation.addEventListener('finish', () => {
        try {
          if (confetti && confetti.parentNode) {
            confetti.remove();
          }
        } catch (e) {
          console.warn('Error removing confetti element:', e);
        }
      });
      
      // Failsafe cleanup after maximum duration
      setTimeout(() => {
        try {
          if (confetti && confetti.parentNode) {
            confetti.remove();
          }
        } catch (e) {
          console.warn('Error in confetti cleanup:', e);
        }
      }, duration + 1000);
    }
  } catch (e) {
    console.warn('Error creating confetti:', e);
  }
}
// --- Sound ---
function playSound(type) {
  try {
    let el = $('#sound-' + type);
    if (el) {
      el.currentTime = 0;
      el.play().catch(e => {
        console.warn('Error playing sound:', e);
      });
    }
  } catch (e) {
    console.warn('Error in playSound:', e);
  }
}
// --- Game Over ---
function endGame() {
  running = false;
  gameover = true;
  $('#top-bar').style.display = 'none';
  $('#final-score').textContent = score;
  let isHigh = false;
  if (score > highscore) {
    highscore = score;
    localStorage.setItem('waterrun-highscore', highscore);
    $('#final-highscore').textContent = highscore;
    
    // Update all highscore displays
    let highscoreElements = document.querySelectorAll('#highscore-value');
    highscoreElements.forEach(el => {
      if (el) el.textContent = highscore;
    });
    
    $('#highscore-label').classList.add('highscore-flash');
    // Only show celebration if we haven't already celebrated during gameplay
    if (!hasRecordCelebration) {
      showHighScoreCelebration();
    }
    playSound('highscore');
    isHigh = true;
  } else {
    $('#final-highscore').textContent = highscore;
  }
  showModal('#gameover-modal');
  setTimeout(() => {
    $('#highscore-label').classList.remove('highscore-flash');
  }, 1400);
}
// --- Pause ---
function pauseGame() {
  if (!running || paused || gameover) return;
  paused = true;
  showModal('#pause-modal');
}
function resumeGame() {
  if (!running || !paused) return;
  paused = false;
  hideModal('#pause-modal');
  lastFrame = performance.now();
  requestAnimationFrame(gameLoop);
}
// --- UI Helpers ---
function showOverlay(sel) { 
  let overlay = $(sel);
  overlay.removeAttribute('hidden');
  // Make overlay cover entire screen and hide canvas
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.zIndex = '9999';
  // Keep original grey background instead of black
  if (!overlay.style.backgroundColor) {
    overlay.style.backgroundColor = 'rgba(128, 128, 128, 0.95)';
  }
}

function hideOverlay(sel) { 
  let overlay = $(sel);
  overlay.setAttribute('hidden', '');
  // Reset overlay styles
  overlay.style.position = '';
  overlay.style.top = '';
  overlay.style.left = '';
  overlay.style.width = '';
  overlay.style.height = '';
  overlay.style.zIndex = '';
  overlay.style.backgroundColor = '';
}

function showModal(sel) { 
  let modal = $(sel);
  modal.removeAttribute('hidden');
  // Make modal cover entire screen and hide canvas
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.zIndex = '9999';
  // Keep original grey background instead of black
  if (!modal.style.backgroundColor) {
    modal.style.backgroundColor = 'rgba(128, 128, 128, 0.95)';
  }
  modal.style.display = 'flex';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
}

function hideModal(sel) { 
  let modal = $(sel);
  modal.setAttribute('hidden', '');
  // Reset modal styles
  modal.style.position = '';
  modal.style.top = '';
  modal.style.left = '';
  modal.style.width = '';
  modal.style.height = '';
  modal.style.zIndex = '';
  modal.style.backgroundColor = '';
  modal.style.display = '';
  modal.style.justifyContent = '';
  modal.style.alignItems = '';
}

// --- Event Handlers ---
function handleKey(e) {
  if (!running || paused || gameover) return;
  
  if (isHorizontal) {
    // Up/Down controls for horizontal layout
    if (e.key === 'ArrowUp') {
      avatarLane = clamp(avatarLane - 1, 0, lanes - 1);
    } else if (e.key === 'ArrowDown') {
      avatarLane = clamp(avatarLane + 1, 0, lanes - 1);
    }
  } else {
    // Left/Right controls for vertical layout
    if (e.key === 'ArrowLeft') {
      avatarLane = clamp(avatarLane - 1, 0, lanes - 1);
    } else if (e.key === 'ArrowRight') {
      avatarLane = clamp(avatarLane + 1, 0, lanes - 1);
    }
  }
}

// --- Touch/Swipe for Mobile ---
let touchStartX = null;
let touchStartY = null;

function handleTouchStart(e) {
  if (!running || paused || gameover) return;
  if (e.touches.length === 1) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
}

function handleTouchEnd(e) {
  if (!running || paused || gameover) return;
  if (touchStartX === null || touchStartY === null) return;
  
  let dx = e.changedTouches[0].clientX - touchStartX;
  let dy = e.changedTouches[0].clientY - touchStartY;
  
  if (isHorizontal) {
    // Vertical swipes for horizontal layout
    if (Math.abs(dy) > 30) {
      if (dy < 0) avatarLane = clamp(avatarLane - 1, 0, lanes - 1);
      else avatarLane = clamp(avatarLane + 1, 0, lanes - 1);
    }
  } else {
    // Horizontal swipes for vertical layout
    if (Math.abs(dx) > 30) {
      if (dx < 0) avatarLane = clamp(avatarLane - 1, 0, lanes - 1);
      else avatarLane = clamp(avatarLane + 1, 0, lanes - 1);
    }
  }
  
  touchStartX = null;
  touchStartY = null;
}

// --- Button Events ---
window.addEventListener('DOMContentLoaded', () => {
  canvas = $('#game-canvas');
  ctx = canvas.getContext('2d');
  setupCanvasSize();
  
  // --- Load Highscore ---
  highscore = parseInt(localStorage.getItem('waterrun-highscore') || '0', 10);
  
  // Update all highscore displays on page load
  let highscoreElements = document.querySelectorAll('#highscore-value');
  highscoreElements.forEach(el => {
    if (el) el.textContent = highscore;
  });
  
  // Also update any highscore displays in the home overlay
  let homeHighscoreElement = $('#home-overlay #highscore-value');
  if (homeHighscoreElement) {
    homeHighscoreElement.textContent = highscore;
  }
  
  // --- Hide overlays on click outside modal-content ---
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) hideModal('#' + modal.id);
    });
  });
  // --- Focus canvas for keyboard ---
  canvas.setAttribute('tabindex', '0');
  canvas.addEventListener('click', () => canvas.focus());
  // --- Show Home Overlay ---
  showOverlay('#home-overlay');
  $('#top-bar').style.display = 'none';

  // Button events
  $('#start-btn').onclick = () => {
    hideOverlay('#home-overlay');
    startGame();
  };
  $('#howto-btn').onclick = () => showModal('#howto-modal');
  $('#close-howto-btn').onclick = () => hideModal('#howto-modal');
  $('#pause-btn').onclick = pauseGame;
  $('#resume-btn').onclick = resumeGame;
  $('#quit-btn').onclick = () => {
    running = false;
    
    // Update highscore display when quitting to menu
    let homeHighscoreElement = $('#home-overlay #highscore-value');
    if (homeHighscoreElement) {
      homeHighscoreElement.textContent = highscore;
    }
    
    showOverlay('#home-overlay');
    hideModal('#pause-modal');
    $('#top-bar').style.display = 'none';
  };
  $('#restart-btn').onclick = () => {
    hideModal('#gameover-modal');
    startGame();
  };
  $('#menu-btn').onclick = () => {
    running = false;
    
    // Update highscore display when returning to menu
    let homeHighscoreElement = $('#home-overlay #highscore-value');
    if (homeHighscoreElement) {
      homeHighscoreElement.textContent = highscore;
    }
    
    showOverlay('#home-overlay');
    hideModal('#gameover-modal');
    $('#top-bar').style.display = 'none';
  };

  // Touch events
  canvas.addEventListener('touchstart', handleTouchStart, {passive:true});
  canvas.addEventListener('touchend', handleTouchEnd, {passive:true});
});

// --- Start Game ---
function startGame() {
  setupCanvasSize();
  resetGame();
  running = true;
  lastFrame = performance.now();
  requestAnimationFrame(gameLoop);
}
// --- Window Resize ---
window.addEventListener('resize', () => {
  setupCanvasSize();
});
// --- Keyboard ---
window.addEventListener('keydown', e => {
  if ($('#home-overlay').style.display !== 'none' && !$('#home-overlay').hasAttribute('hidden')) {
    let shouldStart = false;
    if (isHorizontal) {
      shouldStart = e.key === 'ArrowUp' || e.key === 'ArrowDown';
    } else {
      shouldStart = e.key === 'ArrowLeft' || e.key === 'ArrowRight';
    }
    
    if (shouldStart) {
      hideOverlay('#home-overlay');
      startGame();
    }
  }
  handleKey(e);
});
