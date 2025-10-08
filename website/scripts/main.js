document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.site-header');
  const headerBar = header ? header.querySelector('.header-bar') : null;
  const headerNavLinks = Array.from(document.querySelectorAll('.site-nav a'));

  const normalizePathname = (pathname) => pathname.replace(/index\.html$/i, '') || '/';

  let headerScrollThreshold = 28; // Trigger at ~24-32px scroll

  const computeHeaderThreshold = () => {
    // Use a fixed threshold for consistent behavior
    headerScrollThreshold = 28;
  };

  const updateHeaderState = () => {
    if (!header) return;
    const isScrolled = window.scrollY > headerScrollThreshold;
    header.classList.toggle('is-scrolled', isScrolled);
  };

  computeHeaderThreshold();
  window.addEventListener('scroll', updateHeaderState, { passive: true });
  window.addEventListener('resize', () => {
    computeHeaderThreshold();
    updateHeaderState();
  });
  updateHeaderState();

  if (header && headerNavLinks.length) {
    const pageKey = header.dataset.page;
    if (pageKey) {
      headerNavLinks.forEach((link) => link.classList.remove('is-active'));

      const activeLink = headerNavLinks.find((link) => {
        const href = link.getAttribute('href');
        if (!href) return false;
        if (pageKey === 'home') {
          return href === '#top' || href === 'index.html#top';
        }

        const [pathPart] = href.split('#');
        return pathPart === `${pageKey}.html`;
      });

      if (activeLink) {
        activeLink.classList.add('is-active');
      }
    }
  }

  const smoothScrollToHash = (hash) => {
    if (!hash || hash === '#' || hash.length <= 1) {
      return false;
    }

    const target = document.querySelector(hash);
    if (!target) {
      return false;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (typeof history.replaceState === 'function') {
      history.replaceState(null, '', hash);
    } else {
      window.location.hash = hash;
    }

    return true;
  };

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      const href = anchor.getAttribute('href');
      if (smoothScrollToHash(href)) {
        event.preventDefault();
      }
    });
  });

  if (headerNavLinks.length) {
    const currentPath = normalizePathname(window.location.pathname);

    headerNavLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href) return;

      try {
        const url = new URL(href, window.location.href);
        const samePath = normalizePathname(url.pathname) === currentPath;
        if (samePath && url.hash) {
          link.addEventListener('click', (event) => {
            if (smoothScrollToHash(url.hash)) {
              event.preventDefault();
            }
          });
        }
      } catch (error) {
        // Ignore invalid URLs
      }
    });
  }
});
