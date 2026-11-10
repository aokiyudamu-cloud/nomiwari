'use strict';
const $=id=>document.getElementById(id),KEY='nomiwari_settings_v1',HIST='nomiwari_history_v1';
const labels=['🍺 普通に飲んだ人','🍻 少し飲んだ人','🥤 飲んでない人'];
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
let s={total:'30000',counts:[3,2,1],light:15,none:30,unit:1,...read(KEY,{})};
const money=n=>n.toLocaleString('ja-JP')+'円';
function calc(){
 const t=Number(s.total),n=s.counts,rates=[1,1-s.light/100,1-s.none/100];
 if(!/^\d+$/.test(String(s.total))||!Number.isSafeInteger(t)||t<0||!Array.isArray(n)||n.length!==3||n.some(x=>!Number.isInteger(x)||x<0||x>1000)||n.reduce((a,b)=>a+b,0)===0||![s.light,s.none].every(x=>Number.isInteger(x)&&x>=0&&x<=100)||![1,10,100].includes(s.unit))return {error:'金額・人数・設定を確認してください'};
 const denom=n.reduce((a,c,i)=>a+c*rates[i],0);
 if(!denom)return {error:'全員の負担率が0%です'};
 const people=[];n.forEach((c,g)=>{for(let i=0;i<c;i++)people.push({g,ideal:t*rates[g]/denom,amount:0})});
 let rem=t;for(const p of people){p.amount=Math.floor(p.ideal/s.unit)*s.unit;rem-=p.amount}
 // Largest deficit first; deterministic tie-break by participant order.
 while(rem>=s.unit){let best=0;for(let i=1;i<people.length;i++)if(people[i].ideal-people[i].amount>people[best].ideal-people[best].amount)best=i;people[best].amount+=s.unit;rem-=s.unit}
 while(rem>0){let best=0;for(let i=1;i<people.length;i++)if(people[i].ideal-people[i].amount>people[best].ideal-people[best].amount)best=i;people[best].amount++;rem--}
 return {total:t,people,groups:n.map((count,g)=>({count,amounts:people.filter(p=>p.g===g).map(p=>p.amount)}))};
}
function summary(){const r=calc();if(r.error)return r.error;return ['🍻 飲み割り','合計：'+money(r.total),...r.groups.map((g,i)=>{const m=new Map();g.amounts.forEach(v=>m.set(v,(m.get(v)||0)+1));return labels[i]+'：'+([...m].map(([v,c])=>money(v)+' × '+c+'人').join('、')||'0人')}),'集金合計：'+money(r.people.reduce((a,p)=>a+p.amount,0))].join('\n')}
function store(){try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}}
function renderResults(){const root=$('results');root.replaceChildren();const r=calc();if(r.error){root.textContent=r.error;return}r.groups.forEach((g,i)=>{const row=document.createElement('div');row.className='line';const label=document.createElement('span');label.textContent=labels[i]+'（'+g.count+'人）';const value=document.createElement('strong');value.className='result';value.textContent=[...new Set(g.amounts)].map(money).join(' / ')||'—';row.append(label,value);root.append(row)});const note=document.createElement('p');note.className='muted';note.textContent='✓ 集金合計 '+money(r.total)+'（過不足なし）。同じ区分で金額が異なる場合は端数調整です。';root.append(note)}
function renderHistory(){const root=$('history');root.replaceChildren();const h=read(HIST,[]);if(!Array.isArray(h)||!h.length){root.textContent='履歴なし';return}h.slice(0,30).forEach(x=>{const row=document.createElement('div');row.className='line';const label=document.createElement('span');label.textContent=x.date+' '+money(Number(x.state.total));const b=document.createElement('button');b.textContent='読み込む';b.onclick=()=>{s=JSON.parse(JSON.stringify(x.state));render()};row.append(label,b);root.append(row)})}
function render(){store();$('total').value=s.total;const root=$('people');root.replaceChildren();labels.forEach((name,i)=>{const row=document.createElement('div');row.className='line';const label=document.createElement('span');label.textContent=name+' ('+(i===0?0:i===1?s.light:s.none)+'% OFF)';const buttons=document.createElement('div');const minus=document.createElement('button');minus.textContent='−';minus.disabled=s.counts[i]===0;minus.onclick=()=>{s.counts[i]--;render()};const num=document.createElement('strong');num.textContent=' '+s.counts[i]+' ';const plus=document.createElement('button');plus.textContent='＋';plus.disabled=s.counts[i]>=1000;plus.onclick=()=>{s.counts[i]++;render()};buttons.append(minus,num,plus);row.append(label,buttons);root.append(row)});$('lightDiscount').value=s.light;$('noneDiscount').value=s.none;$('lightOut').textContent=s.light+'% OFF';$('noneOut').textContent=s.none+'% OFF';$('unit').value=String(s.unit);$('warning').textContent=s.light>s.none?'少量飲酒の人の割引率が飲酒なしより高くなっています。':'';renderResults();renderHistory()}
$('total').oninput=e=>{s.total=e.target.value;store();renderResults()};
$('toggle').onclick=()=>{const show=$('settings').classList.contains('hidden');$('settings').classList.toggle('hidden',!show);$('home').classList.toggle('hidden',show);$('toggle').textContent=show?'← 戻る':'⚙ 設定'};
$('done').onclick=()=>{$('settings').classList.add('hidden');$('home').classList.remove('hidden');$('toggle').textContent='⚙ 設定'};
$('lightDiscount').oninput=e=>{s.light=Number(e.target.value);render()};$('noneDiscount').oninput=e=>{s.none=Number(e.target.value);render()};$('unit').onchange=e=>{s.unit=Number(e.target.value);render()};
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(summary());alert('コピーしました')}catch{prompt('以下をコピーしてください',summary())}};
$('share').onclick=async()=>{if(navigator.share){try{await navigator.share({title:'飲み割り',text:summary()})}catch(e){if(e.name!=='AbortError')alert('共有に失敗しました')}}else $('copy').click()};
$('save').onclick=()=>{const r=calc();if(r.error){alert(r.error);return}const h=read(HIST,[]);const list=Array.isArray(h)?h:[];list.unshift({date:new Date().toLocaleString('ja-JP'),state:JSON.parse(JSON.stringify(s))});try{localStorage.setItem(HIST,JSON.stringify(list.slice(0,30)));renderHistory();alert('履歴を保存しました')}catch{alert('保存できませんでした')}};
render();