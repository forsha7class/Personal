const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
$("#year").textContent=new Date().getFullYear();

const saved=localStorage.getItem("dika-theme");
if(saved==="light")document.body.classList.add("light");
$("#themeBtn")?.addEventListener("click",()=>{
  document.body.classList.toggle("light");
  localStorage.setItem("dika-theme",document.body.classList.contains("light")?"light":"dark");
});

let motionOn=!reduce;
const motionBtn=$("#motionBtn");
function syncMotionUI(){
  if(!motionBtn)return;
  const state=motionOn?"ON":"OFF";
  const label=motionOn?"Disable visual effects":"Enable visual effects";
  motionBtn.setAttribute("aria-label",label);
  motionBtn.setAttribute("title",label);
  const stateEl=motionBtn.querySelector("b");
  if(stateEl)stateEl.textContent=state;
}
function setMotion(next){
  motionOn=Boolean(next);
  document.body.classList.toggle("motion-off",!motionOn);
  if(!motionOn){
    $$(".reveal").forEach(el=>{el.classList.add("is-visible");el.style.opacity="1";el.style.transform="none";});
    $$("[data-tilt],.magnetic").forEach(el=>{el.style.transform="none";});
  }else{
    $$(".reveal").forEach(el=>{el.style.opacity="";el.style.transform="";});
  }
  syncMotionUI();
}
motionBtn?.addEventListener("click",()=>{
  setMotion(!motionOn);
  const label=motionOn?"VISUAL EFFECTS ON":"VISUAL EFFECTS OFF";
  motionBtn.setAttribute("aria-label",label);
});
syncMotionUI();

const menuBtn=$("#menuBtn"), mobileMenu=$("#mobileMenu");
const menuOpenIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
const menuCloseIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
function setMenu(open){
  if(!mobileMenu||!menuBtn)return;
  mobileMenu.classList.toggle("open",open);
  mobileMenu.setAttribute("aria-hidden",String(!open));
  menuBtn.setAttribute("aria-expanded",String(open));
  menuBtn.setAttribute("aria-label",open?"Close navigation":"Open navigation");
  menuBtn.innerHTML=open?menuCloseIcon:menuOpenIcon;
  document.body.classList.toggle("menu-open",open);
}
menuBtn?.addEventListener("click",()=>setMenu(!mobileMenu.classList.contains("open")));
$$(".mobile-menu a").forEach(a=>a.addEventListener("click",()=>setMenu(false)));
addEventListener("keydown",e=>{if(e.key==="Escape")setMenu(false)});
addEventListener("resize",()=>{if(innerWidth>980)setMenu(false)},{passive:true});
mobileMenu?.addEventListener("click",e=>{if(e.target===mobileMenu)setMenu(false)});

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
  $$(".magnetic").forEach(btn=>{
    btn.addEventListener("pointermove",e=>{
      const r=btn.getBoundingClientRect();
      const x=((e.clientX-r.left)/r.width-.5)*6;
      const y=((e.clientY-r.top)/r.height-.5)*4;
      btn.style.transform=`translate(${x}px,${y}px)`;
    });
    btn.addEventListener("pointerleave",()=>btn.style.transform="");
  });

  const art=$("[data-tilt]");
  art?.addEventListener("pointermove",e=>{
    const r=art.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width-.5;
    const y=(e.clientY-r.top)/r.height-.5;
    art.style.transform=`perspective(1200px) rotateX(${y*-1.5}deg) rotateY(${x*1.9}deg)`;
  });
  art?.addEventListener("pointerleave",()=>art.style.transform="");
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
