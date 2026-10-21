(() => {
  // Set this to the mint address when it exists. An empty string stays off the page.
  const CONTRACT = "";

  const clips = [
    { id: "jungle", title: "Mew", kicker: "Jungle", src: "./assets/videos/jungle.mp4", poster: "./assets/jungle.jpg", aw: 16, ah: 9 },
    { id: "mirage", title: "Mirage", kicker: "Mirage", src: "./assets/videos/story.mp4", poster: "./assets/story.jpg", aw: 9, ah: 16 },
    { id: "truck", title: "Empty", kicker: "Truck", src: "./assets/videos/truck.mp4", poster: "./assets/truck.jpg", aw: 16, ah: 9 },
    { id: "cell", title: "One cell", kicker: "Cell", src: "./assets/videos/degen.mp4", poster: "./assets/degen.jpg", aw: 16, ah: 9 },
    { id: "island", title: "Faraway", kicker: "Island", src: "./assets/videos/faraway.mp4", poster: "./assets/faraway.jpg", aw: 16, ah: 9 },
    { id: "card", title: "151", kicker: "Card", src: "./nft/mew.mp4", poster: "./nft/cover.jpg", aw: 1, ah: 1 },
  ];

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const app = document.getElementById("app");
  const frame = document.getElementById("frame");
  const film = document.getElementById("film");
  const poster = document.getElementById("poster");
  const play = document.getElementById("play");
  const toggle = document.getElementById("toggle");
  const scrub = document.getElementById("scrub");
  const time = document.getElementById("time");
  const title = document.getElementById("title");
  const kicker = document.getElementById("kicker");
  const sheen = document.getElementById("sheen");
  const wash = document.getElementById("wash");
  const reels = document.getElementById("reels");
  let index = 0;
  let scrubbing = false;

  const fmt = (seconds) => {
    if (!Number.isFinite(seconds)) return "0:00";
    const whole = Math.max(0, Math.floor(seconds));
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
  };

  const moving = () => film.currentTime > 0.04;

  const mark = (playing) => {
    app.classList.toggle("is-playing", Boolean(playing) && !film.paused && moving());
  };

  const start = () => {
    if (reduce) return Promise.resolve();
    film.muted = true;
    const pending = film.play();
    if (!pending) {
      mark(true);
      return Promise.resolve();
    }
    return pending.then(() => mark(true)).catch(() => mark(false));
  };

  const pause = () => {
    film.pause();
    mark(false);
  };

  const flip = () => {
    if (film.paused) start();
    else pause();
  };

  clips.forEach((clip, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.go = clip.id;
    button.innerHTML = `<img alt="" src="${clip.poster}"><span>${clip.kicker}</span>`;
    button.addEventListener("click", () => open(i, true));
    reels.appendChild(button);
  });

  const buttons = [...reels.querySelectorAll("button")];
  const logo = document.querySelector(".mark");

  const open = (next, gesture) => {
    index = (next + clips.length) % clips.length;
    const clip = clips[index];
    title.textContent = clip.title;
    kicker.textContent = clip.kicker;
    frame.classList.toggle("is-card", clip.id === "card");
    frame.style.setProperty("--aw", String(clip.aw));
    frame.style.setProperty("--ah", String(clip.ah));
    if (clip.id !== "card") {
      frame.style.removeProperty("--ry");
      frame.style.removeProperty("--rx");
      frame.style.removeProperty("--sx");
    }
    sheen.hidden = clip.id !== "card";
    buttons.forEach((button, i) => button.classList.toggle("on", i === index));
    const active = buttons[index];
    const rail = reels.getBoundingClientRect();
    const box = active.getBoundingClientRect();
    reels.scrollLeft += box.left - rail.left - (rail.width - box.width) / 2;
    poster.src = clip.poster;
    film.poster = clip.poster;
    wash.style.backgroundImage = `url("${clip.poster}")`;
    app.classList.remove("has-frame", "is-playing");
    if (film.getAttribute("src") !== clip.src) {
      film.src = clip.src;
      film.load();
    }
    history.replaceState(null, "", "#" + clip.id);
    scrub.value = "0";
    time.textContent = "0:00";
    if (gesture) start();
  };

  logo.addEventListener("click", (event) => {
    event.preventDefault();
    open(0, true);
  });

  play.addEventListener("click", (event) => {
    event.stopPropagation();
    start();
  });
  toggle.addEventListener("click", flip);
  film.addEventListener("click", flip);
  film.addEventListener("play", () => mark(true));
  film.addEventListener("pause", () => mark(false));

  scrub.addEventListener("pointerdown", () => {
    scrubbing = true;
  });
  const release = () => {
    scrubbing = false;
  };
  scrub.addEventListener("pointerup", release);
  scrub.addEventListener("pointercancel", release);
  scrub.addEventListener("input", () => {
    if (!Number.isFinite(film.duration) || film.duration === 0) return;
    film.currentTime = (Number(scrub.value) / 1000) * film.duration;
    time.textContent = fmt(film.currentTime);
  });
  film.addEventListener("timeupdate", () => {
    if (moving()) {
      app.classList.add("has-frame");
      if (!film.paused) app.classList.add("is-playing");
    }
    if (!Number.isFinite(film.duration) || film.duration === 0) return;
    time.textContent = fmt(film.currentTime);
    if (scrubbing) return;
    scrub.value = String((film.currentTime / film.duration) * 1000);
  });
  film.addEventListener("loadedmetadata", () => {
    time.textContent = fmt(film.currentTime);
  });

  frame.addEventListener("pointermove", (event) => {
    if (!frame.classList.contains("is-card")) return;
    const box = frame.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;
    const y = (event.clientY - box.top) / box.height - 0.5;
    frame.style.setProperty("--ry", `${x * 16}deg`);
    frame.style.setProperty("--rx", `${-y * 10}deg`);
    frame.style.setProperty("--sx", String(x * 70));
  });

  const hash = location.hash.replace("#", "");
  const startAt = Math.max(0, clips.findIndex((clip) => clip.id === hash));
  open(startAt, false);
  if (!reduce) start();

  const row = document.getElementById("ca");
  const copy = document.getElementById("ca-copy");
  const address = CONTRACT.trim();
  if (!row || !copy || !address) return;
  row.hidden = false;
  copy.dataset.copy = address;
  copy.textContent = address;
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(address);
      const previous = copy.textContent;
      copy.textContent = "Copied";
      window.setTimeout(() => {
        copy.textContent = previous;
      }, 1200);
    } catch {
      copy.textContent = "Copy failed";
    }
  });
})();
