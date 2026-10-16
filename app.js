const state = { paper: [], showAnswers: false, lastConfig: null };
const dims = [
  {key:"difficulty", id:"difficulty-mix", sum:"sum-difficulty", items:["Easy","Medium","Hard"], defaults:[30,50,20], label:"Difficulty"},
  {key:"topic", id:"topic-mix", sum:"sum-topic", items:["Biology","Chemistry","Physics"], defaults:[40,30,30], label:"Topic"},
  {key:"type", id:"type-mix", sum:"sum-type", items:["MCQ","Short Answer","Long Answer"], defaults:[40,40,20], label:"Question type"}
];
const $ = id => document.getElementById(id);
let bank = [];
fetch("src/questions.json").then(r=>r.json()).then(data=>{bank=data; buildMixInputs(); generate();}).catch(()=>{
  $("status").innerHTML='<div class="notice error">Could not load the question bank. Open this folder through a local server (for example, <code>python -m http.server 8000</code>) instead of opening the HTML directly.</div>';
});
function buildMixInputs(){
  dims.forEach(d=>{
    $(d.id).innerHTML=d.items.map((item,i)=>`<div class="mixrow"><label for="${d.key}-${i}">${item}</label><input type="number" min="0" max="100" step="5" id="${d.key}-${i}" value="${d.defaults[i]}"></div>`).join("");
    d.items.forEach((_,i)=>$(`${d.key}-${i}`).addEventListener("input",updateSums));
  }); updateSums();
}
function readConfig(){
  const total = Math.floor(Number($("total").value));
  const mixes={};
  dims.forEach(d=>mixes[d.key]=Object.fromEntries(d.items.map((item,i)=>[item,Number($(`${d.key}-${i}`).value)])));
  return {total,mixes};
}
function updateSums(){
  const c=readConfig();
  dims.forEach(d=>{
    const sum=Object.values(c.mixes[d.key]).reduce((a,b)=>a+b,0);
    $(d.sum).textContent=`${sum}%`; $(d.sum).classList.toggle("bad",sum!==100);
  });
}
function validConfig(c){
  if(!Number.isFinite(c.total)||c.total<5||c.total>60) return "Choose a total between 5 and 60 marks.";
  for(const d of dims){
    const vals=Object.values(c.mixes[d.key]);
    if(vals.some(v=>!Number.isFinite(v)||v<0||v>100)) return `${d.label}: percentages must be between 0 and 100.`;
    if(vals.reduce((a,b)=>a+b,0)!==100) return `${d.label}: percentages must add up to 100%.`;
  }
  return "";
}
function targetFor(total,mix){return Object.fromEntries(Object.entries(mix).map(([k,p])=>[k,total*p/100]));}
function paperScore(paper,c){
  if(!paper.length) return Infinity;
  const total=paper.reduce((s,q)=>s+q.marks,0);
  let err=Math.abs(c.total-total)/Math.max(1,c.total)*5;
  for(const d of dims){
    const target=targetFor(c.total,c.mixes[d.key]);
    const actual=Object.fromEntries(d.items.map(x=>[x,0]));
    paper.forEach(q=>actual[q[d.key]]=(actual[q[d.key]]||0)+q.marks);
    err += Object.keys(target).reduce((s,k)=>s+Math.abs((actual[k]||0)-target[k]),0)/Math.max(1,c.total);
  }
  // Small penalty for repeating a topic/difficulty/type combination; encourages variety.
  const combos={}; paper.forEach(q=>{const k=[q.topic,q.difficulty,q.type].join("|");combos[k]=(combos[k]||0)+1;});
  err += Object.values(combos).reduce((s,n)=>s+Math.max(0,n-1)*.025,0);
  return err;
}
function marginal(q,paper,c){
  let gain=0;
  for(const d of dims){
    const target=targetFor(c.total,c.mixes[d.key]);
    const actual={}; d.items.forEach(x=>actual[x]=0);
    paper.forEach(x=>actual[x[d.key]]+=x.marks);
    const k=q[d.key];
    gain += Math.abs(actual[k]-target[k])-Math.abs(actual[k]+q.marks-target[k]);
    // Avoid filling a category too far beyond its target.
    gain -= Math.max(0,actual[k]+q.marks-target[k])*0.35;
  }
  return gain;
}
function searchPaper(c, locked=[]){
  const lockedIds=new Set(locked.map(q=>q.id));
  const lockedMarks=locked.reduce((s,q)=>s+q.marks,0);
  const remaining=c.total-lockedMarks;
  if(remaining<0) return {paper:locked, exact:false, score:Infinity};
  const pool=bank.filter(q=>!lockedIds.has(q.id));
  let best=null; const attempts=700;
  for(let run=0;run<attempts;run++){
    let paper=[...locked], used=new Set(lockedIds), marks=lockedMarks;
    let steps=0;
    while(marks<c.total && steps<30){
      steps++;
      const left=c.total-marks;
      const candidates=pool.filter(q=>!used.has(q.id)&&q.marks<=left);
      if(!candidates.length) break;
      const ranked=candidates.map(q=>({q, gain:marginal(q,paper,c)+Math.random()*3.2}))
        .sort((a,b)=>b.gain-a.gain);
      const shortlist=ranked.slice(0,Math.min(4,ranked.length));
      // Weighted choice among the top candidates adds exploration without fully random selection.
      const weights=shortlist.map((x,i)=>Math.max(.15,4-i));
      let r=Math.random()*weights.reduce((a,b)=>a+b,0), pick=shortlist[0].q;
      for(let i=0;i<shortlist.length;i++){r-=weights[i];if(r<=0){pick=shortlist[i].q;break;}}
      paper.push(pick); used.add(pick.id); marks+=pick.marks;
    }
    const score=paperScore(paper,c);
    const exact=marks===c.total;
    if(!best || (exact&&!best.exact) || (exact===best.exact&&score<best.score)) best={paper,exact,score};
    if(best.exact && best.score<0.2) break;
  }
  return best||{paper:locked,exact:false,score:Infinity};
}
function generate(){
  const c=readConfig(), error=validConfig(c);
  if(error){$("status").innerHTML=`<div class="notice error">${error}</div>`;return;}
  state.lastConfig=c; state.showAnswers=false;
  const result=searchPaper(c);
  state.paper=result.paper;
  renderPaper(result);
}
function summarize(paper,key,items){
  const total=paper.reduce((s,q)=>s+q.marks,0);
  return items.map(item=>({item,actual:paper.filter(q=>q[key]===item).reduce((s,q)=>s+q.marks,0),total}));
}
function renderBreakdowns(paper,c){
  $("breakdowns").innerHTML=dims.map(d=>{
    const target=targetFor(c.total,c.mixes[d.key]);
    const actual=summarize(paper,d.key,d.items);
    return `<div class="breakdown"><h3>${d.label} · marks share</h3>${actual.map(row=>{
      const targetMarks=target[row.item]||0, delta=row.actual-targetMarks;
      const pct=row.total?row.actual/row.total*100:0;
      return `<div class="brow"><span>${row.item}</span><strong>${row.actual} / ${targetMarks.toFixed(1)} marks</strong><span class="diff">${pct.toFixed(0)}% actual · ${delta>0?"+":""}${delta.toFixed(1)}</span><span class="diff" style="text-align:right">${c.mixes[d.key][row.item]}% target</span><div class="track"><div class="fill" style="width:${Math.min(100,pct)}%"></div></div></div>`;
    }).join("")}</div>`;
  }).join("");
}
function renderPaper(result=null){
  const c=state.lastConfig||readConfig(), paper=state.paper;
  const marks=paper.reduce((s,q)=>s+q.marks,0);
  const exact=marks===c.total;
  const score=paperScore(paper,c);
  $("paper-subtitle").textContent=`${paper.length} questions · ${marks} marks · General school Science`;
  $("metrics").innerHTML=`<div class="metric"><div class="big">${marks}/${c.total}</div><div class="small">Marks achieved / requested</div></div><div class="metric"><div class="big">${paper.length}</div><div class="small">Questions selected</div></div><div class="metric"><div class="big">${exact?"Best fit":"Partial"}</div><div class="small">Total-mark validation</div></div>`;
  const mixErr=dims.reduce((s,d)=>s+summarize(paper,d.key,d.items).reduce((a,row)=>a+Math.abs(row.actual-c.total*c.mixes[d.key][row.item]/100),0),0);
  let notice="";
  if(!exact) notice=`<div class="notice error">The bank could not produce exactly ${c.total} marks in this search. The current paper totals ${marks}. Try a different total or a larger question bank. Do not treat this as a valid final paper.</div>`;
  else if(mixErr>0.01) notice=`<div class="notice warn"><strong>Best-effort mix, not an exact match.</strong> The paper totals ${c.total} marks, but the bank cannot meet every requested category budget in this selection. Compare the breakdowns below; you can adjust the mix or swap a question.</div>`;
  else notice=`<div class="notice ok"><strong>All target mark budgets matched.</strong> Review the question content and answer guide before using the paper.</div>`;
  $("status").innerHTML=notice;
  renderBreakdowns(paper,c);
  $("questions").innerHTML=paper.length?paper.map((q,i)=>`<article class="question"><div class="qtop"><span class="qnum">Q${i+1}.</span><div class="qtext">${esc(q.prompt)}</div><span class="marks">${q.marks} mark${q.marks===1?"":"s"}</span></div>${q.options?`<ol class="opts" type="A">${q.options.map(o=>`<li>${esc(o)}</li>`).join("")}</ol>`:""}<div class="tags"><span class="tag">${q.topic}</span><span class="tag">${q.difficulty}</span><span class="tag">${q.type}</span></div>${state.showAnswers?`<div class="answer"><strong>Answer guide:</strong> ${esc(q.answer)}</div>`:""}<div class="qbottom"><span class="diff" style="font-size:11px">ID ${q.id}</span><button class="swap" data-swap="${q.id}">↻ Swap this question</button></div></article>`).join(""):'<div class="empty">No questions found. Try another total.</div>';
  document.querySelectorAll("[data-swap]").forEach(btn=>btn.addEventListener("click",()=>swapQuestion(btn.dataset.swap)));
}
function swapQuestion(id){
  const c=state.lastConfig, old=state.paper.find(q=>q.id===id);
  if(!old)return;
  const fixed=state.paper.filter(q=>q.id!==id);
  const used=new Set(fixed.map(q=>q.id));
  const candidates=bank.filter(q=>!used.has(q.id)&&q.marks===old.marks);
  if(!candidates.length){$("status").innerHTML='<div class="notice warn">No unused question with the same mark value is available. The current paper was left unchanged.</div>';return;}
  let best=null;
  candidates.forEach(candidate=>{
    const p=[...fixed,candidate];
    const score=paperScore(p,c);
    if(!best||score<best.score)best={candidate,score,p};
  });
  state.paper=state.paper.map(q=>q.id===id?best.candidate:q);
  // Preserve visible order.
  state.paper=[...state.paper];
  renderPaper();
  $("status").insertAdjacentHTML("afterbegin",`<div class="notice ok">Swapped ${old.id} for ${best.candidate.id}. All other questions and the total marks were preserved.</div>`);
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
$("generate").addEventListener("click",generate);
$("regen").addEventListener("click",generate);
$("answers").addEventListener("click",()=>{state.showAnswers=!state.showAnswers;$("answers").textContent=state.showAnswers?"Hide answers":"Show answers";renderPaper();});
$("print").addEventListener("click",()=>window.print());
$("total").addEventListener("input",updateSums);
