(() => {
  // Set this to the mint address when it exists. An empty string stays off the page.
  const CONTRACT = "";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scenes = [...document.querySelectorAll(".scene")];
  const buttons = [...document.querySelectorAll("[data-go]")];
  const title = document.getElementById("title");
  const kicker = document.getElementById("kicker");
  const caption = document.getElementById("caption");
  const holo = document.getElementById("holo");
  let index = 0;
  let lock = false;
  let downX = null;

  const play = (scene) => {
    const video = scene.querySelector("video");
    if (!video || reduce) return;
    video.muted = true;
    video.preload = "auto";
    const mark = () => scene.classList.add("is-playing");
    if (video.readyState >= 2 && !video.paused) mark();
    else video.addEventListener("playing", mark, { once: true });
    video.play().catch(() => {});
  };

  const show = (next) => {
    const wrapped = (next + scenes.length) % scenes.length;
    if (wrapped === index && scenes[index].classList.contains("on")) {
      play(scenes[index]);
      return;
    }
    index = wrapped;
    const scene = scenes[index];
    scenes.forEach((item, i) => {
      const active = i === index;
      item.classList.toggle("on", active);
      const video = item.querySelector("video");
      if (!video || reduce) return;
      if (active) play(item);
      else video.pause();
    });
    buttons.forEach((button) => {
      button.classList.toggle("on", button.dataset.go === scene.dataset.scene);
    });
    const nextTitle = scene.dataset.title || "";
    const nextKicker = scene.dataset.kicker || "";
    const first = !document.body.dataset.booted;
    document.body.dataset.booted = "1";
    if (first || reduce || title.textContent === nextTitle) {
      title.textContent = nextTitle;
      kicker.textContent = nextKicker;
      caption.classList.remove("swap");
    } else {
      caption.classList.add("swap");
      window.setTimeout(() => {
        title.textContent = nextTitle;
        kicker.textContent = nextKicker;
        caption.classList.remove("swap");
      }, 160);
    }
    history.replaceState(null, "", "#" + scene.dataset.scene);
  };

  const step = (delta) => {
    if (lock) return;
    lock = true;
    show(index + delta);
    window.setTimeout(() => {
      lock = false;
    }, reduce ? 0 : 760);
  };

  let coolUntil = 0;
  window.addEventListener(
    "wheel",
    (event) => {
      const now = performance.now();
      if (now < coolUntil) {
        coolUntil = now + 240;
        return;
      }
      if (Math.abs(event.deltaY) < 12) return;
      coolUntil = now + 760;
      step(event.deltaY > 0 ? 1 : -1);
    },
    { passive: true }
  );

  buttons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const target = scenes.findIndex((scene) => scene.dataset.scene === button.dataset.go);
      if (target >= 0) show(target);
    });
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowRight" || event.key === "PageDown") {
      event.preventDefault();
      step(1);
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft" || event.key === "PageUp") {
      event.preventDefault();
      step(-1);
    }
  });

  const stage = document.getElementById("stage");
  stage.addEventListener("pointerdown", (event) => {
    downX = event.clientX;
  });
  stage.addEventListener("pointerup", (event) => {
    if (downX == null) return;
    const delta = event.clientX - downX;
    downX = null;
    if (Math.abs(delta) > 56) step(delta < 0 ? 1 : -1);
  });

  if (!reduce) {
    window.addEventListener("pointermove", (event) => {
      const x = event.clientX / window.innerWidth - 0.5;
      const y = event.clientY / window.innerHeight - 0.5;
      const media = scenes[index].querySelector(".media");
      if (media) media.style.transform = `translate(${x * -22}px, ${y * -14}px) scale(1.06)`;
      if (scenes[index].dataset.scene === "card" && holo) {
        holo.style.transform = `rotateY(${x * 18}deg) rotateX(${-y * 12}deg)`;
        holo.style.setProperty("--sx", String(x * 80));
      }
    });
  }

  const hash = location.hash.replace("#", "");
  const start = scenes.findIndex((scene) => scene.dataset.scene === hash);
  show(start >= 0 ? start : 0);

  const row = document.getElementById("ca");
  const button = document.getElementById("ca-copy");
  const address = CONTRACT.trim();
  if (!row || !button || !address) return;
  row.hidden = false;
  button.dataset.copy = address;
  button.textContent = address;
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(address);
      const previous = button.textContent;
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.textContent = previous;
      }, 1200);
    } catch {
      button.textContent = "Copy failed";
    }
  });
})();
