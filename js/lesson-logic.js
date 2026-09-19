/* ===================================================
   LearnLab - Lesson Logic v2
   localStorage, prev/next nav, tab tracking, reset
   Per-page override: set window.PAGE_TAB_ORDER etc
   before this script loads to customize.
   =================================================== */

const STORAGE_KEY = 'learnlab_progress';

/* ---- Default SLR config (overridable per page) ---- */
window.PAGE_TAB_ORDER = window.PAGE_TAB_ORDER || ['konsep','model','cost','derivasi','grafik','optimizer','evaluasi','quiz'];
window.PAGE_TAB_SECTIONS = window.PAGE_TAB_SECTIONS || {
  konsep:'sec-konsep', model:'sec-model', cost:'sec-cost',
  derivasi:'sec-derivasi', grafik:'sec-grafik', optimizer:'sec-optimizer',
  evaluasi:'sec-evaluasi', quiz:'sec-quiz'
};
window.PAGE_TAB_XP = window.PAGE_TAB_XP || {
  konsep:10, model:15, cost:20, derivasi:25,
  grafik:20, optimizer:40, evaluasi:20, quiz:30
};
window.PAGE_TAB_LABELS = window.PAGE_TAB_LABELS || {
  konsep:'Konsep & Intuisi', model:'Model Matematika',
  cost:'Cost Function', derivasi:'Turunan & Derivasi',
  grafik:'Grafik Regresi', optimizer:'Optimizer',
  evaluasi:'Evaluasi Model', quiz:'Quiz'
};
/* Storage key per page so progress doesn't mix */
window.PAGE_STORAGE_KEY = window.PAGE_STORAGE_KEY || STORAGE_KEY;

/* ---- helpers ---- */
function _tabs()    { return window.PAGE_TAB_ORDER; }
function _sections(){ return window.PAGE_TAB_SECTIONS; }
function _xp()      { return window.PAGE_TAB_XP; }
function _labels()  { return window.PAGE_TAB_LABELS; }
function _storeKey(){ return window.PAGE_STORAGE_KEY; }

/* ---- State ---- */
let state = {
  completedTabs:[], visitedTabs:['konsep'],
  totalXp:0, badges:[], quizScores:{}, currentTab:'konsep'
};

function saveState(){ try{ localStorage.setItem(_storeKey(), JSON.stringify(state)); }catch(e){} }
function loadState(){
  try{
    const raw=localStorage.getItem(_storeKey());
    if(raw){ const saved=JSON.parse(raw); state=Object.assign(state,saved); }
  }catch(e){}
}

/* ---- Tab Navigation ---- */
window.switchTab = function(tabId, skipSave){
  const sections=_sections();
  if(!sections[tabId]) return;

  // Hide all sections
  Object.values(sections).forEach(secId=>{
    const el=document.getElementById(secId);
    if(el) el.classList.remove('active');
  });

  // Show target
  const target=document.getElementById(sections[tabId]);
  if(target) target.classList.add('active');

  // Update chapter tab buttons
  document.querySelectorAll('.chapter-tab').forEach(t=>{
    t.classList.toggle('active', t.dataset.tab===tabId);
  });
  // Update TOC links
  document.querySelectorAll('.toc-link[data-tab]').forEach(t=>{
    t.classList.toggle('active', t.dataset.tab===tabId);
  });

  state.currentTab=tabId;

  if(!state.visitedTabs.includes(tabId)){
    state.visitedTabs.push(tabId);
    const xpMap=_xp();
    const xp=xpMap[tabId]||10;
    awardXP(xp, 'Membuka: '+(_labels()[tabId]||tabId));
  }

  updateTabVisuals();
  updatePrevNext(tabId);
  updateProgressBar();
  if(!skipSave) saveState();

  // Scroll to top
  const mc=document.getElementById('mainContent');
  if(mc) mc.scrollTo({top:0, behavior:'smooth'});

  // SLR-specific tab inits (only when functions exist)
  if(tabId==='evaluasi' && window.initMetricDemo) window.initMetricDemo();
  if(tabId==='grafik'   && window.initRegressionGraph) window.initRegressionGraph();
  if(tabId==='optimizer'){
    if(!window._optTabInited){
      window._optTabInited=true;
      setTimeout(()=>{ if(window.switchOptTab) switchOptTab('singleparam'); }, 60);
    }
    if(window.optMSE && window.OPT_OPTIMAL){
      const j=optMSE(OPT_OPTIMAL.b0,OPT_OPTIMAL.b1).toFixed(4);
      ['gsOptJ','psoOptJ'].forEach(id=>{ const e=document.getElementById(id); if(e) e.textContent=j; });
    }
  }

  // MLR-specific tab inits (only when functions exist)
  if(tabId==='konsep'    && !window._mlrCompInit  && window.initMLRComp)      { window._mlrCompInit=true;  initMLRComp(); }
  if(tabId==='model'     && !window._mlrScaleInit && window.initMLRScale)     { window._mlrScaleInit=true; initMLRScale(); }
  if(tabId==='derivasi'  && !window._mlrMxInit    && window.initMLRMatrix)    { window._mlrMxInit=true;    initMLRMatrix(); }
  if(tabId==='visual3d'  && !window._mlr3dInit    && window.initMLR3D)        { window._mlr3dInit=true;    initMLR3D(); window.awardBadge&&awardBadge('ach2','3D Explorer'); }
  if(tabId==='koefisien' && !window._mlrCfInit    && window.initMLRCoeff)     { window._mlrCfInit=true;    initMLRCoeff(); if(window.initPrediction) initPrediction(); }
  if(tabId==='evaluasi'  && !window._mlrDxInit    && window.initMLRResidPlot) {
    window._mlrDxInit=true;
    if(window.initMLRResidPlot) initMLRResidPlot();
    if(window.initMLRQQ)        initMLRQQ();
    if(window.initMLRVIF)       initMLRVIF();
    if(window.initMLRHomo)      initMLRHomo();
    window.awardBadge&&awardBadge('ach3','Diagnostician');
  }
};

function updatePrevNext(tabId){
  const tabs=_tabs(), labels=_labels();
  const idx=tabs.indexOf(tabId);
  const prevBtn=document.getElementById('btnPrev');
  const nextBtn=document.getElementById('btnNext');
  if(prevBtn){
    prevBtn.disabled=idx<=0;
    prevBtn.style.opacity=idx<=0?'0.3':'1';
    prevBtn.textContent=idx>0?('<- '+(labels[tabs[idx-1]]||tabs[idx-1])):'<- Sebelumnya';
  }
  if(nextBtn){
    const isLast=idx>=tabs.length-1;
    nextBtn.disabled=isLast;
    nextBtn.style.opacity=isLast?'0.3':'1';
    nextBtn.textContent=isLast?'Selesai [OK]':((labels[tabs[idx+1]]||tabs[idx+1])+' ->');
  }
}

window.goPrev=function(){
  const tabs=_tabs();
  const idx=tabs.indexOf(state.currentTab);
  if(idx>0) switchTab(tabs[idx-1]);
};
window.goNext=function(){
  const tabs=_tabs();
  const idx=tabs.indexOf(state.currentTab);
  if(idx<tabs.length-1){ markTabComplete(state.currentTab); switchTab(tabs[idx+1]); }
};

function markTabComplete(tabId){
  if(!state.completedTabs.includes(tabId)){
    state.completedTabs.push(tabId); updateTabVisuals(); updateProgressBar(); saveState();
  }
}

function updateTabVisuals(){
  document.querySelectorAll('.chapter-tab').forEach(t=>{
    const tid=t.dataset.tab;
    const visited=state.visitedTabs.includes(tid);
    const completed=state.completedTabs.includes(tid);
    t.classList.toggle('visited',visited);
    t.classList.toggle('completed',completed);
    let dot=t.querySelector('.tab-dot');
    if(!dot){ dot=document.createElement('span'); dot.className='tab-dot'; t.appendChild(dot); }
    dot.textContent=completed?' [v]':(visited?' .':'');
    dot.style.color=completed?'var(--accent-green)':'var(--accent-cyan)';
  });
  document.querySelectorAll('.toc-link[data-tab]').forEach(t=>{
    const tid=t.dataset.tab;
    const completed=state.completedTabs.includes(tid);
    t.classList.toggle('toc-done',completed);
    let mark=t.querySelector('.toc-mark');
    if(!mark){ mark=document.createElement('span'); mark.className='toc-mark'; t.appendChild(mark); }
    mark.textContent=completed?' [v]':'';
    mark.style.color='var(--accent-green)';
  });
}

function updateProgressBar(){
  const tabs=_tabs();
  const total=tabs.length, done=state.completedTabs.length, visited=state.visitedTabs.length;
  const pct=Math.round((done/total)*100);
  const bar=document.getElementById('progressBar');
  const pctEl=document.getElementById('progressPct');
  const sub=document.getElementById('progressSubtext');
  if(bar) bar.style.width=pct+'%';
  if(pctEl) pctEl.textContent=pct+'%';
  if(sub) sub.textContent=done+' dari '+total+' bab selesai ('+visited+' dikunjungi)';
}

/* ---- XP & Badges ---- */
function awardXP(amount, reason){
  state.totalXp+=amount; saveState();
  showXPGain(amount);
  if(reason) showToast('+'+amount+' XP - '+reason);
  updateXPBar(); checkLevelUp(amount);
}

function updateXPBar(){
  const xpFill=document.getElementById('xpFill');
  const xpVal=document.getElementById('xpVal');
  const levelEl=document.getElementById('playerLevel');
  if(!xpFill) return;
  const level=Math.floor(state.totalXp/200)+1;
  const xpInLevel=state.totalXp%200;
  const pct=(xpInLevel/200*100).toFixed(1);
  xpFill.style.width=pct+'%';
  if(xpVal) xpVal.textContent=xpInLevel+' / 200';
  if(levelEl) levelEl.textContent='Lv.'+level;
}

function checkLevelUp(lastAmount){
  const level=Math.floor(state.totalXp/200)+1;
  const prevLevel=Math.floor((state.totalXp-lastAmount)/200)+1;
  if(level>prevLevel) showToast('LEVEL UP! Sekarang Level '+level+'!', 4000);
}

window.awardBadge=function(badgeId, name){
  if(state.badges.includes(badgeId)) return;
  state.badges.push(badgeId); saveState();
  const el=document.getElementById(badgeId);
  if(el){
    el.classList.remove('locked-ach');
    el.style.background='rgba(16,185,129,0.15)';
    el.style.border='1px solid var(--accent-green)';
    el.style.borderRadius='8px';
    setTimeout(()=>{ el.style.background=''; el.style.border=''; },3000);
  }
  showToast('Badge Unlocked: '+name+'!', 4000);
};

/* ---- Derivation Step-by-Step ---- */
const derivStates={};

window.initDerivation=function(id){
  derivStates[id]={current:0, auto:false, autoTimer:null};
  const steps=document.querySelectorAll('#'+id+' .d-step');
  steps.forEach((s,i)=>{
    s.classList.toggle('d-visible', i===0);
    s.classList.toggle('d-hidden', i!==0);
  });
  updateDerivButtons(id);
};

window.derivNext=function(id){
  const ds=derivStates[id]; if(!ds) return;
  const steps=document.querySelectorAll('#'+id+' .d-step');
  if(ds.current<steps.length-1){
    ds.current++;
    steps[ds.current].classList.remove('d-hidden');
    steps[ds.current].classList.add('d-visible');
    if(window.renderMathInElement){
      window.renderMathInElement(steps[ds.current],{
        delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}]
      });
    }
  }
  updateDerivButtons(id);
  if(ds.current===steps.length-1){
    window.awardBadge('ach1','Matematikawan');
    if(!derivStates[id].xpAwarded){ awardXP(30,'Derivasi lengkap!'); derivStates[id].xpAwarded=true; }
  }
};

window.derivPrev=function(id){
  const ds=derivStates[id]; if(!ds||ds.current<=0) return;
  const steps=document.querySelectorAll('#'+id+' .d-step');
  steps[ds.current].classList.add('d-hidden');
  steps[ds.current].classList.remove('d-visible');
  ds.current--;
  updateDerivButtons(id);
};

window.derivReset=function(id){
  const ds=derivStates[id]; if(!ds) return;
  clearInterval(ds.autoTimer); ds.auto=false;
  const steps=document.querySelectorAll('#'+id+' .d-step');
  steps.forEach((s,i)=>{
    s.classList.toggle('d-visible', i===0);
    s.classList.toggle('d-hidden', i!==0);
  });
  ds.current=0; updateDerivButtons(id);
};

window.derivAutoPlay=function(id){
  const ds=derivStates[id]; if(!ds) return;
  if(ds.auto){ clearInterval(ds.autoTimer); ds.auto=false;
    const btn=document.getElementById('auto-'+id); if(btn) btn.textContent='> Auto'; return; }
  ds.auto=true;
  const btn=document.getElementById('auto-'+id); if(btn) btn.textContent='|| Pause';
  ds.autoTimer=setInterval(()=>{
    const steps=document.querySelectorAll('#'+id+' .d-step');
    if(ds.current>=steps.length-1){ clearInterval(ds.autoTimer); ds.auto=false;
      if(btn) btn.textContent='> Auto'; return; }
    derivNext(id);
  }, 1800);
};

function updateDerivButtons(id){
  const ds=derivStates[id]; if(!ds) return;
  const steps=document.querySelectorAll('#'+id+' .d-step');
  const total=steps.length;
  const prevBtn=document.getElementById('prev-'+id);
  const nextBtn=document.getElementById('next-'+id);
  const counter=document.getElementById('counter-'+id);
  if(prevBtn) prevBtn.disabled=ds.current<=0;
  if(nextBtn) nextBtn.disabled=ds.current>=total-1;
  if(counter) counter.textContent=(ds.current+1)+' / '+total;
}

/* ---- Quiz ---- */
let quizAnswered=0, quizCorrect=0;

window.answerQuiz=function(qId, el, isCorrect){
  const QUIZ_TOTAL = window.PAGE_QUIZ_TOTAL || 6;
  const opts=document.querySelectorAll('#'+qId+'opts .quiz-opt');
  const fb=document.getElementById(qId+'fb');
  if(el.dataset.answered) return;
  opts.forEach(o=>{ o.dataset.answered='1'; o.style.pointerEvents='none'; });
  if(isCorrect){
    el.classList.add('correct');
    if(fb){ fb.textContent='Benar! '+(window.getQuizExplanation?window.getQuizExplanation(qId):''); fb.className='quiz-feedback show correct-fb'; }
    quizCorrect++;
    awardXP(25,'Jawaban benar!');
  } else {
    el.classList.add('wrong');
    opts.forEach(o=>{ if(o.dataset.correct==='1') o.classList.add('correct'); });
    if(fb){ fb.textContent='Kurang tepat. '+(window.getQuizExplanation?window.getQuizExplanation(qId):''); fb.className='quiz-feedback show wrong-fb'; }
  }
  quizAnswered++;
  if(quizAnswered>=(window.PAGE_QUIZ_TOTAL||6)) setTimeout(showQuizResult,700);
};

function showQuizResult(){
  const QUIZ_TOTAL = window.PAGE_QUIZ_TOTAL || 6;
  const final=document.getElementById('quizFinal');
  const msg=document.getElementById('quizFinalMsg');
  if(!final||!msg) return;
  final.style.display='block';
  const score=Math.round((quizCorrect/QUIZ_TOTAL)*100);
  const storageKey=window.PAGE_STORAGE_KEY||STORAGE_KEY;
  state.quizScores[storageKey]=score; saveState();
  if(quizCorrect===QUIZ_TOTAL){
    msg.innerHTML='PERFECT SCORE! '+quizCorrect+'/'+QUIZ_TOTAL+' benar! +100 XP Bonus!';
    awardXP(100,'Perfect quiz score!');
    window.awardBadge&&awardBadge('ach4','Quiz Master');
  } else if(quizCorrect>=Math.ceil(QUIZ_TOTAL*0.7)){
    msg.innerHTML='Bagus! '+quizCorrect+'/'+QUIZ_TOTAL+' benar ('+score+'%).';
    window.awardBadge&&awardBadge('ach4','Quiz Master');
  } else {
    msg.innerHTML=quizCorrect+'/'+QUIZ_TOTAL+' benar. Review materi lagi dan coba ulang!';
  }
  markTabComplete('quiz');
}

/* ---- Reset Progress ---- */
window.resetProgress=function(){
  if(!confirm('Reset semua progress? XP, badge, dan tab selesai akan hilang.')) return;
  localStorage.removeItem(_storeKey());
  state={completedTabs:[],visitedTabs:['konsep'],totalXp:0,badges:[],quizScores:{},currentTab:'konsep'};
  quizAnswered=0; quizCorrect=0;
  updateXPBar(); updateProgressBar(); updateTabVisuals();
  switchTab('konsep',true);
  showToast('Progress direset!');
};

/* ---- Init on load ---- */
document.addEventListener('DOMContentLoaded',()=>{
  loadState();
  updateXPBar();
  updateTabVisuals();
  updateProgressBar();
  switchTab(state.currentTab||'konsep',true);

  // Init derivation boxes found on page
  document.querySelectorAll('.derivation-box').forEach(box=>{
    if(box.id) initDerivation(box.id);
  });

  // Restore badge visuals
  ['ach1','ach2','ach3','ach4'].forEach(id=>{
    if(state.badges.includes(id)){
      const el=document.getElementById(id);
      if(el) el.classList.remove('locked-ach');
    }
  });
});
