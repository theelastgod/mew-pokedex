(() => {
  // Set this to the mint address when it exists. An empty string stays off the page.
  const CONTRACT = "";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const films = document.querySelectorAll("video");

  if (!reduce) {
    const play = (video) => {
      video.muted = true;
      const mark = () => video.parentElement?.classList.add("is-playing");
      video.addEventListener("playing", mark, { once: true });
      video.play().catch(() => {});
    };
    if ("IntersectionObserver" in window) {
      const watcher = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const video = entry.target;
            if (entry.isIntersecting) play(video);
            else video.pause();
          });
        },
        { threshold: 0.35 }
      );
      films.forEach((video) => watcher.observe(video));
    } else {
      films.forEach(play);
    }
  }

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
      button.classList.add("copied");
      setTimeout(() => {
        button.textContent = previous;
        button.classList.remove("copied");
      }, 1200);
    } catch {
      button.textContent = "Copy failed";
    }
  });
})();
