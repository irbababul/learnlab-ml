/* ===================================================
   LearnLab — Main JS v2
   =================================================== */

// ---- roundRect polyfill (for older browsers) ----
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    const radius = Math.min(typeof r === 'number' ? r : (r && r[0]) || 0, w / 2, h / 2);
    this.beginPath();
    this.moveTo(x + radius, y);
    this.lineTo(x + w - radius, y);
    this.quadraticCurveTo(x + w, y, x + w, y + radius);
    this.lineTo(x + w, y + h - radius);
    this.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    this.lineTo(x + radius, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - radius);
    this.lineTo(x, y + radius);
    this.quadraticCurveTo(x, y, x + radius, y);
    this.closePath();
    return this;
  };
}

// ---- Sidebar Toggle ----
const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('mainContent');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function toggleSidebar() {
  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('show');
  } else {
    sidebar.classList.toggle('collapsed');
    if (mainContent) mainContent.classList.toggle('expanded');
  }
}
function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('show');
}
if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);

// ---- Category Toggle ----
function toggleCategory(id) {
  const cat = document.getElementById(id);
  if (!cat) return;
  cat.classList.toggle('collapsed');
  const body = cat.querySelector('.nav-category-body');
  if (body) body.style.display = cat.classList.contains('collapsed') ? 'none' : 'block';
}

// ---- Topic Toggle ----
function toggleTopic(id) {
  const topic = document.getElementById(id);
  if (!topic) return;
  const body = topic.querySelector('.nav-topic-body');
  if (!body) return;
  const hidden = body.style.display === 'none' || body.style.display === '';
  body.style.display = hidden ? 'block' : 'none';
  const arrow = topic.querySelector('.topic-arrow');
  if (arrow) arrow.style.transform = hidden ? '' : 'rotate(-90deg)';
}

// ---- Locked message ----
function showLockedMsg() {
  showToast('🔒 Selesaikan materi sebelumnya dulu!');
}

// ---- Toast ----
function showToast(msg, duration = 3200) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ---- Search ----
const searchInput = document.getElementById('searchInput');
if (searchInput) {
  searchInput.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.nav-item').forEach(item => {
      item.style.display = item.textContent.toLowerCase().includes(q) ? 'flex' : 'none';
    });
  });
}

// ---- XP popup ----
function showXPGain(amount) {
  let el = document.getElementById('xpPopup');
  if (!el) {
    el = document.createElement('div');
    el.id = 'xpPopup'; el.className = 'xp-popup';
    document.body.appendChild(el);
  }
  el.textContent = `+${amount} XP`;
  el.classList.remove('animate');
  void el.offsetWidth;
  el.classList.add('animate');
}

// ---- Range slider track fill ----
function updateSliderBg(slider) {
  const min = parseFloat(slider.min) || 0;
  const max = parseFloat(slider.max) || 100;
  const val = parseFloat(slider.value);
  const pct = ((val - min) / (max - min) * 100).toFixed(1);
  slider.style.background = `linear-gradient(to right,var(--accent-cyan) 0%,var(--accent-cyan) ${pct}%,rgba(255,255,255,.1) ${pct}%,rgba(255,255,255,.1) 100%)`;
}
document.addEventListener('input', e => {
  if (e.target.type === 'range') updateSliderBg(e.target);
});
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('input[type=range]').forEach(updateSliderBg);
});
