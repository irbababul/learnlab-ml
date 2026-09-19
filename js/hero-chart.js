/* ===================================================
   Hero Page — Animated Demo Chart (Simple Regression Preview)
   =================================================== */
(function () {
  const canvas = document.getElementById('heroChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Responsive: fit to container
  function resizeHero() {
    const container = canvas.parentElement;
    if (!container) return;
    const cw = Math.min(container.clientWidth, 420);
    canvas.width = cw;
    canvas.height = Math.round(cw * 0.667);
  }
  resizeHero();
  window.addEventListener('resize', resizeHero);

  let W, H;
  function getDims() { W = canvas.width; H = canvas.height; }

  // Sample data points
  const raw = [
    [30,120],[50,200],[70,280],[40,160],[90,340],
    [60,230],[80,310],[55,210],[75,295],[45,175],
    [65,255],[85,325]
  ];
  // Scale to canvas
  const pad = 40;
  const xMin = 25, xMax = 100, yMin = 100, yMax = 370;
  function scaleX(v) { return pad + (v - xMin) / (xMax - xMin) * (W - 2 * pad); }
  function scaleY(v) { return H - pad - (v - yMin) / (yMax - yMin) * (H - 2 * pad); }

  // Regression line params (animate slope growing)
  let t = 0;
  const TRUE_SLOPE = (350 - 110) / (100 - 25); // ≈ 3.2
  const TRUE_INTERCEPT = 110 - TRUE_SLOPE * 25;

  function draw() {
    getDims();
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const x = pad + i * (W - 2 * pad) / 5;
      const y = pad + i * (H - 2 * pad) / 5;
      ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, H - pad); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, pad); ctx.lineTo(pad, H - pad);
    ctx.lineTo(W - pad, H - pad);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = 'rgba(148,163,184,0.7)';
    ctx.font = '11px Rajdhani, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('X (Fitur)', W / 2, H - 8);
    ctx.save();
    ctx.translate(12, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Y (Target)', 0, 0);
    ctx.restore();

    // Animated slope (lerp from flat to true)
    const progress = Math.min(t / 180, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const slope = TRUE_SLOPE * eased;
    const intercept = TRUE_INTERCEPT + (1 - eased) * (yMax - yMin) * 0.4;

    // Regression line
    const x1 = xMin, y1 = slope * x1 + intercept;
    const x2 = xMax, y2 = slope * x2 + intercept;
    const grad = ctx.createLinearGradient(scaleX(x1), 0, scaleX(x2), 0);
    grad.addColorStop(0, '#00d4ff');
    grad.addColorStop(1, '#8b5cf6');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(scaleX(x1), scaleY(y1));
    ctx.lineTo(scaleX(x2), scaleY(y2));
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Residual lines (faint)
    if (progress > 0.5) {
      const alpha = (progress - 0.5) * 2;
      raw.forEach(([rx, ry]) => {
        const pred = slope * rx + intercept;
        ctx.strokeStyle = `rgba(239,68,68,${0.25 * alpha})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(scaleX(rx), scaleY(ry));
        ctx.lineTo(scaleX(rx), scaleY(pred));
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }

    // Data points
    raw.forEach(([rx, ry]) => {
      ctx.beginPath();
      ctx.arc(scaleX(rx), scaleY(ry), 5, 0, Math.PI * 2);
      ctx.fillStyle = '#00d4ff';
      ctx.shadowColor = '#00d4ff';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(0,212,255,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Label
    ctx.fillStyle = 'rgba(0,212,255,0.8)';
    ctx.font = '600 12px Rajdhani, sans-serif';
    ctx.textAlign = 'left';
    if (progress > 0.7) {
      ctx.fillText(`ŷ = ${slope.toFixed(2)}x + ${intercept.toFixed(1)}`, pad + 10, pad + 20);
    }

    t++;
    requestAnimationFrame(draw);
  }

  draw();
})();
