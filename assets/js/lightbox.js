(function () {
  // Create overlay
  var overlay = document.createElement("div");
  overlay.className = "lightbox-overlay";
  overlay.style.display = "none";
  var overlayImg = document.createElement("img");
  overlayImg.alt = "Enlarged image";
  overlay.appendChild(overlayImg);
  document.body.appendChild(overlay);

  function closeLightbox() {
    overlay.classList.remove("active");
    setTimeout(function () {
      overlay.style.display = "none";
    }, 300);
  }

  // Click overlay to close
  overlay.addEventListener("click", closeLightbox);

  // ESC to close
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay.classList.contains("active")) {
      closeLightbox();
    }
  });

  // Target content images, skip tech icons, navbar, and tiny decorative images
  var images = document.querySelectorAll(".container img");
  images.forEach(function (img) {
    if (img.closest(".tech-icon") || img.closest(".navbar")) return;

    img.classList.add("lightbox-ready");
    img.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      overlayImg.src = this.src;
      overlay.style.display = "flex";
      // Force reflow so the transition plays
      overlay.offsetHeight;
      overlay.classList.add("active");
    });
  });
})();
