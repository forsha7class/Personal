const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
const motionOn=!reduce;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
$("#year").textContent=new Date().getFullYear();

const orb=$(".pointer-light");
if(!reduce&&orb)addEventListener("pointermove",e=>{
  orb.style.left=e.clientX+"px";
  orb.style.top=e.clientY+"px";
  document.documentElement.style.setProperty("--mx",e.clientX+"px");
  document.documentElement.style.setProperty("--my",e.clientY+"px");
},{passive:true});

const reveals=$$(".reveal");
if("IntersectionObserver"in window&&!reduce){
  const io=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      entry.target.style.setProperty("--reveal-delay", `${(entry.target.dataset.delay ?? 0)}ms`);
      entry.target.classList.add("is-visible");
      io.unobserve(entry.target);
    });
  },{threshold:.12,rootMargin:"0px 0px -7% 0px"});
  reveals.forEach((el,i)=>{ el.dataset.delay = String(Math.min(i * 35, 280)); io.observe(el); });
}else reveals.forEach(el=>el.classList.add("is-visible"));

const nav=$$(".nav a"), rail=$$(".rail-item");
const orderedTargetIds=["home","about","experiments","lawtech","projects","thoughts","contact"];
const navTargets=orderedTargetIds.map(id=>document.getElementById(id)).filter(Boolean);
let activeTick=0;
function updateActiveNav(){
  if(activeTick)return;
  activeTick=1;
  requestAnimationFrame(()=>{
    activeTick=0;
    const marker=innerHeight*.34;
    let current="home";
    for(const target of navTargets){
      if(target.getBoundingClientRect().top<=marker)current=target.id;
      else break;
    }
    nav.forEach(a=>a.classList.toggle("active",a.getAttribute("href")==="#"+current));
    rail.forEach(a=>a.classList.toggle("active",a.getAttribute("href")==="#"+current));
  });
}
addEventListener("scroll",updateActiveNav,{passive:true});
addEventListener("resize",updateActiveNav,{passive:true});
updateActiveNav();

if(!reduce){
  const magneticButtons=$$(".magnetic"), art=$("[data-tilt]"), cards=$$(".focus-card,.project,.tool,.contact-card"), targets=new WeakMap();
  magneticButtons.forEach(btn=>{targets.set(btn,{x:0,y:0,tx:0,ty:0});btn.addEventListener("pointermove",e=>{const s=targets.get(btn),r=btn.getBoundingClientRect();s.tx=((e.clientX-r.left)/r.width-.5)*6;s.ty=((e.clientY-r.top)/r.height-.5)*4},{passive:true});btn.addEventListener("pointerleave",()=>{const s=targets.get(btn);s.tx=0;s.ty=0})});
  art?.addEventListener("pointermove",e=>{const r=art.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;art.style.setProperty("--tilt-x",`${y*-1.35}deg`);art.style.setProperty("--tilt-y",`${x*1.75}deg`)},{passive:true});
  art?.addEventListener("pointerleave",()=>{art.style.setProperty("--tilt-x","0deg");art.style.setProperty("--tilt-y","0deg")});
  cards.forEach(card=>{card.addEventListener("pointermove",e=>{const r=card.getBoundingClientRect();card.style.setProperty("--px",`${((e.clientX-r.left)/r.width)*100}%`);card.style.setProperty("--py",`${((e.clientY-r.top)/r.height)*100}%`)},{passive:true});card.addEventListener("pointerleave",()=>{card.style.removeProperty("--px");card.style.removeProperty("--py")})});
  const animateMotion=()=>{magneticButtons.forEach(btn=>{const s=targets.get(btn);s.x+=(s.tx-s.x)*.12;s.y+=(s.ty-s.y)*.12;btn.style.transform=`translate3d(${s.x}px,${s.y}px,0)`});requestAnimationFrame(animateMotion)};requestAnimationFrame(animateMotion);
}

const type=$("#typed"), phrases=[
  'const purpose = "Build, Learn, Contribute";',
  'const focus = ["Law", "Tech", "Systems"];',
  'const rule = "Question the assumptions";'
];
if(type&&!reduce){
  let p=0,i=0,del=false;
  const loop=()=>{
    const s=phrases[p];
    type.textContent=s.slice(0,i);
    if(!del){
      i++;
      if(i>s.length){del=true;return setTimeout(loop,1150)}
    }else{
      i--;
      if(i<0){del=false;i=0;p=(p+1)%phrases.length}
    }
    setTimeout(loop,del?18:38);
  };
  loop();
}

// V4 visual polish: staggered reveals and pointer-aware card glow.
const revealSequence = $$(".reveal");
revealSequence.forEach((el, i) => {
  el.style.setProperty("--delay", `${Math.min(i * 45, 420)}ms`);
});

if (!reduce) {
  $$(".focus-card,.project,.thought,.tool").forEach(card => {
    card.addEventListener("pointermove", e => {
      const r = card.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      card.style.backgroundImage =
        `radial-gradient(circle at ${x}% ${y}%, rgba(217,173,85,.08), transparent 38%), linear-gradient(150deg,#11141a,#0d1016)`;
    });
    card.addEventListener("pointerleave", () => {
      card.style.backgroundImage = "";
    });
  });
}

const boot=$("#boot");
if(boot){const finishBoot=()=>setTimeout(()=>boot.classList.add("is-done"),4200);if(document.readyState==="complete")finishBoot();else addEventListener("load",finishBoot,{once:true})}

const hudIndex=$("#hudIndex"),hudName=$("#hudName");
const hudTargets=[["home","HOME"],["about","ABOUT"],["lawtech","LAW × TECH"],["projects","PROJECTS"],["thoughts","THOUGHTS"],["contact","CONTACT"]].map(([id,name])=>({el:document.getElementById(id),id,name})).filter(x=>x.el);
function updateHud(){if(!hudIndex||!hudName)return;const marker=window.scrollY+window.innerHeight*.35;let current=hudTargets[0];for(const item of hudTargets)if(item.el.offsetTop<=marker)current=item;const index=Math.max(1,hudTargets.findIndex(x=>x.id===current.id)+1);hudIndex.textContent=String(index).padStart(2,"0");hudName.textContent=current.name}
addEventListener("scroll",updateHud,{passive:true});addEventListener("resize",updateHud);updateHud();
const navToggle=$("#navToggle");
if(navToggle){navToggle.addEventListener("click",()=>{const open=navToggle.getAttribute("aria-expanded")==="true";navToggle.setAttribute("aria-expanded",String(!open));navToggle.setAttribute("aria-label",open?"Open menu":"Close menu");$("#siteNav")?.classList.toggle("open",!open);document.body.classList.toggle("menu-open",!open)});$$(".nav a").forEach(a=>a.addEventListener("click",()=>{navToggle.setAttribute("aria-expanded","false");navToggle.setAttribute("aria-label","Open menu");$("#siteNav")?.classList.remove("open");document.body.classList.remove("menu-open")}))}

const focusGroup=document.querySelector(".focus-group");

/* V23 decode-scramble: headings re-type from terminal glyphs on reveal. */
const GLYPHS="!<>-_\\/[]{}—=+*^?#";
const scrambleEls=$$(".scramble");
if(scrambleEls.length&&!reduce){
  const scramble=el=>{
    if(el.dataset.done||el._scrambling)return;
    const final=el.textContent, n=final.length, start=performance.now(), DUR=650;
    el._scrambling=true;el.classList.add("scrambling");
    const frame=now=>{
      const t=Math.min((now-start)/DUR,1), solved=Math.floor(t*n);
      let out="";
      for(let i=0;i<n;i++){const ch=final[i];out+=(i<solved||ch===" ")?ch:GLYPHS[(Math.random()*GLYPHS.length)|0]}
      el.textContent=out;
      if(t<1)requestAnimationFrame(frame);
      else{el.textContent=final;el.classList.remove("scrambling");el.dataset.done="1";el._scrambling=false}
    };
    requestAnimationFrame(frame);
  };
  const sio=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){scramble(e.target);sio.unobserve(e.target)}}),{threshold:.4});
  scrambleEls.forEach(el=>{const f=el.textContent;el.dataset.text=f;sio.observe(el)});
}

/* V22 mascot awakening lifecycle */
const mascot=document.querySelector(".themis-mascot");
const mascotImg=mascot?.querySelector("img");
if(mascot&&mascotImg){
  const ready=()=>{
    mascot.classList.add("is-ready");
    if(!reduce){
      mascot.classList.add("is-awakening");
      window.setTimeout(()=>mascot.classList.remove("is-awakening"),3400);
    }
  };
  if(mascotImg.complete&&mascotImg.naturalWidth>0) ready();
  else mascotImg.addEventListener("load",ready,{once:true});
}
if(!reduce&&mascot){
  const mascotTarget={x:0,y:0,rx:0,ry:0};
  let mascotFrame=0;
  const tickMascot=()=>{
    mascotTarget.x+=(mascotTarget.rx-mascotTarget.x)*.12;
    mascotTarget.y+=(mascotTarget.ry-mascotTarget.y)*.12;
    mascot.style.setProperty("--mascot-x",`${mascotTarget.x}px`);
    mascot.style.setProperty("--mascot-y",`${mascotTarget.y}px`);
    mascot.style.setProperty("--mascot-rotate",`${mascotTarget.x*.045}deg`);
    mascotFrame=requestAnimationFrame(tickMascot);
  };
  mascot.addEventListener("pointermove",e=>{
    const r=mascot.getBoundingClientRect();
    mascotTarget.rx=((e.clientX-r.left)/r.width-.5)*6;
    mascotTarget.ry=((e.clientY-r.top)/r.height-.5)*4;
    if(!mascotFrame) mascotFrame=requestAnimationFrame(tickMascot);
  },{passive:true});
  mascot.addEventListener("pointerleave",()=>{
    mascotTarget.rx=0;mascotTarget.ry=0;
  });
}

/* Hero particles follow the cursor (parallax depth per particle). */
const parts=$$(".hero-particles i");
if(!reduce&&parts.length){
  const heroEl=$(".hero");
  const target={x:0,y:0};
  const pos=parts.map(()=>({x:0,y:0}));
  heroEl?.addEventListener("pointermove",e=>{
    const r=heroEl.getBoundingClientRect();
    target.x=(e.clientX-r.left)/r.width-.5;
    target.y=(e.clientY-r.top)/r.height-.5;
  },{passive:true});
  heroEl?.addEventListener("pointerleave",()=>{target.x=0;target.y=0});
  const tick=()=>{
    parts.forEach((p,i)=>{
      const d=16+(i%4)*8;
      pos[i].x+=(target.x*d-pos[i].x)*.07;
      pos[i].y+=(target.y*d-pos[i].y)*.07;
      p.style.translate=`${pos[i].x}px ${pos[i].y}px`;
    });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
