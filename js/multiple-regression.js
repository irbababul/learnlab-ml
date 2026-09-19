/* ===================================================
   Multiple Linear Regression — Visual Engine
   3D scatter plot, regression plane, coefficient sliders,
   residual visualization, comparison SLR vs MLR
   =================================================== */

/* ── Synthetic dataset: 2 features, 1 target ──
   Harga Rumah (juta):
   x1 = luas (m²), x2 = jarak_pusat (km)
   y = harga = 2.5*x1 - 3.2*x2 + 50 + noise
   ─────────────────────────────────────────── */
window.MLR_DATA = (function(){
  const seed = [
    [45,8,155],[60,5,188],[80,3,242],[50,12,148],[70,7,215],
    [55,6,178],[90,2,268],[40,15,128],[65,4,208],[75,9,222],
    [85,1,258],[48,11,145],[72,6,218],[58,8,175],[92,3,275],
    [62,10,182],[78,4,235],[44,13,138],[68,5,210],[82,2,252],
    [53,9,162],[76,7,225],[87,4,262],[41,14,132],[66,8,198],
    [79,3,248],[57,11,168],[83,5,255],[49,12,150],[71,6,212]
  ];
  return seed.map(([x1,x2,y]) => ({
    x1, x2,
    y: y + (Math.sin(x1*0.37+x2*0.59)*8)
  }));
})();

/* OLS for 2 features (analytic solution) */
window.mlrOLS = function(data) {
  const n = data.length;
  // Build X matrix (n x 3): [1, x1, x2]
  // Use normal equations: beta = (X'X)^{-1} X'y
  let s1=0,s2=0,s11=0,s12=0,s22=0,sy=0,s1y=0,s2y=0;
  data.forEach(p=>{
    s1+=p.x1; s2+=p.x2; s11+=p.x1*p.x1; s12+=p.x1*p.x2;
    s22+=p.x2*p.x2; sy+=p.y; s1y+=p.x1*p.y; s2y+=p.x2*p.y;
  });
  // 3x3 system: [n,s1,s2][s1,s11,s12][s2,s12,s22] * [b0,b1,b2] = [sy,s1y,s2y]
  const A = [[n,s1,s2],[s1,s11,s12],[s2,s12,s22]];
  const b = [sy,s1y,s2y];
  // Gaussian elimination
  const M = A.map((r,i)=>[...r,b[i]]);
  for(let col=0;col<3;col++){
    let pivot=col;
    for(let r=col+1;r<3;r++) if(Math.abs(M[r][col])>Math.abs(M[pivot][col])) pivot=r;
    [M[col],M[pivot]]=[M[pivot],M[col]];
    for(let r=col+1;r<3;r++){
      const f=M[r][col]/M[col][col];
      for(let c=col;c<=3;c++) M[r][c]-=f*M[col][c];
    }
  }
  const beta=[0,0,0];
  for(let r=2;r>=0;r--){
    // correct back-substitution: subtract all already-solved unknowns
    let sum=M[r][3];
    for(let c=r+1;c<3;c++) sum-=M[r][c]*beta[c];
    beta[r]=sum/M[r][r];
  }
  const [b0,b1,b2]=beta;
  const preds=data.map(p=>b0+b1*p.x1+b2*p.x2);
  const residuals=data.map((p,i)=>p.y-preds[i]);
  const mse=residuals.reduce((s,e)=>s+e*e,0)/n;
  const rmse=Math.sqrt(mse);
  const mae=residuals.reduce((s,e)=>s+Math.abs(e),0)/n;
  const ybar=sy/n;
  const ssTot=data.reduce((s,p)=>s+(p.y-ybar)**2,0);
  const ssRes=residuals.reduce((s,e)=>s+e*e,0);
  const r2=1-ssRes/ssTot;
  const r2adj=1-(1-r2)*(n-1)/(n-3);
  return {b0,b1,b2,mse,rmse,mae,r2,r2adj,residuals,preds,ybar};
};

/* ============================================================
   1. 3D SCATTER PLOT (isometric projection)
      Shows data points + regression plane
   ============================================================ */
(function(){
  const cv = document.getElementById('mlr3dCanvas');
  if(!cv) return;
  const ctx = cv.getContext('2d');
  let W,H, rotY=0.5, rotX=0.35, dragging=false, lastMX=0, lastMY=0;
  let b0=50, b1=2.5, b2=-3.2; // user-controlled coefficients
  let showPlane=true, showResiduals=true, autoRot=true, rotId=null;
  let initDone=false;

  const D = MLR_DATA;
  const x1Min=38,x1Max=95, x2Min=0,x2Max=17, yMin=120,yMax=285;

  function resize(){
    const cw=Math.min(cv.parentElement.clientWidth-2,680);
    cv.width=cw; cv.height=Math.round(cw*0.72);
    W=cv.width; H=cv.height;
  }

  function proj(x1,x2,y,ry,rx){
    // normalize to [-1,1]
    const nx=(x1-x1Min)/(x1Max-x1Min)*2-1;
    const nz=(x2-x2Min)/(x2Max-x2Min)*2-1;
    const ny=(y-yMin)/(yMax-yMin)*2-1;
    // rotate Y then X
    const cosY=Math.cos(ry),sinY=Math.sin(ry);
    const rx2=nx*cosY-nz*sinY, rz=nx*sinY+nz*cosY;
    const cosX=Math.cos(rx),sinX=Math.sin(rx);
    const ry2=ny*cosX-rz*sinX, rz2=ny*sinX+rz*cosX;
    const sc=Math.min(W,H)*0.34;
    return {
      cx: W/2 + rx2*sc,
      cy: H/2 - ry2*sc*0.7 + rz2*sc*0.1,
      depth: rz2
    };
  }

  function drawGrid(){
    ctx.strokeStyle='rgba(255,255,255,0.06)'; ctx.lineWidth=0.8;
    const steps=5;
    for(let i=0;i<=steps;i++){
      const x1=x1Min+i*(x1Max-x1Min)/steps;
      const x2=x2Min+i*(x2Max-x2Min)/steps;
      // x1 grid lines
      const p1=proj(x1,x2Min,yMin,rotY,rotX);
      const p2=proj(x1,x2Max,yMin,rotY,rotX);
      ctx.beginPath();ctx.moveTo(p1.cx,p1.cy);ctx.lineTo(p2.cx,p2.cy);ctx.stroke();
      // x2 grid lines
      const p3=proj(x1Min,x2,yMin,rotY,rotX);
      const p4=proj(x1Max,x2,yMin,rotY,rotX);
      ctx.beginPath();ctx.moveTo(p3.cx,p3.cy);ctx.lineTo(p4.cx,p4.cy);ctx.stroke();
    }
    // Axis lines
    ctx.strokeStyle='rgba(255,255,255,0.25)'; ctx.lineWidth=1.5;
    const o=proj(x1Min,x2Min,yMin,rotY,rotX);
    const ax1=proj(x1Max,x2Min,yMin,rotY,rotX);
    const ax2=proj(x1Min,x2Max,yMin,rotY,rotX);
    const ay=proj(x1Min,x2Min,yMax,rotY,rotX);
    ctx.beginPath();ctx.moveTo(o.cx,o.cy);ctx.lineTo(ax1.cx,ax1.cy);ctx.stroke();
    ctx.beginPath();ctx.moveTo(o.cx,o.cy);ctx.lineTo(ax2.cx,ax2.cy);ctx.stroke();
    ctx.beginPath();ctx.moveTo(o.cx,o.cy);ctx.lineTo(ay.cx,ay.cy);ctx.stroke();
    // Axis labels
    ctx.fillStyle='rgba(200,220,240,0.7)'; ctx.font='11px Rajdhani,sans-serif';
    ctx.textAlign='center';
    ctx.fillText('x1 (luas m²)',  ax1.cx+10, ax1.cy+4);
    ctx.fillText('x2 (jarak km)', ax2.cx-8, ax2.cy+4);
    ctx.fillText('y (harga)',     ay.cx,    ay.cy-8);
  }

  function drawPlane(){
    if(!showPlane) return;
    const steps=8;
    const cells=[];
    for(let i=0;i<steps;i++) for(let j=0;j<steps;j++){
      const x1a=x1Min+i*(x1Max-x1Min)/steps;
      const x1b=x1Min+(i+1)*(x1Max-x1Min)/steps;
      const x2a=x2Min+j*(x2Max-x2Min)/steps;
      const x2b=x2Min+(j+1)*(x2Max-x2Min)/steps;
      const ya=Math.min(yMax,Math.max(yMin,b0+b1*x1a+b2*x2a));
      const yb=Math.min(yMax,Math.max(yMin,b0+b1*x1b+b2*x2a));
      const yc=Math.min(yMax,Math.max(yMin,b0+b1*x1b+b2*x2b));
      const yd=Math.min(yMax,Math.max(yMin,b0+b1*x1a+b2*x2b));
      const pts=[proj(x1a,x2a,ya,rotY,rotX),proj(x1b,x2a,yb,rotY,rotX),
                 proj(x1b,x2b,yc,rotY,rotX),proj(x1a,x2b,yd,rotY,rotX)];
      const avgD=pts.reduce((s,p)=>s+p.depth,0)/4;
      cells.push({pts,avgD});
    }
    cells.sort((a,b)=>b.avgD-a.avgD);
    cells.forEach(({pts})=>{
      ctx.beginPath();
      pts.forEach((p,k)=>k===0?ctx.moveTo(p.cx,p.cy):ctx.lineTo(p.cx,p.cy));
      ctx.closePath();
      ctx.fillStyle='rgba(0,212,255,0.12)'; ctx.fill();
      ctx.strokeStyle='rgba(0,212,255,0.25)'; ctx.lineWidth=0.6; ctx.stroke();
    });
  }

  function draw(){
    if(!W) return;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='rgb(6,11,20)'; ctx.fillRect(0,0,W,H);
    drawGrid(); drawPlane();

    // Sort points by depth
    const pts=D.map(p=>{
      const pred=b0+b1*p.x1+b2*p.x2;
      const pp=proj(p.x1,p.x2,p.y,rotY,rotX);
      const predP=proj(p.x1,p.x2,Math.min(yMax,Math.max(yMin,pred)),rotY,rotX);
      return {...pp, predP, resid:p.y-pred, p};
    });
    pts.sort((a,b)=>b.depth-a.depth);

    pts.forEach(pt=>{
      // Residual line
      if(showResiduals){
        const col=pt.resid>0?'rgba(239,68,68,0.6)':'rgba(16,185,129,0.6)';
        ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.setLineDash([3,3]);
        ctx.beginPath();ctx.moveTo(pt.cx,pt.cy);ctx.lineTo(pt.predP.cx,pt.predP.cy);ctx.stroke();
        ctx.setLineDash([]);
      }
      // Data point
      ctx.beginPath();ctx.arc(pt.cx,pt.cy,5,0,Math.PI*2);
      ctx.fillStyle='#00d4ff';ctx.shadowColor='#00d4ff';ctx.shadowBlur=8;ctx.fill();ctx.shadowBlur=0;
    });

    // Info
    ctx.font='bold 11px Orbitron,monospace';ctx.fillStyle='rgba(0,212,255,0.85)';ctx.textAlign='left';
    ctx.fillText('3D Scatter — Regresi Linear Berganda',10,18);
    ctx.font='11px Share Tech Mono,monospace';ctx.fillStyle='rgba(255,255,255,0.7)';
    ctx.fillText(`ŷ = ${b0.toFixed(1)} + ${b1.toFixed(2)}x1 + (${b2.toFixed(2)})x2`,10,34);
    ctx.fillStyle='rgba(200,220,240,0.45)';ctx.textAlign='right';
    ctx.fillText('drag=rotasi',W-6,H-8);
  }

  // Controls
  window.mlr3dSetB0=v=>{b0=parseFloat(v);_setElMLR('mlrB0Val',parseFloat(v).toFixed(1));draw();syncSliders();};
  window.mlr3dSetB1=v=>{b1=parseFloat(v);_setElMLR('mlrB1Val',parseFloat(v).toFixed(2));draw();syncSliders();};
  window.mlr3dSetB2=v=>{b2=parseFloat(v);_setElMLR('mlrB2Val',parseFloat(v).toFixed(2));draw();syncSliders();};
  window.mlr3dFitOLS=function(){
    const r=mlrOLS(D);
    b0=r.b0;b1=r.b1;b2=r.b2;
    ['B0','B1','B2'].forEach((s,i)=>{
      const sl=document.getElementById('mlr'+s+'Slider');
      const v=[b0,b1,b2][i];
      if(sl){sl.value=v.toFixed(2);_setElMLR('mlr'+s+'Val',v.toFixed(2));}
    });
    draw(); updateMLRMetrics(r);
    showToast('OLS fit: b0='+r.b0.toFixed(2)+' b1='+r.b1.toFixed(2)+' b2='+r.b2.toFixed(2));
  };
  window.mlr3dTogglePlane=()=>{showPlane=!showPlane;draw();};
  window.mlr3dToggleResiduals=()=>{showResiduals=!showResiduals;draw();};

  // Cache ybar (constant for fixed dataset)
  const _ybar = MLR_DATA.reduce((s,p)=>s+p.y,0)/MLR_DATA.length;
  const _ssTot = MLR_DATA.reduce((s,p)=>s+(p.y-_ybar)**2,0);

  function syncSliders(){
    const n=D.length;
    const mse=D.reduce((s,p)=>s+(p.y-(b0+b1*p.x1+b2*p.x2))**2,0)/n;
    const ssRes=D.reduce((s,p)=>s+(p.y-(b0+b1*p.x1+b2*p.x2))**2,0);
    const r2=_ssTot>0?1-ssRes/_ssTot:0;
    _setElMLR('mlrLiveMSE',mse.toFixed(2));
    _setElMLR('mlrLiveR2',r2.toFixed(4));
    _setElMLR('mlrLiveRMSE',Math.sqrt(mse).toFixed(2));
  }

  function updateMLRMetrics(r){
    _setElMLR('mlrOptB0',r.b0.toFixed(3));_setElMLR('mlrOptB1',r.b1.toFixed(3));
    _setElMLR('mlrOptB2',r.b2.toFixed(3));_setElMLR('mlrOptR2',r.r2.toFixed(4));
    _setElMLR('mlrOptR2adj',r.r2adj.toFixed(4));_setElMLR('mlrOptRMSE',r.rmse.toFixed(3));
    _setElMLR('mlrOptMAE',r.mae.toFixed(3));_setElMLR('mlrOptMSE',r.mse.toFixed(3));
  }

  // Drag rotate
  cv.addEventListener('mousedown',e=>{dragging=true;lastMX=e.clientX;lastMY=e.clientY;autoRot=false;cancelAnimationFrame(rotId);rotId=null;});
  cv.addEventListener('mousemove',e=>{if(!dragging)return;rotY+=(e.clientX-lastMX)*0.012;rotX+=(e.clientY-lastMY)*0.008;lastMX=e.clientX;lastMY=e.clientY;draw();});
  cv.addEventListener('mouseup',()=>dragging=false);
  cv.addEventListener('mouseleave',()=>dragging=false);
  cv.addEventListener('touchstart',e=>{e.preventDefault();dragging=true;lastMX=e.touches[0].clientX;lastMY=e.touches[0].clientY;autoRot=false;},{passive:false});
  cv.addEventListener('touchmove',e=>{e.preventDefault();if(!dragging)return;rotY+=(e.touches[0].clientX-lastMX)*0.012;rotX+=(e.touches[0].clientY-lastMY)*0.008;lastMX=e.touches[0].clientX;lastMY=e.touches[0].clientY;draw();},{passive:false});
  cv.addEventListener('touchend',()=>dragging=false);

  // Auto-rotate
  function startAutoRot(){rotId=requestAnimationFrame(function loop(){if(autoRot){rotY+=0.004;draw();}rotId=requestAnimationFrame(loop);});}
  window.mlr3dToggleAutoRot=function(){autoRot=!autoRot;const btn=document.getElementById('btnMlrAutoRot');if(btn)btn.textContent=autoRot?'Pause Rotasi':'Auto Rotasi';if(autoRot&&!rotId)startAutoRot();};

  window.initMLR3D=function(){
    resize();
    const r=mlrOLS(D);
    // Round to each slider's step to avoid label/position mismatch
    b0=Math.round(r.b0*2)/2;     // step 0.5
    b1=Math.round(r.b1*20)/20;   // step 0.05
    b2=Math.round(r.b2*20)/20;   // step 0.05
    const steps=[0.5,0.05,0.05];
    ['B0','B1','B2'].forEach((s,i)=>{
      const sl=document.getElementById('mlr'+s+'Slider');
      const v=[b0,b1,b2][i];
      const dec=steps[i]<0.1?2:1;
      if(sl){sl.value=v.toFixed(dec);}
      _setElMLR('mlr'+s+'Val', v.toFixed(2));
    });
    updateMLRMetrics(r); syncSliders();
    autoRot=true; startAutoRot(); draw(); initDone=true;
  };
  window.addEventListener('resize',()=>{if(initDone){resize();draw();}});
  function _setElMLR(id,v){const e=document.getElementById(id);if(e)e.textContent=v;}
  window._setElMLR=_setElMLR;
})();

/* ============================================================
   2. COMPARISON: SLR vs MLR (scatter + two regression lines)
   ============================================================ */
(function(){
  const cv=document.getElementById('mlrCompCanvas');
  if(!cv) return;
  const ctx=cv.getContext('2d');
  const D=MLR_DATA;
  let W,H, initDone=false;
  const PAD={t:36,r:20,b:48,l:60};

  function resize(){const cw=Math.min(cv.parentElement.clientWidth-2,680);cv.width=cw;cv.height=Math.round(cw*0.48);W=cv.width;H=cv.height;}

  function draw(){
    if(!W) return;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='rgba(0,0,0,0.18)'; ctx.roundRect(0,0,W,H,10); ctx.fill();
    const PW=W-PAD.l-PAD.r, PH=H-PAD.t-PAD.b;
    const xMin=38,xMax=95, yMin=120,yMax=285;
    const tCx=x=>PAD.l+(x-xMin)/(xMax-xMin)*PW;
    const tCy=y=>PAD.t+(1-(y-yMin)/(yMax-yMin))*PH;

    // Grid
    ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1;
    for(let i=0;i<=6;i++){
      ctx.beginPath();ctx.moveTo(tCx(xMin+i*(xMax-xMin)/6),PAD.t);ctx.lineTo(tCx(xMin+i*(xMax-xMin)/6),H-PAD.b);ctx.stroke();
      ctx.beginPath();ctx.moveTo(PAD.l,tCy(yMin+i*(yMax-yMin)/6));ctx.lineTo(W-PAD.r,tCy(yMin+i*(yMax-yMin)/6));ctx.stroke();
    }
    ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(PAD.l,PAD.t);ctx.lineTo(PAD.l,H-PAD.b);ctx.lineTo(W-PAD.r,H-PAD.b);ctx.stroke();
    ctx.fillStyle='rgba(148,163,184,0.6)'; ctx.font='11px Rajdhani,sans-serif'; ctx.textAlign='center';
    ctx.fillText('x1 (luas m²)',PAD.l+PW/2,H-4);
    ctx.textAlign='right';
    for(let i=0;i<=4;i++){const v=yMin+i*(yMax-yMin)/4;ctx.fillText(v.toFixed(0),PAD.l-5,tCy(v)+4);}

    // SLR: only x1
    const n=D.length;
    const mx1=D.reduce((s,p)=>s+p.x1,0)/n, mY=D.reduce((s,p)=>s+p.y,0)/n;
    let num=0,den=0; D.forEach(p=>{num+=(p.x1-mx1)*(p.y-mY);den+=(p.x1-mx1)**2;});
    const slrB1=num/den, slrB0=mY-slrB1*mx1;
    ctx.strokeStyle='rgba(245,158,11,0.8)'; ctx.lineWidth=2.5; ctx.setLineDash([6,4]);
    ctx.beginPath();ctx.moveTo(tCx(xMin),tCy(slrB1*xMin+slrB0));ctx.lineTo(tCx(xMax),tCy(slrB1*xMax+slrB0));ctx.stroke();ctx.setLineDash([]);

    // MLR projected: fix x2 at mean
    const mx2=D.reduce((s,p)=>s+p.x2,0)/n;
    const r=mlrOLS(D);
    const mlrY=x1=>r.b0+r.b1*x1+r.b2*mx2;
    ctx.strokeStyle='rgba(0,212,255,0.9)'; ctx.lineWidth=2.5;
    ctx.shadowColor='#00d4ff'; ctx.shadowBlur=6;
    ctx.beginPath();ctx.moveTo(tCx(xMin),tCy(mlrY(xMin)));ctx.lineTo(tCx(xMax),tCy(mlrY(xMax)));ctx.stroke();ctx.shadowBlur=0;

    // Data points
    D.forEach(p=>{
      ctx.beginPath();ctx.arc(tCx(p.x1),tCy(p.y),4.5,0,Math.PI*2);
      ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.fill();
    });

    // Legend
    ctx.font='12px Rajdhani,sans-serif'; ctx.textAlign='left';
    ctx.fillStyle='rgba(245,158,11,0.9)';
    ctx.fillText('--- SLR (hanya x1)', PAD.l+8, PAD.t+16);
    ctx.fillStyle='rgba(0,212,255,0.9)';
    ctx.fillText('--- MLR (x1 + x2, x2=rata2)', PAD.l+8, PAD.t+32);

    // MSE comparison
    const slrMSE=D.reduce((s,p)=>s+(p.y-(slrB1*p.x1+slrB0))**2,0)/n;
    const mlrMSE=r.mse;
    ctx.font='11px Share Tech Mono,monospace';
    ctx.fillStyle='rgba(245,158,11,0.7)'; ctx.textAlign='right';
    ctx.fillText('SLR MSE: '+slrMSE.toFixed(1), W-PAD.r, PAD.t+14);
    ctx.fillStyle='rgba(0,212,255,0.8)';
    ctx.fillText('MLR MSE: '+mlrMSE.toFixed(1)+' (lebih kecil!)', W-PAD.r, PAD.t+30);
    _setElMLR('compSLRMSE',slrMSE.toFixed(2));_setElMLR('compMLRMSE',mlrMSE.toFixed(2));
    _setElMLR('compImprovement',(((slrMSE-mlrMSE)/slrMSE)*100).toFixed(1)+'%');
  }

  window.initMLRComp=function(){resize();draw();initDone=true;};
  window.addEventListener('resize',()=>{if(initDone){resize();draw();}});
})();

/* ============================================================
   3. COEFFICIENT INTERPRETATION GRAPHS
   ============================================================ */
(function(){
  const cvB1=document.getElementById('mlrCoeffB1Canvas');
  const cvB2=document.getElementById('mlrCoeffB2Canvas');
  if(!cvB1||!cvB2) return;
  const ctx1=cvB1.getContext('2d'), ctx2=cvB2.getContext('2d');
  const D=MLR_DATA;
  let initDone=false;

  function resize(){
    [cvB1,cvB2].forEach(cv=>{
      const cw=Math.min(cv.parentElement.clientWidth-2,420);
      cv.width=cw; cv.height=Math.round(cw*0.62);
    });
  }

  function drawPartialPlot(ctx,cv,xKey,bVal,bOther,intercept,xLabel,color){
    const W=cv.width,H=cv.height;
    const PAD={t:28,r:16,b:40,l:56};
    const PW=W-PAD.l-PAD.r, PH=H-PAD.t-PAD.b;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='rgba(0,0,0,0.18)'; ctx.roundRect(0,0,W,H,10); ctx.fill();

    const xs=D.map(p=>p[xKey]);
    const xMin=Math.min(...xs)-2, xMax=Math.max(...xs)+2;
    const yMin=120, yMax=285;
    const tCx=x=>PAD.l+(x-xMin)/(xMax-xMin)*PW;
    const tCy=y=>PAD.t+(1-(y-yMin)/(yMax-yMin))*PH;

    // Grid
    ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1;
    for(let i=0;i<=5;i++){
      ctx.beginPath();ctx.moveTo(PAD.l,tCy(yMin+i*(yMax-yMin)/5));ctx.lineTo(W-PAD.r,tCy(yMin+i*(yMax-yMin)/5));ctx.stroke();
    }
    ctx.strokeStyle='rgba(255,255,255,0.18)'; ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(PAD.l,PAD.t);ctx.lineTo(PAD.l,H-PAD.b);ctx.lineTo(W-PAD.r,H-PAD.b);ctx.stroke();
    ctx.fillStyle='rgba(148,163,184,0.65)'; ctx.font='10px Rajdhani,sans-serif'; ctx.textAlign='center';
    ctx.fillText(xLabel,PAD.l+PW/2,H-4);
    ctx.textAlign='right';
    for(let i=0;i<=4;i++){const v=yMin+i*(yMax-yMin)/4;ctx.fillText(v.toFixed(0),PAD.l-4,tCy(v)+4);}

    // Regression line (holding other at mean)
    const otherMean=D.reduce((s,p)=>s+p[xKey==='x1'?'x2':'x1'],0)/D.length;
    const effectiveB0=intercept+bOther*otherMean;
    const gradLine=ctx.createLinearGradient(PAD.l,0,W-PAD.r,0);
    gradLine.addColorStop(0,color+'aa'); gradLine.addColorStop(1,color);
    ctx.strokeStyle=gradLine; ctx.lineWidth=2.5; ctx.shadowColor=color; ctx.shadowBlur=6;
    ctx.beginPath();
    ctx.moveTo(tCx(xMin),tCy(effectiveB0+bVal*xMin));
    ctx.lineTo(tCx(xMax),tCy(effectiveB0+bVal*xMax));
    ctx.stroke(); ctx.shadowBlur=0;

    // Partial residuals
    D.forEach(p=>{
      const partialY=p.y - bOther*p[xKey==='x1'?'x2':'x1'];
      ctx.beginPath();ctx.arc(tCx(p[xKey]),tCy(partialY),4,0,Math.PI*2);
      ctx.fillStyle=color+'cc'; ctx.fill();
    });

    // Arrow showing +1 unit effect
    const midX=(xMin+xMax)/2;
    const y1=effectiveB0+bVal*midX;
    const y2=effectiveB0+bVal*(midX+1);
    const ax1=tCx(midX),ay1=tCy(y1),ax2=tCx(midX+1),ay2=tCy(y2);
    ctx.strokeStyle='rgba(255,255,255,0.8)'; ctx.lineWidth=1.5;
    ctx.setLineDash([3,3]);
    ctx.beginPath();ctx.moveTo(ax1,ay1);ctx.lineTo(ax2,ay1);ctx.stroke();
    ctx.beginPath();ctx.moveTo(ax2,ay1);ctx.lineTo(ax2,ay2);ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.font='10px Share Tech Mono,monospace'; ctx.textAlign='left';
    ctx.fillText('+1 -> '+bVal.toFixed(2),ax2+3,ay2<ay1?(ay1+ay2)/2:(ay1+ay2)/2);

    // Title
    ctx.font='bold 10px Orbitron,monospace'; ctx.fillStyle=color; ctx.textAlign='left';
    ctx.fillText('Partial Plot: '+xLabel+' | koef='+bVal.toFixed(2),PAD.l,PAD.t-6);
  }

  window.drawMLRCoeffPlots=function(){
    const r=mlrOLS(D);
    drawPartialPlot(ctx1,cvB1,'x1',r.b1,r.b2,r.b0,'x1 (luas m²)','#00d4ff');
    drawPartialPlot(ctx2,cvB2,'x2',r.b2,r.b1,r.b0,'x2 (jarak km)','#8b5cf6');
  };

  window.initMLRCoeff=function(){resize();window.drawMLRCoeffPlots();initDone=true;};
  window.addEventListener('resize',()=>{if(initDone){resize();window.drawMLRCoeffPlots();}});
})();
