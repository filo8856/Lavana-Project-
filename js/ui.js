/** Navigation and page-level interactions. Independent of the map engines. */
window.addEventListener("DOMContentLoaded", () => {
  const menu = document.getElementById("menu-toggle");
  const navigation = document.getElementById("primary-navigation");
  const closeMenu = () => {
    navigation.classList.remove("open");
    menu.setAttribute("aria-expanded", "false");
  };

  menu.addEventListener("click", () => {
    const expanded = menu.getAttribute("aria-expanded") !== "true";
    menu.setAttribute("aria-expanded", String(expanded));
    navigation.classList.toggle("open", expanded);
  });
  navigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest("#navbar")) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      menu.getAttribute("aria-expanded") === "true"
    ) {
      closeMenu();
      menu.focus();
    }
  });
  const desktop = window.matchMedia("(min-width: 1001px)");
  desktop.addEventListener("change", () => closeMenu());

  const links = [...navigation.querySelectorAll('a[href^="#"]')];
  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
  const topButton = document.getElementById("back-to-top");
  let scheduled = false;
  const updatePosition = () => {
    let current = null;
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= 190) current = section.id;
    }
    links.forEach((link) => {
      const active = link.hash === `#${current}`;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    topButton.hidden = window.scrollY < 850;
    scheduled = false;
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(updatePosition);
      }
    },
    { passive: true },
  );
  topButton.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
    document.getElementById("brand-logo").focus({ preventScroll: true });
  });
  updatePosition();
});
