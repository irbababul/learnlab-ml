/* ===================================================
   Regression Graph v2
   Mode A: b0/b1 slider (fixed dataset, manipulate line)
   Mode B: click-to-add / drag points
   =================================================== */
(function () {
  const canvas = document.getElementById('regressionCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const PAD = { top: 36, right: 24, bottom: 52, left: 58 };

  // --- Synthetic dataset (fixed, n=25, y = 1.8x + 3 + noise) ---
  const FIXED_DATA = [
    {x:0.5,y:4.2},{x:1.0,y:4.8},{x:1.5,y:5.9},{x:2.0,y:6.5},{x:2.5,y:8.1},
    {x:3.0,y:8.7},{x:3.5,y:9.6},{x:4.0,y:10.5},{x:4.5,y:11.2},{x:5.0,y:12.3},
    {x:5.5,y:13.0},{x:6.0,y:13.8},{x:6.5,y:15.1},{x:7.0,y:15.4},{x:7.5,y:16.6},
    {x:8.0,y:17.2},{x:8.5,y:18.4},{x:9.0,y:19.1},{x:9.5,y:20.0},{x:10.0,y:20.8},
    {x:2.2,y:7.3},{x:4.8,y:12.0},{x:6.8,y:14.7},{x:7.8,y:16.9},{x:9.2,y:19.6}
  ];

  // --- State ---
  let mode = 'slider'; // 'slider' | 'interactive'
  let b0 = 3.0, b1 = 1.8; // current params (slider mode)
  let userPoints = [...FIXED_DATA.map(p=>({...p}))]; // interactive mode points
  let showResiduals = true, showCI = false;
  let dragging = null;
  let W, H, PW, PH;
  let initialized = false;

  // Expose for sync with cost surface
  window.regressionState = { b0, b1, data: FIXED_DATA };

  function resize() {
    const container = canvas.parentElement;
    const cw = Math.min(container.clientWidth - 2, 720);
    canvas.width = cw;
    // taller on mobile for better readability
    const hRatio = window.innerWidth <= 600 ? 0.75 : 0.52;
    canvas.height = Math.round(cw * hRatio);
    W = canvas.width; H = canvas.height;
    PW = W - PAD.left - PAD.right;
    PH = H - PAD.top - PAD.bottom;
  }

  const xMin=0, xMax=11, yMin=0, yMax=25;
  function toCx(x) { return PAD.left + (x-xMin)/(xMax-xMin)*PW; }
  function toCy(y) { return PAD.top + (1-(y-yMin)/(yMax-yMin))*PH; }
  function toDataX(cx) { return xMin + (cx-PAD.left)/PW*(xMax-xMin); }
  function toDataY(cy) { return yMin + (1-(cy-PAD.top)/PH)*(yMax-yMin); }
  function inPlot(cx,cy) { return cx>=PAD.left && cx<=W-PAD.right && cy>=PAD.top && cy<=H-PAD.bottom; }

  function computeOLS(pts) {
    const n = pts.length; if(n<2) return null;
    const mx = pts.reduce((s,p)=>s+p.x,0)/n;
    const my = pts.reduce((s,p)=>s+p.y,0)/n;
    let num=0, den=0;
    pts.forEach(p=>{ num+=(p.x-mx)*(p.y-my); den+=(p.x-mx)**2; });
    if(den===0) return null;
    const b1=num/den, b0=my-b1*mx;
    const mse=pts.reduce((s,p)=>s+(p.y-(b1*p.x+b0))**2,0)/n;
    const ss_res=pts.reduce((s,p)=>s+(p.y-(b1*p.x+b0))**2,0);
    const ss_tot=pts.reduce((s,p)=>s+(p.y-my)**2,0);
    const r2=ss_tot>0?1-ss_res/ss_tot:0;
    return {b0, b1, mse, rmse:Math.sqrt(mse), r2};
  }

  function computeMSE(pts, cb0, cb1) {
    return pts.reduce((s,p)=>s+(p.y-(cb1*p.x+cb0))**2,0)/pts.length;
  }

  function updateInfoPanel(pts, cb0, cb1) {
    const mse = computeMSE(pts, cb0, cb1);
    const rmse = Math.sqrt(mse);
    const n = pts.length;
    const my = pts.reduce((s,p)=>s+p.y,0)/n;
    const ss_res = pts.reduce((s,p)=>s+(p.y-(cb1*p.x+cb0))**2,0);
    const ss_tot = pts.reduce((s,p)=>s+(p.y-my)**2,0);
    const r2 = ss_tot>0?1-ss_res/ss_tot:0;
    const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
    set('infoW', cb1.toFixed(3));
    set('infoB', cb0.toFixed(3));
    set('infoMSE', mse.toFixed(3));
    set('infoRMSE', rmse.toFixed(3));
    set('infoR2', r2.toFixed(3));
    set('infoN', n);
    // Notify cost surface
    if(window.regressionState) { window.regressionState.b0=cb0; window.regressionState.b1=cb1; }
    if(window.updateCostSurfacePoint) window.updateCostSurfacePoint(cb0, cb1);
  }

  function draw() {
    if(!W) return;
    ctx.clearRect(0,0,W,H);

    // bg
    ctx.fillStyle='rgba(0,0,0,0.18)';
    ctx.roundRect(0,0,W,H,12); ctx.fill();

    // grid
    ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1;
    for(let i=0;i<=10;i++){
      ctx.beginPath(); ctx.moveTo(toCx(xMin+i*(xMax-xMin)/10),PAD.top);
      ctx.lineTo(toCx(xMin+i*(xMax-xMin)/10),H-PAD.bottom); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(PAD.left,toCy(yMin+i*(yMax-yMin)/10));
      ctx.lineTo(W-PAD.right,toCy(yMin+i*(yMax-yMin)/10)); ctx.stroke();
    }
    // axes
    ctx.strokeStyle='rgba(255,255,255,0.18)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(PAD.left,PAD.top); ctx.lineTo(PAD.left,H-PAD.bottom);
    ctx.lineTo(W-PAD.right,H-PAD.bottom); ctx.stroke();

    // axis numbers
    ctx.fillStyle='rgba(148,163,184,0.65)'; ctx.font='11px Rajdhani,sans-serif';
    ctx.textAlign='center';
    for(let i=0;i<=10;i+=2){
      const xv=xMin+i*(xMax-xMin)/10;
      ctx.fillText(xv.toFixed(0), toCx(xv), H-PAD.bottom+16);
    }
    ctx.textAlign='right';
    for(let i=0;i<=5;i++){
      const yv=yMin+i*(yMax-yMin)/5;
      ctx.fillText(yv.toFixed(0), PAD.left-6, toCy(yv)+4);
    }
    ctx.textAlign='center';
    ctx.fillText('X (Fitur)', PAD.left+PW/2, H-6);
    ctx.save(); ctx.translate(14,PAD.top+PH/2); ctx.rotate(-Math.PI/2);
    ctx.fillText('Y (Target)',0,0); ctx.restore();

    const pts = mode==='slider' ? FIXED_DATA : userPoints;
    const cb0 = mode==='slider' ? b0 : (computeOLS(pts)?.b0||0);
    const cb1 = mode==='slider' ? b1 : (computeOLS(pts)?.b1||0);

    if(pts.length>=2){
      // Confidence Band
      if(showCI && pts.length>=4){
        const n=pts.length;
        const mx=pts.reduce((s,p)=>s+p.x,0)/n;
        const mse=computeMSE(pts,cb0,cb1);
        const seRes=Math.sqrt(mse);
        const sxx=pts.reduce((s,p)=>s+(p.x-mx)**2,0);
        const steps=60;
        ctx.fillStyle='rgba(0,212,255,0.07)';
        ctx.beginPath();
        for(let i=0;i<=steps;i++){
          const xi=xMin+(i/steps)*(xMax-xMin);
          const se=seRes*Math.sqrt(1/n+(xi-mx)**2/sxx);
          const hi=cb1*xi+cb0+1.96*se;
          const {cx,cy}={cx:toCx(xi),cy:toCy(hi)};
          i===0?ctx.moveTo(cx,cy):ctx.lineTo(cx,cy);
        }
        for(let i=steps;i>=0;i--){
          const xi=xMin+(i/steps)*(xMax-xMin);
          const se=seRes*Math.sqrt(1/n+(xi-mx)**2/sxx);
          const lo=cb1*xi+cb0-1.96*se;
          ctx.lineTo(toCx(xi),toCy(lo));
        }
        ctx.closePath(); ctx.fill();
      }

      // Regression line
      const y1=cb1*xMin+cb0, y2=cb1*xMax+cb0;
      const grd=ctx.createLinearGradient(toCx(xMin),0,toCx(xMax),0);
      grd.addColorStop(0,'#00d4ff'); grd.addColorStop(1,'#8b5cf6');
      ctx.strokeStyle=grd; ctx.lineWidth=2.5;
      ctx.shadowColor='#00d4ff'; ctx.shadowBlur=8;
      ctx.beginPath();
      ctx.moveTo(toCx(xMin), Math.max(PAD.top, Math.min(H-PAD.bottom, toCy(y1))));
      ctx.lineTo(toCx(xMax), Math.max(PAD.top, Math.min(H-PAD.bottom, toCy(y2))));
      ctx.stroke(); ctx.shadowBlur=0;

      // Residuals
      if(showResiduals){
        pts.forEach(p=>{
          const pred=cb1*p.x+cb0;
          const err=Math.abs(p.y-pred);
          const alpha=Math.min(0.8, 0.2+err/5);
          ctx.strokeStyle=`rgba(239,68,68,${alpha})`;
          ctx.lineWidth=1.5; ctx.setLineDash([4,3]);
          ctx.beginPath();
          ctx.moveTo(toCx(p.x),toCy(p.y));
          ctx.lineTo(toCx(p.x),toCy(pred));
          ctx.stroke(); ctx.setLineDash([]);
          // error²  square visual
          const ey=Math.abs(toCy(p.y)-toCy(pred));
          ctx.fillStyle=`rgba(239,68,68,0.07)`;
          ctx.fillRect(toCx(p.x)-ey/2, Math.min(toCy(p.y),toCy(pred)), ey, ey);
        });
      }

      // Equation label
      const sign=cb0>=0?'+':'-';
      ctx.font='bold 13px Share Tech Mono,monospace';
      ctx.textAlign='left'; ctx.fillStyle='rgba(0,212,255,0.9)';
      ctx.fillText(`ŷ = ${cb1.toFixed(2)}x ${sign} ${Math.abs(cb0).toFixed(2)}`, PAD.left+10, PAD.top+20);
    }

    // Data points
    pts.forEach((p,i)=>{
      const cx=toCx(p.x), cy=toCy(p.y);
      ctx.beginPath(); ctx.arc(cx,cy,9,0,Math.PI*2);
      ctx.fillStyle='rgba(0,212,255,0.1)'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx,cy,5.5,0,Math.PI*2);
      ctx.fillStyle=dragging===i?'#f59e0b':'#00d4ff';
      ctx.shadowColor=dragging===i?'#f59e0b':'#00d4ff'; ctx.shadowBlur=10;
      ctx.fill(); ctx.shadowBlur=0;
      ctx.strokeStyle='rgba(255,255,255,0.25)'; ctx.lineWidth=1.5; ctx.stroke();
    });

    updateInfoPanel(pts, cb0, cb1);
  }

  // ---- Slider mode controls ----
  window.updateB0 = function(v) {
    b0 = parseFloat(v);
    document.getElementById('b0Val').textContent = parseFloat(v).toFixed(2);
    updateSliderTrack(document.getElementById('b0Slider'));
    draw();
  };
  window.updateB1 = function(v) {
    b1 = parseFloat(v);
    document.getElementById('b1Val').textContent = parseFloat(v).toFixed(2);
    updateSliderTrack(document.getElementById('b1Slider'));
    draw();
  };
  window.findOLS = function() {
    const ols = computeOLS(FIXED_DATA);
    if(!ols) return;
    b0=ols.b0; b1=ols.b1;
    const sl0=document.getElementById('b0Slider');
    const sl1=document.getElementById('b1Slider');
    if(sl0){ sl0.value=b0.toFixed(2); document.getElementById('b0Val').textContent=b0.toFixed(2); updateSliderTrack(sl0); }
    if(sl1){ sl1.value=b1.toFixed(2); document.getElementById('b1Val').textContent=b1.toFixed(2); updateSliderTrack(sl1); }
    showToast(`✅ OLS: b0=${b0.toFixed(3)}, b1=${b1.toFixed(3)}`);
    draw();
  };

  function updateSliderTrack(sl) {
    if(!sl) return;
    const min=parseFloat(sl.min), max=parseFloat(sl.max), val=parseFloat(sl.value);
    const pct=((val-min)/(max-min)*100).toFixed(1);
    sl.style.background=`linear-gradient(to right,var(--accent-cyan) 0%,var(--accent-cyan) ${pct}%,rgba(255,255,255,0.1) ${pct}%,rgba(255,255,255,0.1) 100%)`;
  }

  // ---- Mode switch ----
  window.setGraphMode = function(m) {
    mode = m;
    const sliders = document.getElementById('regrSliders');
    const interControls = document.getElementById('regrInterControls');
    if(sliders) sliders.style.display = m==='slider'?'block':'none';
    if(interControls) interControls.style.display = m==='interactive'?'flex':'none';
    const hint = document.getElementById('graphHint');
    if(hint) hint.textContent = m==='slider'
      ? '💡 Geser slider b0/b1 untuk melihat efek langsung terhadap garis dan MSE.'
      : '💡 Klik untuk tambah titik. Geser ke mode Geser untuk drag titik.';
    document.querySelectorAll('.mode-btn').forEach(b=>b.classList.toggle('active', b.dataset.mode===m));
    draw();
  };

  window.setInterMode = function(m) {
    mode = m==='add'?'iadd':'idrag';
    canvas.style.cursor = m==='add'?'crosshair':'grab';
    document.querySelectorAll('.imode-btn').forEach(b=>b.classList.toggle('active',b.dataset.imode===m));
  };
  window.toggleResiduals = function() {
    showResiduals=!showResiduals;
    const btn=document.getElementById('btnShowResidual');
    if(btn) btn.classList.toggle('active',showResiduals);
    draw();
  };
  window.toggleCI = function() {
    showCI=!showCI;
    const btn=document.getElementById('btnShowCI');
    if(btn) btn.classList.toggle('active',showCI);
    draw();
  };
  window.resetPoints = function() {
    userPoints=[...FIXED_DATA.map(p=>({...p}))];
    draw(); showToast('🗑️ Data direset ke default!');
  };

  // ---- Mouse events ----
  function getPos(e){
    const r=canvas.getBoundingClientRect();
    const sx=W/r.width, sy=H/r.height;
    const cx=e.touches?e.touches[0].clientX:e.clientX;
    const cy=e.touches?e.touches[0].clientY:e.clientY;
    return {cx:(cx-r.left)*sx, cy:(cy-r.top)*sy};
  }
  function nearPoint(cx,cy,thr=16){
    const pts=mode.startsWith('i')?userPoints:[];
    let best=-1, bd=Infinity;
    pts.forEach((p,i)=>{
      const d=Math.hypot(toCx(p.x)-cx, toCy(p.y)-cy);
      if(d<thr&&d<bd){best=i;bd=d;}
    });
    return best;
  }

  canvas.addEventListener('mousedown',e=>{
    if(mode==='slider') return;
    const {cx,cy}=getPos(e);
    if(!inPlot(cx,cy)) return;
    if(mode==='idrag'){ dragging=nearPoint(cx,cy); return; }
    if(mode==='iadd'){
      userPoints.push({
        x:Math.max(xMin+0.1,Math.min(xMax-0.1,toDataX(cx))),
        y:Math.max(yMin+0.1,Math.min(yMax-0.1,toDataY(cy)))
      });
      draw();
    }
  });
  canvas.addEventListener('mousemove',e=>{
    if(dragging===null||dragging<0) return;
    const {cx,cy}=getPos(e);
    userPoints[dragging].x=Math.max(xMin+0.1,Math.min(xMax-0.1,toDataX(cx)));
    userPoints[dragging].y=Math.max(yMin+0.1,Math.min(yMax-0.1,toDataY(cy)));
    draw();
  });
  canvas.addEventListener('mouseup',()=>{dragging=null; draw();});
  canvas.addEventListener('mouseleave',()=>{dragging=null;});
  canvas.addEventListener('touchstart',e=>{
    e.preventDefault();
    const {cx,cy}=getPos(e); if(!inPlot(cx,cy)) return;
    if(mode==='idrag'){dragging=nearPoint(cx,cy,22); return;}
    if(mode==='iadd'){
      userPoints.push({
        x:Math.max(xMin+0.1,Math.min(xMax-0.1,toDataX(cx))),
        y:Math.max(yMin+0.1,Math.min(yMax-0.1,toDataY(cy)))
      });
      draw();
    }
  },{passive:false});
  canvas.addEventListener('touchmove',e=>{
    e.preventDefault();
    if(dragging===null||dragging<0) return;
    const {cx,cy}=getPos(e);
    userPoints[dragging].x=Math.max(xMin+0.1,Math.min(xMax-0.1,toDataX(cx)));
    userPoints[dragging].y=Math.max(yMin+0.1,Math.min(yMax-0.1,toDataY(cy)));
    draw();
  },{passive:false});
  canvas.addEventListener('touchend',()=>{dragging=null; draw();});

  // ---- Init ----
  window.initRegressionGraph = function() {
    resize();
    draw();
    // init slider tracks
    ['b0Slider','b1Slider'].forEach(id=>{
      const sl=document.getElementById(id);
      if(sl) updateSliderTrack(sl);
    });
    initialized = true;
  };

  window.addEventListener('resize',()=>{ if(initialized){resize();draw();} });
})();
