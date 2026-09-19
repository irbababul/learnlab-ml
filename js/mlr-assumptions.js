/* ===================================================
   MLR Assumptions — Interactive Solution Panels
   Per-assumption: before/after dynamic graphs + solutions
   =================================================== */

(function(){
'use strict';

/* ── shared tiny helpers ── */
const _e  = id => document.getElementById(id);
const _s  = (id,v) => { const e=_e(id); if(e) e.textContent=v; };
function _rr(ctx,x,y,w,h,r){ ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath(); }
const randN = (mu,sd) => { const u=1-Math.random(),v=Math.random(); return mu+sd*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
function canvasSize(cv,maxW,ratio){ const cw=Math.min(cv.parentElement.clientWidth-2,maxW); cv.width=cw; cv.height=Math.round(cw*ratio); }

/* ── generic scatter+line drawer ── */
function drawScatter(ctx,W,H,pts,xLabel,yLabel,lineF,color){
  const PAD={t:28,r:16,b:40,l:52};
  const PW=W-PAD.l-PAD.r,PH=H-PAD.t-PAD.b;
  const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
  const xMin=Math.min(...xs)*.9,xMax=Math.max(...xs)*1.05;
  const yMin=Math.min(...ys)*.9,yMax=Math.max(...ys)*1.05;
  const tX=x=>PAD.l+(x-xMin)/(xMax-xMin)*PW;
  const tY=y=>PAD.t+(1-(y-yMin)/(yMax-yMin))*PH;

  ctx.strokeStyle='rgba(255,255,255,.04)'; ctx.lineWidth=1;
  for(let i=0;i<=5;i++){
    ctx.beginPath();ctx.moveTo(PAD.l,PAD.t+i*PH/5);ctx.lineTo(W-PAD.r,PAD.t+i*PH/5);ctx.stroke();
    ctx.beginPath();ctx.moveTo(PAD.l+i*PW/5,PAD.t);ctx.lineTo(PAD.l+i*PW/5,H-PAD.b);ctx.stroke();
  }
  ctx.strokeStyle='rgba(255,255,255,.2)'; ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(PAD.l,PAD.t);ctx.lineTo(PAD.l,H-PAD.b);ctx.lineTo(W-PAD.r,H-PAD.b);ctx.stroke();
  ctx.fillStyle='rgba(148,163,184,.6)'; ctx.font='10px Rajdhani,sans-serif';
  ctx.textAlign='center'; ctx.fillText(xLabel,PAD.l+PW/2,H-4);
  ctx.save();ctx.translate(12,PAD.t+PH/2);ctx.rotate(-Math.PI/2);ctx.fillText(yLabel,0,0);ctx.restore();

  if(lineF){
    const g=ctx.createLinearGradient(PAD.l,0,W-PAD.r,0);
    g.addColorStop(0,color); g.addColorStop(1,color+'aa');
    ctx.strokeStyle=g; ctx.lineWidth=2;
    ctx.beginPath();
    for(let i=0;i<=40;i++){
      const x=xMin+i*(xMax-xMin)/40;
      i===0?ctx.moveTo(tX(x),tY(lineF(x))):ctx.lineTo(tX(x),tY(lineF(x)));
    }
    ctx.stroke();
  }
  pts.forEach(p=>{
    ctx.beginPath();ctx.arc(tX(p.x),tY(p.y),4,0,Math.PI*2);
    ctx.fillStyle=color+'cc'; ctx.shadowColor=color; ctx.shadowBlur=5;
    ctx.fill(); ctx.shadowBlur=0;
  });
}

/* ── generic residual-vs-fitted drawer ── */
function drawResid(ctx,W,H,pts,title,color){
  const PAD={t:28,r:16,b:40,l:52};
  const PW=W-PAD.l-PAD.r,PH=H-PAD.t-PAD.b;
  const fits=pts.map(p=>p.fit),resids=pts.map(p=>p.resid);
  const fMin=Math.min(...fits)-1,fMax=Math.max(...fits)+1;
  const rMax=Math.max(...resids.map(Math.abs))*1.3;
  const tX=f=>PAD.l+(f-fMin)/(fMax-fMin)*PW;
  const tY=r=>PAD.t+(1-(r+rMax)/(rMax*2))*PH;

  ctx.strokeStyle='rgba(255,255,255,.04)'; ctx.lineWidth=1;
  for(let i=0;i<=5;i++){ ctx.beginPath();ctx.moveTo(PAD.l,PAD.t+i*PH/5);ctx.lineTo(W-PAD.r,PAD.t+i*PH/5);ctx.stroke(); }
  // zero line
  ctx.strokeStyle='rgba(0,212,255,.3)'; ctx.lineWidth=1.2; ctx.setLineDash([5,4]);
  ctx.beginPath();ctx.moveTo(PAD.l,tY(0));ctx.lineTo(W-PAD.r,tY(0));ctx.stroke();ctx.setLineDash([]);
  ctx.strokeStyle='rgba(255,255,255,.2)'; ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(PAD.l,PAD.t);ctx.lineTo(PAD.l,H-PAD.b);ctx.lineTo(W-PAD.r,H-PAD.b);ctx.stroke();
  ctx.fillStyle='rgba(148,163,184,.6)'; ctx.font='10px Rajdhani,sans-serif';
  ctx.textAlign='center'; ctx.fillText('Fitted',PAD.l+PW/2,H-4);
  ctx.save();ctx.translate(12,PAD.t+PH/2);ctx.rotate(-Math.PI/2);ctx.fillText('Residual',0,0);ctx.restore();

  pts.forEach(p=>{
    ctx.beginPath();ctx.arc(tX(p.fit),tY(p.resid),4,0,Math.PI*2);
    ctx.fillStyle=color+'cc'; ctx.shadowColor=color; ctx.shadowBlur=5;
    ctx.fill(); ctx.shadowBlur=0;
  });
  ctx.font='bold 10px Orbitron,monospace'; ctx.fillStyle=color+'cc'; ctx.textAlign='left';
  ctx.fillText(title,PAD.l+4,PAD.t-6);
}

function bg(ctx,W,H){ ctx.fillStyle='rgba(0,0,0,.2)';_rr(ctx,0,0,W,H,10);ctx.fill(); }

/* =========================================================
   ASSUMPTION 1: LINEARITY
   ========================================================= */
(function(){
  const cvB=_e('asmLinBefore'), cvA=_e('asmLinAfter');
  if(!cvB||!cvA) return;
  const ctxB=cvB.getContext('2d'), ctxA=cvA.getContext('2d');
  let initDone=false;

  // Generate non-linear data (quadratic true relationship)
  function genData(){ return Array.from({length:40},(_,i)=>{
    const x=1+i*0.25; return {x, y: 2*x*x+3*x+randN(0,8)};
  });}

  function drawBefore(pts){
    canvasSize(cvB,400,0.75);
    const W=cvB.width,H=cvB.height;
    ctxB.clearRect(0,0,W,H); bg(ctxB,W,H);
    // Wrong: linear fit
    const n=pts.length,mx=pts.reduce((s,p)=>s+p.x,0)/n,my=pts.reduce((s,p)=>s+p.y,0)/n;
    let num=0,den=0; pts.forEach(p=>{num+=(p.x-mx)*(p.y-my);den+=(p.x-mx)**2;});
    const b1=num/den,b0=my-b1*mx;
    drawScatter(ctxB,W,H,pts,'x','y',x=>b1*x+b0,'#ef4444');
    // Residual markers showing pattern
    const PAD={t:28,r:16,b:40,l:52};
    const PW=W-PAD.l-PAD.r,PH=H-PAD.t-PAD.b;
    const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
    const xMin=Math.min(...xs)*.9,xMax=Math.max(...xs)*1.05;
    const yMin=Math.min(...ys)*.9,yMax=Math.max(...ys)*1.05;
    const tX=x=>PAD.l+(x-xMin)/(xMax-xMin)*PW;
    const tY=y=>PAD.t+(1-(y-yMin)/(yMax-yMin))*PH;
    ctxB.font='bold 10px Orbitron,monospace'; ctxB.fillStyle='rgba(239,68,68,.8)'; ctxB.textAlign='center';
    ctxB.fillText('MASALAH: Pola kurva di residual!',W/2,H-PAD.b-8);
  }

  function drawAfter(pts){
    canvasSize(cvA,400,0.75);
    const W=cvA.width,H=cvA.height;
    ctxA.clearRect(0,0,W,H); bg(ctxA,W,H);
    // Correct: polynomial fit x² + x
    const n=pts.length;
    // Use log transform: y vs x² (linearize)
    const pts2=pts.map(p=>({x:p.x,y:p.y,x2:p.x**2}));
    // OLS with x and x²
    const sx=pts2.reduce((s,p)=>s+p.x,0),sx2=pts2.reduce((s,p)=>s+p.x2,0);
    const sx3=pts2.reduce((s,p)=>s+p.x*p.x2,0),sx4=pts2.reduce((s,p)=>s+p.x2**2,0);
    const sy=pts2.reduce((s,p)=>s+p.y,0),sxy=pts2.reduce((s,p)=>s+p.x*p.y,0),sx2y=pts2.reduce((s,p)=>s+p.x2*p.y,0);
    // Solve 3x3: [n,sx,sx2][sx,sx2+sx2,sx3][sx2,sx3,sx4] – simplified for demo
    // Just fit a²+bx+c with least-squares 3-var
    const A=[[n,sx,sx2],[sx,pts2.reduce((s,p)=>s+p.x**2,0),sx3],[sx2,sx3,sx4]];
    const b=[sy,sxy,sx2y];
    const M=A.map((r,i)=>[...r,b[i]]);
    for(let col=0;col<3;col++){
      let piv=col; for(let r=col+1;r<3;r++) if(Math.abs(M[r][col])>Math.abs(M[piv][col])) piv=r;
      [M[col],M[piv]]=[M[piv],M[col]];
      for(let r=col+1;r<3;r++){ const f=M[r][col]/M[col][col]; for(let c=col;c<=3;c++) M[r][c]-=f*M[col][c]; }
    }
    const beta=[0,0,0];
    for(let r=2;r>=0;r--){ let sum=M[r][3]; for(let c=r+1;c<3;c++) sum-=M[r][c]*beta[c]; beta[r]=sum/M[r][r]; }
    const [c0,c1,c2]=beta;
    drawScatter(ctxA,W,H,pts,'x','y',x=>c2*x**2+c1*x+c0,'#10b981');
    ctxA.font='bold 10px Orbitron,monospace'; ctxA.fillStyle='rgba(16,185,129,.8)'; ctxA.textAlign='center';
    ctxA.fillText('SOLUSI: Tambah fitur x² (polynomial)',cvA.width/2,cvA.height-20);
  }

  const data=genData();
  window.initAsmLinearity=function(){
    drawBefore(data); drawAfter(data); initDone=true;
  };
  window.addEventListener('resize',()=>{if(initDone){drawBefore(data);drawAfter(data);}});
})();

/* =========================================================
   ASSUMPTION 2: INDEPENDENCE
   ========================================================= */
(function(){
  const cvB=_e('asmIndepBefore'), cvA=_e('asmIndepAfter');
  if(!cvB||!cvA) return;
  const ctxB=cvB.getContext('2d'), ctxA=cvA.getContext('2d');
  let initDone=false;

  function genAutocorr(){
    const pts=[]; let prev=0;
    for(let i=0;i<50;i++){
      const resid=0.85*prev+randN(0,2);
      pts.push({t:i, resid, fit:20+i*0.4+randN(0,1)});
      prev=resid;
    }
    return pts;
  }
  function genIndep(){
    return Array.from({length:50},(_,i)=>({t:i,resid:randN(0,2.5),fit:20+i*0.4+randN(0,1)}));
  }

  function drawACFLine(ctx,W,H,pts,label,good){
    const PAD={t:28,r:16,b:40,l:52};
    const PW=W-PAD.l-PAD.r,PH=H-PAD.t-PAD.b;
    const resids=pts.map(p=>p.resid);
    const n=resids.length, maxLag=10;
    const mn=resids.reduce((s,v)=>s+v,0)/n;
    const v0=resids.reduce((s,v)=>s+(v-mn)**2,0)/n;
    const acf=[1,...Array.from({length:maxLag},(_,lag)=>{
      let s=0; for(let i=0;i<n-lag-1;i++) s+=(resids[i]-mn)*(resids[i+lag+1]-mn);
      return v0>0?s/(n*v0):0;
    })];
    const barW=PW/(maxLag+2), yMid=PAD.t+PH*0.5;
    const tH=h=>h*PH*0.45;

    ctx.strokeStyle='rgba(255,255,255,.2)'; ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(PAD.l,yMid);ctx.lineTo(W-PAD.r,yMid);ctx.stroke();
    // Confidence bounds ±1.96/√n
    const bound=1.96/Math.sqrt(n);
    ctx.strokeStyle='rgba(245,158,11,.4)'; ctx.lineWidth=1; ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.moveTo(PAD.l,yMid-tH(bound));ctx.lineTo(W-PAD.r,yMid-tH(bound));ctx.stroke();
    ctx.beginPath();ctx.moveTo(PAD.l,yMid+tH(bound));ctx.lineTo(W-PAD.r,yMid+tH(bound));ctx.stroke();
    ctx.setLineDash([]);

    acf.forEach((a,lag)=>{
      const bx=PAD.l+(lag+0.5)*barW;
      const bh=tH(Math.abs(a));
      const col=Math.abs(a)>bound?(good?'#10b981':'#ef4444'):'rgba(0,212,255,.6)';
      ctx.fillStyle=col;
      ctx.fillRect(bx-barW*0.3,yMid-(a>0?bh:0),barW*0.6,bh);
    });

    ctx.fillStyle='rgba(148,163,184,.65)'; ctx.font='10px Rajdhani,sans-serif'; ctx.textAlign='center';
    ctx.fillText('Lag',PAD.l+PW/2,H-4);
    ctx.save();ctx.translate(12,PAD.t+PH/2);ctx.rotate(-Math.PI/2);ctx.fillText('ACF',0,0);ctx.restore();
    ctx.font='bold 10px Orbitron,monospace';
    ctx.fillStyle=good?'rgba(16,185,129,.8)':'rgba(239,68,68,.8)';
    ctx.textAlign='center'; ctx.fillText(label,W/2,PAD.t-6);
  }

  const badData=genAutocorr(), goodData=genIndep();
  window.initAsmIndep=function(){
    canvasSize(cvB,400,0.65); bg(ctxB,cvB.width,cvB.height);
    drawACFLine(ctxB,cvB.width,cvB.height,badData,'MASALAH: Autokorelasi (ACF tinggi di lag 1-4)',false);
    canvasSize(cvA,400,0.65); bg(ctxA,cvA.width,cvA.height);
    drawACFLine(ctxA,cvA.width,cvA.height,goodData,'SOLUSI: Tambah lag variable / differencing',true);
    initDone=true;
  };
  window.addEventListener('resize',()=>{if(initDone){
    canvasSize(cvB,400,0.65);bg(ctxB,cvB.width,cvB.height);drawACFLine(ctxB,cvB.width,cvB.height,badData,'MASALAH: Autokorelasi',false);
    canvasSize(cvA,400,0.65);bg(ctxA,cvA.width,cvA.height);drawACFLine(ctxA,cvA.width,cvA.height,goodData,'SOLUSI: Residual independen',true);
  }});
})();

/* =========================================================
   ASSUMPTION 3: HOMOSCEDASTICITY
   ========================================================= */
(function(){
  const cvB=_e('asmHomoBefore'), cvA=_e('asmHomoAfter');
  const slBefore=_e('asmHomoSlider'), slAfter=_e('asmHomoSeverity');
  if(!cvB||!cvA) return;
  const ctxB=cvB.getContext('2d'), ctxA=cvA.getContext('2d');
  let severity=1.5, initDone=false;

  function genHetero(sev){
    return Array.from({length:50},(_,i)=>{
      const x=1+i*0.3;
      const y=2+1.5*x+randN(0,sev*x*0.3); // variance grows with x
      return {x,y};
    });
  }
  function genHomo(){
    return Array.from({length:50},(_,i)=>{
      const x=1+i*0.3;
      const ly=Math.log(2+1.5*x)+randN(0,0.15);
      return {x,y:Math.exp(ly)};
    });
  }

  function makeResid(pts,useLog){
    const n=pts.length;
    const ptsT=useLog?pts.map(p=>({x:p.x,y:Math.log(p.y)})):pts;
    const mx=ptsT.reduce((s,p)=>s+p.x,0)/n, my=ptsT.reduce((s,p)=>s+p.y,0)/n;
    let num=0,den=0; ptsT.forEach(p=>{num+=(p.x-mx)*(p.y-my);den+=(p.x-mx)**2;});
    const b1=num/den,b0=my-b1*mx;
    return ptsT.map(p=>({fit:b1*p.x+b0, resid:p.y-(b1*p.x+b0)}));
  }

  function draw(){
    const pts=genHetero(severity);
    canvasSize(cvB,400,0.72); bg(ctxB,cvB.width,cvB.height);
    drawResid(ctxB,cvB.width,cvB.height,makeResid(pts,false),'MASALAH: Corong — varians tidak konstan','#ef4444');
    canvasSize(cvA,400,0.72); bg(ctxA,cvA.width,cvA.height);
    const ptsLog=genHomo();
    drawResid(ctxA,cvA.width,cvA.height,makeResid(ptsLog,true),'SOLUSI: Log(y) — varians stabil','#10b981');
  }

  window.updateAsmHomo=function(v){
    severity=parseFloat(v); _s('asmHomoSevVal',parseFloat(v).toFixed(1));
    if(initDone) draw();
  };
  window.initAsmHomo=function(){ draw(); initDone=true; };
  window.addEventListener('resize',()=>{if(initDone) draw();});
})();

/* =========================================================
   ASSUMPTION 4: NORMALITY OF RESIDUALS
   ========================================================= */
(function(){
  const cvB=_e('asmNormBefore'), cvA=_e('asmNormAfter');
  if(!cvB||!cvA) return;
  const ctxB=cvB.getContext('2d'), ctxA=cvA.getContext('2d');
  let skew=1, initDone=false;

  const normInv=p=>{if(p<=0)return -4;if(p>=1)return 4;const a=[2.515517,.802853,.010328],b=[1.432788,.189269,.001308];const t=Math.sqrt(-2*Math.log(p<.5?p:1-p));const num=a[0]+t*(a[1]+t*a[2]);const den=1+t*(b[0]+t*(b[1]+t*b[2]));return(p<.5?-1:1)*(t-num/den);};

  function genSkewResid(sk){
    // Skewed residuals using exponential-ish distribution
    return Array.from({length:60},()=>{
      const u=Math.random();
      const r=sk>0?(-Math.log(1-u)*sk-sk+randN(0,0.5)):randN(0,2);
      return r;
    });
  }
  function genNormalResid(){ return Array.from({length:60},()=>randN(0,2)); }

  function drawQQ(ctx,W,H,resids,title,good){
    const PAD={t:28,r:16,b:40,l:52};
    const PW=W-PAD.l-PAD.r,PH=H-PAD.t-PAD.b;
    const sorted=[...resids].sort((a,b)=>a-b);
    const n=sorted.length;
    const mn=sorted.reduce((s,v)=>s+v,0)/n;
    const sd=Math.sqrt(sorted.reduce((s,v)=>s+(v-mn)**2,0)/n)||1;
    const zScores=sorted.map(v=>(v-mn)/sd);
    const theoretical=sorted.map((_,i)=>normInv((i+.5)/n));
    const tMin=Math.min(...theoretical)-.3,tMax=Math.max(...theoretical)+.3;
    const zMin=Math.min(...zScores)-.3,zMax=Math.max(...zScores)+.3;
    const tX=t=>PAD.l+(t-tMin)/(tMax-tMin)*PW;
    const tY=z=>PAD.t+(1-(z-zMin)/(zMax-zMin))*PH;

    ctx.strokeStyle='rgba(255,255,255,.04)'; ctx.lineWidth=1;
    for(let i=0;i<=5;i++){ctx.beginPath();ctx.moveTo(PAD.l,PAD.t+i*PH/5);ctx.lineTo(W-PAD.r,PAD.t+i*PH/5);ctx.stroke();}
    // Reference line
    ctx.strokeStyle='rgba(0,212,255,.35)'; ctx.lineWidth=1.5; ctx.setLineDash([5,4]);
    ctx.beginPath();ctx.moveTo(tX(tMin),tY(tMin));ctx.lineTo(tX(tMax),tY(tMax));ctx.stroke();ctx.setLineDash([]);
    ctx.strokeStyle='rgba(255,255,255,.2)'; ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(PAD.l,PAD.t);ctx.lineTo(PAD.l,H-PAD.b);ctx.lineTo(W-PAD.r,H-PAD.b);ctx.stroke();
    ctx.fillStyle='rgba(148,163,184,.65)'; ctx.font='10px Rajdhani,sans-serif';
    ctx.textAlign='center'; ctx.fillText('Theoretical Quantile',PAD.l+PW/2,H-4);
    ctx.save();ctx.translate(12,PAD.t+PH/2);ctx.rotate(-Math.PI/2);ctx.fillText('Sample Quantile',0,0);ctx.restore();

    const col=good?'rgba(16,185,129,.85)':'rgba(139,92,246,.85)';
    zScores.forEach((z,i)=>{
      ctx.beginPath();ctx.arc(tX(theoretical[i]),tY(z),3.5,0,Math.PI*2);
      ctx.fillStyle=col;ctx.fill();
    });
    ctx.font='bold 10px Orbitron,monospace';
    ctx.fillStyle=good?'rgba(16,185,129,.8)':'rgba(139,92,246,.8)';
    ctx.textAlign='center'; ctx.fillText(title,W/2,PAD.t-6);
  }

  function draw(){
    const badR=genSkewResid(skew), goodR=genNormalResid();
    canvasSize(cvB,400,0.82); bg(ctxB,cvB.width,cvB.height);
    drawQQ(ctxB,cvB.width,cvB.height,badR,'MASALAH: Q-Q melengkung (skewed)',false);
    canvasSize(cvA,400,0.82); bg(ctxA,cvA.width,cvA.height);
    drawQQ(ctxA,cvA.width,cvA.height,goodR,'SOLUSI: Setelah transformasi Box-Cox',true);
  }

  window.updateAsmNorm=function(v){
    skew=parseFloat(v); _s('asmNormSkewVal',parseFloat(v).toFixed(1));
    if(initDone) draw();
  };
  window.initAsmNorm=function(){ draw(); initDone=true; };
  window.addEventListener('resize',()=>{if(initDone) draw();});
})();

/* =========================================================
   ASSUMPTION 5: NO MULTICOLLINEARITY
   ========================================================= */
(function(){
  const cvB=_e('asmMCBefore'), cvA=_e('asmMCAfter');
  if(!cvB||!cvA) return;
  const ctxB=cvB.getContext('2d'), ctxA=cvA.getContext('2d');
  let corrLevel=0.95, initDone=false;

  function calcVIF(r){return r<0.9999?1/(1-r**2):9999;}

  function drawVIFBar(ctx,W,H,vif1,vif2,label1,label2,title,good){
    const PAD={t:28,r:24,b:48,l:56};
    const PW=W-PAD.l-PAD.r,PH=H-PAD.t-PAD.b;
    const maxVIF=Math.min(Math.max(vif1,vif2,11),50);
    const barW=PW/6;
    const colors=['#00d4ff','#8b5cf6'];
    const vifs=[vif1,vif2];
    const labels=[label1,label2];

    ctx.strokeStyle='rgba(255,255,255,.04)'; ctx.lineWidth=1;
    [1,5,10].forEach(th=>{
      const y=PAD.t+(1-Math.min(th,maxVIF)/maxVIF)*PH;
      if(y>=PAD.t&&y<=H-PAD.b){
        const col=th===1?'rgba(16,185,129,.4)':th===5?'rgba(245,158,11,.5)':'rgba(239,68,68,.5)';
        ctx.strokeStyle=col; ctx.setLineDash([4,4]);
        ctx.beginPath();ctx.moveTo(PAD.l,y);ctx.lineTo(W-PAD.r,y);ctx.stroke();ctx.setLineDash([]);
        ctx.fillStyle=col; ctx.font='9px Share Tech Mono,monospace'; ctx.textAlign='right';
        ctx.fillText('VIF='+th,W-PAD.r,y-2);
      }
    });
    ctx.strokeStyle='rgba(255,255,255,.2)'; ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(PAD.l,PAD.t);ctx.lineTo(PAD.l,H-PAD.b);ctx.lineTo(W-PAD.r,H-PAD.b);ctx.stroke();

    vifs.forEach((v,i)=>{
      const bx=PAD.l+(i*3+1)*barW;
      const normH=Math.min(v,maxVIF)/maxVIF*PH;
      const by=PAD.t+PH-normH;
      const g=ctx.createLinearGradient(0,by,0,H-PAD.b);
      g.addColorStop(0,v>10?'#ef4444':v>5?'#f59e0b':colors[i]);
      g.addColorStop(1,(v>10?'#ef4444':v>5?'#f59e0b':colors[i])+'44');
      ctx.fillStyle=g; ctx.fillRect(bx,by,barW*1.6,normH);
      ctx.strokeStyle=v>10?'#ef4444':v>5?'#f59e0b':colors[i]; ctx.lineWidth=1.5; ctx.strokeRect(bx,by,barW*1.6,normH);
      ctx.fillStyle='rgba(200,220,240,.8)'; ctx.font='10px Rajdhani,sans-serif'; ctx.textAlign='center';
      ctx.fillText(labels[i],bx+barW*.8,H-PAD.b+14);
      ctx.font='bold 10px Share Tech Mono,monospace';
      ctx.fillStyle=v>10?'#ef4444':v>5?'#f59e0b':colors[i];
      ctx.fillText(v>50?'>50':v.toFixed(1),bx+barW*.8,by-4);
    });

    ctx.textAlign='right'; ctx.fillStyle='rgba(148,163,184,.6)'; ctx.font='9px Rajdhani,sans-serif';
    for(let i=0;i<=5;i++){const v=i*maxVIF/5; ctx.fillText(v.toFixed(0),PAD.l-3,PAD.t+(1-i/5)*PH+3);}
    ctx.font='bold 10px Orbitron,monospace';
    ctx.fillStyle=good?'rgba(16,185,129,.8)':'rgba(239,68,68,.8)';
    ctx.textAlign='left'; ctx.fillText(title,PAD.l,PAD.t-6);
  }

  function draw(){
    // r² correlation → VIF
    const vifBefore=calcVIF(corrLevel);
    canvasSize(cvB,400,0.68); bg(ctxB,cvB.width,cvB.height);
    drawVIFBar(ctxB,cvB.width,cvB.height,vifBefore,vifBefore*0.95,'x1','x2','MASALAH: Multikolinearitas tinggi',false);
    // After: remove one / PCA reduce
    const vifAfter=calcVIF(Math.min(corrLevel*0.3,0.4));
    canvasSize(cvA,400,0.68); bg(ctxA,cvA.width,cvA.height);
    drawVIFBar(ctxA,cvA.width,cvA.height,vifAfter,vifAfter*0.98,'x1','x2 (PCA)','SOLUSI: Setelah PCA / hapus fitur',true);
    _s('asmMCVIF',vifBefore>50?'>50':vifBefore.toFixed(1));
    _s('asmMCCorr',corrLevel.toFixed(2));
  }

  window.updateAsmMC=function(v){
    corrLevel=parseFloat(v); _s('asmMCCorrVal',parseFloat(v).toFixed(2));
    if(initDone) draw();
  };
  window.initAsmMC=function(){ draw(); initDone=true; };
  window.addEventListener('resize',()=>{if(initDone) draw();});
})();

/* =========================================================
   ASSUMPTION 6: NO INFLUENTIAL OUTLIERS
   ========================================================= */
(function(){
  const cvB=_e('asmOutBefore'), cvA=_e('asmOutAfter');
  if(!cvB||!cvA) return;
  const ctxB=cvB.getContext('2d'), ctxA=cvA.getContext('2d');
  let outlierX=8, outlierY=90, initDone=false;
  let dragging=false;

  function genBase(){ return Array.from({length:25},(_,i)=>({x:1+i*0.35,y:5+1.8*(1+i*0.35)+randN(0,1.5)}));}

  function fitLine(pts){
    const n=pts.length,mx=pts.reduce((s,p)=>s+p.x,0)/n,my=pts.reduce((s,p)=>s+p.y,0)/n;
    let num=0,den=0; pts.forEach(p=>{num+=(p.x-mx)*(p.y-my);den+=(p.x-mx)**2;});
    const b1=num/den,b0=my-b1*mx;
    return {b0,b1};
  }

  function drawOutlier(ctx,W,H,pts,outlier,showOutlier,title,col){
    const all=showOutlier?[...pts,outlier]:pts;
    const {b0,b1}=fitLine(all);
    const {b0:b0c,b1:b1c}=fitLine(pts); // without outlier
    drawScatter(ctx,W,H,all,'x','y',x=>b0+b1*x,col);
    if(showOutlier){
      // highlight outlier
      const xs=all.map(p=>p.x),ys=all.map(p=>p.y);
      const xMin=Math.min(...xs)*.9,xMax=Math.max(...xs)*1.05;
      const yMin=Math.min(...ys)*.9,yMax=Math.max(...ys)*1.05;
      const PAD={t:28,r:16,b:40,l:52};
      const PW=W-PAD.l-PAD.r,PH=H-PAD.t-PAD.b;
      const tX=x=>PAD.l+(x-xMin)/(xMax-xMin)*PW;
      const tY=y=>PAD.t+(1-(y-yMin)/(yMax-yMin))*PH;
      ctx.beginPath();ctx.arc(tX(outlier.x),tY(outlier.y),10,0,Math.PI*2);
      ctx.strokeStyle='#ef4444'; ctx.lineWidth=2; ctx.stroke();
      ctx.fillStyle='rgba(239,68,68,.15)'; ctx.fill();
      // true line (without outlier) faint
      ctx.strokeStyle='rgba(16,185,129,.4)'; ctx.lineWidth=1.5; ctx.setLineDash([5,4]);
      ctx.beginPath();ctx.moveTo(tX(xMin),tY(b0c+b1c*xMin));ctx.lineTo(tX(xMax),tY(b0c+b1c*xMax));ctx.stroke();ctx.setLineDash([]);
    }
    ctx.font='bold 10px Orbitron,monospace'; ctx.fillStyle=col+'cc'; ctx.textAlign='center';
    ctx.fillText(title,W/2,H-20);
  }

  const base=genBase();
  function draw(){
    canvasSize(cvB,400,0.75); bg(ctxB,cvB.width,cvB.height);
    drawOutlier(ctxB,cvB.width,cvB.height,base,{x:outlierX,y:outlierY},true,'MASALAH: Outlier menarik garis','#ef4444');
    canvasSize(cvA,400,0.75); bg(ctxA,cvA.width,cvA.height);
    drawOutlier(ctxA,cvA.width,cvA.height,base,null,false,'SOLUSI: Setelah outlier dihapus','#10b981');
    _s('asmOutX',outlierX.toFixed(1)); _s('asmOutY',outlierY.toFixed(0));
  }

  window.updateAsmOutX=function(v){outlierX=parseFloat(v);_s('asmOutXVal',parseFloat(v).toFixed(1));if(initDone)draw();};
  window.updateAsmOutY=function(v){outlierY=parseFloat(v);_s('asmOutYVal',parseFloat(v).toFixed(0));if(initDone)draw();};
  window.initAsmOutlier=function(){draw();initDone=true;};
  window.addEventListener('resize',()=>{if(initDone)draw();});
})();

/* ── toggle solution panels ── */
window.toggleAsmSolution=function(id){
  const panel=_e('sol-'+id);
  const btn=_e('btn-sol-'+id);
  if(!panel) return;
  const open=panel.style.display==='block';
  panel.style.display=open?'none':'block';
  if(btn) btn.textContent=open?'Lihat Solusi & Contoh Interaktif ▼':'Tutup Solusi ▲';
  if(!open){
    // lazy init the canvas when panel opens
    const initMap={
      'lin':window.initAsmLinearity,'indep':window.initAsmIndep,
      'homo':window.initAsmHomo,'norm':window.initAsmNorm,
      'mc':window.initAsmMC,'out':window.initAsmOutlier
    };
    const fn=initMap[id];
    if(fn) fn();
  }
};

})(); // end module
