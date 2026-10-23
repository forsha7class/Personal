/* ============================================================
   DIKA/OS — motion layer
   Pointer-driven effects, canvas dust and text scramble.
   Every loop stops when idle, offscreen or when the tab is hidden.
   Disabled entirely under prefers-reduced-motion.
   ============================================================ */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  var finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ================================================================
     hero idle — pause canvas work and infinite CSS animations
     ================================================================ */

  var hero = document.querySelector(".hero");

  if (hero && "IntersectionObserver" in window) {
    var idleObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          hero.classList.toggle("is-idle", !entry.isIntersecting);
        });
      },
      { threshold: 0 }
    );
    idleObserver.observe(hero);
  }

  /* ================================================================
     gold dust
     ================================================================ */

  var canvas = document.querySelector(".hero-dust");

  if (hero && canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var width = 0;
    var height = 0;
    var dust = [];
    var raf = 0;
    var live = false;
    var visible = true;

    var resize = function () {
      var box = hero.getBoundingClientRect();
      width = Math.max(1, Math.round(box.width));
      height = Math.max(1, Math.round(box.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    var seed = function () {
      dust = [];
      for (var i = 0; i < 40; i++) {
        dust.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: 0.6 + Math.random() * 1.4,
          vy: -(0.05 + Math.random() * 0.16),
          drift: Math.random() * Math.PI * 2,
          speed: 0.004 + Math.random() * 0.005,
          alpha: 0.12 + Math.random() * 0.38
        });
      }
    };

    var frame = function () {
      ctx.clearRect(0, 0, width, height);

      for (var i = 0; i < dust.length; i++) {
        var p = dust[i];
        p.y += p.vy;
        p.drift += p.speed;
        p.x += Math.sin(p.drift) * 0.16;

        if (p.y < -6) {
          p.y = height + 6;
          p.x = Math.random() * width;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(233, 199, 122, " + p.alpha.toFixed(3) + ")";
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    };

    var start = function () {
      if (live || !visible) return;
      live = true;
      raf = requestAnimationFrame(frame);
    };

    var stop = function () {
      live = false;
      cancelAnimationFrame(raf);
    };

    resize();
    seed();

    if ("IntersectionObserver" in window) {
      var dustObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) start();
            else stop();
          });
        },
        { threshold: 0.05 }
      );
      dustObserver.observe(hero);
    } else {
      start();
    }

    document.addEventListener("visibilitychange", function () {
      visible = !document.hidden;
      if (visible) start();
      else stop();
    });

    var resizeTimer = 0;
    window.addEventListener(
      "resize",
      function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
          resize();
          seed();
        }, 200);
      },
      { passive: true }
    );
  }

  /* ================================================================
     hero tilt, glare and scroll skew
     ================================================================ */

  var art = document.querySelector(".hero-art");

  if (art) {
    var targetX = 0;
    var targetY = 0;
    var curX = 0;
    var curY = 0;
    var skew = 0;
    var skewTarget = 0;
    var tiltFrame = 0;

    var paint = function () {
      art.style.transform =
        "perspective(1100px) rotateX(" +
        curX.toFixed(2) +
        "deg) rotateY(" +
        curY.toFixed(2) +
        "deg) skewY(" +
        skew.toFixed(2) +
        "deg)";
    };

    var tick = function () {
      curX += (targetX - curX) * 0.11;
      curY += (targetY - curY) * 0.11;
      skew += (skewTarget - skew) * 0.09;
      skewTarget *= 0.9;

      var settled =
        Math.abs(targetX - curX) < 0.02 &&
        Math.abs(targetY - curY) < 0.02 &&
        Math.abs(skew) < 0.02 &&
        Math.abs(skewTarget) < 0.02;

      if (settled) {
        curX = targetX;
        curY = targetY;
        skew = 0;
        paint();
        tiltFrame = 0;
        return;
      }

      paint();
      tiltFrame = requestAnimationFrame(tick);
    };

    var kick = function () {
      if (!tiltFrame) tiltFrame = requestAnimationFrame(tick);
    };

    art.addEventListener(
      "pointermove",
      function (event) {
        var box = art.getBoundingClientRect();
        var px = (event.clientX - box.left) / box.width;
        var py = (event.clientY - box.top) / box.height;

        targetY = (px - 0.5) * 6;
        targetX = -(py - 0.5) * 4;

        art.style.setProperty("--px", (px * 100).toFixed(1) + "%");
        art.style.setProperty("--py", (py * 100).toFixed(1) + "%");
        kick();
      },
      { passive: true }
    );

    art.addEventListener("pointerleave", function () {
      targetX = 0;
      targetY = 0;
      kick();
    });

    var lastScroll = window.scrollY;
    var scrollSettle = 0;

    window.addEventListener(
      "scroll",
      function () {
        var now = window.scrollY;
        var delta = now - lastScroll;
        lastScroll = now;
        skewTarget = Math.max(-1.2, Math.min(1.2, delta * 0.05));
        kick();

        clearTimeout(scrollSettle);
        scrollSettle = setTimeout(function () {
          skewTarget = 0;
        }, 120);
      },
      { passive: true }
    );
  }

  /* ================================================================
     magnetic buttons
     ================================================================ */

  if (finePointer) {
    var magnets = Array.prototype.slice.call(
      document.querySelectorAll(".hero-actions .btn, .contact-actions .btn")
    );

    magnets.forEach(function (button) {
      var tx = 0;
      var ty = 0;
      var cx = 0;
      var cy = 0;
      var frameId = 0;

      var step = function () {
        cx += (tx - cx) * 0.16;
        cy += (ty - cy) * 0.16;

        if (Math.abs(tx - cx) < 0.05 && Math.abs(ty - cy) < 0.05) {
          button.style.transform = tx === 0 && ty === 0 ? "" : "translate(" + tx + "px," + ty + "px)";
          frameId = 0;
          return;
        }

        button.style.transform =
          "translate(" + cx.toFixed(2) + "px," + cy.toFixed(2) + "px)";
        frameId = requestAnimationFrame(step);
      };

      var start = function () {
        if (!frameId) frameId = requestAnimationFrame(step);
      };

      button.addEventListener(
        "pointermove",
        function (event) {
          var box = button.getBoundingClientRect();
          tx = ((event.clientX - box.left) / box.width - 0.5) * 7;
          ty = ((event.clientY - box.top) / box.height - 0.5) * 5;
          start();
        },
        { passive: true }
      );

      button.addEventListener("pointerleave", function () {
        tx = 0;
        ty = 0;
        start();
      });
    });
  }

  /* ================================================================
     card spotlight
     ================================================================ */

  var cards = Array.prototype.slice.call(
    document.querySelectorAll(".cap-card, .project-card, .stack-group")
  );

  cards.forEach(function (card) {
    var queued = false;
    var lastEvent = null;

    card.addEventListener(
      "pointermove",
      function (event) {
        lastEvent = event;
        if (queued) return;
        queued = true;

        requestAnimationFrame(function () {
          queued = false;
          var box = card.getBoundingClientRect();
          card.style.setProperty("--px", ((lastEvent.clientX - box.left) / box.width) * 100 + "%");
          card.style.setProperty("--py", ((lastEvent.clientY - box.top) / box.height) * 100 + "%");
        });
      },
      { passive: true }
    );
  });

  /* ================================================================
     magnetic nav underline
     ================================================================ */

  var nav = document.getElementById("siteNav");

  if (nav && finePointer) {
    var ink = document.createElement("span");
    ink.className = "nav-ink";
    ink.setAttribute("aria-hidden", "true");
    nav.appendChild(ink);

    var moveInk = function (link) {
      if (!link) {
        ink.style.width = "0px";
        ink.style.opacity = "0";
        return;
      }

      if (link.getAttribute("aria-current") === "page") {
        ink.style.width = "0px";
        ink.style.opacity = "0";
        return;
      }

      ink.style.opacity = "1";
      ink.style.width = link.offsetWidth + "px";
      ink.style.transform = "translateX(" + link.offsetLeft + "px)";
    };

    nav.addEventListener("pointerover", function (event) {
      var link = event.target.closest("a");
      if (link) moveInk(link);
    });

    nav.addEventListener("pointerleave", function () {
      moveInk(null);
    });

    nav.addEventListener("focusin", function (event) {
      var link = event.target.closest("a");
      if (link) moveInk(link);
    });
  }

  /* ================================================================
     cursor ring
     ================================================================ */

  if (finePointer) {
    var ring = document.createElement("div");
    ring.className = "cursor-ring";
    ring.setAttribute("aria-hidden", "true");
    document.body.appendChild(ring);

    var ringX = -100;
    var ringY = -100;
    var goalX = -100;
    var goalY = -100;
    var ringFrame = 0;
    var seen = false;

    var ringTick = function () {
      ringX += (goalX - ringX) * 0.18;
      ringY += (goalY - ringY) * 0.18;
      ring.style.transform =
        "translate3d(" + ringX.toFixed(1) + "px," + ringY.toFixed(1) + "px,0)";

      if (Math.abs(goalX - ringX) < 0.2 && Math.abs(goalY - ringY) < 0.2) {
        ringFrame = 0;
        return;
      }

      ringFrame = requestAnimationFrame(ringTick);
    };

    window.addEventListener(
      "pointermove",
      function (event) {
        goalX = event.clientX;
        goalY = event.clientY;

        if (!seen) {
          seen = true;
          ringX = goalX;
          ringY = goalY;
          ring.classList.add("is-active");
        }

        ring.classList.toggle("is-hot", Boolean(event.target.closest("a, button, input")));

        if (!ringFrame) ringFrame = requestAnimationFrame(ringTick);
      },
      { passive: true }
    );

    document.addEventListener("pointerleave", function () {
      ring.classList.remove("is-active");
    });
  }

  /* ================================================================
     heading scramble, once per heading
     ================================================================ */

  var GLYPHS = "!<>-_\\/[]{}=+*^?#";
  var headings = Array.prototype.slice.call(document.querySelectorAll(".scramble"));

  if (headings.length && "IntersectionObserver" in window) {
    var scramble = function (el) {
      var finalText = el.dataset.text || el.textContent;
      var length = finalText.length;
      var started = performance.now();
      var duration = Math.min(900, 380 + length * 22);

      el.setAttribute("aria-label", finalText);
      el.classList.add("is-scrambling");

      var run = function (now) {
        var t = Math.min((now - started) / duration, 1);
        var solved = Math.floor(t * length);
        var out = "";

        for (var i = 0; i < length; i++) {
          var ch = finalText[i];
          out +=
            i < solved || ch === " "
              ? ch
              : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }

        el.textContent = out;

        if (t < 1) {
          requestAnimationFrame(run);
        } else {
          el.textContent = finalText;
          el.classList.remove("is-scrambling");
        }
      };

      requestAnimationFrame(run);
    };

    var scrambleObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          scramble(entry.target);
          scrambleObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );

    headings.forEach(function (el) {
      el.dataset.text = el.textContent.trim();
      scrambleObserver.observe(el);
    });
  }
})();
