/* ===================================================
   MLR Math Engine
   Matrix notation, OLS derivation, feature scaling viz
   =================================================== */

/* ============================================================
   1. MATRIX VISUALIZATION — shows X, X'X, X'y, beta
   ============================================================ */
(function(){
  const cv=document.getElementById('mlrMatrixCanvas');
  if(!cv) return;
  const ctx=cv.getContext('2d');
  const D=window.MLR_DATA;
  let W,H, initDone=false, step=0;

  function resize(){
    const cw=Math.min(cv.parentElement.clientWidth-2,700);
    cv.width=cw; cv.height=Math.round(cw*0.55);
    W=cv.width; H=cv.height;
  }

  const STEPS=[
    {title:'X matrix (design matrix)', subtitle:'n baris = data, 3 kolom = [1, x1, x2]'},
    {title:"X'X (X-transpose kali X)", subtitle:'Matriks 3×3 — selalu simetris'},
    {title:"X'y (X-transpose kali y)", subtitle:'Vektor 3×1 — produk silang fitur dengan target'},
    {title:'Beta = (X\'X)⁻¹ X\'y', subtitle:'Solusi OLS — koefisien optimal'}
  ];

  function drawMatrix(x,y,rows,cols,data,title,color,maxShow=6){
    const cw=28, ch=22, pad=8;
    const W2=cols*(cw+pad)+pad*2, H2=rows*(ch+4)+30;
    const showRows=Math.min(rows,maxShow);

    // Background
    ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.roundRect(x,y,W2,H2+(showRows<rows?20:0),8); ctx.fill();
    ctx.strokeStyle=color+'66'; ctx.lineWidth=1; ctx.strokeRect(x,y,W2,H2+(showRows<rows?20:0));

    // Title
    ctx.font='bold 10px Orbitron,monospace'; ctx.fillStyle=color; ctx.textAlign='left';
    ctx.fillText(title,x,y-4);

    // Bracket
    ctx.strokeStyle=color+'aa'; ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(x+5,y+24);ctx.lineTo(x+1,y+24);ctx.lineTo(x+1,y+24+showRows*(ch+4));ctx.lineTo(x+5,y+24+showRows*(ch+4));ctx.stroke();
    ctx.beginPath();ctx.moveTo(x+W2-5,y+24);ctx.lineTo(x+W2-1,y+24);ctx.lineTo(x+W2-1,y+24+showRows*(ch+4));ctx.lineTo(x+W2-5,y+24+showRows*(ch+4));ctx.stroke();

    // Data
    ctx.font='10px Share Tech Mono,monospace'; ctx.textAlign='right';
    for(let r=0;r<showRows;r++){
      for(let c=0;c<cols;c++){
        const val=data[r]?.[c];
        const vStr=val===undefined?'?':(typeof val==='number'?val.toFixed(1):String(val));
        const cx=x+pad+c*(cw+pad)+cw, cy=y+26+r*(ch+4)+ch/2-2;
        ctx.fillStyle=color+'dd'; ctx.fillText(vStr,cx,cy);
      }
    }
    if(showRows<rows){
      ctx.fillStyle='rgba(148,163,184,0.5)'; ctx.font='10px Rajdhani,sans-serif'; ctx.textAlign='center';
      ctx.fillText(`... +${rows-maxShow} baris`,x+W2/2,y+H2-4);
    }
  }

  function draw(){
    if(!W) return;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='rgb(6,11,20)'; ctx.fillRect(0,0,W,H);

    const r=mlrOLS(D);
    const n=D.length;

    // Build matrices
    const Xmat=D.map(p=>[1,p.x1,p.x2]);
    const yVec=D.map(p=>[p.y]);
    const XtX=[[n,D.reduce((s,p)=>s+p.x1,0),D.reduce((s,p)=>s+p.x2,0)],
               [D.reduce((s,p)=>s+p.x1,0),D.reduce((s,p)=>s+p.x1**2,0),D.reduce((s,p)=>s+p.x1*p.x2,0)],
               [D.reduce((s,p)=>s+p.x2,0),D.reduce((s,p)=>s+p.x1*p.x2,0),D.reduce((s,p)=>s+p.x2**2,0)]];
    const Xty=[[D.reduce((s,p)=>s+p.y,0)],[D.reduce((s,p)=>s+p.x1*p.y,0)],[D.reduce((s,p)=>s+p.x2*p.y,0)]];
    const beta=[[r.b0],[r.b1],[r.b2]];

    const margin=16, spacing=20;

    if(step===0){
      drawMatrix(margin, 50, n, 3, Xmat, 'X (design matrix)', '#00d4ff', 7);
      ctx.font='12px Rajdhani,sans-serif'; ctx.fillStyle='rgba(200,220,240,0.7)'; ctx.textAlign='left';
      ctx.fillText('Kolom 1 = semua 1 (untuk intercept)',margin,H-60);
      ctx.fillText('Kolom 2 = nilai x1 (luas)',margin,H-44);
      ctx.fillText('Kolom 3 = nilai x2 (jarak)',margin,H-28);
      ctx.fillText('Baris = setiap data observasi (n='+n+')',margin,H-12);
    } else if(step===1){
      drawMatrix(margin, 50, 3, 3, XtX, "X'X", '#8b5cf6', 3);
      ctx.font='12px Rajdhani,sans-serif'; ctx.fillStyle='rgba(200,220,240,0.7)'; ctx.textAlign='left';
      ctx.fillText("X'X selalu simetris (entry [i,j] = entry [j,i])",margin,H-44);
      ctx.fillText("Diagonal = jumlah kuadrat masing-masing kolom X",margin,H-28);
      ctx.fillText("Invertible selama tidak ada multikolinearitas sempurna",margin,H-12);
    } else if(step===2){
      drawMatrix(margin, 50, 3, 1, Xty, "X'y", '#f59e0b', 3);
      ctx.font='12px Rajdhani,sans-serif'; ctx.fillStyle='rgba(200,220,240,0.7)'; ctx.textAlign='left';
      ctx.fillText("[0] = "+Xty[0][0].toFixed(0)+" = jumlah semua y",margin,H-44);
      ctx.fillText("[1] = "+Xty[1][0].toFixed(0)+" = jumlah x1*y",margin,H-28);
      ctx.fillText("[2] = "+Xty[2][0].toFixed(0)+" = jumlah x2*y",margin,H-12);
    } else if(step===3){
      drawMatrix(margin, 50, 3, 1, beta, "β̂ = (X'X)⁻¹ X'y", '#10b981', 3);
      ctx.font='12px Rajdhani,sans-serif'; ctx.fillStyle='rgba(200,220,240,0.7)'; ctx.textAlign='left';
      ctx.fillText("β̂₀ = "+r.b0.toFixed(3)+" (intercept)",margin,H-44);
      ctx.fillText("β̂₁ = "+r.b1.toFixed(3)+" (koef x1: luas)",margin,H-28);
      ctx.fillText("β̂₂ = "+r.b2.toFixed(3)+" (koef x2: jarak)",margin,H-12);
    }

    // Step indicator
    const stDesc=STEPS[step];
    ctx.font='bold 13px Orbitron,monospace'; ctx.fillStyle='rgba(0,212,255,0.85)'; ctx.textAlign='right';
    ctx.fillText('Step '+(step+1)+'/4: '+stDesc.title,W-16,22);
    ctx.font='12px Rajdhani,sans-serif'; ctx.fillStyle='rgba(148,163,184,0.7)';
    ctx.fillText(stDesc.subtitle,W-16,38);

    _setElMLR('mlrMatrixStep',(step+1)+'/4');
    _setElMLR('mlrMatrixTitle',stDesc.title);
  }

  window.mlrMatrixNext=function(){step=Math.min(3,step+1);draw();};
  window.mlrMatrixPrev=function(){step=Math.max(0,step-1);draw();};
  window.mlrMatrixReset=function(){step=0;draw();};
  window.initMLRMatrix=function(){resize();draw();initDone=true;};
  window.addEventListener('resize',()=>{if(initDone){resize();draw();}});
})();

/* ============================================================
   2. FEATURE SCALING VISUALIZATION
   ============================================================ */
(function(){
  const cv=document.getElementById('mlrScaleCanvas');
  if(!cv) return;
  const ctx=cv.getContext('2d');
  const D=window.MLR_DATA;
  let W,H, mode='raw', initDone=false;
  const PAD={t:36,r:20,b:48,l:64};

  function resize(){const cw=Math.min(cv.parentElement.clientWidth-2,680);cv.width=cw;cv.height=Math.round(cw*0.46);W=cv.width;H=cv.height;}

  function standardize(arr){
    const mn=arr.reduce((s,v)=>s+v,0)/arr.length;
    const sd=Math.sqrt(arr.reduce((s,v)=>s+(v-mn)**2,0)/arr.length);
    return arr.map(v=>sd>0?(v-mn)/sd:0);
  }
  function minmax(arr){const mn=Math.min(...arr),mx=Math.max(...arr);return arr.map(v=>mx>mn?(v-mn)/(mx-mn):0);}

  function draw(){
    if(!W) return;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='rgba(0,0,0,0.18)'; ctx.roundRect(0,0,W,H,10); ctx.fill();
    const PW=W-PAD.l-PAD.r, PH=H-PAD.t-PAD.b;

    let x1vals=D.map(p=>p.x1), x2vals=D.map(p=>p.x2);
    if(mode==='standardize'){x1vals=standardize(x1vals);x2vals=standardize(x2vals);}
    else if(mode==='minmax'){x1vals=minmax(x1vals);x2vals=minmax(x2vals);}

    const allX=[...x1vals,...x2vals];
    const xMin=Math.min(...allX)-0.2, xMax=Math.max(...allX)+0.2;
    const tCx=x=>PAD.l+(x-xMin)/(xMax-xMin)*PW;

    // Two strip charts
    const stripY1=PAD.t+PH*0.25, stripY2=PAD.t+PH*0.72;

    // Strip 1: x1
    ctx.fillStyle='rgba(0,212,255,0.12)'; ctx.fillRect(PAD.l,stripY1-18,PW,36);
    x1vals.forEach((v,i)=>{
      ctx.beginPath();ctx.arc(tCx(v),stripY1+(Math.sin(i*1.7)*12),5.5,0,Math.PI*2);
      ctx.fillStyle='rgba(0,212,255,0.85)';ctx.fill();
    });
    ctx.font='bold 11px Orbitron,monospace';ctx.fillStyle='rgba(0,212,255,0.8)';ctx.textAlign='left';
    ctx.fillText('x1 (luas)',PAD.l,stripY1-22);

    // Strip 2: x2
    ctx.fillStyle='rgba(139,92,246,0.12)'; ctx.fillRect(PAD.l,stripY2-18,PW,36);
    x2vals.forEach((v,i)=>{
      ctx.beginPath();ctx.arc(tCx(v),stripY2+(Math.sin(i*2.3)*12),5.5,0,Math.PI*2);
      ctx.fillStyle='rgba(139,92,246,0.85)';ctx.fill();
    });
    ctx.fillStyle='rgba(139,92,246,0.8)';ctx.fillText('x2 (jarak)',PAD.l,stripY2-22);

    // x-axis
    ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(PAD.l,H-PAD.b);ctx.lineTo(W-PAD.r,H-PAD.b);ctx.stroke();
    ctx.fillStyle='rgba(148,163,184,0.6)';ctx.font='10px Rajdhani,sans-serif';ctx.textAlign='center';
    for(let i=0;i<=6;i++){
      const v=xMin+i*(xMax-xMin)/6;
      ctx.fillText(v.toFixed(1),tCx(v),H-PAD.b+14);
    }

    // Stats
    const x1mean=x1vals.reduce((s,v)=>s+v,0)/x1vals.length;
    const x2mean=x2vals.reduce((s,v)=>s+v,0)/x2vals.length;
    const x1std=Math.sqrt(x1vals.reduce((s,v)=>s+(v-x1mean)**2,0)/x1vals.length);
    const x2std=Math.sqrt(x2vals.reduce((s,v)=>s+(v-x2mean)**2,0)/x2vals.length);

    ctx.font='11px Share Tech Mono,monospace';
    ctx.fillStyle='rgba(0,212,255,0.7)';ctx.textAlign='right';
    ctx.fillText('x1: mean='+x1mean.toFixed(2)+' std='+x1std.toFixed(2),W-PAD.r,stripY1+28);
    ctx.fillStyle='rgba(139,92,246,0.7)';
    ctx.fillText('x2: mean='+x2mean.toFixed(2)+' std='+x2std.toFixed(2),W-PAD.r,stripY2+28);

    // Mode label
    const labels={raw:'Raw (asli)',standardize:'Standardisasi (z-score)',minmax:'Min-Max Normalization'};
    ctx.font='bold 11px Orbitron,monospace';ctx.fillStyle='rgba(245,158,11,0.85)';ctx.textAlign='left';
    ctx.fillText('Mode: '+labels[mode],PAD.l,PAD.t-4);
  }

  window.mlrSetScaleMode=function(m){
    mode=m;
    document.querySelectorAll('.scale-btn').forEach(b=>b.classList.toggle('active',b.dataset.scale===m));
    draw();
  };
  window.initMLRScale=function(){resize();draw();initDone=true;};
  window.addEventListener('resize',()=>{if(initDone){resize();draw();}});
})();
