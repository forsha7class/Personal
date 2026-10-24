/* ============================================================
   DIKA/OS — adaptive 3D hero
   Scans the device first, then picks a render mode and drives a
   layered camera choreography on the model-viewer element.

     full    entrance + idle drift + breathing + pointer + scroll + drag
     lite    entrance + a slow sway, no pointer or scroll coupling
     still   3D is shown but nothing animates (it can still be dragged)
     poster  no 3D at all — the static poster only

   The scanner runs in two stages: a cheap pre-flight before anything is
   fetched, then a real frame-timing probe once the model is up. A device
   that measures badly is downgraded one step and the verdict is kept for
   the session.

   Every loop stops when the hero leaves the viewport or the tab is
   hidden. Reduced motion and data-saver never load the model at all.
   ============================================================ */
(function () {
  "use strict";

  var art = document.querySelector(".hero-art");
  if (!art) return;

  var MODULE = "/assets/vendor/model-viewer.min.js";
  var STORE_KEY = "dika.renderMode";
  var ORDER = ["full", "lite", "still", "poster"];
  var TAU = Math.PI * 2;
  var RAD = 180 / Math.PI;

  var model = null;
  var mode = "poster";
  var onScreen = true;
  var raf = 0;
  var paused = false;
  var pauseUntil = 0;
  var lastWrite = 0;
  var scrollT = 0;
  var t0 = 0;
  var base = { theta: 24, phi: 76, radius: 1.05, targetY: 0.27 };
  var pointer = { t: 0, p: 0, tt: 0, pt: 0 };
  var inputsReady = false;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(pointer: fine)").matches;

  var probeText = art.querySelector("[data-probe-text]");

  /* ------------------------------------------------------------------ */
  /* helpers                                                             */
  /* ------------------------------------------------------------------ */

  function clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
  }

  function easeOutCubic(x) {
    var i = 1 - x;
    return 1 - i * i * i;
  }

  function say(text) {
    if (probeText) probeText.textContent = text;
  }

  function readCache() {
    try {
      var value = sessionStorage.getItem(STORE_KEY);
      return value && ORDER.indexOf(value) !== -1 ? value : null;
    } catch (error) {
      return null;
    }
  }

  function writeCache(value) {
    try {
      sessionStorage.setItem(STORE_KEY, value);
    } catch (error) {
      /* private mode — re-scan next time */
    }
  }

  function downgrade(value) {
    var i = ORDER.indexOf(value);
    return ORDER[clamp(i + 1, 0, ORDER.length - 1)];
  }

  /* ------------------------------------------------------------------ */
  /* stage A — pre-flight (nothing is fetched yet)                        */
  /* ------------------------------------------------------------------ */

  function readRenderer() {
    try {
      var canvas = document.createElement("canvas");
      var gl = canvas.getContext("webgl2");
      if (!gl) return { webgl: false, renderer: "" };
      var ext = gl.getExtension("WEBGL_debug_renderer_info");
      var name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "";
      return { webgl: true, renderer: String(name || "") };
    } catch (error) {
      return { webgl: false, renderer: "" };
    }
  }

  function preflight() {
    if (reduce) return "poster";

    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      if (conn.saveData === true) return "poster";
      if (/^(slow-2g|2g)$/.test(String(conn.effectiveType || ""))) return "poster";
    }

    var gpu = readRenderer();
    if (!gpu.webgl) return "poster";
    if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(gpu.renderer)) return "poster";

    var memory = navigator.deviceMemory;
    var cores = navigator.hardwareConcurrency;
    if ((typeof memory === "number" && memory <= 2) || (typeof cores === "number" && cores <= 2)) {
      return "lite";
    }

    return "full";
  }

  /* ------------------------------------------------------------------ */
  /* stage B — frame-timing probe                                        */
  /* ------------------------------------------------------------------ */

  function measure(durationMs) {
    return new Promise(function (resolve) {
      var times = [];
      var start = performance.now();
      var last = start;

      function tick(now) {
        var delta = now - last;
        last = now;
        if (delta > 0 && delta < 200) times.push(delta);
        if (now - start < durationMs) {
          requestAnimationFrame(tick);
        } else {
          resolve(times);
        }
      }

      requestAnimationFrame(tick);
    });
  }

  function stats(times) {
    if (!times.length) return { fps: 60, jank: 0 };
    var sorted = times.slice().sort(function (a, b) {
      return a - b;
    });
    var median = sorted[Math.floor(sorted.length / 2)];
    var jank = times.filter(function (t) {
      return t > 33;
    }).length / times.length;
    return { fps: 1000 / median, jank: jank };
  }

  function weak(times) {
    var result = stats(times);
    return result.fps < 45 || result.jank > 0.15;
  }

  /* ------------------------------------------------------------------ */
  /* mode switching                                                      */
  /* ------------------------------------------------------------------ */

  function setMode(next) {
    mode = next;
    art.setAttribute("data-render", next);
    schedule();
  }

  function finish(finalMode) {
    art.classList.remove("is-probing");
    art.classList.add("is-resolved");
    say("RENDER · " + finalMode.toUpperCase());
    setTimeout(function () {
      art.classList.remove("is-resolved");
    }, 3200);
  }

  /* ------------------------------------------------------------------ */
  /* camera choreography                                                 */
  /* ------------------------------------------------------------------ */

  function readBase() {
    try {
      var orbit = model.getCameraOrbit();
      base.theta = clamp(orbit.theta * RAD, -70, 80);
      base.phi = clamp(orbit.phi * RAD, 64, 90);
      base.radius = clamp(orbit.radius, 0.8, 1.6);
      var target = model.getCameraTarget();
      base.targetY = target.y;
    } catch (error) {
      /* keep the defaults */
    }
  }

  function syncBase() {
    readBase();
    pointer.t = 0;
    pointer.tt = 0;
    pointer.p = 0;
    pointer.pt = 0;
  }

  function apply(now) {
    var t = now - t0;
    var enter = easeOutCubic(clamp(t / 1200, 0, 1));

    var swayTheta = 0;
    var swayPhi = 0;
    var swayRadius = 0;
    var floatY = 0;

    if (mode === "full") {
      swayTheta = 18 * Math.sin((t / 24000) * TAU);
      swayPhi = 4 * Math.sin((t / 31000) * TAU);
      swayRadius = 0.03 * Math.sin((t / 27000) * TAU);
      floatY = 0.02 * Math.sin((t / 9000) * TAU);
    } else {
      swayTheta = 26 * Math.sin((t / 34000) * TAU);
    }

    var pointerTheta = mode === "full" ? pointer.t : 0;
    var pointerPhi = mode === "full" ? pointer.p : 0;
    var scrollTheta = mode === "full" ? -10 * scrollT : 0;
    var scrollPhi = mode === "full" ? 8 * scrollT : 0;
    var scrollRadius = mode === "full" ? 0.12 * scrollT : 0;

    var theta = base.theta + (-25 + swayTheta * enter) * (1 - enter) + swayTheta * enter;
    var phi = base.phi + (-6 + swayPhi * enter) * (1 - enter) + swayPhi * enter;
    var radius = base.radius + 1.35 * (1 - enter) + base.radius * swayRadius * enter;

    theta += pointerTheta + scrollTheta;
    phi += pointerPhi + scrollPhi;
    radius += scrollRadius;

    model.cameraOrbit = theta.toFixed(2) + "deg " + phi.toFixed(2) + "deg " + radius.toFixed(3) + "m";
    model.cameraTarget = "0m " + (base.targetY + floatY * enter).toFixed(4) + "m 0m";
  }

  function canRun() {
    return (
      !!model &&
      mode !== "poster" &&
      mode !== "still" &&
      onScreen &&
      !document.hidden
    );
  }

  function loop(now) {
    raf = 0;

    if (!canRun()) return;

    if (paused && now < pauseUntil) {
      raf = requestAnimationFrame(loop);
      return;
    }

    if (paused) {
      paused = false;
      syncBase();
      t0 = now;
    }

    var minDelta = mode === "lite" ? 50 : 33;
    if (now - lastWrite >= minDelta) {
      lastWrite = now;
      pointer.t += (pointer.tt - pointer.t) * 0.06;
      pointer.p += (pointer.pt - pointer.p) * 0.06;
      apply(now);
    }

    raf = requestAnimationFrame(loop);
  }

  function schedule() {
    if (canRun()) {
      if (!raf) raf = requestAnimationFrame(loop);
    } else if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  /* ------------------------------------------------------------------ */
  /* input                                                               */
  /* ------------------------------------------------------------------ */

  function attachInputs() {
    if (inputsReady) return;
    inputsReady = true;

    if (fine) {
      art.addEventListener("pointermove", function (event) {
        if (mode !== "full") return;
        var box = art.getBoundingClientRect();
        var nx = (event.clientX - box.left) / box.width - 0.5;
        var ny = (event.clientY - box.top) / box.height - 0.5;
        pointer.tt = clamp(nx * 16, -9, 9);
        pointer.pt = clamp(ny * 10, -6, 6);
      });
      art.addEventListener("pointerleave", function () {
        pointer.tt = 0;
        pointer.pt = 0;
      });
    }

    window.addEventListener(
      "scroll",
      function () {
        if (mode !== "full") {
          scrollT = 0;
          return;
        }
        var box = art.getBoundingClientRect();
        scrollT = clamp(-box.top / Math.max(1, box.height), 0, 1);
      },
      { passive: true }
    );

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        function (entries) {
          onScreen = entries[0].isIntersecting;
          schedule();
        },
        { threshold: 0 }
      ).observe(art);
    }

    document.addEventListener("visibilitychange", schedule);

    model.addEventListener("camera-change", function (event) {
      var source = event && event.detail ? event.detail.source : "";
      if (source !== "user-interaction") return;
      paused = true;
      pauseUntil = performance.now() + 3000;
    });
  }

  /* ------------------------------------------------------------------ */
  /* boot                                                                */
  /* ------------------------------------------------------------------ */

  function loadModule() {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.type = "module";
      script.src = MODULE;
      script.onload = resolve;
      script.onerror = function () {
        reject(new Error("model-viewer failed to load"));
      };
      document.head.appendChild(script);
    });
  }

  function waitForModel(timeoutMs) {
    return new Promise(function (resolve, reject) {
      if (model.loaded && model.model) return resolve();
      var timer = setTimeout(function () {
        reject(new Error("model timed out"));
      }, timeoutMs);
      model.addEventListener(
        "load",
        function () {
          clearTimeout(timer);
          resolve();
        },
        { once: true }
      );
    });
  }

  function boot() {
    var cached = readCache();
    var startMode = cached || preflight();

    if (startMode === "poster") {
      finish("poster");
      return;
    }

    say("PROBE · ADAPTIVE RENDER");
    art.classList.add("is-probing");

    loadModule()
      .then(function () {
        return customElements.whenDefined("model-viewer");
      })
      .then(function () {
        model = art.querySelector(".hero-model");
        if (!model) throw new Error("no model-viewer element");
        model.addEventListener("error", function () {
          finish("poster");
        });
        model.addEventListener("contextlost", function () {
          finish("poster");
        });
        setMode(startMode);
        return waitForModel(25000);
      })
      .then(function () {
        readBase();
        attachInputs();
        t0 = performance.now();
        schedule();

        if (cached) return startMode;

        return measure(1200)
          .then(function (times) {
            return weak(times) ? downgrade(startMode) : startMode;
          })
          .then(function (afterFirst) {
            if (afterFirst === startMode) return afterFirst;
            setMode(afterFirst);
            return measure(600).then(function (times) {
              return weak(times) ? downgrade(afterFirst) : afterFirst;
            });
          });
      })
      .then(function (finalMode) {
        if (finalMode !== startMode) setMode(finalMode);
        writeCache(finalMode);
        finish(finalMode);
      })
      .catch(function () {
        setMode("poster");
        writeCache("poster");
        finish("poster");
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
