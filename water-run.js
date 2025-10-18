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
let avatarLane, isMobile, running, paused, gameover;
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
  // Responsive: fit to parent, keep aspect ratio
  let container = $('#game-container');
  let w = container.offsetWidth;
  let h = Math.round(w * 1.5);
  if (window.innerHeight < h + 120) h = window.innerHeight - 120;
  canvas.width = w;
  canvas.height = h;
  width = w;
  height = h;
  isMobile = window.innerWidth < 700;
  lanes = isMobile ? LANES_MOBILE : LANES_DESKTOP;
  laneWidth = width / lanes;
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
  $('#score').textContent = score;
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
  d.y = -DROPLET_RADIUS * 2;
  d.speed = lerp(speed, speed * 1.3, Math.random() * 0.5);
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
    ctx.moveTo(i * laneWidth, 0);
    ctx.lineTo(i * laneWidth, height);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash for other drawing
  }
  // Draw avatar
  drawAvatar(avatarLane);
  // Move and draw droplets
  for (let i = droplets.length - 1; i >= 0; --i) {
    let d = droplets[i];
    d.y += d.speed;
    drawDroplet(d);
    // Collision
    if (
      d.lane === avatarLane &&
      d.y + DROPLET_RADIUS > height - AVATAR_HEIGHT - AVATAR_Y_OFFSET &&
      d.y - DROPLET_RADIUS < height - AVATAR_Y_OFFSET
    ) {
      handleDroplet(d);
      droplets.splice(i, 1);
      releaseDroplet(d);
      continue;
    }
    // Out of bounds
    if (d.y - DROPLET_RADIUS > height) {
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
  let x = lane * laneWidth + laneWidth / 2;
  let y = height - AVATAR_HEIGHT / 2 - AVATAR_Y_OFFSET;
  
  ctx.save();
  ctx.translate(x, y);
  
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
  let x = d.lane * laneWidth + laneWidth / 2;
  let y = d.y;
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
    $('#highscore-value').textContent = highscore;
    hasRecordCelebration = true;
    showHighScoreCelebration();
    playSound('highscore');
  }
  
  $('#score').textContent = score;
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
    $('#highscore-value').textContent = highscore;
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
function showOverlay(sel) { $(sel).removeAttribute('hidden'); }
function hideOverlay(sel) { $(sel).setAttribute('hidden', ''); }
function showModal(sel) { $(sel).removeAttribute('hidden'); }
function hideModal(sel) { $(sel).setAttribute('hidden', ''); }
// --- Event Handlers ---
function handleKey(e) {
  if (!running || paused || gameover) return;
  if (e.key === 'ArrowLeft') {
    avatarLane = clamp(avatarLane - 1, 0, lanes - 1);
  } else if (e.key === 'ArrowRight') {
    avatarLane = clamp(avatarLane + 1, 0, lanes - 1);
  }
}
// --- Touch/Swipe for Mobile ---
let touchStartX = null;
function handleTouchStart(e) {
  if (!running || paused || gameover) return;
  if (e.touches.length === 1) {
    touchStartX = e.touches[0].clientX;
  }
}
function handleTouchEnd(e) {
  if (!running || paused || gameover) return;
  if (touchStartX === null) return;
  let dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 30) {
    if (dx < 0) avatarLane = clamp(avatarLane - 1, 0, lanes - 1);
    else avatarLane = clamp(avatarLane + 1, 0, lanes - 1);
  }
  touchStartX = null;
}
// --- Button Events ---
window.addEventListener('DOMContentLoaded', () => {
  canvas = $('#game-canvas');
  ctx = canvas.getContext('2d');
  setupCanvasSize();
  // --- Load Highscore ---
  highscore = parseInt(localStorage.getItem('waterrun-highscore') || '0', 10);
  $('#highscore-value').textContent = highscore;
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
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      hideOverlay('#home-overlay');
      startGame();
    }
  }
  handleKey(e);
});
