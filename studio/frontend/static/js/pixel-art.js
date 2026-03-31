(() => {
  const layer = document.createElement("div");
  layer.className = "pixel-stars";

  for (let index = 0; index < 48; index += 1) {
    const star = document.createElement("span");
    star.className = "pixel-star";
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.animationDelay = `${Math.random() * 4}s`;
    layer.appendChild(star);
  }

  window.addEventListener("DOMContentLoaded", () => {
    document.body.appendChild(layer);
  });
})();
