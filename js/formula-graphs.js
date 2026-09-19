/* ===================================================
   Formula Graphs — Mini dynamic graphs per formula/concept
   Each function draws to a specific canvas ID
   =================================================== */

// ---- Shared utilities ----
function fgClear(ctx, W, H) {
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='rgba(0,0,0,0.2)';
  ctx.roundRect(0,0,W,H,10); ctx.fill();
}
function fgGrid(ctx,W,H,pad){
  ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1;
  for(let i=0;i<=8;i++){
    const x=pad.l+i*(W-pad.l-pad.r)/8, y=pad.t+i*(H-pad.t-pad.b)/8;
    ctx.beginPath(); ctx.moveTo(x,pad.t); ctx.lineTo(x,H-pad.b); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(W-pad.r,y); ctx.stroke();
  }
}
function fgAxes(ctx,W,H,pad){
  ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1.5;
  ctx.beginPath();
  ctx.moveTo(pad.l,pad.t); ctx.lineTo(pad.l,H-pad.b); ctx.lineTo(W-pad.r,H-pad.b);
  ctx.stroke();
}

// ============================================================
// 1. RESIDUAL DIAGRAM — shows one data point, prediction, residual
// ============================================================
(function(){
  const canvas=document.getElementById('fgResidual');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  let t=0;

  function draw(){
    const W=canvas.width, H=canvas.height;
    fgClear(ctx,W,H);
    fgGrid(ctx,W,H,{l:40,r:20,t:20,b:40});
    fgAxes(ctx,W,H,{l:40,r:20,t:20,b:40});

    const PAD={l:40,r:20,t:20,b:40};
    const PW=W-PAD.l-PAD.r, PH=H-PAD.t-PAD.b;
    const xMin=0,xMax=10,yMin=0,yMax=18;
    const toCx=x=>PAD.l+(x-xMin)/xMax*PW;
    const toCy=y=>PAD.t+(1-(y-yMin)/(yMax-yMin))*PH;

    // Animated regression line
    const b0=2+Math.sin(t*0.015)*0.5;
    const b1=1.5+Math.cos(t*0.02)*0.3;

    // Draw regression line
    ctx.strokeStyle='rgba(0,212,255,0.7)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(toCx(0),toCy(b0)); ctx.lineTo(toCx(10),toCy(b1*10+b0)); ctx.stroke();

    // A few data points
    const pts=[{x:2,y:6},{x:5,y:10},{x:7,y:13},{x:9,y:16}];
    pts.forEach((p,i)=>{
      const pred=b1*p.x+b0;
      const err=p.y-pred;

      // Residual vertical line
      ctx.strokeStyle=err>0?'rgba(239,68,68,0.7)':'rgba(16,185,129,0.7)';
      ctx.lineWidth=1.5; ctx.setLineDash([4,3]);
      ctx.beginPath(); ctx.moveTo(toCx(p.x),toCy(p.y)); ctx.lineTo(toCx(p.x),toCy(pred)); ctx.stroke();
      ctx.setLineDash([]);

      // Squared error area
      const errPx=Math.abs(toCy(p.y)-toCy(pred));
      ctx.fillStyle=err>0?'rgba(239,68,68,0.08)':'rgba(16,185,129,0.08)';
      ctx.fillRect(toCx(p.x)-errPx/2, Math.min(toCy(p.y),toCy(pred)), errPx, errPx);

      // Data point
      ctx.beginPath(); ctx.arc(toCx(p.x),toCy(p.y),5,0,Math.PI*2);
      ctx.fillStyle='#00d4ff'; ctx.shadowColor='#00d4ff'; ctx.shadowBlur=6; ctx.fill(); ctx.shadowBlur=0;

      // Residual label (first point only)
      if(i===0){
        ctx.font='10px Share Tech Mono,monospace';
        ctx.fillStyle='rgba(239,68,68,0.9)'; ctx.textAlign='left';
        ctx.fillText(`e = ${err.toFixed(1)}`, toCx(p.x)+8, (toCy(p.y)+toCy(pred))/2+4);
      }
    });

    // Labels
    ctx.font='11px Rajdhani,sans-serif'; ctx.fillStyle='rgba(0,212,255,0.7)'; ctx.textAlign='left';
    ctx.fillText('eᵢ = yᵢ − ŷᵢ', PAD.l+4, PAD.t+14);
    ctx.fillStyle='rgba(239,68,68,0.6)'; ctx.fillText('■ = eᵢ² (squared error)', PAD.l+4, H-PAD.b-6);

    t++;
    requestAnimationFrame(draw);
  }
  draw();
})();

// ============================================================
// 2. MSE PARABOLA — J as function of single param (b1 fixed)
// ============================================================
(function(){
  const canvas=document.getElementById('fgMSEParabola');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');

  const DATA=[{x:1,y:5},{x:2,y:7},{x:3,y:9},{x:4,y:11},{x:5,y:13}];
  let cursor=null, animB0=0, animDir=1;

  function computeMSE_b0(b0){
    return DATA.reduce((s,p)=>s+(p.y-(1.8*p.x+b0))**2,0)/DATA.length;
  }

  // Optimal b0
  const optB0=5-1.8*3; // ≈ -0.4

  function draw(){
    const W=canvas.width, H=canvas.height;
    fgClear(ctx,W,H);
    const PAD={l:48,r:16,t:20,b:44};
    const PW=W-PAD.l-PAD.r, PH=H-PAD.t-PAD.b;
    fgGrid(ctx,W,H,PAD); fgAxes(ctx,W,H,PAD);

    const b0Min=-5, b0Max=8;
    const jVals=[];
    for(let b0=b0Min;b0<=b0Max;b0+=0.1) jVals.push({b0,j:computeMSE_b0(b0)});
    const maxJ=Math.max(...jVals.map(v=>v.j));
    const toCx=b0=>PAD.l+(b0-b0Min)/(b0Max-b0Min)*PW;
    const toCy=j=>PAD.t+(1-j/(maxJ*1.1))*PH;

    // Axis labels
    ctx.font='10px Rajdhani,sans-serif'; ctx.fillStyle='rgba(148,163,184,0.6)'; ctx.textAlign='center';
    ctx.fillText('b₀', PAD.l+PW/2, H-4);
    ctx.textAlign='right'; ctx.fillText('J', PAD.l-4, PAD.t+12);

    // Parabola curve
    const grad=ctx.createLinearGradient(PAD.l,0,W-PAD.r,0);
    grad.addColorStop(0,'#ef4444'); grad.addColorStop(0.5,'#f59e0b'); grad.addColorStop(1,'#ef4444');
    ctx.strokeStyle=grad; ctx.lineWidth=2.5;
    ctx.beginPath();
    jVals.forEach((v,i)=>{ i===0?ctx.moveTo(toCx(v.b0),toCy(v.j)):ctx.lineTo(toCx(v.b0),toCy(v.j)); });
    ctx.stroke();

    // Fill under curve
    ctx.beginPath();
    jVals.forEach((v,i)=>{ i===0?ctx.moveTo(toCx(v.b0),toCy(v.j)):ctx.lineTo(toCx(v.b0),toCy(v.j)); });
    ctx.lineTo(toCx(b0Max),H-PAD.b); ctx.lineTo(toCx(b0Min),H-PAD.b); ctx.closePath();
    ctx.fillStyle='rgba(239,68,68,0.06)'; ctx.fill();

    // Animated cursor
    animB0+=animDir*0.03;
    if(animB0>b0Max-1||animB0<b0Min+1) animDir*=-1;
    const curJ=computeMSE_b0(animB0);
    ctx.beginPath(); ctx.arc(toCx(animB0),toCy(curJ),5,0,Math.PI*2);
    ctx.fillStyle='#fff'; ctx.shadowColor='#fff'; ctx.shadowBlur=10; ctx.fill(); ctx.shadowBlur=0;
    // drop to x-axis
    ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1; ctx.setLineDash([3,3]);
    ctx.beginPath(); ctx.moveTo(toCx(animB0),toCy(curJ)); ctx.lineTo(toCx(animB0),H-PAD.b); ctx.stroke();
    ctx.setLineDash([]);

    // Minimum marker
    ctx.beginPath(); ctx.arc(toCx(optB0),toCy(computeMSE_b0(optB0)),6,0,Math.PI*2);
    ctx.fillStyle='rgba(16,185,129,0.9)'; ctx.shadowColor='#10b981'; ctx.shadowBlur=10; ctx.fill(); ctx.shadowBlur=0;
    ctx.font='10px Share Tech Mono,monospace'; ctx.fillStyle='rgba(16,185,129,0.9)';
    ctx.textAlign='left'; ctx.fillText(`min b₀≈${optB0.toFixed(1)}`,toCx(optB0)+8,toCy(computeMSE_b0(optB0))-6);

    // J label
    ctx.font='10px Share Tech Mono,monospace'; ctx.fillStyle='rgba(245,158,11,0.7)';
    ctx.textAlign='right'; ctx.fillText(`J=${curJ.toFixed(1)}`,W-PAD.r-2,toCy(curJ)-6);

    requestAnimationFrame(draw);
  }
  draw();
})();

// ============================================================
// 3. SLOPE EFFECT — shows effect of b1 on line direction
// ============================================================
(function(){
  const canvas=document.getElementById('fgSlopeEffect');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  let t=0;

  function draw(){
    const W=canvas.width,H=canvas.height;
    fgClear(ctx,W,H);
    const PAD={l:36,r:16,t:20,b:36};
    const PW=W-PAD.l-PAD.r,PH=H-PAD.t-PAD.b;
    fgGrid(ctx,W,H,PAD); fgAxes(ctx,W,H,PAD);
    const toCx=x=>PAD.l+x/10*PW, toCy=y=>PAD.t+(1-y/20)*PH;

    const slopes=[{b1:-1,c:'rgba(239,68,68,0.5)'},{b1:0,c:'rgba(245,158,11,0.5)'},{b1:1.8,c:'rgba(0,212,255,0.8)'},{b1:3,c:'rgba(139,92,246,0.5)'}];
    slopes.forEach(({b1,c})=>{
      ctx.strokeStyle=c; ctx.lineWidth=b1===1.8?2.5:1.5;
      ctx.beginPath(); ctx.moveTo(toCx(0),toCy(3)); ctx.lineTo(toCx(10),toCy(b1*10+3)); ctx.stroke();
      ctx.font='10px Rajdhani,sans-serif'; ctx.fillStyle=c; ctx.textAlign='left';
      const ly=toCy(b1*9+3);
      ctx.fillText(`b₁=${b1}`, toCx(9)+2, Math.max(PAD.t+10,Math.min(H-PAD.b-4,ly)));
    });

    // Animated arrow showing angle
    const animB1=1.8+Math.sin(t*0.02)*1.5;
    ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(toCx(0),toCy(3)); ctx.lineTo(toCx(10),toCy(animB1*10+3)); ctx.stroke();
    ctx.font='bold 11px Orbitron,monospace'; ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.textAlign='center';
    ctx.fillText(`b₁=${animB1.toFixed(1)}`,W/2,PAD.t+14);
    t++;
    requestAnimationFrame(draw);
  }
  draw();
})();

// ============================================================
// 4. R² VISUALIZATION — shows SS_res vs SS_tot
// ============================================================
(function(){
  const canvas=document.getElementById('fgR2');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');

  const DATA=[{x:1,y:5},{x:2,y:7.5},{x:3,y:9},{x:4,y:11},{x:5,y:13.5},{x:6,y:15}];
  let sliderR2=0.85;

  const meanY=DATA.reduce((s,p)=>s+p.y,0)/DATA.length;
  const n=DATA.length;
  const mx=DATA.reduce((s,p)=>s+p.x,0)/n;
  let num=0,den=0; DATA.forEach(p=>{num+=(p.x-mx)*(p.y-meanY);den+=(p.x-mx)**2;});
  const optB1=num/den, optB0=meanY-optB1*mx;

  function draw(r2Override){
    const W=canvas.width,H=canvas.height;
    fgClear(ctx,W,H);
    const PAD={l:40,r:20,t:20,b:40};
    const PW=W-PAD.l-PAD.r,PH=H-PAD.t-PAD.b;
    fgGrid(ctx,W,H,PAD); fgAxes(ctx,W,H,PAD);
    const xMin=0,xMax=7,yMin=0,yMax=20;
    const toCx=x=>PAD.l+(x-xMin)/(xMax-xMin)*PW;
    const toCy=y=>PAD.t+(1-(y-yMin)/(yMax-yMin))*PH;

    const r2=r2Override!==undefined?r2Override:sliderR2;
    // "noise" controlled by 1-r2
    const noise=(1-r2)*4;

    // Mean line
    ctx.strokeStyle='rgba(245,158,11,0.5)'; ctx.lineWidth=1.5; ctx.setLineDash([6,4]);
    ctx.beginPath(); ctx.moveTo(toCx(0),toCy(meanY)); ctx.lineTo(toCx(7),toCy(meanY)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font='10px Rajdhani,sans-serif'; ctx.fillStyle='rgba(245,158,11,0.6)';
    ctx.textAlign='right'; ctx.fillText('ȳ (mean)',W-PAD.r,toCy(meanY)-4);

    // Regression line
    ctx.strokeStyle='rgba(0,212,255,0.8)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(toCx(0),toCy(optB0)); ctx.lineTo(toCx(7),toCy(optB1*7+optB0)); ctx.stroke();

    // Data points with controlled noise
    DATA.forEach((p,i)=>{
      const ny=p.y+(Math.sin(i*3.7)*noise);
      const pred=optB1*p.x+optB0;
      const ss_res_i=(ny-pred)**2;
      const ss_tot_i=(ny-meanY)**2;

      // SS_res (to regression line)
      ctx.strokeStyle='rgba(239,68,68,0.7)'; ctx.lineWidth=1.5; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(toCx(p.x),toCy(ny)); ctx.lineTo(toCx(p.x),toCy(pred)); ctx.stroke();
      // SS_tot (to mean)
      ctx.strokeStyle='rgba(245,158,11,0.4)'; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(toCx(p.x)+4,toCy(ny)); ctx.lineTo(toCx(p.x)+4,toCy(meanY)); ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath(); ctx.arc(toCx(p.x),toCy(ny),4.5,0,Math.PI*2);
      ctx.fillStyle='#00d4ff'; ctx.fill();
    });

    // R² display
    ctx.font='bold 14px Orbitron,monospace'; ctx.textAlign='center';
    ctx.fillStyle='rgba(0,212,255,0.9)'; ctx.fillText(`R² = ${r2.toFixed(2)}`, W/2, PAD.t+16);

    // Legend
    ctx.font='10px Rajdhani,sans-serif'; ctx.textAlign='left';
    ctx.fillStyle='rgba(239,68,68,0.8)'; ctx.fillText('— SS_res',PAD.l+4,H-PAD.b-20);
    ctx.fillStyle='rgba(245,158,11,0.7)'; ctx.fillText('— SS_tot',PAD.l+4,H-PAD.b-8);
  }

  // Slider
  const sl=document.getElementById('r2Slider');
  if(sl){
    sl.addEventListener('input',e=>{
      sliderR2=parseFloat(e.target.value);
      const vEl=document.getElementById('r2SliderVal');
      if(vEl) vEl.textContent=sliderR2.toFixed(2);
      draw(sliderR2);
    });
  }
  draw(sliderR2);
  window.drawR2Graph=draw;
})();

// ============================================================
// 5. INTERCEPT EFFECT — b0 shifts line up/down
// ============================================================
(function(){
  const canvas=document.getElementById('fgInterceptEffect');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  let t=0;

  function draw(){
    const W=canvas.width,H=canvas.height;
    fgClear(ctx,W,H);
    const PAD={l:36,r:16,t:20,b:36};
    fgGrid(ctx,W,H,PAD); fgAxes(ctx,W,H,PAD);
    const PW=W-PAD.l-PAD.r,PH=H-PAD.t-PAD.b;
    const toCx=x=>PAD.l+x/10*PW, toCy=y=>PAD.t+(1-y/20)*PH;

    const b1=1.8;
    const intercepts=[-2,0,3,6];
    intercepts.forEach((b0,i)=>{
      const alpha=b0===3?0.9:0.4;
      ctx.strokeStyle=`rgba(139,92,246,${alpha})`; ctx.lineWidth=b0===3?2.5:1.5;
      ctx.beginPath(); ctx.moveTo(toCx(0),toCy(b0)); ctx.lineTo(toCx(8),toCy(b1*8+b0)); ctx.stroke();
      ctx.font='10px Rajdhani,sans-serif'; ctx.fillStyle=`rgba(139,92,246,${alpha})`;
      ctx.textAlign='left'; ctx.fillText(`b₀=${b0}`,toCx(0.2),toCy(b0)-4);
    });

    // Animated b0
    const animB0=3+Math.sin(t*0.025)*3;
    ctx.strokeStyle='rgba(255,255,255,0.7)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(toCx(0),toCy(animB0)); ctx.lineTo(toCx(8),toCy(b1*8+animB0)); ctx.stroke();
    // b0 dot on y-axis
    ctx.beginPath(); ctx.arc(toCx(0),toCy(animB0),5,0,Math.PI*2);
    ctx.fillStyle='#fff'; ctx.fill();
    ctx.font='bold 11px Share Tech Mono,monospace'; ctx.fillStyle='rgba(255,255,255,0.9)';
    ctx.textAlign='left'; ctx.fillText(`b₀=${animB0.toFixed(1)}`,toCx(0.3),toCy(animB0)-6);
    t++;
    requestAnimationFrame(draw);
  }
  draw();
})();

// ============================================================
// 6. GRADIENT ARROW — shows gradient direction on J curve
// ============================================================
(function(){
  const canvas=document.getElementById('fgGradient');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');

  const DATA=[{x:1,y:5},{x:2,y:7},{x:3,y:9},{x:4,y:11},{x:5,y:13}];
  let b0Cursor=6;
  let animating=false, animDir=-1;

  function J(b0){ return DATA.reduce((s,p)=>s+(p.y-(1.8*p.x+b0))**2,0)/DATA.length; }
  function dJ(b0){ return DATA.reduce((s,p)=>s+(-2/DATA.length)*(p.y-(1.8*p.x+b0)),0); }

  function draw(){
    const W=canvas.width,H=canvas.height;
    fgClear(ctx,W,H);
    const PAD={l:48,r:16,t:20,b:40};
    const PW=W-PAD.l-PAD.r,PH=H-PAD.t-PAD.b;
    fgGrid(ctx,W,H,PAD); fgAxes(ctx,W,H,PAD);
    const b0Min=-3,b0Max=10;
    const jMax=Math.max(...Array.from({length:100},(_,i)=>J(b0Min+i*(b0Max-b0Min)/100)));
    const toCx=b0=>PAD.l+(b0-b0Min)/(b0Max-b0Min)*PW;
    const toCy=j=>PAD.t+(1-j/(jMax*1.1))*PH;

    ctx.font='10px Rajdhani,sans-serif'; ctx.fillStyle='rgba(148,163,184,0.6)';
    ctx.textAlign='center'; ctx.fillText('b₀',PAD.l+PW/2,H-4);

    // Curve
    ctx.strokeStyle='rgba(245,158,11,0.8)'; ctx.lineWidth=2.5;
    ctx.beginPath();
    for(let i=0;i<=100;i++){
      const b0=b0Min+i*(b0Max-b0Min)/100;
      i===0?ctx.moveTo(toCx(b0),toCy(J(b0))):ctx.lineTo(toCx(b0),toCy(J(b0)));
    }
    ctx.stroke();

    // Current point
    const cx=toCx(b0Cursor), cy=toCy(J(b0Cursor));
    ctx.beginPath(); ctx.arc(cx,cy,6,0,Math.PI*2);
    ctx.fillStyle='#fff'; ctx.shadowColor='#fff'; ctx.shadowBlur=8; ctx.fill(); ctx.shadowBlur=0;

    // Gradient tangent line
    const grad=dJ(b0Cursor);
    const dx=40, dy=grad*dx*(PH/(jMax*1.1))/(PW/(b0Max-b0Min));
    ctx.strokeStyle='rgba(239,68,68,0.8)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(cx-dx,cy-dy*(-1)); ctx.lineTo(cx+dx,cy+dy*(-1)*-1);
    // Tangent at current point
    const scale=PW/(b0Max-b0Min);
    const scaleY=PH/(jMax*1.1);
    ctx.beginPath(); ctx.moveTo(cx-30,cy+grad*30*scaleY/scale); ctx.lineTo(cx+30,cy-grad*30*scaleY/scale);
    ctx.stroke();

    // Gradient arrow (direction of steepest descent)
    const arrowDir=grad>0?-1:1;
    const arrowLen=Math.min(60,Math.abs(grad)*10);
    ctx.strokeStyle='rgba(16,185,129,0.9)'; ctx.lineWidth=2.5;
    drawArrow(ctx,cx,cy,cx+arrowLen*arrowDir,cy,6);

    ctx.font='10px Share Tech Mono,monospace';
    ctx.fillStyle='rgba(239,68,68,0.8)'; ctx.textAlign='left';
    ctx.fillText(`∂J/∂b₀ = ${grad.toFixed(2)}`,PAD.l+4,PAD.t+14);
    ctx.fillStyle='rgba(16,185,129,0.8)';
    ctx.fillText(`→ update: b₀ -= α × ∂J/∂b₀`,PAD.l+4,H-PAD.b-6);

    // animate
    if(animating){ b0Cursor+=animDir*0.06; if(b0Cursor<-1||b0Cursor>8) animDir*=-1; }
    requestAnimationFrame(draw);
  }

  function drawArrow(ctx,x1,y1,x2,y2,size){
    const dx=x2-x1,dy=y2-y1;
    const len=Math.sqrt(dx*dx+dy*dy);
    if(len<1) return;
    const nx=dx/len,ny=dy/len;
    ctx.strokeStyle='rgba(16,185,129,0.9)'; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2,y2);
    ctx.lineTo(x2-size*(nx+ny*0.6),y2-size*(ny-nx*0.6));
    ctx.lineTo(x2-size*(nx-ny*0.6),y2-size*(ny+nx*0.6));
    ctx.closePath(); ctx.fillStyle='rgba(16,185,129,0.9)'; ctx.fill();
  }

  const sl=document.getElementById('fgGradSlider');
  if(sl){
    sl.addEventListener('input',e=>{
      b0Cursor=parseFloat(e.target.value);
      const v=document.getElementById('fgGradVal');
      if(v) v.textContent=b0Cursor.toFixed(1);
    });
  }
  const animBtn=document.getElementById('fgGradAnim');
  if(animBtn) animBtn.addEventListener('click',()=>{
    animating=!animating;
    animBtn.textContent=animating?'⏸ Pause':'▶ Animasi GD';
  });

  draw();
})();

// ============================================================
// 7. ERROR DISTRIBUTION — histogram of residuals
// ============================================================
(function(){
  const canvas=document.getElementById('fgErrDist');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');

  const DATA=[
    {x:0.5,y:4.2},{x:1.0,y:4.8},{x:1.5,y:5.9},{x:2.0,y:6.5},{x:2.5,y:8.1},
    {x:3.0,y:8.7},{x:3.5,y:9.6},{x:4.0,y:10.5},{x:4.5,y:11.2},{x:5.0,y:12.3},
    {x:5.5,y:13.0},{x:6.0,y:13.8},{x:6.5,y:15.1},{x:7.0,y:15.4},{x:7.5,y:16.6}
  ];
  const b0=2.8,b1=1.81;
  const residuals=DATA.map(p=>p.y-(b1*p.x+b0));

  function draw(){
    const W=canvas.width,H=canvas.height;
    fgClear(ctx,W,H);
    const PAD={l:40,r:16,t:24,b:40};
    const PW=W-PAD.l-PAD.r,PH=H-PAD.t-PAD.b;
    fgGrid(ctx,W,H,PAD); fgAxes(ctx,W,H,PAD);

    const bins=8, minR=-2.5, maxR=2.5;
    const binW=(maxR-minR)/bins;
    const counts=new Array(bins).fill(0);
    residuals.forEach(r=>{ const i=Math.floor((r-minR)/binW); if(i>=0&&i<bins) counts[i]++; });
    const maxC=Math.max(...counts);

    const toCx=r=>PAD.l+(r-minR)/(maxR-minR)*PW;
    const toCy=c=>PAD.t+(1-c/(maxC*1.2))*PH;
    const barW=PW/bins*0.85;

    counts.forEach((c,i)=>{
      const r=minR+i*binW+binW/2;
      const x=toCx(r)-barW/2;
      const h=PH-toCy(c)+PAD.t;
      const norm=Math.abs(r)/(maxR);
      ctx.fillStyle=`rgba(${Math.round(norm*200+55)},${Math.round((1-norm)*150+30)},255,0.7)`;
      ctx.fillRect(x,toCy(c),barW,h);
      ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.lineWidth=1; ctx.strokeRect(x,toCy(c),barW,h);
    });

    // Normal curve overlay
    const sigma=Math.sqrt(residuals.reduce((s,r)=>s+r*r,0)/residuals.length);
    ctx.strokeStyle='rgba(0,212,255,0.7)'; ctx.lineWidth=2;
    ctx.beginPath();
    for(let r=minR;r<=maxR;r+=0.05){
      const prob=(1/(sigma*Math.sqrt(2*Math.PI)))*Math.exp(-r*r/(2*sigma*sigma));
      const scaledC=prob*residuals.length*binW;
      const cx=toCx(r),cy=toCy(scaledC/1);
      r===minR?ctx.moveTo(cx,cy):ctx.lineTo(cx,cy);
    }
    ctx.stroke();

    // Zero line
    ctx.strokeStyle='rgba(245,158,11,0.5)'; ctx.lineWidth=1.5; ctx.setLineDash([4,4]);
    ctx.beginPath(); ctx.moveTo(toCx(0),PAD.t); ctx.lineTo(toCx(0),H-PAD.b); ctx.stroke(); ctx.setLineDash([]);

    ctx.font='10px Rajdhani,sans-serif'; ctx.fillStyle='rgba(148,163,184,0.7)';
    ctx.textAlign='center'; ctx.fillText('Distribusi Residual eᵢ',W/2,PAD.t+12);
    ctx.fillStyle='rgba(0,212,255,0.7)'; ctx.fillText('~ Normal(0, σ²)',W/2,H-4);
  }
  draw();
})();
