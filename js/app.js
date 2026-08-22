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
$("#motionBtn")?.addEventListener("click",()=>{
  motionOn=!motionOn;
  document.body.classList.toggle("motion-off",!motionOn);
});

const menuBtn=$("#menuBtn"), mobileMenu=$("#mobileMenu");
menuBtn?.addEventListener("click",()=>{
  const open=mobileMenu.classList.toggle("open");
  mobileMenu.setAttribute("aria-hidden",String(!open));
  menuBtn.setAttribute("aria-expanded",String(open));
});
$$(".mobile-menu a").forEach(a=>a.addEventListener("click",()=>{
  mobileMenu.classList.remove("open");
  mobileMenu.setAttribute("aria-hidden","true");
  menuBtn?.setAttribute("aria-expanded","false");
}));
addEventListener("keydown",e=>{
  if(e.key==="Escape"){
    mobileMenu?.classList.remove("open");
    mobileMenu?.setAttribute("aria-hidden","true");
    menuBtn?.setAttribute("aria-expanded","false");
  }
});

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
      entry.target.classList.add("is-visible");
      io.unobserve(entry.target);
    });
  },{threshold:.12,rootMargin:"0px 0px -7% 0px"});
  reveals.forEach(el=>io.observe(el));
}else reveals.forEach(el=>el.classList.add("is-visible"));

const sections=$$("main section[id]"), nav=$$(".nav a"), rail=$$(".rail-item");
if("IntersectionObserver"in window){
  const secObs=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      nav.forEach(a=>a.classList.toggle("active",a.getAttribute("href")==="#"+entry.target.id));
      rail.forEach(a=>a.classList.toggle("active",a.getAttribute("href")==="#"+entry.target.id));
    });
  },{threshold:.5});
  sections.forEach(s=>secObs.observe(s));
}

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
