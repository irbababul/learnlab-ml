/* ===================================================
   Cost Surface — 2D Contour Plot of J(b0, b1)
   Shows current (b0,b1) point, animated GD path
   =================================================== */
(function () {
  const canvas = document.getElementById('costSurfaceCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // dataset (same as regression-graph)
  const DATA = [
    {x:0.5,y:4.2},{x:1.0,y:4.8},{x:1.5,y:5.9},{x:2.0,y:6.5},{x:2.5,y:8.1},
    {x:3.0,y:8.7},{x:3.5,y:9.6},{x:4.0,y:10.5},{x:4.5,y:11.2},{x:5.0,y:12.3},
    {x:5.5,y:13.0},{x:6.0,y:13.8},{x:6.5,y:15.1},{x:7.0,y:15.4},{x:7.5,y:16.6},
    {x:8.0,y:17.2},{x:8.5,y:18.4},{x:9.0,y:19.1},{x:9.5,y:20.0},{x:10.0,y:20.8},
    {x:2.2,y:7.3},{x:4.8,y:12.0},{x:6.8,y:14.7},{x:7.8,y:16.9},{x:9.2,y:19.6}
  ];

  // Parameter ranges for contour
  const B0_MIN=-5, B0_MAX=10, B1_MIN=-2, B1_MAX=5;
  const GRID=80; // contour resolution

  let W, H, PAD={top:36,right:24,bottom:52,left:64};
  let PW, PH;
  let contourCache=null;
  let currentB0=3.0, currentB1=1.8;
  let gdPath=[];
  let initialized=false;

  function resize(){
    const container=canvas.parentElement;
    const cw=Math.min(container.clientWidth-2,680);
    canvas.width=cw; canvas.height=Math.round(cw*0.72);
    W=canvas.width; H=canvas.height;
    PW=W-PAD.left-PAD.right; PH=H-PAD.top-PAD.bottom;
    contourCache=null; // invalidate cache
  }

  function computeMSE(b0,b1){
    return DATA.reduce((s,p)=>s+(p.y-(b1*p.x+b0))**2,0)/DATA.length;
  }

  function toCx(b0){ return PAD.left+(b0-B0_MIN)/(B0_MAX-B0_MIN)*PW; }
  function toCy(b1){ return PAD.top+(1-(b1-B1_MIN)/(B1_MAX-B1_MIN))*PH; }
  function toB0(cx){ return B0_MIN+(cx-PAD.left)/PW*(B0_MAX-B0_MIN); }
  function toB1(cy){ return B1_MIN+(1-(cy-PAD.top)/PH)*(B1_MAX-B1_MIN); }

  function buildContour(){
    // Pre-compute MSE grid
    const grid=[];
    let minJ=Infinity, maxJ=0;
    for(let i=0;i<=GRID;i++){
      grid[i]=[];
      for(let j=0;j<=GRID;j++){
        const b0=B0_MIN+i*(B0_MAX-B0_MIN)/GRID;
        const b1=B1_MIN+j*(B1_MAX-B1_MIN)/GRID;
        const j_val=computeMSE(b0,b1);
        grid[i][j]=j_val;
        if(j_val<minJ) minJ=j_val;
        if(j_val>maxJ) maxJ=j_val;
      }
    }
    return {grid, minJ, maxJ};
  }

  // Color map: deep blue (low cost) → cyan → yellow → red (high cost)
  function costColor(normalized){
    // normalized 0..1
    const t=Math.sqrt(normalized); // sqrt for better visual spread
    let r,g,b;
    if(t<0.25){
      const s=t/0.25;
      r=Math.round(10+s*0); g=Math.round(30+s*150); b=Math.round(80+s*175);
    } else if(t<0.5){
      const s=(t-0.25)/0.25;
      r=Math.round(10+s*50); g=Math.round(180+s*30); b=Math.round(255-s*255);
    } else if(t<0.75){
      const s=(t-0.5)/0.25;
      r=Math.round(60+s*195); g=Math.round(210-s*90); b=Math.round(0);
    } else {
      const s=(t-0.75)/0.25;
      r=Math.round(255); g=Math.round(120-s*120); b=Math.round(0);
    }
    return `rgb(${r},${g},${b})`;
  }

  function drawContour(cache){
    const {grid,minJ,maxJ}=cache;
    const cw=PW/GRID, ch=PH/GRID;
    for(let i=0;i<GRID;i++){
      for(let j=0;j<GRID;j++){
        const norm=(grid[i][j]-minJ)/(maxJ-minJ+0.001);
        ctx.fillStyle=costColor(norm);
        ctx.fillRect(PAD.left+i*cw, PAD.top+(GRID-1-j)*ch, cw+1, ch+1);
      }
    }
    // Contour lines (isocurves)
    const levels=8;
    for(let lv=1;lv<levels;lv++){
      const threshold=minJ+(maxJ-minJ)*(lv/levels);
      ctx.strokeStyle=`rgba(255,255,255,${0.12+lv*0.01})`;
      ctx.lineWidth=0.7;
      // Simple marching: highlight cells near threshold
      for(let i=0;i<GRID-1;i++){
        for(let j=0;j<GRID-1;j++){
          const v=grid[i][j];
          const v2=grid[i+1][j];
          if((v<threshold)!==(v2<threshold)){
            const x=PAD.left+(i+0.5)*cw;
            const y1=PAD.top+(GRID-1-j)*ch;
            ctx.beginPath(); ctx.moveTo(x,y1); ctx.lineTo(x,y1-ch); ctx.stroke();
          }
        }
      }
    }
  }

  function draw(){
    if(!W) return;
    ctx.clearRect(0,0,W,H);

    // bg
    ctx.fillStyle='rgba(6,11,20,0.95)';
    ctx.fillRect(0,0,W,H);

    if(!contourCache) contourCache=buildContour();
    drawContour(contourCache);

    // Axes overlay
    ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=1.5;
    ctx.beginPath();
    ctx.moveTo(PAD.left,PAD.top); ctx.lineTo(PAD.left,H-PAD.bottom);
    ctx.lineTo(W-PAD.right,H-PAD.bottom); ctx.stroke();

    // Axis ticks & labels
    ctx.fillStyle='rgba(200,220,240,0.7)'; ctx.font='11px Rajdhani,sans-serif';
    ctx.textAlign='center';
    for(let i=0;i<=5;i++){
      const b0v=B0_MIN+i*(B0_MAX-B0_MIN)/5;
      ctx.fillText(b0v.toFixed(1), toCx(b0v), H-PAD.bottom+16);
    }
    ctx.textAlign='right';
    for(let i=0;i<=5;i++){
      const b1v=B1_MIN+i*(B1_MAX-B1_MIN)/5;
      ctx.fillText(b1v.toFixed(1), PAD.left-5, toCy(b1v)+4);
    }
    ctx.textAlign='center';
    ctx.fillStyle='rgba(200,220,240,0.8)'; ctx.font='12px Rajdhani,sans-serif';
    ctx.fillText('b₀ (intercept)', PAD.left+PW/2, H-6);
    ctx.save(); ctx.translate(16,PAD.top+PH/2); ctx.rotate(-Math.PI/2);
    ctx.fillText('b₁ (slope)',0,0); ctx.restore();

    // Title
    ctx.textAlign='left'; ctx.font='bold 12px Orbitron,monospace';
    ctx.fillStyle='rgba(0,212,255,0.8)';
    ctx.fillText('J(b₀, b₁) — Cost Surface', PAD.left+8, PAD.top+18);

    // GD path
    if(gdPath.length>1){
      ctx.strokeStyle='rgba(245,158,11,0.85)'; ctx.lineWidth=2;
      ctx.beginPath();
      gdPath.forEach((pt,i)=>{
        const cx=toCx(pt.b0), cy=toCy(pt.b1);
        i===0?ctx.moveTo(cx,cy):ctx.lineTo(cx,cy);
      });
      ctx.stroke();
      gdPath.forEach((pt,i)=>{
        if(i%5===0||i===gdPath.length-1){
          ctx.beginPath(); ctx.arc(toCx(pt.b0),toCy(pt.b1),3,0,Math.PI*2);
          ctx.fillStyle='rgba(245,158,11,0.9)'; ctx.fill();
        }
      });
    }

    // Current point
    const cx=toCx(currentB0), cy=toCy(currentB1);
    const mse=computeMSE(currentB0,currentB1);
    // glow ring
    ctx.beginPath(); ctx.arc(cx,cy,14,0,Math.PI*2);
    ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx,cy,9,0,Math.PI*2);
    ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx,cy,5,0,Math.PI*2);
    ctx.fillStyle='#fff'; ctx.shadowColor='#fff'; ctx.shadowBlur=12;
    ctx.fill(); ctx.shadowBlur=0;

    // MSE label near point
    ctx.fillStyle='rgba(255,255,255,0.9)';
    ctx.font='bold 11px Share Tech Mono,monospace';
    ctx.textAlign='left';
    const lx=cx+14, ly=cy-8;
    ctx.fillText(`J=${mse.toFixed(2)}`, lx>W-80?cx-70:lx, ly<PAD.top+12?cy+18:ly);

    // Optimal point marker
    const ols=computeOLS();
    if(ols){
      const ox=toCx(ols.b0), oy=toCy(ols.b1);
      ctx.beginPath(); ctx.arc(ox,oy,7,0,Math.PI*2);
      ctx.strokeStyle='rgba(16,185,129,0.9)'; ctx.lineWidth=2.5;
      ctx.shadowColor='#10b981'; ctx.shadowBlur=10; ctx.stroke(); ctx.shadowBlur=0;
      ctx.fillStyle='rgba(16,185,129,0.3)'; ctx.fill();
      // cross
      ctx.strokeStyle='rgba(16,185,129,0.9)'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(ox-10,oy); ctx.lineTo(ox+10,oy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox,oy-10); ctx.lineTo(ox,oy+10); ctx.stroke();
    }

    // Color legend
    drawLegend(contourCache.minJ, contourCache.maxJ);

    // Update info
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    set('csB0', currentB0.toFixed(3));
    set('csB1', currentB1.toFixed(3));
    set('csMSE', mse.toFixed(3));
    if(ols){ set('csOptB0',ols.b0.toFixed(3)); set('csOptB1',ols.b1.toFixed(3));
      set('csOptMSE',computeMSE(ols.b0,ols.b1).toFixed(3)); }
  }

  function drawLegend(minJ, maxJ){
    const lx=W-PAD.right-16, ly=PAD.top+10;
    const lh=Math.min(140, PH*0.6), lw=14;
    const steps=40;
    for(let i=0;i<steps;i++){
      const norm=i/steps;
      ctx.fillStyle=costColor(norm);
      ctx.fillRect(lx, ly+lh*(1-norm/1)*(steps-1-i)/steps*steps/steps, lw, lh/steps+1);
    }
    // Proper gradient legend
    const grad=ctx.createLinearGradient(0,ly+lh,0,ly);
    grad.addColorStop(0,costColor(0)); grad.addColorStop(0.5,costColor(0.5)); grad.addColorStop(1,costColor(1));
    ctx.fillStyle=grad; ctx.fillRect(lx,ly,lw,lh);
    ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1; ctx.strokeRect(lx,ly,lw,lh);
    ctx.fillStyle='rgba(200,220,240,0.7)'; ctx.font='10px Rajdhani,sans-serif';
    ctx.textAlign='left';
    ctx.fillText(maxJ.toFixed(0),lx+lw+3,ly+8);
    ctx.fillText(((maxJ+minJ)/2).toFixed(0),lx+lw+3,ly+lh/2+4);
    ctx.fillText(minJ.toFixed(0),lx+lw+3,ly+lh);
  }

  function computeOLS(){
    const n=DATA.length;
    const mx=DATA.reduce((s,p)=>s+p.x,0)/n;
    const my=DATA.reduce((s,p)=>s+p.y,0)/n;
    let num=0,den=0;
    DATA.forEach(p=>{num+=(p.x-mx)*(p.y-my);den+=(p.x-mx)**2;});
    if(den===0) return null;
    const b1=num/den,b0=my-b1*mx;
    return {b0,b1};
  }

  // Click on canvas to set b0/b1
  canvas.addEventListener('click',e=>{
    const r=canvas.getBoundingClientRect();
    const sx=W/r.width,sy=H/r.height;
    const cx=(e.clientX-r.left)*sx, cy=(e.clientY-r.top)*sy;
    if(cx>=PAD.left&&cx<=W-PAD.right&&cy>=PAD.top&&cy<=H-PAD.bottom){
      currentB0=toB0(cx); currentB1=toB1(cy);
      // sync sliders
      syncSliders(currentB0,currentB1);
      draw();
    }
  });

  function syncSliders(b0,b1){
    const sl0=document.getElementById('b0Slider');
    const sl1=document.getElementById('b1Slider');
    if(sl0&&parseFloat(sl0.min)<=b0&&b0<=parseFloat(sl0.max)){
      sl0.value=b0.toFixed(2);
      const el=document.getElementById('b0Val');if(el)el.textContent=b0.toFixed(2);
    }
    if(sl1&&parseFloat(sl1.min)<=b1&&b1<=parseFloat(sl1.max)){
      sl1.value=b1.toFixed(2);
      const el=document.getElementById('b1Val');if(el)el.textContent=b1.toFixed(2);
    }
    if(window.updateCostSurfacePoint) window.updateCostSurfacePoint(b0,b1);
  }

  // Called from regression-graph slider changes
  window.updateCostSurfacePoint = function(b0, b1) {
    currentB0=b0; currentB1=b1;
    if(initialized) draw();
  };

  // Called from gradient-descent
  window.setCostSurfaceGDPath = function(path) {
    gdPath = path;
    if(path.length>0){ currentB0=path[path.length-1].b0; currentB1=path[path.length-1].b1; }
    if(initialized) draw();
  };

  window.clearCostSurfacePath = function() {
    gdPath = []; if(initialized) draw();
  };

  window.initCostSurface = function() {
    resize();
    draw();
    initialized=true;
  };

  window.addEventListener('resize',()=>{ if(initialized){resize();draw();} });
})();
