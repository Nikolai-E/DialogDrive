document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.site-header');
    const headerBar = header ? header.querySelector('.header-bar') : null;
    const headerNavLinks = Array.from(document.querySelectorAll('.site-nav a'));
    const floatingClouds = document.querySelectorAll('.floating-text');
    const hero = document.querySelector('.hero');

    const normalizePathname = (pathname) => pathname.replace(/index\.html$/i, '') || '/';

    let headerScrollThreshold = 24;

    const computeHeaderThreshold = () => {
        if (!header) {
            headerScrollThreshold = 24;
            return;
        }

        const headerHeight = header.offsetHeight || 0;
        const barHeight = headerBar ? headerBar.offsetHeight : 0;
        headerScrollThreshold = Math.max(24, (barHeight || headerHeight) * 0.85);
    };

    const updateHeaderState = () => {
        if (!header) return;
        const isFloating = window.scrollY > headerScrollThreshold;
        header.classList.toggle('is-scrolled', isFloating);
        header.classList.toggle('is-anchored', !isFloating);
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

    const finePointer = window.matchMedia('(pointer: fine)');

    if (hero && floatingClouds.length && finePointer.matches) {
        const handlePointerMove = (event) => {
            if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') {
                return;
            }

            const bounds = hero.getBoundingClientRect();
            const offsetX = ((event.clientX - bounds.left) / bounds.width) - 0.5;
            const offsetY = ((event.clientY - bounds.top) / bounds.height) - 0.5;

            floatingClouds.forEach((cloud, index) => {
                const intensity = (index + 1) * 6;
                const translateX = offsetX * intensity;
                const translateY = offsetY * intensity * -1;
                cloud.style.transform = `translate(${translateX}px, ${translateY}px)`;
            });
        };

        hero.addEventListener('pointermove', handlePointerMove);

        hero.addEventListener('pointerleave', () => {
            floatingClouds.forEach((cloud) => {
                cloud.style.transform = '';
            });
        });

        const handlePointerPreferenceChange = (event) => {
            if (!event.matches) {
                hero.removeEventListener('pointermove', handlePointerMove);
                floatingClouds.forEach((cloud) => {
                    cloud.style.transform = '';
                });
            }
        };

        if (typeof finePointer.addEventListener === 'function') {
            finePointer.addEventListener('change', handlePointerPreferenceChange);
        } else if (typeof finePointer.addListener === 'function') {
            finePointer.addListener(handlePointerPreferenceChange);
        }
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
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
