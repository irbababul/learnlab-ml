/* ===================================================
   LearnLab — Optimizer Engine v2
   5 sub-tabs: 1-param | 2-param (loss plane) | GD | non-gradient | PSO
   =================================================== */

/* ── Mobile-aware canvas sizing helper ── */
function _canvasW(parent, maxW) {
  const w = (parent ? parent.clientWidth : window.innerWidth) - 2;
  return Math.min(w, maxW || 720);
}
function _isMobile() { return window.innerWidth <= 600; }


const OPT_DATA = [
  {x:0.5,y:4.2},{x:1.0,y:4.8},{x:1.5,y:5.9},{x:2.0,y:6.5},{x:2.5,y:8.1},
  {x:3.0,y:8.7},{x:3.5,y:9.6},{x:4.0,y:10.5},{x:4.5,y:11.2},{x:5.0,y:12.3},
  {x:5.5,y:13.0},{x:6.0,y:13.8},{x:6.5,y:15.1},{x:7.0,y:15.4},{x:7.5,y:16.6},
  {x:8.0,y:17.2},{x:8.5,y:18.4},{x:9.0,y:19.1},{x:9.5,y:20.0},{x:10.0,y:20.8},
  {x:2.2,y:7.3},{x:4.8,y:12.0},{x:6.8,y:14.7},{x:7.8,y:16.9},{x:9.2,y:19.6}
];
window.optMSE = (b0,b1) => OPT_DATA.reduce((s,p)=>s+(p.y-(b1*p.x+b0))**2,0)/OPT_DATA.length;

// Precompute OLS
const _n=OPT_DATA.length;
const _mx=OPT_DATA.reduce((s,p)=>s+p.x,0)/_n, _my=OPT_DATA.reduce((s,p)=>s+p.y,0)/_n;
let _num=0,_den=0; OPT_DATA.forEach(p=>{_num+=(p.x-_mx)*(p.y-_my);_den+=(p.x-_mx)**2;});
window.OPT_OPTIMAL={b1:_num/_den, b0:_my-(_num/_den)*_mx};
window.OPT_BOUNDS={b0:{min:-3,max:8},b1:{min:0,max:4}};

// Shared cost color (blue=low → red=high)
window.optCostColor=function(n){
  const t=Math.sqrt(Math.max(0,Math.min(1,n)));
  let r,g,b;
  if(t<0.25){const s=t/0.25;r=10;g=Math.round(60+s*150);b=Math.round(180+s*60);}
  else if(t<0.5){const s=(t-.25)/.25;r=Math.round(s*40);g=Math.round(210+s*20);b=Math.round(240-s*240);}
  else if(t<0.75){const s=(t-.5)/.25;r=Math.round(40+s*215);g=Math.round(230-s*100);b=0;}
  else{const s=(t-.75)/.25;r=255;g=Math.round(130-s*130);b=0;}
  return `rgb(${r},${g},${b})`;
};

// Shared grid cache
window._optGridCache=null;
window.getOptGrid=function(steps=60){
  if(window._optGridCache&&window._optGridCache.steps===steps) return window._optGridCache;
  const {b0,b1}=OPT_BOUNDS; const grid=[],vals=[];
  for(let i=0;i<=steps;i++){grid[i]=[];
    for(let j=0;j<=steps;j++){
      const cb0=b0.min+i*(b0.max-b0.min)/steps;
      const cb1=b1.min+j*(b1.max-b1.min)/steps;
      const v=optMSE(cb0,cb1); grid[i][j]=v; vals.push(v);
    }}
  const minJ=Math.min(...vals),maxJ=Math.max(...vals);
  return (window._optGridCache={grid,minJ,maxJ,steps});
};

/* helper: slider bg update */
function _slBg(sl){if(!sl)return;const mn=parseFloat(sl.min),mx=parseFloat(sl.max),v=parseFloat(sl.value);const p=((v-mn)/(mx-mn)*100).toFixed(1);sl.style.background=`linear-gradient(to right,var(--accent-cyan) 0%,var(--accent-cyan) ${p}%,rgba(255,255,255,.1) ${p}%,rgba(255,255,255,.1) 100%)`;}
function _setEl(id,v){const e=document.getElementById(id);if(e)e.textContent=v;}
function _roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}


/* ════════════════════════════════════════════════════
   SUB-TAB 1 — SINGLE PARAMETER
   Ubah satu parameter (b1), lihat J berubah sebagai kurva 1D
   ════════════════════════════════════════════════════ */
(function(){
  const cvMain = document.getElementById('sp1Canvas');   // J(b1) parabola
  const cvLine = document.getElementById('sp1LineCanvas'); // regression line preview
  if(!cvMain||!cvLine) return;
  const ctxM=cvMain.getContext('2d'), ctxL=cvLine.getContext('2d');

  let W1,H1,W2,H2, initDone=false;
  let b1Val=0.0, b0Fixed=2.8; // b0 fixed at OLS value
  const B1_MIN=-1, B1_MAX=4;

  function resize(){
    const pw  = _canvasW(cvMain.parentElement, 680);
    const pw2 = _canvasW(cvLine.parentElement, 680);
    // taller ratio on mobile so plots are readable
    const hRatio = _isMobile() ? 0.62 : 0.42;
    const lRatio = _isMobile() ? 0.56 : 0.38;
    cvMain.width=pw;  cvMain.height=Math.round(pw*hRatio);
    cvLine.width=pw2; cvLine.height=Math.round(pw2*lRatio);
    W1=cvMain.width; H1=cvMain.height;
    W2=cvLine.width; H2=cvLine.height;
  }

  /* ── J(b1) parabola curve ── */
  function drawParabola(){
    ctxM.clearRect(0,0,W1,H1);
    _roundRect(ctxM,0,0,W1,H1,10); ctxM.fillStyle='rgba(0,0,0,.22)'; ctxM.fill();
    const PAD={t:32,r:24,b:48,l:64};
    const PW=W1-PAD.l-PAD.r, PH=H1-PAD.t-PAD.b;

    // Compute J values along b1 axis
    const pts=[]; let jMin=Infinity,jMax=0;
    for(let i=0;i<=120;i++){
      const b1=B1_MIN+i*(B1_MAX-B1_MIN)/120;
      const j=optMSE(b0Fixed,b1);
      pts.push({b1,j}); if(j<jMin)jMin=j; if(j>jMax)jMax=j;
    }
    const jp=(jMax-jMin)*.07||.5;
    const tCx=b1=>PAD.l+(b1-B1_MIN)/(B1_MAX-B1_MIN)*PW;
    const tCy=j=>PAD.t+(1-(j-jMin+jp)/(jMax-jMin+2*jp))*PH;

    // Grid
    ctxM.strokeStyle='rgba(255,255,255,.04)'; ctxM.lineWidth=1;
    for(let i=0;i<=5;i++){const y=PAD.t+i*PH/5;ctxM.beginPath();ctxM.moveTo(PAD.l,y);ctxM.lineTo(W1-PAD.r,y);ctxM.stroke();}
    for(let i=0;i<=5;i++){const x=PAD.l+i*PW/5;ctxM.beginPath();ctxM.moveTo(x,PAD.t);ctxM.lineTo(x,H1-PAD.b);ctxM.stroke();}

    // Axes
    ctxM.strokeStyle='rgba(255,255,255,.2)'; ctxM.lineWidth=1.5;
    ctxM.beginPath(); ctxM.moveTo(PAD.l,PAD.t); ctxM.lineTo(PAD.l,H1-PAD.b); ctxM.lineTo(W1-PAD.r,H1-PAD.b); ctxM.stroke();

    // Axis ticks & labels
    ctxM.fillStyle='rgba(148,163,184,.65)'; ctxM.font='10px Rajdhani,sans-serif';
    ctxM.textAlign='center';
    for(let i=0;i<=5;i++){const b1v=B1_MIN+i*(B1_MAX-B1_MIN)/5; ctxM.fillText(b1v.toFixed(1),tCx(b1v),H1-PAD.b+15);}
    ctxM.textAlign='right';
    for(let i=0;i<=4;i++){const jv=jMin+i*(jMax-jMin)/4; ctxM.fillText(jv.toFixed(0),PAD.l-6,tCy(jv)+4);}
    ctxM.fillStyle='rgba(200,220,240,.7)'; ctxM.textAlign='center';
    ctxM.fillText('b₁ (slope)',PAD.l+PW/2,H1-4);
    ctxM.save(); ctxM.translate(14,PAD.t+PH/2); ctxM.rotate(-Math.PI/2);
    ctxM.fillText('J (MSE)',0,0); ctxM.restore();

    // Fill under curve
    const gFill=ctxM.createLinearGradient(0,PAD.t,0,H1-PAD.b);
    gFill.addColorStop(0,'rgba(239,68,68,.22)'); gFill.addColorStop(1,'rgba(239,68,68,0)');
    ctxM.fillStyle=gFill;
    ctxM.beginPath(); ctxM.moveTo(tCx(pts[0].b1),H1-PAD.b);
    pts.forEach(p=>ctxM.lineTo(tCx(p.b1),tCy(p.j)));
    ctxM.lineTo(tCx(pts[pts.length-1].b1),H1-PAD.b); ctxM.closePath(); ctxM.fill();

    // Curve
    const gLine=ctxM.createLinearGradient(PAD.l,0,W1-PAD.r,0);
    gLine.addColorStop(0,'#ef4444'); gLine.addColorStop(0.5,'#f59e0b'); gLine.addColorStop(1,'#ef4444');
    ctxM.strokeStyle=gLine; ctxM.lineWidth=2.5;
    ctxM.beginPath(); pts.forEach((p,i)=>i===0?ctxM.moveTo(tCx(p.b1),tCy(p.j)):ctxM.lineTo(tCx(p.b1),tCy(p.j))); ctxM.stroke();

    // Optimal point
    const optB1=OPT_OPTIMAL.b1, optJ=optMSE(b0Fixed,optB1);
    ctxM.beginPath(); ctxM.arc(tCx(optB1),tCy(optJ),7,0,Math.PI*2);
    ctxM.fillStyle='rgba(16,185,129,.9)'; ctxM.shadowColor='#10b981'; ctxM.shadowBlur=12; ctxM.fill(); ctxM.shadowBlur=0;
    ctxM.fillStyle='rgba(16,185,129,.8)'; ctxM.font='10px Share Tech Mono,monospace'; ctxM.textAlign='left';
    ctxM.fillText(`min b₁≈${optB1.toFixed(2)}`,tCx(optB1)+10,tCy(optJ)-6);

    // Current b1 position
    const curJ=optMSE(b0Fixed,b1Val);
    ctxM.beginPath(); ctxM.arc(tCx(b1Val),tCy(curJ),6,0,Math.PI*2);
    ctxM.fillStyle='#fff'; ctxM.shadowColor='#fff'; ctxM.shadowBlur=12; ctxM.fill(); ctxM.shadowBlur=0;

    // Drop line
    ctxM.strokeStyle='rgba(255,255,255,.2)'; ctxM.lineWidth=1; ctxM.setLineDash([3,3]);
    ctxM.beginPath(); ctxM.moveTo(tCx(b1Val),tCy(curJ)); ctxM.lineTo(tCx(b1Val),H1-PAD.b); ctxM.stroke(); ctxM.setLineDash([]);

    // Gradient arrow at current point
    const dj_db1=-2/OPT_DATA.length*OPT_DATA.reduce((s,p)=>s+p.x*(p.y-(b1Val*p.x+b0Fixed)),0);
    const arrowDir=dj_db1>0?-1:1;
    const arrowLen=Math.min(50,Math.abs(dj_db1)*8);
    const ax=tCx(b1Val), ay=tCy(curJ);
    ctxM.strokeStyle='rgba(0,212,255,.7)'; ctxM.lineWidth=2;
    ctxM.beginPath(); ctxM.moveTo(ax,ay); ctxM.lineTo(ax+arrowLen*arrowDir,ay); ctxM.stroke();
    // arrowhead
    ctxM.beginPath();
    ctxM.moveTo(ax+arrowLen*arrowDir,ay);
    ctxM.lineTo(ax+arrowLen*arrowDir-8*arrowDir,ay-5);
    ctxM.lineTo(ax+arrowLen*arrowDir-8*arrowDir,ay+5);
    ctxM.closePath(); ctxM.fillStyle='rgba(0,212,255,.7)'; ctxM.fill();

    // Info labels
    ctxM.font='bold 12px Orbitron,monospace'; ctxM.fillStyle='rgba(0,212,255,.8)'; ctxM.textAlign='left';
    ctxM.fillText(`J(b₁) | b₀ tetap = ${b0Fixed.toFixed(2)}`,PAD.l+6,PAD.t+18);
    ctxM.font='11px Share Tech Mono,monospace'; ctxM.fillStyle='rgba(255,255,255,.7)';
    ctxM.fillText(`b₁=${b1Val.toFixed(2)}  J=${curJ.toFixed(3)}  ∂J/∂b₁=${dj_db1.toFixed(3)}`,PAD.l+6,PAD.t+34);

    // Update info panel
    _setEl('sp1B1Val',b1Val.toFixed(3)); _setEl('sp1J',curJ.toFixed(4));
    _setEl('sp1Grad',dj_db1.toFixed(4));
    _setEl('sp1OptB1',OPT_OPTIMAL.b1.toFixed(3));
    _setEl('sp1OptJ',optMSE(b0Fixed,OPT_OPTIMAL.b1).toFixed(4));
    _setEl('sp1Gap',(curJ-optMSE(b0Fixed,OPT_OPTIMAL.b1)).toFixed(4));
    const gapEl=document.getElementById('sp1Gap');
    if(gapEl){const gap=curJ-optMSE(b0Fixed,OPT_OPTIMAL.b1);
      gapEl.style.color=gap<0.5?'var(--accent-green)':gap<3?'var(--accent-yellow)':'var(--accent-red)';}
  }

  /* ── Regression line preview ── */
  function drawLine(){
    ctxL.clearRect(0,0,W2,H2);
    _roundRect(ctxL,0,0,W2,H2,10); ctxL.fillStyle='rgba(0,0,0,.18)'; ctxL.fill();
    const PAD={t:24,r:20,b:44,l:52};
    const PW=W2-PAD.l-PAD.r,PH=H2-PAD.t-PAD.b;
    const xMin=0,xMax=11,yMin=0,yMax=25;
    const tCx=x=>PAD.l+(x-xMin)/(xMax-xMin)*PW;
    const tCy=y=>PAD.t+(1-(y-yMin)/(yMax-yMin))*PH;

    // Grid
    ctxL.strokeStyle='rgba(255,255,255,.04)'; ctxL.lineWidth=1;
    for(let i=0;i<=10;i++){ctxL.beginPath();ctxL.moveTo(tCx(i),PAD.t);ctxL.lineTo(tCx(i),H2-PAD.b);ctxL.stroke();}
    // Axes
    ctxL.strokeStyle='rgba(255,255,255,.18)'; ctxL.lineWidth=1.5;
    ctxL.beginPath();ctxL.moveTo(PAD.l,PAD.t);ctxL.lineTo(PAD.l,H2-PAD.b);ctxL.lineTo(W2-PAD.r,H2-PAD.b);ctxL.stroke();

    // Optimal line (reference, faint green)
    const {b0:ob0,b1:ob1}=OPT_OPTIMAL;
    ctxL.strokeStyle='rgba(16,185,129,.35)'; ctxL.lineWidth=1.5; ctxL.setLineDash([6,4]);
    ctxL.beginPath();ctxL.moveTo(tCx(0),tCy(ob0));ctxL.lineTo(tCx(10),tCy(ob1*10+ob0));ctxL.stroke();ctxL.setLineDash([]);

    // Current line
    const y0=b0Fixed, y1=b1Val*10+b0Fixed;
    const g=ctxL.createLinearGradient(tCx(0),0,tCx(10),0);
    g.addColorStop(0,'#f59e0b'); g.addColorStop(1,'#ef4444');
    ctxL.strokeStyle=g; ctxL.lineWidth=2.5; ctxL.shadowColor='#f59e0b'; ctxL.shadowBlur=8;
    ctxL.beginPath();
    ctxL.moveTo(tCx(0),Math.max(PAD.t,Math.min(H2-PAD.b,tCy(y0))));
    ctxL.lineTo(tCx(10),Math.max(PAD.t,Math.min(H2-PAD.b,tCy(y1))));
    ctxL.stroke(); ctxL.shadowBlur=0;

    // Residuals
    OPT_DATA.forEach(p=>{
      const pred=b1Val*p.x+b0Fixed;
      ctxL.strokeStyle='rgba(239,68,68,.3)'; ctxL.lineWidth=1; ctxL.setLineDash([3,3]);
      ctxL.beginPath();ctxL.moveTo(tCx(p.x),tCy(p.y));ctxL.lineTo(tCx(p.x),tCy(pred));ctxL.stroke();ctxL.setLineDash([]);
    });

    // Data points
    OPT_DATA.forEach(p=>{
      ctxL.beginPath();ctxL.arc(tCx(p.x),tCy(p.y),4.5,0,Math.PI*2);
      ctxL.fillStyle='#00d4ff';ctxL.shadowColor='#00d4ff';ctxL.shadowBlur=6;ctxL.fill();ctxL.shadowBlur=0;
    });

    // Labels
    ctxL.font='bold 11px Share Tech Mono,monospace'; ctxL.fillStyle='#f59e0b'; ctxL.textAlign='left';
    ctxL.fillText(`ŷ = ${b1Val.toFixed(2)}x + ${b0Fixed.toFixed(2)}`,PAD.l+6,PAD.t+16);
    ctxL.fillStyle='rgba(16,185,129,.6)';
    ctxL.fillText(`Optimal: ŷ = ${ob1.toFixed(2)}x + ${ob0.toFixed(2)}`,PAD.l+6,H2-PAD.b-6);
  }

  function drawAll(){drawParabola();drawLine();}

  window.sp1UpdateB1=function(v){
    b1Val=parseFloat(v);
    _setEl('sp1B1Slider2',parseFloat(v).toFixed(2));
    _slBg(document.getElementById('sp1B1Slider'));
    drawAll();
  };
  window.sp1UpdateB0Fixed=function(v){
    b0Fixed=parseFloat(v);
    _setEl('sp1B0FixedVal',parseFloat(v).toFixed(2));
    _slBg(document.getElementById('sp1B0FixedSlider'));
    drawAll();
  };
  window.sp1FindMin=function(){
    // OLS b1 given this fixed b0 approach: do gradient descent on 1 param
    let b=b1Val;
    for(let i=0;i<2000;i++){
      const grad=-2/OPT_DATA.length*OPT_DATA.reduce((s,p)=>s+p.x*(p.y-(b*p.x+b0Fixed)),0);
      b-=0.01*grad;
      if(Math.abs(grad)<0.0001) break;
    }
    b1Val=Math.round(b*1000)/1000;
    const sl=document.getElementById('sp1B1Slider');
    if(sl){sl.value=b1Val;_slBg(sl);_setEl('sp1B1Slider2',b1Val.toFixed(2));}
    drawAll(); showToast(`✅ b₁ optimal untuk b₀=${b0Fixed.toFixed(2)}: b₁≈${b1Val.toFixed(3)}`);
  };

  window.initSingleParam=function(){
    resize(); b1Val=0; b0Fixed=parseFloat(OPT_OPTIMAL.b0.toFixed(2));
    const sl0=document.getElementById('sp1B0FixedSlider');
    if(sl0){sl0.value=b0Fixed;_setEl('sp1B0FixedVal',b0Fixed.toFixed(2));_slBg(sl0);}
    drawAll(); initDone=true;
  };
  window.addEventListener('resize',()=>{if(initDone){resize();drawAll();}});
})();


/* ════════════════════════════════════════════════════
   SUB-TAB 2 — LOSS PLANE (2D contour + 3D surface sync)
   ════════════════════════════════════════════════════ */
(function(){
  const cv2d=document.getElementById('lp2dCanvas');
  const cv3d=document.getElementById('lp3dCanvas');
  const cv1d=document.getElementById('lp1dCanvas');
  if(!cv2d||!cv3d) return;
  const ctx2=cv2d.getContext('2d'), ctx3=cv3d.getContext('2d');
  const ctx1=cv1d?cv1d.getContext('2d'):null;
  const BND=OPT_BOUNDS;
  let W2,H2,W3,H3,W1,H1, initDone=false;
  let curB0=3.0, curB1=1.8, fixedParam='b1';
  let rot3d=0.4, dragging3d=false, lastX3d=0, autoRot=false, rotId=null;

  function resize(){
    const pw2=_canvasW(cv2d.parentElement, 500);
    const pw3=_canvasW(cv3d.parentElement, 500);
    const h2ratio = _isMobile() ? 1.05 : 0.88;
    const h3ratio = _isMobile() ? 1.0  : 0.84;
    cv2d.width=pw2; cv2d.height=Math.round(pw2*h2ratio);
    cv3d.width=pw3; cv3d.height=Math.round(pw3*h3ratio);
    W2=cv2d.width; H2=cv2d.height;
    W3=cv3d.width; H3=cv3d.height;
    if(cv1d){
      const pw1=_canvasW(cv1d.parentElement, 680);
      const h1ratio = _isMobile() ? 0.52 : 0.36;
      cv1d.width=pw1; cv1d.height=Math.round(pw1*h1ratio);
      W1=cv1d.width; H1=cv1d.height;
    }
  }

  const PAD2={t:32,r:24,b:52,l:60};
  function toCxB0(b0){return PAD2.l+(b0-BND.b0.min)/(BND.b0.max-BND.b0.min)*(W2-PAD2.l-PAD2.r);}
  function toCyB1(b1){return PAD2.t+(1-(b1-BND.b1.min)/(BND.b1.max-BND.b1.min))*(H2-PAD2.t-PAD2.b);}

  /* ── 2D Contour ── */
  function draw2D(){
    if(!W2) return;
    ctx2.clearRect(0,0,W2,H2); ctx2.fillStyle='rgb(6,11,20)'; ctx2.fillRect(0,0,W2,H2);
    const cache=getOptGrid(55); const STEPS=55;
    const PW=W2-PAD2.l-PAD2.r, PH=H2-PAD2.t-PAD2.b;
    const cw=PW/STEPS, ch=PH/STEPS;
    for(let i=0;i<STEPS;i++) for(let j=0;j<STEPS;j++){
      const norm=(cache.grid[i][j]-cache.minJ)/(cache.maxJ-cache.minJ+.01);
      ctx2.fillStyle=optCostColor(norm);
      ctx2.fillRect(PAD2.l+i*cw,PAD2.t+(STEPS-1-j)*ch,cw+1,ch+1);
    }
    // Axes
    ctx2.strokeStyle='rgba(255,255,255,.25)'; ctx2.lineWidth=1.5;
    ctx2.beginPath();ctx2.moveTo(PAD2.l,PAD2.t);ctx2.lineTo(PAD2.l,H2-PAD2.b);ctx2.lineTo(W2-PAD2.r,H2-PAD2.b);ctx2.stroke();
    // Axis labels
    ctx2.fillStyle='rgba(200,220,240,.65)'; ctx2.font='10px Rajdhani,sans-serif';
    ctx2.textAlign='center';
    for(let i=0;i<=5;i++){const v=BND.b0.min+i*(BND.b0.max-BND.b0.min)/5;ctx2.fillText(v.toFixed(1),toCxB0(v),H2-PAD2.b+14);}
    ctx2.textAlign='right';
    for(let i=0;i<=4;i++){const v=BND.b1.min+i*(BND.b1.max-BND.b1.min)/4;ctx2.fillText(v.toFixed(1),PAD2.l-5,toCyB1(v)+4);}
    ctx2.textAlign='center'; ctx2.fillStyle='rgba(200,220,240,.75)';
    ctx2.fillText('b₀',PAD2.l+PW/2,H2-5);
    ctx2.save();ctx2.translate(13,PAD2.t+PH/2);ctx2.rotate(-Math.PI/2);ctx2.fillText('b₁',0,0);ctx2.restore();
    // GD path overlay
    if(window._optGDPath&&window._optGDPath.length>1){
      ctx2.strokeStyle='rgba(245,158,11,.8)'; ctx2.lineWidth=1.8;
      ctx2.beginPath();
      window._optGDPath.forEach((pt,k)=>{k===0?ctx2.moveTo(toCxB0(pt.b0),toCyB1(pt.b1)):ctx2.lineTo(toCxB0(pt.b0),toCyB1(pt.b1));});
      ctx2.stroke();
      window._optGDPath.filter((_,k)=>k%8===0).forEach(pt=>{
        ctx2.beginPath();ctx2.arc(toCxB0(pt.b0),toCyB1(pt.b1),2.5,0,Math.PI*2);
        ctx2.fillStyle='rgba(245,158,11,.7)';ctx2.fill();
      });
    }
    // PSO particles
    if(window._optPSOParticles){
      window._optPSOParticles.forEach(p=>{
        ctx2.beginPath();ctx2.arc(toCxB0(p.b0),toCyB1(p.b1),4,0,Math.PI*2);
        ctx2.fillStyle=p.color||'rgba(0,212,255,.7)';ctx2.shadowBlur=4;ctx2.shadowColor=p.color||'#00d4ff';
        ctx2.fill();ctx2.shadowBlur=0;
      });
    }
    // Grid/random search dots
    if(window._optSearchDots){
      window._optSearchDots.forEach(d=>{
        ctx2.beginPath();ctx2.arc(toCxB0(d.b0),toCyB1(d.b1),3,0,Math.PI*2);
        const norm=(d.j-cache.minJ)/(cache.maxJ-cache.minJ+.01);
        ctx2.fillStyle=d.isBest?'rgba(16,185,129,.9)':optCostColor(norm)+'99';
        ctx2.fill();
      });
    }
    // Optimal cross
    ctx2.strokeStyle='rgba(16,185,129,.85)'; ctx2.lineWidth=1.5;
    const ox=toCxB0(OPT_OPTIMAL.b0), oy=toCyB1(OPT_OPTIMAL.b1);
    ctx2.beginPath();ctx2.moveTo(ox-10,oy);ctx2.lineTo(ox+10,oy);ctx2.stroke();
    ctx2.beginPath();ctx2.moveTo(ox,oy-10);ctx2.lineTo(ox,oy+10);ctx2.stroke();
    ctx2.beginPath();ctx2.arc(ox,oy,5,0,Math.PI*2);
    ctx2.fillStyle='rgba(16,185,129,.9)';ctx2.fill();
    // Current point
    const cx=toCxB0(curB0), cy=toCyB1(curB1);
    ctx2.beginPath();ctx2.arc(cx,cy,10,0,Math.PI*2);
    ctx2.strokeStyle='rgba(255,255,255,.25)';ctx2.lineWidth=1;ctx2.stroke();
    ctx2.beginPath();ctx2.arc(cx,cy,6,0,Math.PI*2);
    ctx2.fillStyle='#fff';ctx2.shadowColor='#fff';ctx2.shadowBlur=14;ctx2.fill();ctx2.shadowBlur=0;
    // Title + info
    ctx2.font='bold 10px Orbitron,monospace'; ctx2.fillStyle='rgba(0,212,255,.8)'; ctx2.textAlign='left';
    ctx2.fillText('2D Contour — klik untuk gerak',PAD2.l+4,PAD2.t-10);
    ctx2.font='10px Share Tech Mono,monospace'; ctx2.fillStyle='rgba(255,255,255,.65)';
    ctx2.fillText(`J=${optMSE(curB0,curB1).toFixed(3)}`,PAD2.l+4,PAD2.t+14);
    // color legend
    const lx=W2-PAD2.r-14,ly=PAD2.t+8,lh=Math.min(110,PH*.55),lw=12;
    const gr=ctx2.createLinearGradient(0,ly+lh,0,ly);
    gr.addColorStop(0,optCostColor(0));gr.addColorStop(.5,optCostColor(.5));gr.addColorStop(1,optCostColor(1));
    ctx2.fillStyle=gr;ctx2.fillRect(lx,ly,lw,lh);
    ctx2.strokeStyle='rgba(255,255,255,.15)';ctx2.lineWidth=.8;ctx2.strokeRect(lx,ly,lw,lh);
    ctx2.fillStyle='rgba(200,220,240,.6)'; ctx2.font='9px Rajdhani,sans-serif'; ctx2.textAlign='left';
    ctx2.fillText(cache.maxJ.toFixed(0),lx+lw+3,ly+7);
    ctx2.fillText(cache.minJ.toFixed(0),lx+lw+3,ly+lh);
  }

  /* ── 3D Surface ── */
  const B3={b0:{min:-2,max:8,n:26},b1:{min:0,max:4,n:26}};
  function proj3D(b0,b1,j,minJ,maxJ,rot){
    const nx=(b0-B3.b0.min)/(B3.b0.max-B3.b0.min)*2-1;
    const nz=(b1-B3.b1.min)/(B3.b1.max-B3.b1.min)*2-1;
    const ny=(j-minJ)/(maxJ-minJ+.001);
    const cosR=Math.cos(rot),sinR=Math.sin(rot);
    const rx=nx*cosR-nz*sinR, rz=nx*sinR+nz*cosR;
    const sc=Math.min(W3,H3)*.3;
    return {cx:W3/2+(rx*.866-rz*.5)*sc, cy:H3*.56+(rx*.5+rz*.5)*sc*.55-ny*sc*.68, ny};
  }
  function draw3D(){
    if(!W3) return;
    ctx3.clearRect(0,0,W3,H3); ctx3.fillStyle='rgb(6,11,20)'; ctx3.fillRect(0,0,W3,H3);
    const nb0=B3.b0.n, nb1=B3.b1.n;
    const g3=[]; let minJ=Infinity,maxJ=0;
    for(let i=0;i<=nb0;i++){g3[i]=[];
      for(let j=0;j<=nb1;j++){
        const b0=B3.b0.min+i*(B3.b0.max-B3.b0.min)/nb0;
        const b1=B3.b1.min+j*(B3.b1.max-B3.b1.min)/nb1;
        const v=optMSE(b0,b1); g3[i][j]={b0,b1,j:v};
        if(v<minJ)minJ=v; if(v>maxJ)maxJ=v;
      }}
    const cells=[];
    for(let i=0;i<nb0;i++) for(let j=0;j<nb1;j++){
      const pts=[g3[i][j],g3[i+1][j],g3[i+1][j+1],g3[i][j+1]];
      const avgJ=pts.reduce((s,p)=>s+p.j,0)/4;
      const projs=pts.map(p=>proj3D(p.b0,p.b1,p.j,minJ,maxJ,rot3d));
      cells.push({projs,avgJ,avgY:projs.reduce((s,p)=>s+p.cy,0)/4});
    }
    cells.sort((a,b)=>b.avgY-a.avgY);
    cells.forEach(({projs,avgJ})=>{
      const nz=(avgJ-minJ)/(maxJ-minJ+.001),t=Math.sqrt(nz);
      let r,g,b;
      if(t<.35){const s=t/.35;r=10;g=Math.round(60+s*170);b=Math.round(180+s*50);}
      else if(t<.65){const s=(t-.35)/.3;r=Math.round(s*50);g=Math.round(230-s*70);b=Math.round(230-s*230);}
      else{const s=(t-.65)/.35;r=Math.round(50+s*205);g=Math.round(160-s*160);b=0;}
      ctx3.beginPath(); projs.forEach((p,k)=>k===0?ctx3.moveTo(p.cx,p.cy):ctx3.lineTo(p.cx,p.cy));
      ctx3.closePath(); ctx3.fillStyle=`rgba(${r},${g},${b},.92)`; ctx3.fill();
      ctx3.strokeStyle='rgba(0,0,0,.3)'; ctx3.lineWidth=.4; ctx3.stroke();
    });
    // GD path on 3D
    if(window._optGDPath&&window._optGDPath.length>1){
      ctx3.strokeStyle='rgba(245,158,11,.8)'; ctx3.lineWidth=2;
      ctx3.beginPath();
      window._optGDPath.forEach((pt,k)=>{
        const p=proj3D(pt.b0,pt.b1,optMSE(pt.b0,pt.b1),minJ,maxJ,rot3d);
        k===0?ctx3.moveTo(p.cx,p.cy):ctx3.lineTo(p.cx,p.cy);
      }); ctx3.stroke();
    }
    // Current point
    const cp=proj3D(curB0,curB1,optMSE(curB0,curB1),minJ,maxJ,rot3d);
    ctx3.beginPath();ctx3.arc(cp.cx,cp.cy,8,0,Math.PI*2);
    ctx3.fillStyle='#fff';ctx3.shadowColor='#fff';ctx3.shadowBlur=16;ctx3.fill();ctx3.shadowBlur=0;
    ctx3.strokeStyle='rgba(0,212,255,.8)';ctx3.lineWidth=2;ctx3.stroke();
    // Optimal
    const op=proj3D(OPT_OPTIMAL.b0,OPT_OPTIMAL.b1,optMSE(OPT_OPTIMAL.b0,OPT_OPTIMAL.b1),minJ,maxJ,rot3d);
    ctx3.beginPath();ctx3.arc(op.cx,op.cy,6,0,Math.PI*2);
    ctx3.fillStyle='rgba(16,185,129,.9)';ctx3.shadowColor='#10b981';ctx3.shadowBlur=12;ctx3.fill();ctx3.shadowBlur=0;
    // Drop line
    const cpBase=proj3D(curB0,curB1,minJ,minJ,maxJ,rot3d);
    ctx3.strokeStyle='rgba(0,212,255,.25)';ctx3.lineWidth=1;ctx3.setLineDash([3,3]);
    ctx3.beginPath();ctx3.moveTo(cp.cx,cp.cy);ctx3.lineTo(cpBase.cx,cpBase.cy);ctx3.stroke();ctx3.setLineDash([]);
    // Labels
    ctx3.font='bold 10px Orbitron,monospace';ctx3.fillStyle='rgba(0,212,255,.8)';ctx3.textAlign='left';
    ctx3.fillText('3D Surface — drag rotasi',8,16);
    ctx3.font='10px Share Tech Mono,monospace';ctx3.fillStyle='rgba(255,255,255,.65)';
    ctx3.fillText(`J=${optMSE(curB0,curB1).toFixed(3)}`,8,30);
    ctx3.fillStyle='rgba(16,185,129,.7)';ctx3.fillText('● min',8,H3-22);
    ctx3.fillStyle='rgba(255,255,255,.6)';ctx3.fillText('● kamu',8,H3-10);
    ctx3.fillStyle='rgba(200,220,240,.4)';ctx3.textAlign='right';ctx3.fillText('drag=rotasi',W3-6,H3-6);
  }

  /* ── 1D sweep curve ── */
  function draw1D(){
    if(!ctx1||!W1) return;
    ctx1.clearRect(0,0,W1,H1);
    _roundRect(ctx1,0,0,W1,H1,10); ctx1.fillStyle='rgba(0,0,0,.2)'; ctx1.fill();
    const PAD={t:22,r:18,b:40,l:56};
    const PW=W1-PAD.l-PAD.r, PH=H1-PAD.t-PAD.b;
    const fixed=fixedParam==='b1';
    const sweepMin=fixed?BND.b0.min:BND.b1.min, sweepMax=fixed?BND.b0.max:BND.b1.max;
    const fixedVal=fixed?curB1:curB0, curSweep=fixed?curB0:curB1;
    const label=fixed?'b₀':'b₁';
    const pts=[]; let jMin2=Infinity,jMax2=0;
    for(let i=0;i<=100;i++){
      const sv=sweepMin+i*(sweepMax-sweepMin)/100;
      const j=fixed?optMSE(sv,fixedVal):optMSE(fixedVal,sv);
      pts.push({sv,j}); if(j<jMin2)jMin2=j; if(j>jMax2)jMax2=j;
    }
    const jp2=(jMax2-jMin2)*.07||.5;
    const tCx=sv=>PAD.l+(sv-sweepMin)/(sweepMax-sweepMin)*PW;
    const tCy=j=>PAD.t+(1-(j-jMin2+jp2)/(jMax2-jMin2+2*jp2))*PH;

    // Grid
    ctx1.strokeStyle='rgba(255,255,255,.04)'; ctx1.lineWidth=1;
    for(let i=0;i<=4;i++){const y=PAD.t+i*PH/4;ctx1.beginPath();ctx1.moveTo(PAD.l,y);ctx1.lineTo(W1-PAD.r,y);ctx1.stroke();}
    ctx1.strokeStyle='rgba(255,255,255,.15)'; ctx1.lineWidth=1.5;
    ctx1.beginPath();ctx1.moveTo(PAD.l,PAD.t);ctx1.lineTo(PAD.l,H1-PAD.b);ctx1.lineTo(W1-PAD.r,H1-PAD.b);ctx1.stroke();
    // Labels
    ctx1.fillStyle='rgba(148,163,184,.6)'; ctx1.font='10px Rajdhani,sans-serif';
    ctx1.textAlign='center'; ctx1.fillText(label,PAD.l+PW/2,H1-4);
    ctx1.textAlign='right'; ctx1.fillText(jMax2.toFixed(0),PAD.l-3,PAD.t+8); ctx1.fillText(jMin2.toFixed(0),PAD.l-3,H1-PAD.b);
    // Fill
    const gf=ctx1.createLinearGradient(0,PAD.t,0,H1-PAD.b);
    gf.addColorStop(0,'rgba(239,68,68,.2)'); gf.addColorStop(1,'rgba(239,68,68,0)');
    ctx1.fillStyle=gf;
    ctx1.beginPath();ctx1.moveTo(tCx(pts[0].sv),H1-PAD.b);
    pts.forEach(p=>ctx1.lineTo(tCx(p.sv),tCy(p.j)));
    ctx1.lineTo(tCx(pts[pts.length-1].sv),H1-PAD.b);ctx1.closePath();ctx1.fill();
    // Curve
    const gc=ctx1.createLinearGradient(PAD.l,0,W1-PAD.r,0);
    gc.addColorStop(0,'#ef4444');gc.addColorStop(.5,'#f59e0b');gc.addColorStop(1,'#ef4444');
    ctx1.strokeStyle=gc; ctx1.lineWidth=2.5;
    ctx1.beginPath(); pts.forEach((p,i)=>i===0?ctx1.moveTo(tCx(p.sv),tCy(p.j)):ctx1.lineTo(tCx(p.sv),tCy(p.j))); ctx1.stroke();
    // Optimal & current
    const optPt=pts.reduce((a,b)=>a.j<b.j?a:b);
    ctx1.beginPath();ctx1.arc(tCx(optPt.sv),tCy(optPt.j),5,0,Math.PI*2);
    ctx1.fillStyle='rgba(16,185,129,.9)';ctx1.fill();
    ctx1.font='9px Share Tech Mono,monospace';ctx1.fillStyle='rgba(16,185,129,.8)';ctx1.textAlign='left';
    ctx1.fillText(`min≈${optPt.sv.toFixed(2)}`,tCx(optPt.sv)+7,tCy(optPt.j)-4);
    const curJ1=fixed?optMSE(curSweep,fixedVal):optMSE(fixedVal,curSweep);
    ctx1.beginPath();ctx1.arc(tCx(curSweep),tCy(curJ1),5,0,Math.PI*2);
    ctx1.fillStyle='#fff';ctx1.shadowColor='#fff';ctx1.shadowBlur=10;ctx1.fill();ctx1.shadowBlur=0;
    ctx1.strokeStyle='rgba(255,255,255,.2)';ctx1.lineWidth=1;ctx1.setLineDash([3,3]);
    ctx1.beginPath();ctx1.moveTo(tCx(curSweep),tCy(curJ1));ctx1.lineTo(tCx(curSweep),H1-PAD.b);ctx1.stroke();ctx1.setLineDash([]);
    ctx1.fillStyle='rgba(245,158,11,.7)'; ctx1.textAlign='right'; ctx1.font='10px Share Tech Mono,monospace';
    ctx1.fillText(`J=${curJ1.toFixed(2)} | ${fixed?'b₁':'b₀'}=${fixedVal.toFixed(2)} (tetap)`,W1-PAD.r,PAD.t+14);
  }

  function drawAll(){
    draw2D(); draw3D(); draw1D();
    const j=optMSE(curB0,curB1);
    _setEl('lpB0Display',curB0.toFixed(3)); _setEl('lpB1Display',curB1.toFixed(3));
    _setEl('lpJDisplay',j.toFixed(4));
    _setEl('lpOptB0',OPT_OPTIMAL.b0.toFixed(3)); _setEl('lpOptB1',OPT_OPTIMAL.b1.toFixed(3));
    _setEl('lpOptJ',optMSE(OPT_OPTIMAL.b0,OPT_OPTIMAL.b1).toFixed(4));
    const gap=j-optMSE(OPT_OPTIMAL.b0,OPT_OPTIMAL.b1);
    _setEl('lpGap',gap.toFixed(4));
    const gapEl=document.getElementById('lpGap');
    if(gapEl) gapEl.style.color=gap<.5?'var(--accent-green)':gap<2?'var(--accent-yellow)':'var(--accent-red)';
  }

  // Expose for GD sync
  window.lpSetPoint=function(b0,b1){curB0=b0;curB1=b1;drawAll();};
  window.lpDrawAll=drawAll;

  // Slider controls
  window.lpUpdateB0=function(v){curB0=parseFloat(v);_setEl('lpB0Val',parseFloat(v).toFixed(2));_slBg(document.getElementById('lpB0Slider'));drawAll();};
  window.lpUpdateB1=function(v){curB1=parseFloat(v);_setEl('lpB1Val',parseFloat(v).toFixed(2));_slBg(document.getElementById('lpB1Slider'));drawAll();};
  window.lpSetFixed=function(p){fixedParam=p;document.querySelectorAll('.lp-fix-btn').forEach(b=>b.classList.toggle('active',b.dataset.fix===p));drawAll();};
  window.lpGoOptimal=function(){
    curB0=parseFloat(OPT_OPTIMAL.b0.toFixed(2)); curB1=parseFloat(OPT_OPTIMAL.b1.toFixed(2));
    const sl0=document.getElementById('lpB0Slider'),sl1=document.getElementById('lpB1Slider');
    if(sl0){sl0.value=curB0;_setEl('lpB0Val',curB0.toFixed(2));_slBg(sl0);}
    if(sl1){sl1.value=curB1;_setEl('lpB1Val',curB1.toFixed(2));_slBg(sl1);}
    drawAll(); showToast('✅ Di-set ke nilai optimal OLS!');
  };
  window.lpRandomize=function(){
    curB0=+(Math.random()*(BND.b0.max-BND.b0.min)+BND.b0.min).toFixed(2);
    curB1=+(Math.random()*(BND.b1.max-BND.b1.min)+BND.b1.min).toFixed(2);
    const sl0=document.getElementById('lpB0Slider'),sl1=document.getElementById('lpB1Slider');
    if(sl0){sl0.value=curB0;_setEl('lpB0Val',curB0.toFixed(2));_slBg(sl0);}
    if(sl1){sl1.value=curB1;_setEl('lpB1Val',curB1.toFixed(2));_slBg(sl1);}
    drawAll();
  };

  // 3D drag
  cv3d.addEventListener('mousedown',e=>{dragging3d=true;lastX3d=e.clientX;});
  cv3d.addEventListener('mousemove',e=>{if(!dragging3d)return;rot3d+=(e.clientX-lastX3d)*.012;lastX3d=e.clientX;draw3D();});
  cv3d.addEventListener('mouseup',()=>{dragging3d=false;});
  cv3d.addEventListener('mouseleave',()=>{dragging3d=false;});
  cv3d.addEventListener('touchstart',e=>{e.preventDefault();dragging3d=true;lastX3d=e.touches[0].clientX;},{passive:false});
  cv3d.addEventListener('touchmove',e=>{e.preventDefault();if(!dragging3d)return;rot3d+=(e.touches[0].clientX-lastX3d)*.012;lastX3d=e.touches[0].clientX;draw3D();},{passive:false});
  cv3d.addEventListener('touchend',()=>{dragging3d=false;});

  // 2D click
  cv2d.addEventListener('click',e=>{
    const r=cv2d.getBoundingClientRect(),sx=W2/r.width,sy=H2/r.height;
    const cx=(e.clientX-r.left)*sx,cy=(e.clientY-r.top)*sy;
    const PW=W2-PAD2.l-PAD2.r,PH=H2-PAD2.t-PAD2.b;
    if(cx>=PAD2.l&&cx<=W2-PAD2.r&&cy>=PAD2.t&&cy<=H2-PAD2.b){
      curB0=BND.b0.min+(cx-PAD2.l)/PW*(BND.b0.max-BND.b0.min);
      curB1=BND.b1.min+(1-(cy-PAD2.t)/PH)*(BND.b1.max-BND.b1.min);
      curB0=Math.round(curB0*100)/100; curB1=Math.round(curB1*100)/100;
      const sl0=document.getElementById('lpB0Slider'),sl1=document.getElementById('lpB1Slider');
      if(sl0){sl0.value=curB0;_setEl('lpB0Val',curB0.toFixed(2));_slBg(sl0);}
      if(sl1){sl1.value=curB1;_setEl('lpB1Val',curB1.toFixed(2));_slBg(sl1);}
      drawAll();
    }
  });

  window.initLossPlaneInteractive=function(){resize();drawAll();initDone=true;};
  window.addEventListener('resize',()=>{if(initDone){resize();drawAll();}});
})();


/* ════════════════════════════════════════════════════
   SUB-TAB 3 — GRADIENT DESCENT (synced with loss plane)
   ════════════════════════════════════════════════════ */
(function(){
  const gdCv=document.getElementById('optGdCanvas');
  const lossCv=document.getElementById('optLossCanvas');
  if(!gdCv||!lossCv) return;
  const ctx=gdCv.getContext('2d'), lCtx=lossCv.getContext('2d');
  const PAD={top:36,right:24,bottom:52,left:58};
  let W,H,LW,LH, initDone=false;
  let lr=0.005, iterPerStep=5;
  let b0=0,b1=0, initB0=0,initB1=0;
  let totalIter=0, lossHist=[], paramHist=[];
  let running=false, animId=null, frameC=0;

  const OPT_B1=OPT_OPTIMAL.b1, OPT_B0=OPT_OPTIMAL.b0;

  function resize(){
    const cw=_canvasW(gdCv.parentElement, 720);
    const lossH = _isMobile() ? 0.38 : 0.22;  // taller loss curve on mobile
    gdCv.width=cw;   gdCv.height=Math.round(cw*0.5);
    lossCv.width=cw; lossCv.height=Math.round(cw*lossH);
    W=gdCv.width; H=gdCv.height;
    LW=lossCv.width; LH=lossCv.height;
  }
  const xMin=0,xMax=11,yMin=0,yMax=25;
  const tCx=x=>PAD.left+(x-xMin)/(xMax-xMin)*(W-PAD.left-PAD.right);
  const tCy=y=>PAD.top+(1-(y-yMin)/(yMax-yMin))*(H-PAD.top-PAD.bottom);

  function mse(b0v,b1v){return OPT_DATA.reduce((s,p)=>s+(p.y-(b1v*p.x+b0v))**2,0)/OPT_DATA.length;}

  function step(){
    const n=OPT_DATA.length; let dw=0,db=0;
    OPT_DATA.forEach(p=>{const e=p.y-(b1*p.x+b0);dw+=(-2/n)*p.x*e;db+=(-2/n)*e;});
    b0-=lr*db; b1-=lr*dw; totalIter++;
    lossHist.push(mse(b0,b1)); paramHist.push({b0,b1});
  }

  function doSteps(){
    for(let i=0;i<iterPerStep;i++) step();
    draw(); drawLoss(); updateInfo();
    // sync to loss plane 2D/3D
    window._optGDPath=[...paramHist];
    if(window.lpDrawAll) window.lpDrawAll();
    // convergence check
    if(lossHist.length>10){
      const r5=lossHist.slice(-5);
      if(Math.max(...r5)-Math.min(...r5)<0.00005){
        running=false; cancelAnimationFrame(animId);
        const btn=document.getElementById('optGdStartBtn');if(btn)btn.textContent='▶ Mulai / Pause';
        showToast(`✅ Konvergen! iter=${totalIter}, J=${mse(b0,b1).toFixed(5)}`);
        if(window.awardBadge) awardBadge('ach3','Gradient Rider');
        return true;
      }
    }
    return false;
  }

  function draw(){
    if(!W) return;
    ctx.clearRect(0,0,W,H);
    _roundRect(ctx,0,0,W,H,12); ctx.fillStyle='rgba(0,0,0,.18)'; ctx.fill();
    const PW=W-PAD.left-PAD.right,PH=H-PAD.top-PAD.bottom;
    // Grid
    ctx.strokeStyle='rgba(255,255,255,.04)'; ctx.lineWidth=1;
    for(let i=0;i<=10;i++){
      ctx.beginPath();ctx.moveTo(tCx(i),PAD.top);ctx.lineTo(tCx(i),H-PAD.bottom);ctx.stroke();
      ctx.beginPath();ctx.moveTo(PAD.left,tCy(i*2.5));ctx.lineTo(W-PAD.right,tCy(i*2.5));ctx.stroke();
    }
    ctx.strokeStyle='rgba(255,255,255,.2)'; ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(PAD.left,PAD.top);ctx.lineTo(PAD.left,H-PAD.bottom);ctx.lineTo(W-PAD.right,H-PAD.bottom);ctx.stroke();
    ctx.fillStyle='rgba(148,163,184,.6)'; ctx.font='11px Rajdhani,sans-serif';
    ctx.textAlign='center';
    for(let i=0;i<=5;i++){const xv=xMin+i*(xMax-xMin)/5;ctx.fillText(xv.toFixed(0),tCx(xv),H-PAD.bottom+16);}
    ctx.textAlign='right';
    for(let i=0;i<=5;i++){const yv=yMin+i*(yMax-yMin)/5;ctx.fillText(yv.toFixed(0),PAD.left-6,tCy(yv)+4);}
    // Optimal line
    ctx.strokeStyle='rgba(16,185,129,.4)'; ctx.lineWidth=1.5; ctx.setLineDash([6,4]);
    ctx.beginPath();ctx.moveTo(tCx(xMin),tCy(OPT_B1*xMin+OPT_B0));ctx.lineTo(tCx(xMax),tCy(OPT_B1*xMax+OPT_B0));ctx.stroke();ctx.setLineDash([]);
    // Current line
    const grd=ctx.createLinearGradient(tCx(xMin),0,tCx(xMax),0);
    grd.addColorStop(0,'#f59e0b'); grd.addColorStop(1,'#ef4444');
    ctx.strokeStyle=grd; ctx.lineWidth=2.5; ctx.shadowColor='#f59e0b'; ctx.shadowBlur=8;
    ctx.beginPath();
    ctx.moveTo(tCx(xMin),Math.max(PAD.top,Math.min(H-PAD.bottom,tCy(b1*xMin+b0))));
    ctx.lineTo(tCx(xMax),Math.max(PAD.top,Math.min(H-PAD.bottom,tCy(b1*xMax+b0))));
    ctx.stroke(); ctx.shadowBlur=0;
    // Residuals (faint)
    OPT_DATA.forEach(p=>{
      const pred=b1*p.x+b0;
      ctx.strokeStyle='rgba(239,68,68,.2)'; ctx.lineWidth=1; ctx.setLineDash([2,3]);
      ctx.beginPath();ctx.moveTo(tCx(p.x),tCy(p.y));ctx.lineTo(tCx(p.x),tCy(pred));ctx.stroke();ctx.setLineDash([]);
    });
    // Data points
    OPT_DATA.forEach(p=>{
      ctx.beginPath();ctx.arc(tCx(p.x),tCy(p.y),5,0,Math.PI*2);
      ctx.fillStyle='#00d4ff';ctx.shadowColor='#00d4ff';ctx.shadowBlur=6;ctx.fill();ctx.shadowBlur=0;
    });
    ctx.font='bold 12px Share Tech Mono,monospace'; ctx.textAlign='left';
    ctx.fillStyle='#f59e0b'; ctx.fillText(`Current: ŷ=${b1.toFixed(2)}x+${b0.toFixed(2)}`,PAD.left+8,PAD.top+18);
    ctx.fillStyle='rgba(16,185,129,.7)'; ctx.fillText(`Optimal: ŷ=${OPT_B1.toFixed(2)}x+${OPT_B0.toFixed(2)}`,PAD.left+8,PAD.top+34);
  }

  function drawLoss(){
    if(!LW) return;
    lCtx.clearRect(0,0,LW,LH); lCtx.fillStyle='rgba(0,0,0,.18)'; lCtx.fillRect(0,0,LW,LH);
    const lPAD={t:16,r:20,b:32,l:56};
    const lPW=LW-lPAD.l-lPAD.r,lPH=LH-lPAD.t-lPAD.b;
    if(lossHist.length<2){
      lCtx.fillStyle='rgba(148,163,184,.4)'; lCtx.font='12px Rajdhani,sans-serif';
      lCtx.textAlign='center'; lCtx.fillText('Loss curve muncul setelah iterasi dimulai',LW/2,LH/2); return;
    }
    const maxL=lossHist[0], minL=Math.min(...lossHist);
    const lp=(maxL-minL)*.05||.1;
    const toCxL=i=>lPAD.l+(i/(lossHist.length-1))*lPW;
    const toCyL=v=>lPAD.t+(1-(v-minL+lp)/(maxL-minL+2*lp))*lPH;
    lCtx.strokeStyle='rgba(255,255,255,.05)'; lCtx.lineWidth=1;
    for(let i=0;i<=4;i++){const y=lPAD.t+i*lPH/4;lCtx.beginPath();lCtx.moveTo(lPAD.l,y);lCtx.lineTo(LW-lPAD.r,y);lCtx.stroke();}
    lCtx.strokeStyle='rgba(255,255,255,.15)'; lCtx.lineWidth=1.5;
    lCtx.beginPath();lCtx.moveTo(lPAD.l,lPAD.t);lCtx.lineTo(lPAD.l,LH-lPAD.b);lCtx.lineTo(LW-lPAD.r,LH-lPAD.b);lCtx.stroke();
    lCtx.fillStyle='rgba(148,163,184,.6)'; lCtx.font='10px Rajdhani,sans-serif';
    lCtx.textAlign='center'; lCtx.fillText('Iterasi',lPAD.l+lPW/2,LH-3);
    lCtx.textAlign='right'; lCtx.fillText(maxL.toFixed(1),lPAD.l-3,lPAD.t+8); lCtx.fillText(minL.toFixed(1),lPAD.l-3,LH-lPAD.b);
    const fg=lCtx.createLinearGradient(0,lPAD.t,0,LH-lPAD.b);
    fg.addColorStop(0,'rgba(239,68,68,.3)'); fg.addColorStop(1,'rgba(239,68,68,0)');
    lCtx.fillStyle=fg;
    lCtx.beginPath();lCtx.moveTo(toCxL(0),LH-lPAD.b);
    lossHist.forEach((v,i)=>lCtx.lineTo(toCxL(i),toCyL(v)));
    lCtx.lineTo(toCxL(lossHist.length-1),LH-lPAD.b);lCtx.closePath();lCtx.fill();
    const lg=lCtx.createLinearGradient(lPAD.l,0,LW-lPAD.r,0);
    lg.addColorStop(0,'#ef4444');lg.addColorStop(1,'#f59e0b');
    lCtx.strokeStyle=lg; lCtx.lineWidth=2;
    lCtx.beginPath();lossHist.forEach((v,i)=>i===0?lCtx.moveTo(toCxL(i),toCyL(v)):lCtx.lineTo(toCxL(i),toCyL(v)));lCtx.stroke();
    const lx=toCxL(lossHist.length-1),ly2=toCyL(lossHist[lossHist.length-1]);
    lCtx.beginPath();lCtx.arc(lx,ly2,4,0,Math.PI*2);
    lCtx.fillStyle='#f59e0b';lCtx.shadowColor='#f59e0b';lCtx.shadowBlur=8;lCtx.fill();lCtx.shadowBlur=0;
    lCtx.fillStyle='rgba(148,163,184,.6)'; lCtx.textAlign='left'; lCtx.fillText('Loss (MSE)',lPAD.l+4,lPAD.t+12);
  }

  function updateInfo(){
    const j=mse(b0,b1);
    _setEl('optGdIter',totalIter); _setEl('optGdMSE',j.toFixed(4));
    _setEl('optGdB0',b0.toFixed(4)); _setEl('optGdB1',b1.toFixed(4));
    _setEl('optGdDb0',(b0-OPT_B0).toFixed(4)); _setEl('optGdDb1',(b1-OPT_B1).toFixed(4));
    if(window.lpSetPoint) lpSetPoint(b0,b1);
  }

  function runLoop(){
    if(!running) return;
    frameC++;
    if(frameC%2===0){if(doStepsAndLog())return;}
    animId=requestAnimationFrame(runLoop);
  }

  window.optGdToggle=function(){
    running=!running;
    const btn=document.getElementById('optGdStartBtn');
    if(btn)btn.textContent=running?'⏸ Pause':'▶ Mulai / Pause';
    if(running){frameC=0;runLoop();}else cancelAnimationFrame(animId);
  };
  window.optGdReset=function(){
    running=false; cancelAnimationFrame(animId);
    b0=initB0; b1=initB1; totalIter=0; lossHist=[]; paramHist=[]; frameC=0;
    window._optGDPath=[];
    const log=document.getElementById('optGdLog');
    if(log)log.innerHTML='<div class="log-line" style="color:var(--text-muted);">// Log iterasi...</div>';
    const btn=document.getElementById('optGdStartBtn');if(btn)btn.textContent='▶ Mulai / Pause';
    updateInfo(); draw(); drawLoss();
    if(window.lpDrawAll) lpDrawAll();
    showToast('↺ Gradient Descent direset!');
  };
  window.optGdUpdateLR=function(v){lr=parseFloat(v);_setEl('optGdLrVal',parseFloat(v).toFixed(4));};
  window.optGdUpdateIter=function(v){iterPerStep=parseInt(v);_setEl('optGdIterVal',v);};
  window.optGdUpdateInitB0=function(v){initB0=parseFloat(v);_setEl('optGdInitB0Val',parseFloat(v).toFixed(1));if(!running){b0=initB0;draw();}};
  window.optGdUpdateInitB1=function(v){initB1=parseFloat(v);_setEl('optGdInitB1Val',parseFloat(v).toFixed(1));if(!running){b1=initB1;draw();}};

  // Log helper — inline into doSteps
  const _origDoSteps = doSteps;
  function doStepsAndLog() {
    const res = _origDoSteps();
    // Log every iterPerStep iterations (not every single step)
    const log = document.getElementById('optGdLog');
    if (log) {
      const line = document.createElement('div');
      line.className = 'log-line' + (totalIter % 50 === 0 ? ' highlight' : '');
      line.textContent = 'iter ' + String(totalIter).padStart(4,'0') +
        ' | J=' + mse(b0,b1).toFixed(4) +
        ' | b0=' + b0.toFixed(3) +
        ' | b1=' + b1.toFixed(3);
      log.appendChild(line);
      if (log.children.length > 100) log.removeChild(log.firstChild);
      log.scrollTop = log.scrollHeight;
    }
    return res;
  }

  // Override the exported step function to include logging
  window.optGdStep = doStepsAndLog;

  window.initGradientDescent=function(){resize();b0=initB0;b1=initB1;draw();drawLoss();updateInfo();initDone=true;};
  window.addEventListener('resize',()=>{if(initDone){resize();draw();drawLoss();}});
})();


/* ════════════════════════════════════════════════════
   SUB-TAB 4 — GRID SEARCH
   ════════════════════════════════════════════════════ */
(function(){
  const canvas=document.getElementById('gsCanvas');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  const BND=OPT_BOUNDS;
  let W,H,PAD={t:32,r:24,b:52,l:60}, initDone=false;
  let gridN=8, running=false, animId=null;
  let cells=[], best=null, idx=0, done=false;

  function resize(){const cw=_canvasW(canvas.parentElement,680);canvas.width=cw;canvas.height=Math.round(cw*(_isMobile()?0.95:0.72));W=canvas.width;H=canvas.height;}
  const PW=()=>W-PAD.l-PAD.r, PH=()=>H-PAD.t-PAD.b;
  const tCxB0=b0=>PAD.l+(b0-BND.b0.min)/(BND.b0.max-BND.b0.min)*PW();
  const tCyB1=b1=>PAD.t+(1-(b1-BND.b1.min)/(BND.b1.max-BND.b1.min))*PH();

  function build(){cells=[];best=null;idx=0;done=false;
    for(let i=0;i<gridN;i++) for(let j=0;j<gridN;j++){
      const b0=BND.b0.min+(i+.5)*(BND.b0.max-BND.b0.min)/gridN;
      const b1=BND.b1.min+(j+.5)*(BND.b1.max-BND.b1.min)/gridN;
      cells.push({b0,b1,j:optMSE(b0,b1),visited:false,isBest:false,ord:i*gridN+j});
    }
    cells.sort((a,b)=>a.ord-b.ord);
  }

  function draw(){
    if(!W)return; ctx.clearRect(0,0,W,H); ctx.fillStyle='rgb(6,11,20)'; ctx.fillRect(0,0,W,H);
    const cache=getOptGrid(50); const cw2=PW()/50,ch2=PH()/50;
    for(let i=0;i<50;i++) for(let j=0;j<50;j++){
      const n=(cache.grid[i][j]-cache.minJ)/(cache.maxJ-cache.minJ+.01);
      ctx.fillStyle=optCostColor(n)+'88'; ctx.fillRect(PAD.l+i*cw2,PAD.t+(49-j)*ch2,cw2+1,ch2+1);
    }
    // grid lines
    ctx.strokeStyle='rgba(255,255,255,.06)'; ctx.lineWidth=1;
    for(let i=0;i<=gridN;i++){
      const x=PAD.l+i*PW()/gridN,y2=PAD.t+i*PH()/gridN;
      ctx.beginPath();ctx.moveTo(x,PAD.t);ctx.lineTo(x,H-PAD.b);ctx.stroke();
      ctx.beginPath();ctx.moveTo(PAD.l,y2);ctx.lineTo(W-PAD.r,y2);ctx.stroke();
    }
    ctx.strokeStyle='rgba(255,255,255,.2)'; ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(PAD.l,PAD.t);ctx.lineTo(PAD.l,H-PAD.b);ctx.lineTo(W-PAD.r,H-PAD.b);ctx.stroke();
    ctx.fillStyle='rgba(200,220,240,.6)'; ctx.font='10px Rajdhani,sans-serif'; ctx.textAlign='center';
    for(let i=0;i<=5;i++){const v=BND.b0.min+i*(BND.b0.max-BND.b0.min)/5;ctx.fillText(v.toFixed(1),tCxB0(v),H-PAD.b+14);}
    ctx.textAlign='right';
    for(let i=0;i<=4;i++){const v=BND.b1.min+i*(BND.b1.max-BND.b1.min)/4;ctx.fillText(v.toFixed(1),PAD.l-5,tCyB1(v)+4);}
    ctx.textAlign='center'; ctx.fillText('b₀',PAD.l+PW()/2,H-5);

    const sz=PW()/gridN*.34;
    cells.forEach((c,ci)=>{
      const cx=tCxB0(c.b0),cy=tCyB1(c.b1);
      if(c.visited){
        const n=(c.j-cache.minJ)/(cache.maxJ-cache.minJ+.01);
        ctx.beginPath();ctx.arc(cx,cy,sz,0,Math.PI*2);
        ctx.fillStyle=c.isBest?'rgba(16,185,129,.9)':optCostColor(n)+'cc'; ctx.fill();
        ctx.strokeStyle=c.isBest?'#10b981':'rgba(255,255,255,.25)';
        ctx.lineWidth=c.isBest?2:.8; ctx.stroke();
        if(c.isBest){ctx.font='bold 9px Share Tech Mono,monospace';ctx.fillStyle='rgba(16,185,129,.9)';ctx.textAlign='center';
          ctx.fillText('BEST',cx,cy-sz-3);ctx.fillText(`J=${c.j.toFixed(2)}`,cx,cy+sz+10);}
      } else {
        ctx.beginPath();ctx.arc(cx,cy,sz*.65,0,Math.PI*2);
        ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=1;ctx.stroke();
      }
      if(idx>0&&ci===idx-1&&c.visited){
        ctx.beginPath();ctx.arc(cx,cy,sz*1.3,0,Math.PI*2);
        ctx.strokeStyle='rgba(245,158,11,.8)';ctx.lineWidth=2;ctx.shadowColor='#f59e0b';ctx.shadowBlur=10;ctx.stroke();ctx.shadowBlur=0;
      }
    });
    const vis=cells.filter(c=>c.visited).length;
    ctx.font='bold 11px Orbitron,monospace';ctx.fillStyle='rgba(0,212,255,.8)';ctx.textAlign='left';
    ctx.fillText('Grid Search',PAD.l+4,PAD.t-10);
    ctx.font='11px Share Tech Mono,monospace';ctx.fillStyle='rgba(255,255,255,.6)';
    ctx.fillText(`${vis}/${cells.length} | Grid ${gridN}×${gridN}`,PAD.l+4,PAD.t+16);
    if(best&&best.visited){ctx.fillStyle='rgba(16,185,129,.8)';
      ctx.fillText(`Best → b₀=${best.b0.toFixed(2)}, b₁=${best.b1.toFixed(2)}, J=${best.j.toFixed(3)}`,PAD.l+4,H-PAD.b-8);}
    _setEl('gsVisited',`${vis}/${cells.length}`); _setEl('gsGrid',`${gridN}×${gridN}`);
    if(best&&best.visited){_setEl('gsBestB0',best.b0.toFixed(3));_setEl('gsBestB1',best.b1.toFixed(3));_setEl('gsBestJ',best.j.toFixed(4));}
    window._optSearchDots=cells.filter(c=>c.visited).map(c=>({b0:c.b0,b1:c.b1,j:c.j,isBest:c.isBest}));
  }

  function stepVisit(){
    if(idx>=cells.length){done=true;running=false;cancelAnimationFrame(animId);
      showToast(`✅ Grid Search selesai! Best J=${best.j.toFixed(4)}`);draw();return;}
    const c=cells[idx];c.visited=true;
    if(!best||c.j<best.j){if(best)best.isBest=false;c.isBest=true;best=c;}
    idx++;
  }
  let fc2=0;
  function loop(){if(!running)return;fc2++;if(fc2%Math.max(1,Math.round(8/gridN))===0)stepVisit();draw();if(!done)animId=requestAnimationFrame(loop);}

  window.gsStart=function(){if(done)build();running=!running;const btn=document.getElementById('gsStartBtn');if(btn)btn.textContent=running?'⏸ Pause':'▶ Mulai';if(running){fc2=0;loop();}else cancelAnimationFrame(animId);};
  window.gsReset=function(){running=false;cancelAnimationFrame(animId);build();draw();done=false;window._optSearchDots=[];if(window.lpDrawAll)lpDrawAll();const btn=document.getElementById('gsStartBtn');if(btn)btn.textContent='▶ Mulai';['gsVisited','gsBestB0','gsBestB1','gsBestJ'].forEach(id=>_setEl(id,id==='gsVisited'?'0':'—'));};
  window.gsSetGrid=function(v){gridN=parseInt(v);_setEl('gsGridVal',`${v}×${v}`);build();draw();};
  window.initGridSearch=function(){resize();build();draw();const el=document.getElementById('gsOptJ');if(el)el.textContent=optMSE(OPT_OPTIMAL.b0,OPT_OPTIMAL.b1).toFixed(4);initDone=true;};
  window.addEventListener('resize',()=>{if(initDone){resize();draw();}});
})();


/* ════════════════════════════════════════════════════
   SUB-TAB 4b — RANDOM SEARCH
   ════════════════════════════════════════════════════ */
(function(){
  const canvas=document.getElementById('rsCanvas');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  const BND=OPT_BOUNDS;
  let W,H,PAD={t:32,r:24,b:52,l:60}, initDone=false;
  let nSamples=100, running=false, animId=null;
  let samples=[], best=null, idx=0, done=false;

  function resize(){const cw=_canvasW(canvas.parentElement,680);canvas.width=cw;canvas.height=Math.round(cw*(_isMobile()?0.95:0.72));W=canvas.width;H=canvas.height;}
  const PW=()=>W-PAD.l-PAD.r;
  const tCxB0=b0=>PAD.l+(b0-BND.b0.min)/(BND.b0.max-BND.b0.min)*PW();
  const tCyB1=b1=>PAD.t+(1-(b1-BND.b1.min)/(BND.b1.max-BND.b1.min))*(H-PAD.t-PAD.b);

  function build(){samples=[];best=null;idx=0;done=false;
    for(let i=0;i<nSamples;i++){
      const b0=Math.random()*(BND.b0.max-BND.b0.min)+BND.b0.min;
      const b1=Math.random()*(BND.b1.max-BND.b1.min)+BND.b1.min;
      samples.push({b0,b1,j:optMSE(b0,b1),visited:false,isBest:false});
    }}

  function draw(){
    if(!W)return; ctx.clearRect(0,0,W,H); ctx.fillStyle='rgb(6,11,20)'; ctx.fillRect(0,0,W,H);
    const cache=getOptGrid(50); const PH=H-PAD.t-PAD.b;
    const cw2=PW()/50,ch2=PH/50;
    for(let i=0;i<50;i++) for(let j=0;j<50;j++){
      const n=(cache.grid[i][j]-cache.minJ)/(cache.maxJ-cache.minJ+.01);
      ctx.fillStyle=optCostColor(n)+'66'; ctx.fillRect(PAD.l+i*cw2,PAD.t+(49-j)*ch2,cw2+1,ch2+1);
    }
    ctx.strokeStyle='rgba(255,255,255,.2)'; ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(PAD.l,PAD.t);ctx.lineTo(PAD.l,H-PAD.b);ctx.lineTo(W-PAD.r,H-PAD.b);ctx.stroke();
    ctx.fillStyle='rgba(200,220,240,.6)'; ctx.font='10px Rajdhani,sans-serif';
    ctx.textAlign='center'; ctx.fillText('b₀',PAD.l+PW()/2,H-5);
    ctx.textAlign='right';
    for(let i=0;i<=4;i++){const v=BND.b1.min+i*(BND.b1.max-BND.b1.min)/4;ctx.fillText(v.toFixed(1),PAD.l-5,tCyB1(v)+4);}

    samples.filter(s=>s.visited&&!s.isBest).forEach(s=>{
      ctx.beginPath();ctx.arc(tCxB0(s.b0),tCyB1(s.b1),3.5,0,Math.PI*2);
      const n=(s.j-cache.minJ)/(cache.maxJ-cache.minJ+.01);
      ctx.fillStyle=optCostColor(n)+'cc';ctx.fill();
    });
    if(best&&best.visited){
      ctx.beginPath();ctx.arc(tCxB0(best.b0),tCyB1(best.b1),10,0,Math.PI*2);
      ctx.fillStyle='rgba(16,185,129,.15)';ctx.fill();
      ctx.beginPath();ctx.arc(tCxB0(best.b0),tCyB1(best.b1),6,0,Math.PI*2);
      ctx.fillStyle='rgba(16,185,129,.9)';ctx.shadowColor='#10b981';ctx.shadowBlur=14;ctx.fill();ctx.shadowBlur=0;
    }
    if(idx>0&&idx<=samples.length){
      const c=samples[idx-1];
      if(c&&c.visited){ctx.beginPath();ctx.arc(tCxB0(c.b0),tCyB1(c.b1),8,0,Math.PI*2);
        ctx.strokeStyle='rgba(245,158,11,.8)';ctx.lineWidth=2;ctx.shadowColor='#f59e0b';ctx.shadowBlur=8;ctx.stroke();ctx.shadowBlur=0;}
    }
    const vis=samples.filter(s=>s.visited).length;
    ctx.font='bold 11px Orbitron,monospace';ctx.fillStyle='rgba(0,212,255,.8)';ctx.textAlign='left';
    ctx.fillText('Random Search',PAD.l+4,PAD.t-10);
    ctx.font='11px Share Tech Mono,monospace';ctx.fillStyle='rgba(255,255,255,.6)';
    ctx.fillText(`${vis}/${nSamples} sampel`,PAD.l+4,PAD.t+16);
    if(best&&best.visited){ctx.fillStyle='rgba(16,185,129,.8)';ctx.fillText(`Best → b₀=${best.b0.toFixed(2)}, b₁=${best.b1.toFixed(2)}, J=${best.j.toFixed(3)}`,PAD.l+4,H-PAD.b-8);}
    _setEl('rsVisited',`${vis}/${nSamples}`);
    if(best&&best.visited){_setEl('rsBestB0',best.b0.toFixed(3));_setEl('rsBestB1',best.b1.toFixed(3));_setEl('rsBestJ',best.j.toFixed(4));}
    window._optSearchDots=samples.filter(s=>s.visited).map(s=>({b0:s.b0,b1:s.b1,j:s.j,isBest:s.isBest}));
  }

  function stepVisit(){
    if(idx>=samples.length){done=true;running=false;cancelAnimationFrame(animId);showToast(`✅ Random Search selesai! Best J=${best.j.toFixed(4)}`);draw();return;}
    const c=samples[idx];c.visited=true;
    if(!best||c.j<best.j){if(best)best.isBest=false;c.isBest=true;best=c;}
    idx++;
  }
  let fc3=0;
  function loop(){if(!running)return;fc3++;if(fc3%2===0){for(let k=0;k<3;k++)stepVisit();}draw();if(!done)animId=requestAnimationFrame(loop);}

  window.rsStart=function(){if(done)build();running=!running;const btn=document.getElementById('rsStartBtn');if(btn)btn.textContent=running?'⏸ Pause':'▶ Mulai';if(running){fc3=0;loop();}else cancelAnimationFrame(animId);};
  window.rsReset=function(){running=false;cancelAnimationFrame(animId);build();draw();done=false;window._optSearchDots=[];if(window.lpDrawAll)lpDrawAll();const btn=document.getElementById('rsStartBtn');if(btn)btn.textContent='▶ Mulai';['rsVisited','rsBestB0','rsBestB1','rsBestJ'].forEach(id=>_setEl(id,id==='rsVisited'?'0':'—'));};
  window.rsSetN=function(v){nSamples=parseInt(v);_setEl('rsNVal',v);build();draw();};
  window.initRandomSearch=function(){resize();build();draw();initDone=true;};
  window.addEventListener('resize',()=>{if(initDone){resize();draw();}});
})();


/* ════════════════════════════════════════════════════
   SUB-TAB 5 — PSO
   ════════════════════════════════════════════════════ */
(function(){
  const canvas=document.getElementById('psoCanvas');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  const BND=OPT_BOUNDS;
  let W,H,PAD={t:32,r:24,b:52,l:60}, initDone=false;
  let nP=20, w_in=0.7, c1=1.5, c2=1.5;
  let particles=[], gBest=null, iter=0, done=false, running=false, animId=null;
  const TRAIL=18;

  function resize(){const cw=_canvasW(canvas.parentElement,680);canvas.width=cw;canvas.height=Math.round(cw*(_isMobile()?1.1:0.8));W=canvas.width;H=canvas.height;}
  const PW=()=>W-PAD.l-PAD.r, PH=()=>H-PAD.t-PAD.b;
  const tCxB0=b0=>PAD.l+(b0-BND.b0.min)/(BND.b0.max-BND.b0.min)*PW();
  const tCyB1=b1=>PAD.t+(1-(b1-BND.b1.min)/(BND.b1.max-BND.b1.min))*PH();

  function initSwarm(){
    particles=[];gBest=null;iter=0;done=false;
    for(let i=0;i<nP;i++){
      const b0=Math.random()*(BND.b0.max-BND.b0.min)+BND.b0.min;
      const b1=Math.random()*(BND.b1.max-BND.b1.min)+BND.b1.min;
      const j=optMSE(b0,b1);
      const p={b0,b1,j,vb0:(Math.random()-.5)*.4,vb1:(Math.random()-.5)*.2,
        pBest:{b0,b1,j},trail:[],color:`hsl(${Math.round(Math.random()*280+160)},80%,60%)`};
      particles.push(p);
      if(!gBest||j<gBest.j)gBest={b0,b1,j};
    }
    window._optPSOParticles=particles;
  }

  function psoStep(){
    particles.forEach(p=>{
      const r1=Math.random(),r2=Math.random();
      p.vb0=w_in*p.vb0+c1*r1*(p.pBest.b0-p.b0)+c2*r2*(gBest.b0-p.b0);
      p.vb1=w_in*p.vb1+c1*r1*(p.pBest.b1-p.b1)+c2*r2*(gBest.b1-p.b1);
      const mv0=(BND.b0.max-BND.b0.min)*.08, mv1=(BND.b1.max-BND.b1.min)*.08;
      p.vb0=Math.max(-mv0,Math.min(mv0,p.vb0));
      p.vb1=Math.max(-mv1,Math.min(mv1,p.vb1));
      p.trail.push({b0:p.b0,b1:p.b1});if(p.trail.length>TRAIL)p.trail.shift();
      p.b0=Math.max(BND.b0.min,Math.min(BND.b0.max,p.b0+p.vb0));
      p.b1=Math.max(BND.b1.min,Math.min(BND.b1.max,p.b1+p.vb1));
      p.j=optMSE(p.b0,p.b1);
      if(p.j<p.pBest.j)p.pBest={b0:p.b0,b1:p.b1,j:p.j};
      if(p.j<gBest.j)gBest={b0:p.b0,b1:p.b1,j:p.j};
    });
    iter++;
    window._optPSOParticles=particles;
    const spread=particles.reduce((mx,p)=>Math.max(mx,Math.hypot(p.b0-gBest.b0,p.b1-gBest.b1)),0);
    if(spread<0.05&&iter>20){done=true;running=false;cancelAnimationFrame(animId);
      showToast(`✅ PSO konvergen! iter=${iter}, J=${gBest.j.toFixed(5)}`);
      if(window.awardBadge)awardBadge('ach3','Gradient Rider');
    }
  }

  function draw(){
    if(!W)return; ctx.clearRect(0,0,W,H); ctx.fillStyle='rgb(6,11,20)'; ctx.fillRect(0,0,W,H);
    const cache=getOptGrid(50); const cw2=PW()/50,ch2=PH()/50;
    for(let i=0;i<50;i++) for(let j=0;j<50;j++){
      const n=(cache.grid[i][j]-cache.minJ)/(cache.maxJ-cache.minJ+.01);
      ctx.fillStyle=optCostColor(n)+'88'; ctx.fillRect(PAD.l+i*cw2,PAD.t+(49-j)*ch2,cw2+1,ch2+1);
    }
    ctx.strokeStyle='rgba(255,255,255,.2)'; ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(PAD.l,PAD.t);ctx.lineTo(PAD.l,H-PAD.b);ctx.lineTo(W-PAD.r,H-PAD.b);ctx.stroke();
    ctx.fillStyle='rgba(200,220,240,.6)'; ctx.font='10px Rajdhani,sans-serif';
    ctx.textAlign='center'; ctx.fillText('b₀',PAD.l+PW()/2,H-5);
    ctx.textAlign='right';
    for(let i=0;i<=4;i++){const v=BND.b1.min+i*(BND.b1.max-BND.b1.min)/4;ctx.fillText(v.toFixed(1),PAD.l-5,tCyB1(v)+4);}
    // Optimal cross
    ctx.strokeStyle='rgba(16,185,129,.8)'; ctx.lineWidth=1.5;
    const ox=tCxB0(OPT_OPTIMAL.b0),oy=tCyB1(OPT_OPTIMAL.b1);
    ctx.beginPath();ctx.moveTo(ox-12,oy);ctx.lineTo(ox+12,oy);ctx.stroke();
    ctx.beginPath();ctx.moveTo(ox,oy-12);ctx.lineTo(ox,oy+12);ctx.stroke();
    ctx.beginPath();ctx.arc(ox,oy,5,0,Math.PI*2);ctx.fillStyle='rgba(16,185,129,.9)';ctx.fill();

    particles.forEach(p=>{
      // Trail
      if(p.trail.length>1){
        ctx.beginPath();
        p.trail.forEach((pt,k)=>{k===0?ctx.moveTo(tCxB0(pt.b0),tCyB1(pt.b1)):ctx.lineTo(tCxB0(pt.b0),tCyB1(pt.b1));});
        ctx.lineTo(tCxB0(p.b0),tCyB1(p.b1));
        const hsl=p.color; ctx.strokeStyle=hsl.replace('hsl','hsla').replace(')',',0.32)');
        ctx.lineWidth=1.5; ctx.stroke();
      }
      // pBest square
      ctx.fillStyle=p.color+'55';
      ctx.fillRect(tCxB0(p.pBest.b0)-3,tCyB1(p.pBest.b1)-3,6,6);
      // Velocity arrow
      const sc=PW()*.75;
      const ax=tCxB0(p.b0),ay=tCyB1(p.b1);
      const ex=ax+p.vb0*sc, ey=ay-p.vb1*sc;
      ctx.strokeStyle=p.color+'77'; ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(ex,ey);ctx.stroke();
      // Particle dot
      ctx.beginPath();ctx.arc(ax,ay,5.5,0,Math.PI*2);
      ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=8;ctx.fill();ctx.shadowBlur=0;
    });
    // gBest
    if(gBest){
      ctx.beginPath();ctx.arc(tCxB0(gBest.b0),tCyB1(gBest.b1),11,0,Math.PI*2);
      ctx.strokeStyle='rgba(245,158,11,.9)';ctx.lineWidth=2.5;ctx.shadowColor='#f59e0b';ctx.shadowBlur=14;ctx.stroke();ctx.shadowBlur=0;
      ctx.fillStyle='rgba(245,158,11,.2)';ctx.fill();
      ctx.font='bold 10px Share Tech Mono,monospace';ctx.fillStyle='rgba(245,158,11,.9)';ctx.textAlign='left';
      ctx.fillText('gBest',tCxB0(gBest.b0)+14,tCyB1(gBest.b1)+4);
    }
    ctx.font='bold 11px Orbitron,monospace';ctx.fillStyle='rgba(0,212,255,.8)';ctx.textAlign='left';
    ctx.fillText('Particle Swarm Optimization',PAD.l+4,PAD.t-10);
    ctx.font='10px Share Tech Mono,monospace';ctx.fillStyle='rgba(255,255,255,.6)';
    ctx.fillText(`iter=${iter} | N=${nP} | w=${w_in} | c₁=${c1} | c₂=${c2}`,PAD.l+4,PAD.t+16);
    if(gBest){ctx.fillStyle='rgba(245,158,11,.8)';ctx.fillText(`gBest → b₀=${gBest.b0.toFixed(3)}, b₁=${gBest.b1.toFixed(3)}, J=${gBest.j.toFixed(4)}`,PAD.l+4,H-PAD.b-8);}
    _setEl('psoIter',iter); _setEl('psoN',nP);
    if(gBest){_setEl('psoBestB0',gBest.b0.toFixed(4));_setEl('psoBestB1',gBest.b1.toFixed(4));_setEl('psoBestJ',gBest.j.toFixed(5));}
    // sync to loss plane
    if(window.lpDrawAll)lpDrawAll();
  }

  let fc4=0;
  function runLoop(){if(!running)return;fc4++;if(fc4%2===0)psoStep();draw();if(!done)animId=requestAnimationFrame(runLoop);}

  window.psoStart=function(){if(done)initSwarm();running=!running;const btn=document.getElementById('psoStartBtn');if(btn)btn.textContent=running?'⏸ Pause':'▶ Mulai';if(running){fc4=0;runLoop();}else cancelAnimationFrame(animId);};
  window.psoReset=function(){running=false;cancelAnimationFrame(animId);initSwarm();draw();done=false;window._optPSOParticles=particles;if(window.lpDrawAll)lpDrawAll();const btn=document.getElementById('psoStartBtn');if(btn)btn.textContent='▶ Mulai';_setEl('psoIter',0);['psoBestB0','psoBestB1','psoBestJ'].forEach(id=>_setEl(id,'—'));};
  window.psoStep1=function(){if(!done){psoStep();draw();}};
  window.psoSetN=function(v){nP=parseInt(v);_setEl('psoNVal',v);initSwarm();draw();};
  window.psoSetW=function(v){w_in=parseFloat(v);_setEl('psoWVal',parseFloat(v).toFixed(2));};
  window.psoSetC1=function(v){c1=parseFloat(v);_setEl('psoC1Val',parseFloat(v).toFixed(1));};
  window.psoSetC2=function(v){c2=parseFloat(v);_setEl('psoC2Val',parseFloat(v).toFixed(1));};
  window.initPSO=function(){resize();initSwarm();draw();const el=document.getElementById('psoOptJ');if(el)el.textContent=optMSE(OPT_OPTIMAL.b0,OPT_OPTIMAL.b1).toFixed(4);initDone=true;};
  window.addEventListener('resize',()=>{if(initDone){resize();draw();}});
})();
