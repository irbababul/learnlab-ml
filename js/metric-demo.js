/* ===================================================
   Metric Demo v2 — Full metrics: MSE, RMSE, MAE, R²
   With outlier toggle, SS_res/SS_tot visual,
   side-by-side comparison bar chart
   =================================================== */
(function () {
  const canvas = document.getElementById('metricCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const PAD = { top: 32, right: 24, bottom: 52, left: 60 };

  const BASE_DATA = [
    {x:1,y:5.2},{x:2,y:7.1},{x:3,y:9.3},{x:4,y:11.0},{x:5,y:13.2},
    {x:6,y:14.8},{x:7,y:16.9},{x:8,y:18.3},{x:9,y:20.1},{x:10,y:22.0}
  ];
  // Outlier data
  const OUTLIER = {x:5, y:25};

  let errorLevel=0.3, showOutlier=false;
  let W, H, PW, PH;
  let _curLevel=0.3;

  function resize(){
    const container=canvas.parentElement;
    const cw=Math.min(container.clientWidth-2,720);
    canvas.width=cw; canvas.height=Math.round(cw*0.5);
    W=canvas.width; H=canvas.height;
    PW=W-PAD.left-PAD.right; PH=H-PAD.top-PAD.bottom;
  }

  // OLS on given dataset
  function ols(data){
    const n=data.length;
    const mx=data.reduce((s,p)=>s+p.x,0)/n;
    const my=data.reduce((s,p)=>s+p.y,0)/n;
    let num=0,den=0;
    data.forEach(p=>{num+=(p.x-mx)*(p.y-my);den+=(p.x-mx)**2;});
    if(den===0) return {b0:my,b1:0,mx,my};
    const b1=num/den,b0=my-b1*mx;
    return {b0,b1,mx,my};
  }

  function computeMetrics(data, b0, b1){
    const n=data.length;
    const my=data.reduce((s,p)=>s+p.y,0)/n;
    const errors=data.map(p=>p.y-(b1*p.x+b0));
    const mse=errors.reduce((s,e)=>s+e*e,0)/n;
    const rmse=Math.sqrt(mse);
    const mae=errors.reduce((s,e)=>s+Math.abs(e),0)/n;
    const ss_res=errors.reduce((s,e)=>s+e*e,0);
    const ss_tot=data.reduce((s,p)=>s+(p.y-my)**2,0);
    const r2=ss_tot>0?1-ss_res/ss_tot:0;
    const maxErr=Math.max(...errors.map(Math.abs));
    return {mse,rmse,mae,r2,ss_res,ss_tot,maxErr,errors,n};
  }

  function draw(level){
    if(!W) return;
    _curLevel=level;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='rgba(0,0,0,0.18)'; ctx.roundRect(0,0,W,H,12); ctx.fill();

    const data=showOutlier?[...BASE_DATA,OUTLIER]:[...BASE_DATA];
    // Add noise proportional to errorLevel
    const noisyData=data.map((p,i)=>({
      x:p.x,
      y:p.y+(Math.sin(i*5.3+1)*level*4)
    }));

    const {b0,b1,my}=ols(noisyData);
    const metrics=computeMetrics(noisyData,b0,b1);

    const xMin=0,xMax=11,yMin=0,yMax=30;
    const toCx=x=>PAD.left+(x-xMin)/(xMax-xMin)*PW;
    const toCy=y=>PAD.top+(1-(y-yMin)/(yMax-yMin))*PH;

    // Grid
    ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1;
    for(let i=0;i<=10;i++){
      ctx.beginPath(); ctx.moveTo(toCx(xMin+i),PAD.top); ctx.lineTo(toCx(xMin+i),H-PAD.bottom); ctx.stroke();
    }
    for(let i=0;i<=6;i++){
      const y=yMin+i*(yMax-yMin)/6;
      ctx.beginPath(); ctx.moveTo(PAD.left,toCy(y)); ctx.lineTo(W-PAD.right,toCy(y)); ctx.stroke();
    }
    ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(PAD.left,PAD.top); ctx.lineTo(PAD.left,H-PAD.bottom);
    ctx.lineTo(W-PAD.right,H-PAD.bottom); ctx.stroke();

    // Mean line (for R² / SS_tot)
    ctx.strokeStyle='rgba(245,158,11,0.3)'; ctx.lineWidth=1.5; ctx.setLineDash([6,4]);
    ctx.beginPath(); ctx.moveTo(toCx(xMin),toCy(my)); ctx.lineTo(toCx(xMax),toCy(my)); ctx.stroke(); ctx.setLineDash([]);

    // Regression line
    const rg=ctx.createLinearGradient(toCx(xMin),0,toCx(xMax),0);
    rg.addColorStop(0,'#00d4ff'); rg.addColorStop(1,'#8b5cf6');
    ctx.strokeStyle=rg; ctx.lineWidth=2.5; ctx.shadowColor='#00d4ff'; ctx.shadowBlur=8;
    ctx.beginPath(); ctx.moveTo(toCx(xMin),toCy(b1*xMin+b0)); ctx.lineTo(toCx(xMax),toCy(b1*xMax+b0)); ctx.stroke(); ctx.shadowBlur=0;

    // Residuals with SS visual
    noisyData.forEach((p,i)=>{
      const pred=b1*p.x+b0;
      const err=p.y-pred;
      const errPx=Math.abs(toCy(p.y)-toCy(pred));

      // SS_res square (red)
      ctx.fillStyle='rgba(239,68,68,0.06)';
      ctx.fillRect(toCx(p.x)-errPx/2,Math.min(toCy(p.y),toCy(pred)),errPx,errPx);
      // Residual line
      ctx.strokeStyle=`rgba(239,68,68,${Math.min(0.8,0.2+Math.abs(err)*0.15)})`;
      ctx.lineWidth=1.5; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(toCx(p.x),toCy(p.y)); ctx.lineTo(toCx(p.x),toCy(pred)); ctx.stroke(); ctx.setLineDash([]);

      // Outlier highlight
      if(showOutlier&&p===noisyData[noisyData.length-1]){
        ctx.beginPath(); ctx.arc(toCx(p.x),toCy(p.y),12,0,Math.PI*2);
        ctx.strokeStyle='rgba(239,68,68,0.7)'; ctx.lineWidth=2; ctx.stroke();
        ctx.fillStyle='rgba(239,68,68,0.1)'; ctx.fill();
      }

      // Data point
      ctx.beginPath(); ctx.arc(toCx(p.x),toCy(p.y),5.5,0,Math.PI*2);
      ctx.fillStyle=showOutlier&&p===noisyData[noisyData.length-1]?'#ef4444':'#00d4ff';
      ctx.shadowColor='#00d4ff'; ctx.shadowBlur=6; ctx.fill(); ctx.shadowBlur=0;
    });

    // Axis labels
    ctx.fillStyle='rgba(148,163,184,0.6)'; ctx.font='11px Rajdhani,sans-serif';
    ctx.textAlign='center'; ctx.fillText('X',PAD.left+PW/2,H-6);
    ctx.save(); ctx.translate(14,PAD.top+PH/2); ctx.rotate(-Math.PI/2); ctx.fillText('Y',0,0); ctx.restore();

    // Update metric displays
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    set('metricMSE',metrics.mse.toFixed(3));
    set('metricRMSE',metrics.rmse.toFixed(3));
    set('metricMAE',metrics.mae.toFixed(3));
    set('metricR2',metrics.r2.toFixed(3));
    set('metricSSRes',metrics.ss_res.toFixed(2));
    set('metricSSTot',metrics.ss_tot.toFixed(2));
    set('metricMaxErr',metrics.maxErr.toFixed(2));
    set('metricN',metrics.n);

    // Color code R²
    const r2El=document.getElementById('metricR2');
    if(r2El){
      r2El.style.color=metrics.r2>0.9?'var(--accent-green)':metrics.r2>0.7?'var(--accent-yellow)':'var(--accent-red)';
    }
  }

  // Bar chart for metric comparison
  function drawBarChart(){
    const bc=document.getElementById('metricBarCanvas');
    if(!bc) return;
    const bCtx=bc.getContext('2d');
    const bW=bc.width, bH=bc.height;
    bCtx.clearRect(0,0,bW,bH);
    bCtx.fillStyle='rgba(0,0,0,0.15)'; bCtx.fillRect(0,0,bW,bH);

    const data=[...BASE_DATA];
    const {b0,b1}=ols(data);
    const metrics=computeMetrics(data,b0,b1);

    // Show two scenarios: normal vs with outlier
    const dataOut=[...BASE_DATA,OUTLIER];
    const {b0:b0o,b1:b1o}=ols(dataOut);
    const metricsOut=computeMetrics(dataOut,b0o,b1o);

    const bars=[
      {label:'MSE',normal:metrics.mse,outlier:metricsOut.mse,color:'#00d4ff'},
      {label:'RMSE',normal:metrics.rmse,outlier:metricsOut.rmse,color:'#8b5cf6'},
      {label:'MAE',normal:metrics.mae,outlier:metricsOut.mae,color:'#10b981'}
    ];

    const bPAD={t:24,r:20,b:40,l:20};
    const bPW=bW-bPAD.l-bPAD.r, bPH=bH-bPAD.t-bPAD.b;
    const maxVal=Math.max(...bars.map(b=>Math.max(b.normal,b.outlier)))*1.2;
    const barW=bPW/(bars.length*3+1);

    bCtx.fillStyle='rgba(148,163,184,0.7)'; bCtx.font='10px Rajdhani,sans-serif';
    bCtx.textAlign='center';
    bCtx.fillText('Normal vs Dengan Outlier',bW/2,bPAD.t-6);

    bars.forEach((bar,i)=>{
      const x1=bPAD.l+(i*3+0.5)*barW;
      const x2=bPAD.l+(i*3+1.5)*barW;
      const h1=(bar.normal/maxVal)*bPH;
      const h2=(bar.outlier/maxVal)*bPH;

      // Normal bar
      bCtx.fillStyle=bar.color+'cc';
      bCtx.fillRect(x1,bPAD.t+bPH-h1,barW*0.9,h1);
      // Outlier bar
      bCtx.fillStyle='rgba(239,68,68,0.7)';
      bCtx.fillRect(x2,bPAD.t+bPH-h2,barW*0.9,h2);

      bCtx.fillStyle='rgba(200,220,240,0.7)';
      bCtx.fillText(bar.label,(x1+x2+barW)/2,bPAD.t+bPH+14);
      bCtx.fillStyle=bar.color+'cc';
      bCtx.fillText(bar.normal.toFixed(1),x1+barW*0.45,bPAD.t+bPH-h1-4);
      bCtx.fillStyle='rgba(239,68,68,0.8)';
      bCtx.fillText(bar.outlier.toFixed(1),x2+barW*0.45,bPAD.t+bPH-h2-4);
    });

    // Legend
    bCtx.fillStyle='rgba(148,163,184,0.7)'; bCtx.textAlign='left';
    bCtx.fillRect(bW-90,bPAD.t+5,10,10); bCtx.fillStyle='rgba(0,212,255,0.7)'; bCtx.fillRect(bW-90,bPAD.t+5,10,10);
    bCtx.fillStyle='rgba(148,163,184,0.7)'; bCtx.fillText('Normal',bW-76,bPAD.t+14);
    bCtx.fillStyle='rgba(239,68,68,0.7)'; bCtx.fillRect(bW-90,bPAD.t+22,10,10);
    bCtx.fillStyle='rgba(148,163,184,0.7)'; bCtx.fillText('+Outlier',bW-76,bPAD.t+31);
  }

  window.updateMetricDemo = function(v){
    errorLevel=parseFloat(v)/100;
    const vEl=document.getElementById('errorLevelVal');
    if(vEl) vEl.textContent=v+'%';
    draw(errorLevel);
  };
  window.toggleOutlier = function(){
    showOutlier=!showOutlier;
    const btn=document.getElementById('btnOutlier');
    if(btn){ btn.classList.toggle('active',showOutlier); btn.textContent=showOutlier?'🔴 Hapus Outlier':'🔴 Tambah Outlier'; }
    draw(_curLevel);
    drawBarChart();
    showToast(showOutlier?'Outlier ditambahkan — perhatikan MSE melonjak!':'Outlier dihapus');
  };

  window.initMetricDemo=function(){
    resize();
    draw(_curLevel);
    drawBarChart();
  };

  window.addEventListener('resize',()=>{ resize(); draw(_curLevel); drawBarChart(); });
})();
