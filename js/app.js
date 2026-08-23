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
if(boot){const finishBoot=()=>setTimeout(()=>boot.classList.add("is-done"),850);if(document.readyState==="complete")finishBoot();else addEventListener("load",finishBoot,{once:true})}

const hudIndex=$("#hudIndex"),hudName=$("#hudName");
const hudTargets=[["home","HOME"],["about","ABOUT"],["lawtech","LAW × TECH"],["projects","PROJECTS"],["thoughts","THOUGHTS"],["contact","CONTACT"]].map(([id,name])=>({el:document.getElementById(id),id,name})).filter(x=>x.el);
function updateHud(){if(!hudIndex||!hudName)return;const marker=window.scrollY+window.innerHeight*.35;let current=hudTargets[0];for(const item of hudTargets)if(item.el.offsetTop<=marker)current=item;const index=Math.max(1,hudTargets.findIndex(x=>x.id===current.id)+1);hudIndex.textContent=String(index).padStart(2,"0");hudName.textContent=current.name}
addEventListener("scroll",updateHud,{passive:true});addEventListener("resize",updateHud);updateHud();
const focusGroup=document.querySelector(".focus-group");
if(focusGroup){const cards=[...focusGroup.querySelectorAll(".project")];cards.forEach(card=>{card.addEventListener("pointerenter",()=>{focusGroup.classList.add("has-focus");card.classList.add("is-focus")});card.addEventListener("pointerleave",()=>{focusGroup.classList.remove("has-focus");card.classList.remove("is-focus")})})}

/* V19 mascot lifecycle */
const mascot=document.querySelector(".themis-mascot");
const mascotImg=mascot?.querySelector("img");
if(mascot&&mascotImg){
  const ready=()=>mascot.classList.add("is-ready");
  if(mascotImg.complete&&mascotImg.naturalWidth>0)ready();
  else mascotImg.addEventListener("load",ready,{once:true});
}
if(!reduce&&mascot){
  mascot.addEventListener("pointermove",e=>{
    const r=mascot.getBoundingClientRect();
    const nx=(e.clientX-r.left)/r.width-.5;
    const ny=(e.clientY-r.top)/r.height-.5;
    mascot.style.setProperty("--mascot-x",`${nx*4}px`);
    mascot.style.setProperty("--mascot-y",`${ny*3}px`);
    mascot.style.setProperty("--mascot-rotate",`${nx*.18}deg`);
  },{passive:true});
  mascot.addEventListener("pointerleave",()=>{
    mascot.style.setProperty("--mascot-x","0px");
    mascot.style.setProperty("--mascot-y","0px");
    mascot.style.setProperty("--mascot-rotate","0deg");
  });
}
