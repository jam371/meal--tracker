const PLANS={
  main:{label:"Main Day",targets:{cal:2515,p:186,c:328,f:51},meals:[
    {name:"PRE-WORKOUT SNACK",sub:"Before training",foods:[
      ["Rice Cakes",3,"rice cake",93,2,19,1],["Honey",10,"g",32,0,8,0],["Banana",100,"g",84,1,20,0]]},
    {name:"MEAL 1",sub:"Post workout",foods:[
      ["Greek Yoghurt (0%)",150,"g",88,16,6,0],["Whey Protein",15,"g",56,14,0,0],["Blueberries",100,"g",40,1,9,0],["Honey",10,"g",32,0,8,0],["Banana",180,"g",152,2,36,0]]},
    {name:"MEAL 2",sub:"Main meal",foods:[
      ["Tuna",130,"g",141,33,0,1],["Pasta",150,"g",507,18,102,3],["Mixed salad",50,"g",8,0,2,0],["Cheese",15,"g",61,4,0,5]]},
    {name:"MEAL 3",sub:"Main meal",foods:[
      ["Rump steak cooked",180,"g",378,45,0,22],["White Potato (raw)",450,"g",360,9,81,0],["Olive Oil",5,"g",45,0,0,5],["Mixed salad",50,"g",8,0,2,0]]},
    {name:"SHAKE",sub:"Protein shake",foods:[
      ["Whey Protein",35,"g",137,32,0,1],["Whole Milk",150,"mL",93,5,7,5],["Frozen Mixed Berries",100,"g",32,1,7,0],["Honey",25,"g",76,0,19,0],["Peanut Butter",15,"g",92,3,2,8]]}
  ]},
  alt:{label:"Alternative Day",targets:{cal:2503,p:187,c:315,f:55},meals:[
    {name:"PRE-WORKOUT SNACK",sub:"Alternative option",foods:[
      ["Coco Pops",50,"g",189,3,42,1],["Almond Milk (Unsweetened)",200,"mL",22,1,0,2]]},
    {name:"MEAL 1",sub:"Alternative option",foods:[
      ["Chicken Breast (Cooked)",75,"g",105,24,0,1],["Jasmine Rice (cooked)",160,"g",255,6,51,3],["Mixed salad",50,"g",8,0,2,0]]},
    {name:"MEAL 2",sub:"Alternative option",foods:[
      ["Chicken Breast (Cooked)",130,"g",186,42,0,2],["Jasmine Rice (cooked)",300,"g",486,12,96,6],["Mixed salad",50,"g",8,0,2,0],["Cheese",10,"g",39,3,0,3]]},
    {name:"MEAL 3",sub:"Alternative option",foods:[
      ["Lean Beef Mince (Cooked)",140,"g",194,35,0,6],["Rice",125,"g",427,15,85,3],["Cheese",40,"g",166,10,0,14]]},
    {name:"SHAKE ALTERNATIVE",sub:"Alternative shake",foods:[
      ["Dark Chocolate (70%)",30,"g",173,3,11,13],["Whey Protein",35,"g",137,32,0,1],["Frozen Mixed Berries",100,"g",32,1,7,0],["Honey",25,"g",76,0,19,0]]}
  ]}
};

function normPlan(p){return p.meals.map(m=>({...m,foods:m.foods.map(x=>({name:x[0],amount:x[1],unit:x[2],cal:x[3],p:x[4],c:x[5],f:x[6]}))}))}
Object.values(PLANS).forEach(p=>p.meals=normPlan(p));

const $=id=>document.getElementById(id);
let db={days:{},weights:[],customMeals:[]};
let savePromise=null;
let saveQueued=false;
let hasUnsavedChanges=false;
function updateSaveButton(){
  const btn=$("saveDbBtn");
  if(btn) btn.disabled=!hasUnsavedChanges||Boolean(savePromise);
}
function save(){
  hasUnsavedChanges=true;
  updateSaveButton();
  try{window.dispatchEvent(new Event("mealtracker:datachange"))}catch(e){}
}
async function saveToDatabase(manual=false){
  const btn=$("saveDbBtn");
  if(!hasUnsavedChanges||savePromise)return;
  if(btn&&manual){btn.disabled=true;btn.textContent="Saving…";}
  if(savePromise) saveQueued=true;
  else savePromise=(async()=>{
    do{
      saveQueued=false;
      const res=await fetch("/api/state",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(db)});
      const data=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.error||"Database save failed");
    }while(saveQueued);
  })();
  const pendingSave=savePromise;
  try{
    await pendingSave;
    hasUnsavedChanges=false;
    if(btn&&manual){btn.textContent="Saved ✓";setTimeout(()=>{btn.textContent="Save";updateSaveButton()},1200)}
  }catch(err){
    console.error(err);
    if(btn&&manual){btn.textContent="Save failed";updateSaveButton();}
    if(manual) alert("Could not save your changes. Please try again.");
  }finally{
    if(savePromise===pendingSave){
      savePromise=null;
      updateSaveButton();
    }
  }
}
async function loadFromDatabase(){
  try{
    const res=await fetch("/api/state",{cache:"no-store"});
    const data=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error||"Database load failed");
    if(data&&typeof data==="object"){db={days:data.days||{},weights:Array.isArray(data.weights)?data.weights:[],customMeals:Array.isArray(data.customMeals)?data.customMeals:[]};}
  }catch(err){console.error(err);alert("The app could not load its Neon database data. Check your Vercel deployment and DATABASE_URL.");}
}
function dateNow(){let d=new Date();return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,10)}

$("date").value=dateNow();$("weightDate").value=dateNow();

function day(){
  const d=$("date").value;
  if(!db.days[d]) db.days[d]={slots:["main","main","main","main","main"],foods:{},notes:{},custom:[]};
  if(!db.days[d].slots){
    const old=db.days[d].plan||"main";
    db.days[d].slots=[old,old,old,old,old];
  }
  return db.days[d]
}
const TARGETS={cal:2515,p:186,c:328,f:51};
function slotPlan(mi){return PLANS[day().slots[mi]||"main"]||PLANS.main}
function foodKey(mi,fi){return `p-${mi}-${fi}`}
function scale(f,a){let r=f.amount?Number(a)/Number(f.amount):0;return {cal:f.cal*r,p:f.p*r,c:f.c*r,f:f.f*r}}
function dayTotals(onlyDone=false){
  let t={cal:0,p:0,c:0,f:0,count:0,done:0};
  const d=day();
  for(let mi=0;mi<5;mi++){
    const m=slotPlan(mi).meals[mi];
    if(!m) continue;
    m.foods.forEach((f,fi)=>{
      let s=d.foods[foodKey(mi,fi)]||{actual:f.amount,done:false};
      if(!onlyDone||s.done){let x=scale(f,s.actual);t.cal+=x.cal;t.p+=x.p;t.c+=x.c;t.f+=x.f}
      if(s.done)t.done++;t.count++;
    });
  }
  (d.custom||[]).forEach((m,i)=>m.foods.forEach((f,fi)=>{
    let s=d.foods[`c-${i}-${fi}`]||{actual:f.amount,done:false};
    if(!onlyDone||s.done){let x=scale(f,s.actual);t.cal+=x.cal;t.p+=x.p;t.c+=x.c;t.f+=x.f}
    if(s.done)t.done++;t.count++;
  }));
  return t
}
function plannedTotals(){
  let t={cal:0,p:0,c:0,f:0};
  for(let mi=0;mi<5;mi++) slotPlan(mi).meals[mi].foods.forEach(f=>{t.cal+=f.cal;t.p+=f.p;t.c+=f.c;t.f+=f.f});
  return t
}
function renderSummary(){let t=dayTotals(true),tar=TARGETS;let cards=[["Calories",t.cal,tar.cal," kcal"],["Protein",t.p,tar.p,"g"],["Carbs",t.c,tar.c,"g"],["Fat",t.f,tar.f,"g"]];$("summary").innerHTML=cards.map(x=>`<div class="card"><div class="label">${x[0]}</div><div class="metric">${Math.round(x[1])}<small> / ${x[2]}${x[3]}</small></div><div class="progress"><i style="width:${Math.min(100,x[1]/x[2]*100)}%"></i></div><div class="tiny">${Math.max(0,Math.round(x[2]-x[1]))}${x[3]} remaining</div></div>`).join("")}
function mealBlock(m,mi,custom=false){
  let d=day(), keybase=custom?`c-${mi}`:`p-${mi}`;
  let t={cal:0,p:0,c:0,f:0,done:0,count:m.foods.length};
  let rows=m.foods.map((f,fi)=>{let k=`${keybase}-${fi}`,s=d.foods[k]||{actual:f.amount,done:false},x=scale(f,s.actual);t.cal+=x.cal;t.p+=x.p;t.c+=x.c;t.f+=x.f;if(s.done)t.done++;return `<div class="row ${s.done?'done':''}"><div class="cell check"><input type="checkbox" ${s.done?'checked':''} onchange="toggle('${k}',${mi},${fi},${custom},this.checked)"></div><div class="cell"><div class="food">${f.name}</div><div class="planned">Plan: ${f.amount} ${f.unit}</div></div><div class="cell qty"><input type="number" min="0" step="1" value="${s.actual}" onchange="amount('${k}',${mi},${fi},${custom},this.value)"></div><div class="cell unit">${f.unit}</div><div class="cell num">${Math.round(x.cal)}</div><div class="cell num">${Math.round(x.p)}g</div><div class="cell num">${Math.round(x.c)}g</div><div class="cell num">${Math.round(x.f)}g</div></div>`}).join("");
  return `<section class="meal"><div class="mealhead"><div class="mealname">${m.name}<span>${m.sub||"Additional meal"} · ${t.done}/${t.count} foods eaten</span></div><div class="mealstats"><span><b>${Math.round(t.cal)}</b> kcal</span><span>P <b>${Math.round(t.p)}g</b></span><span>C <b>${Math.round(t.c)}g</b></span><span>F <b>${Math.round(t.f)}g</b></span></div></div><div class="mealbody"><div class="row head"><div></div><div class="cell">Food</div><div class="cell">Actual</div><div class="cell">Unit</div><div class="cell">Cals</div><div class="cell">Pro</div><div class="cell">Cho</div><div class="cell">Fat</div></div>${rows}</div><div class="mealfoot"><div class="note"><input placeholder="Meal note (optional)" value="${esc(day().notes[keybase]||"")}" onchange="note('${keybase}',this.value)"></div><span class="pill">${custom?"ADDITIONAL MEAL":"PLANNED MEAL"}</span></div></section>`
}
function renderLog(){
  renderSummary();
  let d=day();
  let base="";
  for(let i=0;i<5;i++){
    let m=slotPlan(i).meals[i];
    base+=mealBlockWithChoice(m,i);
  }
  $("mealList").innerHTML=base+(d.custom||[]).map((m,i)=>mealBlock(m,i,true)).join("");
}
function mealBlockWithChoice(m,mi){
  let choice=day().slots[mi]||"main";
  let selector=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
    <span class="label">Meal option</span>
    <select onchange="changeSlot(${mi},this.value)" style="padding:6px 8px;border:1px solid var(--line);border-radius:7px;background:white;font-weight:800;color:var(--navy)">
      <option value="main" ${choice==="main"?"selected":""}>Main</option>
      <option value="alt" ${choice==="alt"?"selected":""}>Alternative</option>
    </select>
  </div>`;
  return `<div>${selector}${mealBlock(m,mi,false)}</div>`;
}
function changeSlot(mi,value){
  let d=day();
  d.slots[mi]=value;
  // Only clear this meal slot when switching between Main and Alternative.
  // Other meals on the same day keep their logged quantities and completion.
  const prefix=`p-${mi}-`;
  Object.keys(d.foods).forEach(k=>{if(k.startsWith(prefix)) delete d.foods[k]});
  delete d.notes[prefix.slice(0,-1)];
  save();
  renderLog();
}
function esc(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function toggle(k,mi,fi,custom,v){let d=day();let f=(custom?d.custom[mi].foods:slotPlan(mi).meals[mi].foods)[fi];d.foods[k]={actual:d.foods[k]?.actual??f.amount,done:v};save();renderLog()}
function amount(k,mi,fi,custom,v){let d=day();let f=(custom?d.custom[mi].foods:slotPlan(mi).meals[mi].foods)[fi];d.foods[k]={actual:Math.max(0,Number(v)||0),done:d.foods[k]?.done||false};save();renderLog()}
function note(k,v){day().notes[k]=v;save()}
function markAll(){let d=day();for(let mi=0;mi<5;mi++){let m=slotPlan(mi).meals[mi];m.foods.forEach((f,fi)=>{let k=foodKey(mi,fi);d.foods[k]={actual:d.foods[k]?.actual??f.amount,done:true}})}(d.custom||[]).forEach((m,mi)=>m.foods.forEach((f,fi)=>{let k=`c-${mi}-${fi}`;d.foods[k]={actual:d.foods[k]?.actual??f.amount,done:true}}));save();renderLog()}
function resetDay(){if(!confirm("Reset this day's logged foods and notes?"))return;let d=day();d.foods={};d.notes={};save();renderLog()}
$("date").onchange=async()=>{await loadFromDatabase();day();renderLog()}

document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".panel").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.tab).classList.add("active");if(b.dataset.tab==="history")renderHistory();if(b.dataset.tab==="weight")renderWeight();if(b.dataset.tab==="meals")renderCustomMeals()});

function loggedDates(){return Object.keys(db.days).sort()}
function adherenceFor(date){
  const d=db.days[date]; if(!d)return 0;
  let total=0,done=0;
  for(let mi=0;mi<5;mi++){
    const plan=PLANS[d.slots?.[mi]||d.plan||"main"];
    const m=plan?.meals?.[mi]; if(!m) continue;
    m.foods.forEach((f,fi)=>{total++;if(d.foods?.[`p-${mi}-${fi}`]?.done)done++});
  }
  (d.custom||[]).forEach((m,mi)=>m.foods.forEach((f,fi)=>{total++;if(d.foods?.[`c-${mi}-${fi}`]?.done)done++}));
  return total?done/total*100:0;
}
function historyEntry(date){
  const d=db.days[date];
  let t={cal:0,p:0,c:0,f:0,count:0,done:0};
  for(let mi=0;mi<5;mi++){
    const plan=PLANS[d.slots?.[mi]||d.plan||"main"];
    const m=plan?.meals?.[mi]; if(!m) continue;
    m.foods.forEach((f,fi)=>{
      const state=d.foods?.[`p-${mi}-${fi}`]||{actual:f.amount,done:false};
      if(state.done){const x=scale(f,state.actual);t.cal+=x.cal;t.p+=x.p;t.c+=x.c;t.f+=x.f;t.done++;}
      t.count++;
    });
  }
  (d.custom||[]).forEach((m,mi)=>m.foods.forEach((f,fi)=>{
    const state=d.foods?.[`c-${mi}-${fi}`]||{actual:f.amount,done:false};
    if(state.done){const x=scale(f,state.actual);t.cal+=x.cal;t.p+=x.p;t.c+=x.c;t.f+=x.f;t.done++;}
    t.count++;
  }));
  return {date,d,t,ad:t.count?t.done/t.count*100:0,planLabel:[...new Set((d.slots||[]).map(x=>x==="alt"?"Alternative":"Main"))].join(" + ")||"Main"};
}
function streakStats(){
  const dates=new Set(loggedDates());
  let cur=0, best=0, run=0;
  const today=new Date($("date").value+'T00:00:00');
  for(let i=0;i<3660;i++){
    const d=new Date(today); d.setDate(today.getDate()-i);
    const key=d.toISOString().slice(0,10);
    if(dates.has(key)){cur++;} else {break;}
  }
  const all=loggedDates();
  for(let i=0;i<all.length;i++){
    if(i===0 || (new Date(all[i]+'T00:00:00')-new Date(all[i-1]+'T00:00:00'))===86400000) run++; else run=1;
    best=Math.max(best,run);
  }
  return {current:cur,best};
}
function renderHistory(){
  let dates=loggedDates(), recent=dates.slice(-7), entries=dates.slice().reverse().map(historyEntry), st=streakStats();
  let rows=entries.map(e=>`<tr><td>${e.date}</td><td>${e.planLabel}</td><td>${e.t.done}/${e.t.count}</td><td>${Math.round(e.t.cal)}</td><td>${Math.round(e.t.p)}g</td><td>${Math.round(e.t.c)}g</td><td>${Math.round(e.t.f)}g</td><td class="${e.ad>=80?'good':''}">${Math.round(e.ad)}%</td></tr>`).join("");
  let avg=recent.length?recent.reduce((a,d)=>a+adherenceFor(d),0)/recent.length:0;
  $("historySummary").innerHTML=`<div class="card"><div class="label">Days logged</div><div class="metric">${dates.length}</div><div class="tiny">All-time saved days</div></div><div class="card"><div class="label">7-day adherence</div><div class="metric">${Math.round(avg)}%</div><div class="tiny">${recent.length} day${recent.length===1?'':'s'} with logs</div></div><div class="card"><div class="label">Best day</div><div class="metric">${dates.length?Math.round(Math.max(...dates.map(adherenceFor))):0}%</div><div class="tiny">Highest food completion</div></div><div class="card"><div class="label">Daily target</div><div class="metric" style="font-size:20px">2,515 kcal</div><div class="tiny">Same target for every meal combination</div></div>`;
  $("streakCard").innerHTML=`<div style="display:flex;justify-content:space-between;gap:20px;align-items:center;flex-wrap:wrap"><div><div class="label">🔥 Current logging streak</div><div class="metric">${st.current} day${st.current===1?'':'s'}</div><div class="tiny">Log at least one meal on consecutive calendar days to keep it going.</div></div><div style="text-align:right"><div class="label">Longest streak</div><div class="metric">${st.best} day${st.best===1?'':'s'}</div><div class="tiny">Your best run so far</div></div></div>`;
  $("historyRows").innerHTML=rows||`<tr><td colspan="8" class="empty">No logged days yet. Start ticking off foods in Daily Log.</td></tr>`;
  drawBarChart("adherenceChart",recent.map(d=>({label:d.slice(5),value:adherenceFor(d)})),"Adherence","%");
}
function drawBarChart(id,data,title,suffix){let el=$(id);if(!data.length){el.innerHTML='<div class="chart-empty">Your weekly consistency chart will appear here once you log days.</div>';return}let W=el.clientWidth||800,H=300,pad={l:42,r:18,t:28,b:42},cw=W-pad.l-pad.r,ch=H-pad.t-pad.b,max=100;let bw=Math.max(12,cw/data.length*.55);let bars=data.map((d,i)=>{let x=pad.l+(i+.5)*cw/data.length-bw/2,h=d.value/max*ch,y=pad.t+ch-h;return `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="5" fill="#0b6aa6"/><text x="${x+bw/2}" y="${y-7}" text-anchor="middle" font-size="11" font-weight="800" fill="#183042">${Math.round(d.value)}${suffix}</text><text x="${x+bw/2}" y="${pad.t+ch+24}" text-anchor="middle" font-size="11" fill="#6b7d8b">${esc(d.label)}</text>`}).join("");el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><text x="${pad.l}" y="17" font-size="12" font-weight="900" fill="#063f66">${title}</text><line x1="${pad.l}" y1="${pad.t+ch}" x2="${W-pad.r}" y2="${pad.t+ch}" stroke="#ccd8e1"/>${bars}</svg>`}
function renderWeight(){let w=db.weights.slice().sort((a,b)=>a.date.localeCompare(b.date));let vals=w.map(x=>x.weight);let current=vals.at(-1),first=vals[0],change=(current!=null&&first!=null?current-first:0);$("weightStats").innerHTML=`<div class="card"><div class="label">Latest weight</div><div class="metric">${current!=null?current.toFixed(1):"—"}<small> kg</small></div><div class="tiny">${w.length?formatDate(w.at(-1).date):"No entries yet"}</div></div><div class="card"><div class="label">Change since first</div><div class="metric">${w.length>1?(change>0?"+":"")+change.toFixed(1):"—"}<small> kg</small></div><div class="tiny">Based on saved entries</div></div><div class="card"><div class="label">Highest</div><div class="metric">${vals.length?Math.max(...vals).toFixed(1):"—"}<small> kg</small></div></div><div class="card"><div class="label">Lowest</div><div class="metric">${vals.length?Math.min(...vals).toFixed(1):"—"}<small> kg</small></div></div>`;
 drawLineChart("weightChart",w.map(x=>({label:x.date.slice(5),value:x.weight})));
 $("weightRows").innerHTML=w.slice().reverse().map((x,i)=>{let idx=w.findIndex(y=>y===x),prev=idx>0?w[idx-1].weight:null;let ch=prev==null?"—":((x.weight-prev)>0?"+":"")+(x.weight-prev).toFixed(1)+" kg";return `<tr><td>${x.date}</td><td><b>${Number(x.weight).toFixed(1)} kg</b></td><td>${ch}</td><td>${esc(x.note)}</td><td><button class="btn danger" onclick="deleteWeight(${db.weights.indexOf(x)})">Delete</button></td></tr>`}).join("")||`<tr><td colspan="5" class="empty">No weight entries yet.</td></tr>`;
}
function drawLineChart(id,data){let el=$(id);if(!data.length){el.innerHTML='<div class="chart-empty">Add your first weight to start the trend.</div>';return}let W=el.clientWidth||800,H=300,pad={l:45,r:20,t:25,b:42},cw=W-pad.l-pad.r,ch=H-pad.t-pad.b,min=Math.min(...data.map(x=>x.value)),max=Math.max(...data.map(x=>x.value));if(min===max){min-=1;max+=1}let pts=data.map((d,i)=>{let x=pad.l+(data.length===1?cw/2:i*cw/(data.length-1)),y=pad.t+(max-d.value)/(max-min)*ch;return [x,y,d]});let path=pts.map((p,i)=>(i?"L":"M")+p[0]+" "+p[1]).join(" ");let circles=pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="#0b6aa6"/><text x="${p[0]}" y="${p[1]-10}" text-anchor="middle" font-size="11" font-weight="800" fill="#183042">${p[2].value.toFixed(1)}</text><text x="${p[0]}" y="${pad.t+ch+25}" text-anchor="middle" font-size="10" fill="#6b7d8b">${esc(p[2].label)}</text>`).join("");el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><line x1="${pad.l}" y1="${pad.t+ch}" x2="${W-pad.r}" y2="${pad.t+ch}" stroke="#ccd8e1"/><path d="${path}" fill="none" stroke="#0b6aa6" stroke-width="3"/>${circles}</svg>`}
function addWeight(){let v=Number($("weightValue").value);if(!v)return alert("Enter a weight.");db.weights.push({date:$("weightDate").value||dateNow(),weight:v,note:$("weightNote").value.trim()});db.weights.sort((a,b)=>a.date.localeCompare(b.date));save();$("weightValue").value="";$("weightNote").value="";renderWeight()}
function deleteWeight(i){db.weights.splice(i,1);save();renderWeight()}
function formatDate(s){return new Date(s+"T00:00:00").toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"})}

function saveCustomMeal(){
 let name=$("cmName").value.trim(),food=$("cmFood").value.trim(),amount=Number($("cmAmount").value),unit=$("cmUnit").value.trim(),cal=Number($("cmCal").value),p=Number($("cmP").value),c=Number($("cmC").value),f=Number($("cmF").value);
 if(!name||!food||!amount||!unit)return alert("Please enter a meal name, food, amount and unit.");
 let meal=db.customMeals.find(x=>x.name===name);if(!meal){meal={name,sub:"Custom meal",foods:[]};db.customMeals.push(meal)}
 meal.foods.push({name:food,amount,unit,cal,p,c,f});save();["cmName","cmFood","cmAmount","cmUnit","cmCal","cmP","cmC","cmF"].forEach(id=>$(id).value="");renderCustomMeals()
}
function renderCustomMeals(){$("customMeals").innerHTML=db.customMeals.map((m,i)=>`<div class="custommeal"><div><h3>${esc(m.name)}</h3><p>${m.foods.map(f=>`${esc(f.name)} (${f.amount}${esc(f.unit)})`).join(" · ")}</p></div><div class="buttons"><button class="btn primary" onclick="addCustomToToday(${i})">Add to today's log</button><button class="btn danger" onclick="deleteCustom(${i})">Delete</button></div></div>`).join("")||'<div class="empty">No additional meals saved yet.</div>'}
function addCustomToToday(i){let d=day();d.custom=d.custom||[];let copy=JSON.parse(JSON.stringify(db.customMeals[i]));d.custom.push(copy);save();alert(`${copy.name} added to ${d.date||$("date").value}.`);renderLog()}
function deleteCustom(i){if(confirm("Delete this saved additional meal?")){db.customMeals.splice(i,1);save();renderCustomMeals()}}

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js").catch(()=>{}));
}
init();
window.addEventListener("mealtracker:datachange",()=>{if(document.getElementById("history").classList.contains("active"))renderHistory();});
async function init(){await loadFromDatabase();day();renderLog()}
