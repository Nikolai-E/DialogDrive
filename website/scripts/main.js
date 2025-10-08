document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  const navbar = header ? null : document.querySelector('.navbar');
  const headerElement = header || navbar;
  const headerNavLinks = Array.from(document.querySelectorAll('.site-nav a, .nav-links a'));

  const normalizePathname = (pathname) => pathname.replace(/index\.html$/i, '') || '/';

  let headerScrollThreshold = 28; // Trigger at ~24-32px scroll
  let lastHeaderHeight = 0;

  const updateHeaderMetrics = () => {
    if (!headerElement) {
      root.style.removeProperty('--header-height-current');
      lastHeaderHeight = 0;
      return;
    }

    if (header && header.classList.contains('is-scrolled')) {
      return;
    }

    const { height } = headerElement.getBoundingClientRect();
    const roundedHeight = Math.max(0, Math.ceil(height));

    if (!roundedHeight || roundedHeight === lastHeaderHeight) {
      return;
    }

    root.style.setProperty('--header-height-current', `${roundedHeight}px`);
    lastHeaderHeight = roundedHeight;
  };

  const computeHeaderThreshold = () => {
    // Use a fixed threshold for consistent behavior
    headerScrollThreshold = 28;
  };

  const updateHeaderState = () => {
    if (header) {
      const isScrolled = window.scrollY > headerScrollThreshold;
      const wasScrolled = header.classList.contains('is-scrolled');

      if (isScrolled !== wasScrolled) {
        header.classList.toggle('is-scrolled', isScrolled);
      }

      if (!isScrolled) {
        updateHeaderMetrics();
      }
    } else {
      updateHeaderMetrics();
    }
  };

  computeHeaderThreshold();
  updateHeaderMetrics();
  updateHeaderState();

  window.addEventListener('scroll', updateHeaderState, { passive: true });
  window.addEventListener('resize', () => {
    computeHeaderThreshold();
    updateHeaderMetrics();
    updateHeaderState();
  });
  window.addEventListener('load', () => setTimeout(updateHeaderMetrics, 0));

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
