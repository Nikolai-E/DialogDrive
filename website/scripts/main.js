document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const header = document.querySelector('.header');
  const themeToggle = document.getElementById('theme-toggle');
  const navLinks = header ? Array.from(header.querySelectorAll('.header__nav a')) : [];
  const THEME_KEY = 'dialogdrive-theme';
  const SCROLL_THRESHOLD = 12;

  // ===== Theme management =====
  const setToggleLabel = (theme) => {
    const label = themeToggle?.querySelector('.theme-toggle__label');
    if (!themeToggle || !label) return;

    const isDark = theme === 'dark';
    const nextTheme = isDark ? 'light' : 'dark';
    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeToggle.setAttribute('aria-label', `Switch to ${nextTheme} mode`);
    label.textContent = isDark ? 'Dark' : 'Light';
  };

  const applyTheme = (theme) => {
    const normalized = theme === 'light' ? 'light' : 'dark';
    root.setAttribute('data-theme', normalized);
    setToggleLabel(normalized);
    localStorage.setItem(THEME_KEY, normalized);
  };

  const initializeTheme = () => {
    const storedTheme = localStorage.getItem(THEME_KEY);
    if (storedTheme === 'dark' || storedTheme === 'light') {
      applyTheme(storedTheme);
      return;
    }

    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    applyTheme(prefersLight ? 'light' : 'dark');
  };

  const toggleTheme = () => {
    const currentTheme = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    applyTheme(currentTheme === 'light' ? 'dark' : 'light');
  };

  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  const themeQuery = window.matchMedia('(prefers-color-scheme: light)');
  themeQuery.addEventListener('change', (event) => {
    const storedTheme = localStorage.getItem(THEME_KEY);
    if (!storedTheme) {
      applyTheme(event.matches ? 'light' : 'dark');
    }
  });

  initializeTheme();

  // ===== Header behaviour =====
  const updateHeaderState = () => {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > SCROLL_THRESHOLD);
  };

  updateHeaderState();
  window.addEventListener('scroll', updateHeaderState, { passive: true });

  const setActiveNav = () => {
    if (!header || !navLinks.length) return;

    const pageKey = header.dataset.page || '';
    navLinks.forEach((link) => {
      link.classList.remove('is-active');
      if (link.hasAttribute('aria-current')) {
        link.removeAttribute('aria-current');
      }
    });

    let activeLink;
    if (pageKey === 'home') {
      activeLink = navLinks.find((link) => {
        const href = link.getAttribute('href');
        return href === '#top' || href === 'index.html#top';
      });
    } else if (pageKey) {
      activeLink = navLinks.find((link) => {
        const href = link.getAttribute('href');
        if (!href) return false;
        const [pathPart] = href.split('#');
        return pathPart === `${pageKey}.html`;
      });
    }

    if (activeLink) {
      activeLink.classList.add('is-active');
      activeLink.setAttribute('aria-current', 'page');
    }
  };

  setActiveNav();

  // ===== Smooth scrolling for in-page anchors =====
  const smoothScrollToHash = (hash) => {
    if (!hash || hash === '#' || hash.length <= 1) {
      return false;
    }

    const target = document.querySelector(hash);
    if (!target) {
      return false;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  };

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      const hash = anchor.getAttribute('href');
      if (smoothScrollToHash(hash)) {
        event.preventDefault();
      }
    });
  });

  const heroRotator = document.querySelector('[data-rotator]');
  const heroRotatorText = heroRotator?.querySelector('[data-rotator-text]');

  if (heroRotator && heroRotatorText) {
    const phrases = ['capture prompts.', 'reuse prompts.', 'refine prompts.'];
    const longestPhrase = phrases.reduce((longest, phrase) => (phrase.length > longest.length ? phrase : longest), '');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let currentPhrase = 0;
    let currentLength = 0;
    let isErasing = false;
    let activeTimeout;

    const setIdleState = (isIdle) => {
      heroRotator.classList.toggle('is-idle', isIdle);
    };

    const clearActiveTimeout = () => {
      if (activeTimeout) {
        clearTimeout(activeTimeout);
        activeTimeout = undefined;
      }
    };

    const reserveWidth = () => {
      const measurement = document.createElement('span');
      measurement.className = 'hero__headline-text';
      measurement.textContent = longestPhrase;
      measurement.setAttribute('aria-hidden', 'true');
      measurement.style.position = 'absolute';
      measurement.style.top = '0';
      measurement.style.left = '0';
      measurement.style.visibility = 'hidden';
      measurement.style.whiteSpace = 'nowrap';
      measurement.style.pointerEvents = 'none';
      heroRotator.appendChild(measurement);

      const { width } = measurement.getBoundingClientRect();
      heroRotator.style.setProperty('--rotator-min-width', `${Math.ceil(width)}px`);
      measurement.remove();
    };

    const randomBetween = (min, max) => Math.round(min + Math.random() * (max - min));

    const schedule = (fn, min, max) => {
      activeTimeout = window.setTimeout(fn, randomBetween(min, max));
    };

    const stepTypewriter = () => {
      const targetPhrase = phrases[currentPhrase];

      if (!isErasing) {
        setIdleState(false);
        currentLength += 1;
        heroRotatorText.textContent = targetPhrase.slice(0, currentLength);

        if (currentLength === targetPhrase.length) {
          setIdleState(true);
          schedule(() => {
            isErasing = true;
            stepTypewriter();
          }, 1400, 2000);
        } else {
          schedule(stepTypewriter, 60, 80);
        }
      } else {
        setIdleState(false);
        currentLength -= 1;
        heroRotatorText.textContent = targetPhrase.slice(0, currentLength);

        if (currentLength === 0) {
          isErasing = false;
          currentPhrase = (currentPhrase + 1) % phrases.length;
          schedule(stepTypewriter, 160, 260);
        } else {
          schedule(stepTypewriter, 35, 50);
        }
      }
    };

    const startTypewriter = () => {
      clearActiveTimeout();
      currentPhrase = 0;
      currentLength = 0;
      isErasing = false;
      heroRotatorText.textContent = '';
      setIdleState(false);
      schedule(stepTypewriter, 220, 320);
    };

    const stopTypewriter = () => {
      clearActiveTimeout();
      heroRotatorText.textContent = phrases[0];
      currentPhrase = 0;
      currentLength = phrases[0].length;
      isErasing = false;
      setIdleState(true);
    };

    reserveWidth();
    const handleMotionChange = (event) => {
      reserveWidth();
      if (event.matches) {
        stopTypewriter();
      } else {
        startTypewriter();
      }
    };

    if (typeof motionQuery.addEventListener === 'function') {
      motionQuery.addEventListener('change', handleMotionChange);
    } else if (typeof motionQuery.addListener === 'function') {
      motionQuery.addListener(handleMotionChange);
    }

    window.addEventListener('resize', reserveWidth, { passive: true });

    if (motionQuery.matches) {
      stopTypewriter();
    } else {
      startTypewriter();
    }
  }
});
