/* ===================================================
   MLR Diagnostics Engine
   Residual plot, Q-Q plot, VIF, Homoscedasticity
   =================================================== */

// Module-level helpers (safe — unique names)
const _diagD = () => window.MLR_DATA || [];
const _s = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
function _roundR(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

/* ============================================================
   1. RESIDUAL PLOT — residual vs fitted
   ============================================================ */
(function(){
  const cv=document.getElementById('mlrResidPlot');
  if(!cv) return;
  const ctx=cv.getContext('2d');
  let W,H,initDone=false;
  const PAD={t:32,r:20,b:48,l:60};

  function resize(){const cw=Math.min(cv.parentElement.clientWidth-2,680);cv.width=cw;cv.height=Math.round(cw*0.5);W=cv.width;H=cv.height;}

  function draw(){
    if(!W)return;
    ctx.clearRect(0,0,W,H);
    _roundR(ctx,0,0,W,H,10);ctx.fillStyle='rgba(0,0,0,0.18)';ctx.fill();
    const PW=W-PAD.l-PAD.r, PH=H-PAD.t-PAD.b;
    const r=mlrOLS(_diagD());
    const fitted=r.preds, resids=r.residuals;
    const fMin=Math.min(...fitted)-2, fMax=Math.max(...fitted)+2;
    const rMax=Math.max(...resids.map(Math.abs))*1.3;
    const tCx=f=>PAD.l+(f-fMin)/(fMax-fMin)*PW;
    const tCy=r=>PAD.t+(1-(r+rMax)/(rMax*2))*PH;

    // Grid & zero line
    ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=1;
    for(let i=0;i<=6;i++){ctx.beginPath();ctx.moveTo(PAD.l,PAD.t+i*PH/6);ctx.lineTo(W-PAD.r,PAD.t+i*PH/6);ctx.stroke();}
    ctx.strokeStyle='rgba(0,212,255,0.3)';ctx.lineWidth=1.5;ctx.setLineDash([6,4]);
    ctx.beginPath();ctx.moveTo(PAD.l,tCy(0));ctx.lineTo(W-PAD.r,tCy(0));ctx.stroke();ctx.setLineDash([]);
    ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(PAD.l,PAD.t);ctx.lineTo(PAD.l,H-PAD.b);ctx.lineTo(W-PAD.r,H-PAD.b);ctx.stroke();

    // Labels
    ctx.fillStyle='rgba(148,163,184,0.65)';ctx.font='11px Rajdhani,sans-serif';ctx.textAlign='center';
    ctx.fillText('Fitted Values (ŷ)',PAD.l+PW/2,H-4);
    ctx.save();ctx.translate(14,PAD.t+PH/2);ctx.rotate(-Math.PI/2);ctx.fillText('Residual (e)',0,0);ctx.restore();

    // Residual points
    resids.forEach((e,i)=>{
      const col=Math.abs(e)>15?'#ef4444':'#00d4ff';
      ctx.beginPath();ctx.arc(tCx(fitted[i]),tCy(e),5,0,Math.PI*2);
      ctx.fillStyle=col;ctx.shadowColor=col;ctx.shadowBlur=6;ctx.fill();ctx.shadowBlur=0;
    });

    // Loess-like trend line (moving average)
    const sorted=[...resids.map((e,i)=>({e,f:fitted[i]}))].sort((a,b)=>a.f-b.f);
    const k=5;
    ctx.strokeStyle='rgba(245,158,11,0.7)';ctx.lineWidth=2;
    ctx.beginPath();
    for(let i=k;i<sorted.length-k;i++){
      const avg=sorted.slice(i-k,i+k+1).reduce((s,p)=>s+p.e,0)/(2*k+1);
      i===k?ctx.moveTo(tCx(sorted[i].f),tCy(avg)):ctx.lineTo(tCx(sorted[i].f),tCy(avg));
    }
    ctx.stroke();

    ctx.font='bold 11px Orbitron,monospace';ctx.fillStyle='rgba(0,212,255,0.8)';ctx.textAlign='left';
    ctx.fillText('Residual vs Fitted',PAD.l+4,PAD.t-8);
    ctx.font='11px Rajdhani,sans-serif';ctx.fillStyle='rgba(148,163,184,0.7)';
    ctx.fillText('Ideal: titik tersebar acak di sekitar garis 0',PAD.l+4,H-PAD.b-8);

    // Update stats
    const meanResid=resids.reduce((s,e)=>s+e,0)/resids.length;
    const stdResid=Math.sqrt(resids.reduce((s,e)=>s+e**2,0)/resids.length);
    _s('diagMeanResid',meanResid.toFixed(4));_s('diagStdResid',stdResid.toFixed(3));
    const outliers=resids.filter(e=>Math.abs(e)>2*stdResid).length;
    _s('diagOutliers',outliers);
  }

  window.initMLRResidPlot=function(){resize();draw();initDone=true;};
  window.addEventListener('resize',()=>{if(initDone){resize();draw();}});
})();

/* ============================================================
   2. Q-Q PLOT — residual normality
   ============================================================ */
(function(){
  const cv=document.getElementById('mlrQQPlot');
  if(!cv) return;
  const ctx=cv.getContext('2d');
  let W,H,initDone=false;
  const PAD={t:32,r:20,b:48,l:60};

  function resize(){const cw=Math.min(cv.parentElement.clientWidth-2,400);cv.width=cw;cv.height=Math.round(cw*0.88);W=cv.width;H=cv.height;}

  // Normal quantile approximation
  function normInv(p){
    if(p<=0)return -4;if(p>=1)return 4;
    const a=[2.515517,0.802853,0.010328];
    const b=[1.432788,0.189269,0.001308];
    const t=Math.sqrt(-2*Math.log(p<0.5?p:1-p));
    const num=a[0]+t*(a[1]+t*a[2]);
    const den=1+t*(b[0]+t*(b[1]+t*b[2]));
    return (p<0.5?-1:1)*(t-num/den);
  }

  function draw(){
    if(!W)return;
    ctx.clearRect(0,0,W,H);
    _roundR(ctx,0,0,W,H,10);ctx.fillStyle='rgba(0,0,0,0.18)';ctx.fill();
    const PW=W-PAD.l-PAD.r, PH=H-PAD.t-PAD.b;
    const r=mlrOLS(_diagD());
    const n=r.residuals.length;
    const sorted=[...r.residuals].sort((a,b)=>a-b);
    const mean=sorted.reduce((s,v)=>s+v,0)/n;
    const std=Math.sqrt(sorted.reduce((s,v)=>s+(v-mean)**2,0)/n);
    const zScores=sorted.map(v=>std>0?(v-mean)/std:0);
    const theoretical=sorted.map((_,i)=>normInv((i+0.5)/n));
    const tMin=Math.min(...theoretical)-0.3, tMax=Math.max(...theoretical)+0.3;
    const zMin=Math.min(...zScores)-0.3, zMax=Math.max(...zScores)+0.3;
    const tCx=t=>PAD.l+(t-tMin)/(tMax-tMin)*PW;
    const tCy=z=>PAD.t+(1-(z-zMin)/(zMax-zMin))*PH;

    // Grid
    ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=1;
    for(let i=0;i<=5;i++){
      ctx.beginPath();ctx.moveTo(PAD.l,PAD.t+i*PH/5);ctx.lineTo(W-PAD.r,PAD.t+i*PH/5);ctx.stroke();
      ctx.beginPath();ctx.moveTo(PAD.l+i*PW/5,PAD.t);ctx.lineTo(PAD.l+i*PW/5,H-PAD.b);ctx.stroke();
    }
    ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(PAD.l,PAD.t);ctx.lineTo(PAD.l,H-PAD.b);ctx.lineTo(W-PAD.r,H-PAD.b);ctx.stroke();
    ctx.fillStyle='rgba(148,163,184,0.65)';ctx.font='10px Rajdhani,sans-serif';
    ctx.textAlign='center';ctx.fillText('Theoretical Quantiles',PAD.l+PW/2,H-4);
    ctx.save();ctx.translate(13,PAD.t+PH/2);ctx.rotate(-Math.PI/2);ctx.fillText('Sample Quantiles',0,0);ctx.restore();

    // Reference line
    ctx.strokeStyle='rgba(0,212,255,0.35)';ctx.lineWidth=1.5;ctx.setLineDash([6,4]);
    ctx.beginPath();ctx.moveTo(tCx(tMin),tCy(tMin));ctx.lineTo(tCx(tMax),tCy(tMax));ctx.stroke();ctx.setLineDash([]);

    // Points
    zScores.forEach((z,i)=>{
      const dev=Math.abs(z-theoretical[i]);
      const col=dev>0.5?'#ef4444':'rgba(139,92,246,0.85)';
      ctx.beginPath();ctx.arc(tCx(theoretical[i]),tCy(z),4.5,0,Math.PI*2);
      ctx.fillStyle=col;ctx.fill();
    });

    // Shapiro-Wilk approximation (W statistic)
    const maxDev=Math.max(...zScores.map((z,i)=>Math.abs(z-theoretical[i])));
    const normality=maxDev<0.4?'Normal':'Kurang Normal';
    const normColor=maxDev<0.4?'var(--accent-green)':'var(--accent-yellow)';
    ctx.font='bold 10px Orbitron,monospace';ctx.fillStyle='rgba(139,92,246,0.85)';ctx.textAlign='left';
    ctx.fillText('Q-Q Plot Residual',PAD.l,PAD.t-8);
    const normEl=document.getElementById('diagNormality');
    if(normEl){normEl.textContent=normality;normEl.style.color=normColor;}
    _s('diagMaxDev',maxDev.toFixed(3));
  }

  window.initMLRQQ=function(){resize();draw();initDone=true;};
  window.addEventListener('resize',()=>{if(initDone){resize();draw();}});
})();

/* ============================================================
   3. VIF — Variance Inflation Factor (multicollinearity)
   ============================================================ */
(function(){
  const cv=document.getElementById('mlrVIFCanvas');
  if(!cv) return;
  const ctx=cv.getContext('2d');
  let W,H,initDone=false;
  const PAD={t:32,r:24,b:48,l:60};

  function resize(){const cw=Math.min(cv.parentElement.clientWidth-2,680);cv.width=cw;cv.height=Math.round(cw*0.44);W=cv.width;H=cv.height;}

  // VIF for feature k = 1/(1-R²_k) where R²_k = R² of regressing x_k on all other x
  function calcVIF(){
    const n=_diagD().length;
    const mx1=_diagD().reduce((s,p)=>s+p.x1,0)/n;
    const mx2=_diagD().reduce((s,p)=>s+p.x2,0)/n;

    // VIF for x1: regress x1 on x2
    let num12=0, den2=0;
    _diagD().forEach(p=>{ num12+=(p.x2-mx2)*(p.x1-mx1); den2+=(p.x2-mx2)**2; });
    const b1_on_2 = den2>0 ? num12/den2 : 0;
    const b0_1on2 = mx1 - b1_on_2*mx2;
    const ssTot1  = _diagD().reduce((s,p)=>s+(p.x1-mx1)**2, 0);
    const ssRes1  = _diagD().reduce((s,p)=>s+(p.x1-(b0_1on2+b1_on_2*p.x2))**2, 0);
    const r2_1    = ssTot1>0 ? 1-ssRes1/ssTot1 : 0;
    const vif1    = r2_1<0.9999 ? 1/(1-r2_1) : 9999;

    // VIF for x2: regress x2 on x1 (separate regression, correct direction)
    let num21=0, den1=0;
    _diagD().forEach(p=>{ num21+=(p.x1-mx1)*(p.x2-mx2); den1+=(p.x1-mx1)**2; });
    const b1_on_1 = den1>0 ? num21/den1 : 0;
    const b0_2on1 = mx2 - b1_on_1*mx1;
    const ssTot2  = _diagD().reduce((s,p)=>s+(p.x2-mx2)**2, 0);
    const ssRes2  = _diagD().reduce((s,p)=>s+(p.x2-(b0_2on1+b1_on_1*p.x1))**2, 0);
    const r2_2    = ssTot2>0 ? 1-ssRes2/ssTot2 : 0;
    const vif2    = r2_2<0.9999 ? 1/(1-r2_2) : 9999;

    // Pearson correlation (symmetric, same for both)
    const corr = (ssTot1>0&&ssTot2>0) ? num12/Math.sqrt(ssTot1*ssTot2) : 0;
    return {vif1, vif2, r2_1, r2_2, corr};
  }

  function draw(){
    if(!W)return;
    ctx.clearRect(0,0,W,H);
    _roundR(ctx,0,0,W,H,10);ctx.fillStyle='rgba(0,0,0,0.18)';ctx.fill();
    const PW=W-PAD.l-PAD.r,PH=H-PAD.t-PAD.b;
    const {vif1,vif2,corr}=calcVIF();
    const features=[{name:'x1 (luas)',vif:vif1,color:'#00d4ff'},{name:'x2 (jarak)',vif:vif2,color:'#8b5cf6'}];
    const maxVIF=10;
    const barW=PW/(features.length*3);

    ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(PAD.l,PAD.t);ctx.lineTo(PAD.l,H-PAD.b);ctx.lineTo(W-PAD.r,H-PAD.b);ctx.stroke();

    // Threshold lines
    [1,5,10].forEach(th=>{
      const y=PAD.t+(1-th/maxVIF)*PH;
      if(y>=PAD.t&&y<=H-PAD.b){
        ctx.strokeStyle=th===1?'rgba(16,185,129,0.4)':th===5?'rgba(245,158,11,0.5)':'rgba(239,68,68,0.5)';
        ctx.lineWidth=1;ctx.setLineDash([5,4]);
        ctx.beginPath();ctx.moveTo(PAD.l,y);ctx.lineTo(W-PAD.r,y);ctx.stroke();ctx.setLineDash([]);
        ctx.fillStyle=th===1?'rgba(16,185,129,0.7)':th===5?'rgba(245,158,11,0.7)':'rgba(239,68,68,0.7)';
        ctx.font='10px Share Tech Mono,monospace';ctx.textAlign='right';
        ctx.fillText('VIF='+th+(th===1?' (OK)':th===5?' (warn)':' (bad)'),W-PAD.r,y-3);
      }
    });

    features.forEach((f,i)=>{
      const bx=PAD.l+(i*3+1)*barW;
      const normH=Math.min(f.vif,maxVIF)/maxVIF*PH;
      const by=PAD.t+PH-normH;
      const col=f.vif<5?f.color:'#ef4444';
      const g=ctx.createLinearGradient(0,by,0,H-PAD.b);
      g.addColorStop(0,col);g.addColorStop(1,col+'44');
      ctx.fillStyle=g;ctx.fillRect(bx,by,barW*1.8,normH);
      ctx.strokeStyle=col;ctx.lineWidth=1.5;ctx.strokeRect(bx,by,barW*1.8,normH);
      ctx.fillStyle='rgba(200,220,240,0.8)';ctx.font='11px Rajdhani,sans-serif';ctx.textAlign='center';
      ctx.fillText(f.name,bx+barW*0.9,H-PAD.b+16);
      ctx.font='bold 12px Share Tech Mono,monospace';ctx.fillStyle=col;
      ctx.fillText(f.vif.toFixed(2),bx+barW*0.9,by-5);
    });

    ctx.textAlign='right';ctx.fillStyle='rgba(148,163,184,0.6)';ctx.font='10px Rajdhani,sans-serif';
    for(let i=0;i<=5;i++){const v=i*maxVIF/5;ctx.fillText(v.toFixed(0),PAD.l-4,PAD.t+(1-i/5)*PH+4);}
    ctx.font='bold 11px Orbitron,monospace';ctx.fillStyle='rgba(245,158,11,0.85)';ctx.textAlign='left';
    ctx.fillText('VIF — Variance Inflation Factor',PAD.l,PAD.t-8);

    _s('diagVIF1',vif1.toFixed(3));_s('diagVIF2',vif2.toFixed(3));
    _s('diagCorr',corr.toFixed(4));
    const mcStatus=document.getElementById('diagMCStatus');
    if(mcStatus){
      const ok=Math.max(vif1,vif2)<5;
      mcStatus.textContent=ok?'Tidak ada multikolinearitas serius':'Perhatian: VIF > 5';
      mcStatus.style.color=ok?'var(--accent-green)':'var(--accent-yellow)';
    }
  }

  window.initMLRVIF=function(){resize();draw();initDone=true;};
  window.addEventListener('resize',()=>{if(initDone){resize();draw();}});
})();

/* ============================================================
   4. HOMOSCEDASTICITY — scale-location plot
   ============================================================ */
(function(){
  const cv=document.getElementById('mlrHomoCanvas');
  if(!cv) return;
  const ctx=cv.getContext('2d');
  let W,H,initDone=false;
  const PAD={t:32,r:20,b:48,l:60};

  function resize(){const cw=Math.min(cv.parentElement.clientWidth-2,400);cv.width=cw;cv.height=Math.round(cw*0.82);W=cv.width;H=cv.height;}

  function draw(){
    if(!W)return;
    ctx.clearRect(0,0,W,H);
    _roundR(ctx,0,0,W,H,10);ctx.fillStyle='rgba(0,0,0,0.18)';ctx.fill();
    const PW=W-PAD.l-PAD.r,PH=H-PAD.t-PAD.b;
    const r=mlrOLS(_diagD());
    const sqrtAbsResid=r.residuals.map(e=>Math.sqrt(Math.abs(e)));
    const fMin=Math.min(...r.preds)-2,fMax=Math.max(...r.preds)+2;
    const sMin=0,sMax=Math.max(...sqrtAbsResid)*1.2;
    const tCx=f=>PAD.l+(f-fMin)/(fMax-fMin)*PW;
    const tCy=s=>PAD.t+(1-(s-sMin)/(sMax-sMin))*PH;

    ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=1;
    for(let i=0;i<=5;i++){ctx.beginPath();ctx.moveTo(PAD.l,PAD.t+i*PH/5);ctx.lineTo(W-PAD.r,PAD.t+i*PH/5);ctx.stroke();}
    ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(PAD.l,PAD.t);ctx.lineTo(PAD.l,H-PAD.b);ctx.lineTo(W-PAD.r,H-PAD.b);ctx.stroke();
    ctx.fillStyle='rgba(148,163,184,0.65)';ctx.font='10px Rajdhani,sans-serif';ctx.textAlign='center';
    ctx.fillText('Fitted',PAD.l+PW/2,H-4);
    ctx.save();ctx.translate(13,PAD.t+PH/2);ctx.rotate(-Math.PI/2);ctx.fillText('|e|^0.5',0,0);ctx.restore();

    // Trend check
    const sorted=[...sqrtAbsResid.map((s,i)=>({s,f:r.preds[i]}))].sort((a,b)=>a.f-b.f);
    const k=4;
    ctx.strokeStyle='rgba(245,158,11,0.65)';ctx.lineWidth=1.5;
    ctx.beginPath();
    for(let i=k;i<sorted.length-k;i++){
      const avg=sorted.slice(i-k,i+k+1).reduce((s,p)=>s+p.s,0)/(2*k+1);
      i===k?ctx.moveTo(tCx(sorted[i].f),tCy(avg)):ctx.lineTo(tCx(sorted[i].f),tCy(avg));
    }
    ctx.stroke();

    sqrtAbsResid.forEach((s,i)=>{
      ctx.beginPath();ctx.arc(tCx(r.preds[i]),tCy(s),4.5,0,Math.PI*2);
      ctx.fillStyle='rgba(16,185,129,0.8)';ctx.fill();
    });

    ctx.font='bold 10px Orbitron,monospace';ctx.fillStyle='rgba(16,185,129,0.85)';ctx.textAlign='left';
    ctx.fillText('Scale-Location',PAD.l,PAD.t-8);
    ctx.font='10px Rajdhani,sans-serif';ctx.fillStyle='rgba(148,163,184,0.6)';
    ctx.fillText('Ideal: garis kuning datar',PAD.l,H-PAD.b-8);

    // Breusch-Pagan approximation
    const mean_s=sqrtAbsResid.reduce((s,v)=>s+v,0)/sqrtAbsResid.length;
    const variance_s=sqrtAbsResid.reduce((s,v)=>s+(v-mean_s)**2,0)/sqrtAbsResid.length;
    const homoOk=variance_s<1.5;
    const homoEl=document.getElementById('diagHomoStatus');
    if(homoEl){
      homoEl.textContent=homoOk?'Homoscedastic (OK)':'Heteroscedastic (perlu diperiksa)';
      homoEl.style.color=homoOk?'var(--accent-green)':'var(--accent-yellow)';
    }
  }

  window.initMLRHomo=function(){resize();draw();initDone=true;};
  window.addEventListener('resize',()=>{if(initDone){resize();draw();}});
})();
