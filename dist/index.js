"use strict";
(() => {
  // bin/live-reload.js
  new EventSource(`${"http://localhost:3000"}/esbuild`).addEventListener("change", () => location.reload());

  // src/utils/faq-accordion.ts
  var FaqAccordionController = class {
    soonerItems = [];
    init() {
      this.initSoonerAccordionItems();
    }
    // ─── New 'sooner' process block behavior (mouse hover + mobile click) ───────
    initSoonerAccordionItems() {
      const items = document.querySelectorAll('[dev-target="one-sooner-accordion"]');
      if (!items.length) return;
      items.forEach((item) => {
        this.soonerItems.push(item);
        const header = item.querySelector('[dev-target="sooner-header"]');
        const circle = item.querySelector('[dev-target="circle"]');
        if (!header) return;
        header.addEventListener("mouseenter", () => {
          if (this.isHoverable() && !this.isTouchDevice()) {
            this.openSoonerItem(item);
          }
        });
        header.addEventListener("click", (event) => {
          if (this.isTouchDevice()) {
            event.preventDefault();
            this.toggleSoonerItem(item);
          }
        });
        if (circle) {
          circle.addEventListener("click", (event) => {
            if (this.isTouchDevice()) {
              event.preventDefault();
              event.stopPropagation();
              this.toggleSoonerItem(item);
            }
          });
        }
      });
      if (items.length > 0) {
        this.openSoonerItem(items[0]);
      }
    }
    toggleSoonerItem(item) {
      if (item.classList.contains("is-open")) {
        this.closeSoonerItem(item);
      } else {
        this.openSoonerItem(item);
      }
    }
    openSoonerItem(item) {
      this.soonerItems.forEach((sibling) => {
        sibling.classList.remove("is-open");
        const siblingCircle = sibling.querySelector('[dev-target="circle"]');
        siblingCircle?.classList.remove("is-active");
      });
      item.classList.add("is-open");
      const circle = item.querySelector('[dev-target="circle"]');
      circle?.classList.add("is-active");
    }
    closeSoonerItem(item) {
      item.classList.remove("is-open");
      const circle = item.querySelector('[dev-target="circle"]');
      circle?.classList.remove("is-active");
    }
    isTouchDevice() {
      return "ontouchstart" in window || navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
    }
    isHoverable() {
      return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    }
    destroy() {
      this.soonerItems = [];
    }
  };

  // src/index.ts
  window.Webflow ||= [];
  window.Webflow.push(() => {
    const faqAccordionController = new FaqAccordionController();
    faqAccordionController.init();
  });
})();
//# sourceMappingURL=index.js.map
