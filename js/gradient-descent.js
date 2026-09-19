/* ===================================================
   Gradient Descent v2
   Synced with cost surface + loss plane
   Full step-through, auto-play, convergence detection
   =================================================== */
(function () {
  const gdCanvas = document.getElementById('gdCanvas');
  const lossCanvas = document.getElementById('lossCanvas');
  if (!gdCanvas || !lossCanvas) return;
  const ctx = gdCanvas.getContext('2d');
  const lCtx = lossCanvas.getContext('2d');
  const PAD = { top: 36, right: 24, bottom: 52, left: 58 };

  const DATA = [
    {x:0.5,y:4.2},{x:1.0,y:4.8},{x:1.5,y:5.9},{x:2.0,y:6.5},{x:2.5,y:8.1},
    {x:3.0,y:8.7},{x:3.5,y:9.6},{x:4.0,y:10.5},{x:4.5,y:11.2},{x:5.0,y:12.3},
    {x:5.5,y:13.0},{x:6.0,y:13.8},{x:6.5,y:15.1},{x:7.0,y:15.4},{x:7.5,y:16.6},
    {x:8.0,y:17.2},{x:8.5,y:18.4},{x:9.0,y:19.1},{x:9.5,y:20.0},{x:10.0,y:20.8},
    {x:2.2,y:7.3},{x:4.8,y:12.0},{x:6.8,y:14.7},{x:7.8,y:16.9},{x:9.2,y:19.6}
  ];

  // Precompute OLS optimal
  const n=DATA.length;
  const mx=DATA.reduce((s,p)=>s+p.x,0)/n;
  const my=DATA.reduce((s,p)=>s+p.y,0)/n;
  let _num=0,_den=0; DATA.forEach(p=>{_num+=(p.x-mx)*(p.y-my);_den+=(p.x-mx)**2;});
  const OPT_B1=_num/_den, OPT_B0=my-OPT_B1*mx;

  // State
  let lr=0.005, iterPerStep=5;
  let b0=0.0, b1=0.0, initB0=0.0, initB1=0.0;
  let totalIter=0, lossHistory=[], paramHistory=[];
  let running=false, animId=null, frameCount=0;
  let W,H,LW,LH,PW,PH;
  let initialized=false;

  function resize(){
    const container=gdCanvas.parentElement;
    const cw=Math.min(container.clientWidth-2,720);
    const isMob=window.innerWidth<=600;
    gdCanvas.width=cw; gdCanvas.height=Math.round(cw*0.5);
    lossCanvas.width=cw; lossCanvas.height=Math.round(cw*(isMob?0.38:0.22));
    W=gdCanvas.width; H=gdCanvas.height;
    LW=lossCanvas.width; LH=lossCanvas.height;
    PW=W-PAD.left-PAD.right; PH=H-PAD.top-PAD.bottom;
  }

  const xMin=0,xMax=11,yMin=0,yMax=25;
  function toCx(x){return PAD.left+(x-xMin)/(xMax-xMin)*PW;}
  function toCy(y){return PAD.top+(1-(y-yMin)/(yMax-yMin))*PH;}

  function computeMSE(cb0,cb1){
    return DATA.reduce((s,p)=>s+(p.y-(cb1*p.x+cb0))**2,0)/n;
  }

  function gdOneStep(){
    let dw=0,db=0;
    DATA.forEach(p=>{
      const err=p.y-(b1*p.x+b0);
      dw+=(-2/n)*p.x*err;
      db+=(-2/n)*err;
    });
    b0-=lr*db; b1-=lr*dw;
  }

  function doSteps(){
    for(let i=0;i<iterPerStep;i++){
      gdOneStep(); totalIter++;
      lossHistory.push(computeMSE(b0,b1));
      paramHistory.push({b0,b1});
    }
    gdDraw(); drawLoss(); updateInfo(); addLog();
    // Sync with cost surface & loss plane
    if(window.setCostSurfaceGDPath) window.setCostSurfaceGDPath([...paramHistory]);
    if(window.setLossPlaneGDPath) window.setLossPlaneGDPath([...paramHistory]);
    if(window.updateCostSurfacePoint) window.updateCostSurfacePoint(b0,b1);
    if(window.updateLossPlanePoint) window.updateLossPlanePoint(b0,b1);
    // Check convergence
    if(lossHistory.length>10){
      const recent=lossHistory.slice(-5);
      const delta=Math.max(...recent)-Math.min(...recent);
      if(delta<0.0001){
        running=false; cancelAnimationFrame(animId);
        const btn=document.getElementById('gdStartBtn');
        if(btn) btn.textContent='▶ Mulai / Pause';
        showToast(`✅ Konvergen pada iterasi ${totalIter}! J=${computeMSE(b0,b1).toFixed(4)}`);
        if(totalIter>=50 && window.awardBadge) window.awardBadge('ach3','Gradient Rider');
        return true;
      }
    }
    return false;
  }

  window.gdStep = doSteps;

  window.gdToggle = function(){
    running=!running;
    const btn=document.getElementById('gdStartBtn');
    if(btn) btn.textContent=running?'⏸ Pause':'▶ Mulai / Pause';
    if(running) runLoop(); else cancelAnimationFrame(animId);
  };

  window.gdReset = function(){
    running=false; cancelAnimationFrame(animId);
    b0=initB0; b1=initB1;
    totalIter=0; lossHistory=[]; paramHistory=[]; frameCount=0;
    const log=document.getElementById('gdLog');
    if(log) log.innerHTML='<div class="log-line" style="color:var(--text-muted);">// Log iterasi...</div>';
    const btn=document.getElementById('gdStartBtn');
    if(btn) btn.textContent='▶ Mulai / Pause';
    if(window.clearCostSurfacePath) window.clearCostSurfacePath();
    updateInfo(); gdDraw(); drawLoss();
    showToast('↺ Gradient Descent direset!');
  };

  function runLoop(){
    if(!running) return;
    frameCount++;
    if(frameCount%2===0){ if(doSteps()) return; }
    animId=requestAnimationFrame(runLoop);
  }

  function updateInfo(){
    const mse=computeMSE(b0,b1);
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    set('gdIter',totalIter);
    set('gdMSE',mse.toFixed(4));
    set('gdB0',b0.toFixed(4));
    set('gdB1',b1.toFixed(4));
    set('gdDeltaB0',(b0-OPT_B0).toFixed(4));
    set('gdDeltaB1',(b1-OPT_B1).toFixed(4));
  }

  function addLog(){
    const log=document.getElementById('gdLog');
    if(!log) return;
    const mse=computeMSE(b0,b1);
    if(totalIter%iterPerStep!==0&&totalIter>iterPerStep) return;
    const line=document.createElement('div');
    line.className='log-line'+(totalIter%50===0?' highlight':'');
    line.textContent=`iter ${String(totalIter).padStart(4,'0')} | J=${mse.toFixed(4)} | b0=${b0.toFixed(3)} | b1=${b1.toFixed(3)}`;
    log.appendChild(line);
    if(log.children.length>80){log.removeChild(log.firstChild);}
    log.scrollTop=log.scrollHeight;
  }

  function gdDraw(){
    if(!W) return;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='rgba(0,0,0,0.18)'; ctx.roundRect(0,0,W,H,12); ctx.fill();

    // Grid
    ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1;
    for(let i=0;i<=10;i++){
      ctx.beginPath(); ctx.moveTo(toCx(xMin+i*(xMax-xMin)/10),PAD.top);
      ctx.lineTo(toCx(xMin+i*(xMax-xMin)/10),H-PAD.bottom); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(PAD.left,toCy(yMin+i*(yMax-yMin)/10));
      ctx.lineTo(W-PAD.right,toCy(yMin+i*(yMax-yMin)/10)); ctx.stroke();
    }
    ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(PAD.left,PAD.top); ctx.lineTo(PAD.left,H-PAD.bottom);
    ctx.lineTo(W-PAD.right,H-PAD.bottom); ctx.stroke();

    ctx.fillStyle='rgba(148,163,184,0.6)'; ctx.font='11px Rajdhani,sans-serif';
    ctx.textAlign='center';
    for(let i=0;i<=5;i++){const xv=xMin+i*(xMax-xMin)/5;ctx.fillText(xv.toFixed(0),toCx(xv),H-PAD.bottom+16);}
    ctx.textAlign='right';
    for(let i=0;i<=5;i++){const yv=yMin+i*(yMax-yMin)/5;ctx.fillText(yv.toFixed(0),PAD.left-6,toCy(yv)+4);}

    // Optimal line (reference)
    const og=ctx.createLinearGradient(toCx(xMin),0,toCx(xMax),0);
    og.addColorStop(0,'rgba(16,185,129,0.4)'); og.addColorStop(1,'rgba(16,185,129,0.4)');
    ctx.strokeStyle=og; ctx.lineWidth=1.5; ctx.setLineDash([6,4]);
    ctx.beginPath(); ctx.moveTo(toCx(xMin),toCy(OPT_B1*xMin+OPT_B0)); ctx.lineTo(toCx(xMax),toCy(OPT_B1*xMax+OPT_B0)); ctx.stroke(); ctx.setLineDash([]);

    // Current line
    const grd=ctx.createLinearGradient(toCx(xMin),0,toCx(xMax),0);
    grd.addColorStop(0,'#f59e0b'); grd.addColorStop(1,'#ef4444');
    ctx.strokeStyle=grd; ctx.lineWidth=2.5;
    ctx.shadowColor='#f59e0b'; ctx.shadowBlur=8;
    const y0c=b1*xMin+b0, y1c=b1*xMax+b0;
    ctx.beginPath();
    ctx.moveTo(toCx(xMin),Math.max(PAD.top,Math.min(H-PAD.bottom,toCy(y0c))));
    ctx.lineTo(toCx(xMax),Math.max(PAD.top,Math.min(H-PAD.bottom,toCy(y1c))));
    ctx.stroke(); ctx.shadowBlur=0;

    // Residuals (faint)
    DATA.forEach(p=>{
      const pred=b1*p.x+b0;
      ctx.strokeStyle='rgba(239,68,68,0.25)'; ctx.lineWidth=1; ctx.setLineDash([2,3]);
      ctx.beginPath(); ctx.moveTo(toCx(p.x),toCy(p.y)); ctx.lineTo(toCx(p.x),toCy(pred)); ctx.stroke(); ctx.setLineDash([]);
    });

    // Data points
    DATA.forEach(p=>{
      ctx.beginPath(); ctx.arc(toCx(p.x),toCy(p.y),5,0,Math.PI*2);
      ctx.fillStyle='#00d4ff'; ctx.shadowColor='#00d4ff'; ctx.shadowBlur=6; ctx.fill(); ctx.shadowBlur=0;
    });

    // Labels
    ctx.font='bold 12px Share Tech Mono,monospace'; ctx.textAlign='left';
    ctx.fillStyle='#f59e0b'; ctx.fillText(`Current: ŷ=${b1.toFixed(2)}x+${b0.toFixed(2)}`,PAD.left+8,PAD.top+18);
    ctx.fillStyle='rgba(16,185,129,0.7)'; ctx.fillText(`Optimal: ŷ=${OPT_B1.toFixed(2)}x+${OPT_B0.toFixed(2)}`,PAD.left+8,PAD.top+34);
  }

  function drawLoss(){
    if(!LW) return;
    lCtx.clearRect(0,0,LW,LH);
    lCtx.fillStyle='rgba(0,0,0,0.18)'; lCtx.fillRect(0,0,LW,LH);
    const lPAD={t:16,r:20,b:32,l:56};
    const lPW=LW-lPAD.l-lPAD.r, lPH=LH-lPAD.t-lPAD.b;

    if(lossHistory.length<2){
      lCtx.fillStyle='rgba(148,163,184,0.4)'; lCtx.font='12px Rajdhani,sans-serif';
      lCtx.textAlign='center'; lCtx.fillText('Loss curve muncul setelah iterasi dimulai',LW/2,LH/2); return;
    }
    const maxL=lossHistory[0], minL=Math.min(...lossHistory);
    const pad=(maxL-minL)*0.05||0.1;
    const toCx=i=>lPAD.l+(i/(lossHistory.length-1))*lPW;
    const toCy=v=>lPAD.t+(1-(v-minL+pad)/(maxL-minL+2*pad))*lPH;

    lCtx.strokeStyle='rgba(255,255,255,0.05)'; lCtx.lineWidth=1;
    for(let i=0;i<=4;i++){const y=lPAD.t+i*lPH/4;lCtx.beginPath();lCtx.moveTo(lPAD.l,y);lCtx.lineTo(LW-lPAD.r,y);lCtx.stroke();}

    lCtx.strokeStyle='rgba(255,255,255,0.15)'; lCtx.lineWidth=1.5;
    lCtx.beginPath(); lCtx.moveTo(lPAD.l,lPAD.t); lCtx.lineTo(lPAD.l,LH-lPAD.b); lCtx.lineTo(LW-lPAD.r,LH-lPAD.b); lCtx.stroke();

    lCtx.fillStyle='rgba(148,163,184,0.6)'; lCtx.font='10px Rajdhani,sans-serif';
    lCtx.textAlign='center'; lCtx.fillText('Iterasi',lPAD.l+lPW/2,LH-2);
    lCtx.textAlign='right'; lCtx.fillText(maxL.toFixed(1),lPAD.l-3,lPAD.t+8); lCtx.fillText(minL.toFixed(1),lPAD.l-3,LH-lPAD.b);

    const fg=lCtx.createLinearGradient(0,lPAD.t,0,LH-lPAD.b);
    fg.addColorStop(0,'rgba(239,68,68,0.3)'); fg.addColorStop(1,'rgba(239,68,68,0)');
    lCtx.fillStyle=fg;
    lCtx.beginPath(); lCtx.moveTo(toCx(0),LH-lPAD.b);
    lossHistory.forEach((v,i)=>lCtx.lineTo(toCx(i),toCy(v)));
    lCtx.lineTo(toCx(lossHistory.length-1),LH-lPAD.b); lCtx.closePath(); lCtx.fill();

    const lg=lCtx.createLinearGradient(lPAD.l,0,LW-lPAD.r,0);
    lg.addColorStop(0,'#ef4444'); lg.addColorStop(1,'#f59e0b');
    lCtx.strokeStyle=lg; lCtx.lineWidth=2;
    lCtx.beginPath();
    lossHistory.forEach((v,i)=>{ i===0?lCtx.moveTo(toCx(i),toCy(v)):lCtx.lineTo(toCx(i),toCy(v)); });
    lCtx.stroke();

    const lx=toCx(lossHistory.length-1), ly=toCy(lossHistory[lossHistory.length-1]);
    lCtx.beginPath(); lCtx.arc(lx,ly,4,0,Math.PI*2);
    lCtx.fillStyle='#f59e0b'; lCtx.shadowColor='#f59e0b'; lCtx.shadowBlur=8; lCtx.fill(); lCtx.shadowBlur=0;

    lCtx.fillStyle='rgba(148,163,184,0.6)'; lCtx.font='10px Rajdhani,sans-serif'; lCtx.textAlign='left';
    lCtx.fillText('Loss (MSE)',lPAD.l+4,lPAD.t+12);
  }

  // Slider controls
  window.updateLR=function(v){ lr=parseFloat(v); document.getElementById('lrVal').textContent=parseFloat(v).toFixed(4); };
  window.updateIterPerStep=function(v){ iterPerStep=parseInt(v); document.getElementById('iterVal').textContent=v; };
  window.updateInitB0=function(v){ initB0=parseFloat(v); document.getElementById('initB0Val').textContent=parseFloat(v).toFixed(1); if(!running){b0=initB0;gdDraw();} };
  window.updateInitB1=function(v){ initB1=parseFloat(v); document.getElementById('initB1Val').textContent=parseFloat(v).toFixed(1); if(!running){b1=initB1;gdDraw();} };

  window.initGradientDescent=function(){
    resize(); b0=initB0; b1=initB1;
    gdDraw(); drawLoss(); updateInfo();
    initialized=true;
  };

  window.addEventListener('resize',()=>{ if(initialized){resize();gdDraw();drawLoss();} });
})();
