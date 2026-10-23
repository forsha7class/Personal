/* ============================================================
   DIKA/OS — terminal
   A constrained, read-only navigation surface.
   No eval, no fetch, no shell, no filesystem access.
   ============================================================ */
(function () {
  "use strict";

  var root = document.querySelector("[data-terminal]");
  if (!root) return;

  var form = root.querySelector("[data-term-form]");
  var input = root.querySelector("[data-term-input]");
  var log = root.querySelector("[data-term-log]");
  var dataEl = document.getElementById("term-data");
  if (!form || !input || !log) return;

  var data = { projects: [], stack: [], site: {} };
  if (dataEl) {
    try {
      data = JSON.parse(dataEl.textContent);
    } catch (error) {
      data = { projects: [], stack: [], site: {} };
    }
  }

  var projects = Array.isArray(data.projects) ? data.projects : [];
  var bySlug = {};
  projects.forEach(function (project) {
    bySlug[project.slug] = project;
  });

  var history = [];
  var cursor = -1;
  var hasGreeted = false;

  /* ---------- output helpers ---------- */

  function addLine(text, className, href) {
    var line = document.createElement("span");
    line.className = "term-line" + (className ? " " + className : "");

    if (href) {
      var link = document.createElement("a");
      link.href = href;
      link.textContent = text;
      line.appendChild(link);
    } else {
      line.textContent = text === "" ? "\u00a0" : text;
    }

    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
    return line;
  }

  function addCommandLine(command) {
    addLine(command, "term-line--cmd");
  }

  function addTable(rows) {
    rows.forEach(function (row) {
      var line = document.createElement("span");
      line.className = "term-line";

      var key = document.createElement("span");
      key.className = "term-key";
      key.textContent = String(row[0]).padEnd(18, " ");
      line.appendChild(key);

      if (row[2]) {
        var link = document.createElement("a");
        link.href = row[2];
        link.textContent = row[1];
        line.appendChild(link);
      } else {
        line.appendChild(document.createTextNode(row[1]));
      }

      log.appendChild(line);
    });
    log.scrollTop = log.scrollHeight;
  }

  /* ---------- command handlers ---------- */

  function cmdHelp() {
    addLine("Available commands:");
    addTable([
      ["help", "show this list"],
      ["about", "who is behind DIKA/OS"],
      ["projects", "list published builds"],
      ["stack", "verified tools and platforms"],
      ["contact", "approved contact channels"],
      ["open <slug>", "open a project case study"],
      ["clear", "clear the console"]
    ]);
    addLine("");
    addLine("Every command also has a regular link on the page.", "term-line--ok");
  }

  function cmdAbout() {
    addLine(
      "DIKA/OS is the working portfolio of Dika — a systems builder working",
      "term-line--value"
    );
    addLine("where software engineering meets law and technology.", "term-line--value");
    addLine("Focus: interface engineering, static systems, and testable UI.");
    addLine("");
    addLine("Read more", null, "/#about");
  }

  function cmdProjects() {
    if (!projects.length) {
      addLine("No published builds yet.", "term-line--err");
      return;
    }

    addLine("Published builds (" + projects.length + "):");
    projects.forEach(function (project, index) {
      var label =
        (index + 1 < 10 ? "0" : "") + (index + 1) + "  " + project.name + " — " + project.status;
      addLine(label + "  " + project.tagline, null, "/projects/" + project.slug + "/");
    });
    addLine("");
    addLine("Open one with: open <slug>", "term-line--ok");
    addLine("Slugs: " + projects.map(function (p) { return p.slug; }).join(", "));
  }

  function cmdStack() {
    if (!Array.isArray(data.stack) || !data.stack.length) {
      addLine("Stack data unavailable.", "term-line--err");
      return;
    }

    addLine("Verified stack:");
    data.stack.forEach(function (group) {
      addLine(group.group + ": " + group.items.join(", "));
    });
  }

  function cmdContact() {
    var site = data.site || {};
    addLine("Approved contact channels:");
    if (site.email) addLine("email     " + site.email, null, "mailto:" + site.email);
    if (site.github) addLine("github    " + site.github, null, site.github);
    if (site.instagram) addLine("instagram " + site.instagram, null, site.instagram);
    addLine("");
    addLine("No forms, no tracking — these are plain links.", "term-line--ok");
  }

  function cmdClear() {
    log.textContent = "";
  }

  function cmdOpen(argument) {
    if (!argument) {
      addLine("Usage: open <slug>", "term-line--err");
      addLine("Slugs: " + projects.map(function (p) { return p.slug; }).join(", "));
      return;
    }

    var slug = argument.toLowerCase();
    if (!bySlug[slug]) {
      addLine("Project not published: " + slug, "term-line--err");
      addLine("Try: " + projects.map(function (p) { return p.slug; }).join(", "));
      return;
    }

    addLine("Opening " + bySlug[slug].name + "…", "term-line--ok");
    window.location.href = "/projects/" + slug + "/";
  }

  var commands = {
    help: cmdHelp,
    about: cmdAbout,
    projects: cmdProjects,
    stack: cmdStack,
    contact: cmdContact,
    clear: cmdClear,
    open: cmdOpen
  };

  /* ---------- execution ---------- */

  function run(raw) {
    var value = String(raw || "").trim();
    addCommandLine(value);

    if (!value) return;

    var parts = value.split(/\s+/);
    var name = parts[0].toLowerCase();
    var argument = parts.slice(1).join(" ");

    if (!Object.prototype.hasOwnProperty.call(commands, name)) {
      addLine('command not found: "' + name + '" — type "help" for available commands.', "term-line--err");
      return;
    }

    commands[name](argument);
  }

  /* ---------- events ---------- */

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var value = input.value;
    input.value = "";

    if (value.trim()) {
      history.push(value.trim());
      cursor = history.length;
    }

    run(value);
  });

  input.addEventListener("keydown", function (event) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!history.length) return;
      cursor = Math.max(0, cursor - 1);
      input.value = history[cursor] || "";
      input.setSelectionRange(input.value.length, input.value.length);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!history.length) return;
      cursor = Math.min(history.length, cursor + 1);
      input.value = history[cursor] || "";
      input.setSelectionRange(input.value.length, input.value.length);
      return;
    }

    if (event.key === "Escape") {
      input.blur();
    }
  });

  /* ---------- Cmd/Ctrl+K jumps to the terminal ---------- */

  document.addEventListener("keydown", function (event) {
    if (!(event.key === "k" || event.key === "K")) return;
    if (!(event.metaKey || event.ctrlKey)) return;

    var active = document.activeElement;
    var tag = active ? active.tagName : "";
    if (tag === "INPUT" || tag === "TEXTAREA" || (active && active.isContentEditable)) return;

    event.preventDefault();
    root.scrollIntoView({ block: "center", behavior: "smooth" });
    input.focus({ preventScroll: true });

    if (!hasGreeted) {
      cmdHelp();
      hasGreeted = true;
    }
  });

  /* ---------- greeting ---------- */

  if (!hasGreeted) {
    addLine("DIKA/OS shell — read-only navigation layer.", "term-line--ok");
    addLine('Type "help" and press Enter. Nothing here touches a server.');
    addLine("");
    hasGreeted = true;
  }
})();
