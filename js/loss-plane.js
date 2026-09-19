/* ===================================================
   Loss Plane — Isometric 3D perspective of J(b0,b1)
   Shows the "bowl" shape of the MSE cost function
   =================================================== */
(function () {
  const canvas = document.getElementById('lossPlaneCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const DATA = [
    {x:0.5,y:4.2},{x:1.0,y:4.8},{x:2.0,y:6.5},{x:3.0,y:8.7},
    {x:4.0,y:10.5},{x:5.0,y:12.3},{x:6.0,y:13.8},{x:7.0,y:15.4},
    {x:8.0,y:17.2},{x:9.0,y:19.1},{x:10.0,y:20.8},
    {x:2.5,y:8.1},{x:4.5,y:11.2},{x:6.5,y:15.1},{x:7.5,y:16.6}
  ];

  const B0_RANGE={min:-2,max:8,steps:28};
  const B1_RANGE={min:0,max:4,steps:28};
  let W,H, angle=0.52, rotY=0.5; // view angles
  let rotateMode=false, lastMouse=null;
  let initialized=false;
  let currentB0=3,currentB1=1.8;
  let gdPath=[];
  let autoRotate=true, rotAngle=0;

  function resize(){
    const container=canvas.parentElement;
    const cw=Math.min(container.clientWidth-2,680);
    canvas.width=cw; canvas.height=Math.round(cw*0.68);
    W=canvas.width; H=canvas.height;
  }

  function computeMSE(b0,b1){
    return DATA.reduce((s,p)=>s+(p.y-(b1*p.x+b0))**2,0)/DATA.length;
  }

  // Build surface grid
  function buildSurface(){
    const {min:b0min,max:b0max,steps:nb0}=B0_RANGE;
    const {min:b1min,max:b1max,steps:nb1}=B1_RANGE;
    const grid=[];
    let minJ=Infinity, maxJ=0;
    for(let i=0;i<=nb0;i++){
      grid[i]=[];
      for(let j=0;j<=nb1;j++){
        const b0=b0min+i*(b0max-b0min)/nb0;
        const b1=b1min+j*(b1max-b1min)/nb1;
        const j_val=computeMSE(b0,b1);
        grid[i][j]={b0,b1,j:j_val};
        if(j_val<minJ) minJ=j_val;
        if(j_val>maxJ) maxJ=j_val;
      }
    }
    return {grid,minJ,maxJ,nb0,nb1};
  }

  // Isometric 3D projection
  function project3D(b0,b1,j,minJ,maxJ,rot){
    const {min:b0min,max:b0max}=B0_RANGE;
    const {min:b1min,max:b1max}=B1_RANGE;
    // Normalize to [-1,1]
    const nx=(b0-b0min)/(b0max-b0min)*2-1;
    const ny=(b1-b1min)/(b1max-b1min)*2-1;
    const nz=(j-minJ)/(maxJ-minJ+0.01);
    // Rotate around Z axis
    const cosR=Math.cos(rot), sinR=Math.sin(rot);
    const rx=nx*cosR-ny*sinR;
    const ry=nx*sinR+ny*cosR;
    // Isometric project
    const ISO_X=0.866, ISO_Y=0.5; // cos30, sin30
    const scale=Math.min(W,H)*0.32;
    const cx=W/2 + (rx*ISO_X - ry*ISO_X)*scale;
    const cy=H*0.5 + (rx*ISO_Y + ry*ISO_Y)*scale*0.6 - nz*scale*0.7;
    return {cx,cy,nz};
  }

  function faceColor(nz,shade){
    const t=Math.pow(nz,0.5);
    let r,g,b;
    if(t<0.3){ r=20+t*100; g=80+t*200; b=200-t*100; }
    else if(t<0.6){ const s=(t-0.3)/0.3; r=50+s*180; g=140+s*60; b=170-s*170; }
    else { const s=(t-0.6)/0.4; r=230+s*25; g=100-s*100; b=0; }
    r=Math.round(r*shade); g=Math.round(g*shade); b=Math.round(b*shade);
    return `rgb(${r},${g},${b})`;
  }

  function draw(){
    if(!W) return;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='rgb(6,11,20)'; ctx.fillRect(0,0,W,H);

    const {grid,minJ,maxJ,nb0,nb1}=buildSurface();

    // Sort cells back-to-front for painter's algorithm
    const cells=[];
    for(let i=0;i<nb0;i++){
      for(let j=0;j<nb1;j++){
        const pts=[grid[i][j],grid[i+1][j],grid[i+1][j+1],grid[i][j+1]];
        const avgJ=pts.reduce((s,p)=>s+p.j,0)/4;
        const proj=pts.map(p=>project3D(p.b0,p.b1,p.j,minJ,maxJ,rotAngle));
        const avgY=proj.reduce((s,p)=>s+p.cy,0)/4;
        cells.push({pts,proj,avgJ,avgY,i,j});
      }
    }
    cells.sort((a,b)=>b.avgY-a.avgY); // painter: far first

    cells.forEach(({pts,proj,avgJ})=>{
      const nz=(avgJ-minJ)/(maxJ-minJ+0.01);
      ctx.beginPath();
      proj.forEach((p,k)=>k===0?ctx.moveTo(p.cx,p.cy):ctx.lineTo(p.cx,p.cy));
      ctx.closePath();
      ctx.fillStyle=faceColor(nz,0.9);
      ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=0.5; ctx.stroke();
    });

    // Draw GD path on surface
    if(gdPath.length>1){
      ctx.strokeStyle='rgba(245,158,11,0.9)'; ctx.lineWidth=2.5;
      ctx.shadowColor='#f59e0b'; ctx.shadowBlur=6;
      ctx.beginPath();
      gdPath.forEach((pt,i)=>{
        const p=project3D(pt.b0,pt.b1,computeMSE(pt.b0,pt.b1),minJ,maxJ,rotAngle);
        i===0?ctx.moveTo(p.cx,p.cy):ctx.lineTo(p.cx,p.cy);
      });
      ctx.stroke(); ctx.shadowBlur=0;
      // endpoint
      if(gdPath.length>0){
        const last=gdPath[gdPath.length-1];
        const p=project3D(last.b0,last.b1,computeMSE(last.b0,last.b1),minJ,maxJ,rotAngle);
        ctx.beginPath(); ctx.arc(p.cx,p.cy,5,0,Math.PI*2);
        ctx.fillStyle='#f59e0b'; ctx.shadowColor='#f59e0b'; ctx.shadowBlur=12;
        ctx.fill(); ctx.shadowBlur=0;
      }
    }

    // Current point on surface
    const curJ=computeMSE(currentB0,currentB1);
    const curP=project3D(currentB0,currentB1,curJ,minJ,maxJ,rotAngle);
    ctx.beginPath(); ctx.arc(curP.cx,curP.cy,7,0,Math.PI*2);
    ctx.fillStyle='#fff'; ctx.shadowColor='#fff'; ctx.shadowBlur=16;
    ctx.fill(); ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(0,212,255,0.8)'; ctx.lineWidth=2; ctx.stroke();

    // Optimal (minimum) point
    const olsB0=2.8,olsB1=1.81; // precomputed approximation
    const optJ=computeMSE(olsB0,olsB1);
    const optP=project3D(olsB0,olsB1,optJ,minJ,maxJ,rotAngle);
    ctx.beginPath(); ctx.arc(optP.cx,optP.cy,6,0,Math.PI*2);
    ctx.fillStyle='rgba(16,185,129,0.9)'; ctx.shadowColor='#10b981'; ctx.shadowBlur=12;
    ctx.fill(); ctx.shadowBlur=0;
    ctx.strokeStyle='#10b981'; ctx.lineWidth=2; ctx.stroke();

    // Labels
    ctx.font='bold 13px Orbitron,monospace';
    ctx.fillStyle='rgba(0,212,255,0.8)'; ctx.textAlign='left';
    ctx.fillText('J(b₀, b₁) — Loss Plane', 12, 22);

    ctx.font='11px Rajdhani,sans-serif';
    ctx.fillStyle='rgba(255,255,255,0.6)';
    ctx.fillText('● Putih = posisi saat ini', 12, H-32);
    ctx.fillStyle='rgba(16,185,129,0.8)';
    ctx.fillText('● Hijau = minimum (OLS)', 12, H-18);
    ctx.fillStyle='rgba(245,158,11,0.8)';
    ctx.fillText('● Oranye = path GD', 140, H-18);

    ctx.fillStyle='rgba(200,220,240,0.5)'; ctx.textAlign='right';
    ctx.fillText('Drag untuk rotasi', W-8, H-8);
  }

  // Auto-rotate animation
  let animId=null;
  function startAutoRotate(){
    if(animId) return;
    function loop(){
      if(autoRotate) rotAngle+=0.003;
      draw();
      animId=requestAnimationFrame(loop);
    }
    loop();
  }

  // Mouse drag for manual rotation
  canvas.addEventListener('mousedown',e=>{ rotateMode=true; lastMouse={x:e.clientX,y:e.clientY}; autoRotate=false; cancelAnimationFrame(animId); animId=null; });
  canvas.addEventListener('mousemove',e=>{
    if(!rotateMode||!lastMouse) return;
    rotAngle+=(e.clientX-lastMouse.x)*0.01;
    lastMouse={x:e.clientX,y:e.clientY};
    draw();
  });
  canvas.addEventListener('mouseup',()=>{ rotateMode=false; });
  canvas.addEventListener('mouseleave',()=>{ rotateMode=false; });

  canvas.addEventListener('touchstart',e=>{ e.preventDefault(); rotateMode=true; lastMouse={x:e.touches[0].clientX,y:e.touches[0].clientY}; autoRotate=false; },{passive:false});
  canvas.addEventListener('touchmove',e=>{
    e.preventDefault();
    if(!rotateMode) return;
    rotAngle+=(e.touches[0].clientX-lastMouse.x)*0.01;
    lastMouse={x:e.touches[0].clientX,y:e.touches[0].clientY};
    draw();
  },{passive:false});
  canvas.addEventListener('touchend',()=>{ rotateMode=false; });

  // Toggle auto-rotate
  window.toggleAutoRotate = function(){
    autoRotate=!autoRotate;
    const btn=document.getElementById('btnAutoRotate');
    if(btn) btn.textContent=autoRotate?'⏸ Pause Rotasi':'▶ Auto Rotasi';
    if(autoRotate && !animId) startAutoRotate();
    else if(!autoRotate){ cancelAnimationFrame(animId); animId=null; draw(); }
  };

  // Sync from GD
  window.updateLossPlanePoint = function(b0,b1){
    currentB0=b0; currentB1=b1;
    if(initialized&&!autoRotate) draw();
  };
  window.setLossPlaneGDPath = function(path){
    gdPath=path;
    if(path.length>0){currentB0=path[path.length-1].b0;currentB1=path[path.length-1].b1;}
    if(initialized&&!autoRotate) draw();
  };

  window.initLossPlane = function(){
    resize();
    autoRotate=true;
    startAutoRotate();
    initialized=true;
  };

  window.addEventListener('resize',()=>{ if(initialized){resize();} });
})();
