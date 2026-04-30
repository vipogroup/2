// Slider functionality

// Products Slider - Infinite Circular Carousel
document.addEventListener('DOMContentLoaded', function() {
    console.log('Slider.js loaded');

    const originalCards = Array.from(document.querySelectorAll('.product-card'));

    if (originalCards.length === 0) {
        console.log('No product cards found');
        return;
    }

    console.log('Found', originalCards.length, 'original product cards');

    // Clone entire set 3 times for infinite effect
    const container = document.querySelector('.products-container');

    if (!container) {
        console.log('Products container not found');
        return;
    }

    const isMobileView = window.matchMedia('(max-width: 768px)').matches;

    function setupMobileCarousel(wrapper, cardsNodeList) {
        const cards = Array.from(cardsNodeList);
        const links = cards.map(card => card.closest('.product-card-link'));
        if (cards.length === 0 || !links.every(Boolean)) {
            console.log('Mobile carousel setup aborted - no cards or links');
            return;
        }

        wrapper.classList.add('mobile-carousel');
        wrapper.style.transform = 'none';
        wrapper.scrollLeft = 0;

        cards.forEach(card => {
            loadCardImages(card);
            card.classList.remove('center', 'side', 'far');
        });

        let activeIndex = 0;
        let autoScrollTimer;
        let restartTimer;
        let scrollDebounce;
        let isProgrammaticScroll = false;

        const total = cards.length;

        function applyClasses(index) {
            cards.forEach((card, i) => {
                card.classList.remove('center', 'side', 'far');
                if (i === index) {
                    card.classList.add('center');
                } else if (i === (index + 1) % total || i === (index - 1 + total) % total) {
                    card.classList.add('side');
                } else {
                    card.classList.add('far');
                }
            });
        }

        function centerCard(index, smooth = true) {
            if (total === 0) {
                return;
            }

            activeIndex = (index + total) % total;
            applyClasses(activeIndex);

            const link = links[activeIndex];
            if (!link) {
                return;
            }

            const containerRect = wrapper.getBoundingClientRect();
            const linkRect = link.getBoundingClientRect();
            const targetLeft = wrapper.scrollLeft + (linkRect.left - containerRect.left) - (containerRect.width - linkRect.width) / 2;

            isProgrammaticScroll = true;
            wrapper.scrollTo({ left: targetLeft, behavior: smooth ? 'smooth' : 'auto' });
            setTimeout(() => {
                isProgrammaticScroll = false;
            }, smooth ? 400 : 0);
        }

        function startAutoScroll() {
            if (total <= 1) {
                return;
            }
            clearInterval(autoScrollTimer);
            autoScrollTimer = setInterval(() => {
                centerCard(activeIndex + 1, true);
            }, 2200);
        }

        function stopAutoScroll() {
            clearInterval(autoScrollTimer);
        }

        function scheduleAutoRestart() {
            clearTimeout(restartTimer);
            restartTimer = setTimeout(() => {
                startAutoScroll();
            }, 1500);
        }

        const interactionEvents = ['touchstart', 'mousedown', 'pointerdown'];
        const resumeEvents = ['touchend', 'mouseup', 'pointerup', 'mouseleave'];

        interactionEvents.forEach(evt => {
            wrapper.addEventListener(evt, () => {
                stopAutoScroll();
                clearTimeout(restartTimer);
            }, { passive: true });
        });

        resumeEvents.forEach(evt => {
            wrapper.addEventListener(evt, () => {
                scheduleAutoRestart();
            }, { passive: true });
        });

        wrapper.addEventListener('scroll', () => {
            if (isProgrammaticScroll) {
                return;
            }
            stopAutoScroll();
            clearTimeout(scrollDebounce);
            scrollDebounce = setTimeout(() => {
                const containerRect = wrapper.getBoundingClientRect();
                const containerCenter = containerRect.left + containerRect.width / 2;
                let closestIndex = activeIndex;
                let minDistance = Number.POSITIVE_INFINITY;

                cards.forEach((card, idx) => {
                    const rect = card.getBoundingClientRect();
                    const cardCenter = rect.left + rect.width / 2;
                    const distance = Math.abs(cardCenter - containerCenter);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestIndex = idx;
                    }
                });

                centerCard(closestIndex, true);
                scheduleAutoRestart();
            }, 120);
        }, { passive: true });

        requestAnimationFrame(() => {
            centerCard(0, false);
            startAutoScroll();
        });
    }

    if (isMobileView) {
        setupMobileCarousel(container, originalCards);
        return;
    }

    container.classList.remove('mobile-carousel');

    const allLinks = Array.from(container.querySelectorAll('.product-card-link'));

    // Clone the entire set 2 more times (so we have 3 complete sets)
    for (let i = 0; i < 2; i++) {
        allLinks.forEach(link => {
            const clone = link.cloneNode(true);
            container.appendChild(clone);
        });
    }

    // Get all cards including clones
    const productCards = Array.from(document.querySelectorAll('.product-card'));
    console.log('Total cards after cloning:', productCards.length);

    // Start from middle set (כורסת עיסוי in second set)
    const startIndex = originalCards.length;
    let currentIndex = startIndex + Math.floor(originalCards.length / 2);

    function loadCardImages(card) {
        const img = card.querySelector('img.lazy-load');
        if (img && !img.getAttribute('src')) {
            const dataSrc = img.getAttribute('data-src');
            if (dataSrc) {
                img.setAttribute('src', dataSrc);
            }
        }
    }

    function showCards() {
        const total = productCards.length;

        productCards.forEach((card, i) => {
            // Remove all classes
            card.classList.remove('center', 'side', 'far');

            // Force reflow to ensure CSS updates
            void card.offsetWidth;

            // Check if this is the center card
            if (i === currentIndex) {
                card.classList.add('center');
                loadCardImages(card);
                console.log('Center card index:', i, '- Name:', card.querySelector('h3').textContent);
            } else if (i === (currentIndex + 1) % total) {
                // Next card (right side)
                card.classList.add('side');
                loadCardImages(card);
            } else if (i === (currentIndex - 1 + total) % total) {
                // Previous card (left side)
                card.classList.add('side');
                loadCardImages(card);
            } else {
                // All other cards are farther away
                card.classList.add('far');
            }
        });

        const wrapper = container.parentElement;
        const centerCard = productCards[currentIndex];
        if (!wrapper || !centerCard) {
            return;
        }

        const wrapperRect = wrapper.getBoundingClientRect();
        const cardRect = centerCard.getBoundingClientRect();
        const wrapperCenter = wrapperRect.left + wrapperRect.width / 2;
        const cardCenter = cardRect.left + cardRect.width / 2;
        const offset = wrapperCenter - cardCenter;
        container.style.transform = `translateX(${offset}px)`;
    }

    function nextCard() {
        currentIndex = (currentIndex + 1) % productCards.length;
        if (currentIndex >= startIndex + originalCards.length) {
            container.classList.add('no-transition');
            currentIndex -= originalCards.length;
            requestAnimationFrame(() => {
                container.classList.remove('no-transition');
                showCards();
            });
            return;
        }
        console.log('Moving to index:', currentIndex);
        showCards();
    }

    function prevCard() {
        currentIndex = (currentIndex - 1 + productCards.length) % productCards.length;
        if (currentIndex < startIndex) {
            container.classList.add('no-transition');
            currentIndex += originalCards.length;
            requestAnimationFrame(() => {
                container.classList.remove('no-transition');
                showCards();
            });
            return;
        }
        console.log('Moving to index:', currentIndex);
        showCards();
    }

    // Initialize - force immediate display
    console.log('Initializing carousel...');
    setTimeout(() => {
        container.classList.add('no-transition');
        showCards();
        requestAnimationFrame(() => {
            container.classList.remove('no-transition');
        });
        console.log('Initial display set');
    }, 0);

    // Auto-rotate every ~1.8 seconds for a snappier feel
    let autoRotateInterval = setInterval(nextCard, 1800);

    // Manual swipe/drag functionality
    let startX = 0;
    let isDragging = false;

    // Touch events for mobile
    container.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        clearInterval(autoRotateInterval);
        container.classList.add('no-transition');
    });

    container.addEventListener('touchend', (e) => {
        const endX = e.changedTouches[0].clientX;
        const diff = startX - endX;

        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                nextCard(); // Swipe left - next
            } else {
                prevCard(); // Swipe right - previous
            }
        }

        container.classList.remove('no-transition');
        // Restart auto-rotation after short pause
        setTimeout(() => {
            autoRotateInterval = setInterval(nextCard, 1800);
        }, 2200);
    });

    // Mouse events for desktop
    container.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        isDragging = true;
        clearInterval(autoRotateInterval);
        container.style.cursor = 'grabbing';
        container.classList.add('no-transition');
    });

    container.addEventListener('mousemove', (e) => {
        if (!isDragging) {
            return;
        }
        e.preventDefault();
    });

    container.addEventListener('mouseup', (e) => {
        if (!isDragging) {
            return;
        }

        const endX = e.clientX;
        const diff = startX - endX;

        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                nextCard(); // Drag left - next
            } else {
                prevCard(); // Drag right - previous
            }
        }

        isDragging = false;
        container.style.cursor = 'grab';
        container.classList.remove('no-transition');

        // Restart auto-rotation after short pause
        setTimeout(() => {
            autoRotateInterval = setInterval(nextCard, 1800);
        }, 2200);
    });

    container.addEventListener('mouseleave', () => {
        if (isDragging) {
            isDragging = false;
            container.style.cursor = 'grab';
            container.classList.remove('no-transition');
        }
    });

    // Set initial cursor
    container.style.cursor = 'grab';

    console.log('Carousel initialized with manual controls');

    // Testimonials slider
    const testimonialCards = document.querySelectorAll('.testimonial-card');
    const dots = document.querySelectorAll('.slider-dots .dot');
    let currentSlide = 0;
    let testimonialInterval;

    function showSlide(index) {
        testimonialCards.forEach(card => {
            card.style.display = 'none';
        });

        dots.forEach(dot => {
            dot.classList.remove('active');
        });

        if (testimonialCards[index]) {
            testimonialCards[index].style.display = 'flex';
            dots[index].classList.add('active');
        }
    }

    if (testimonialCards.length > 0 && dots.length > 0) {
        showSlide(0);

        dots.forEach(dot => {
            dot.addEventListener('click', function() {
                const slideIndex = parseInt(this.getAttribute('data-index'), 10);
                showSlide(slideIndex);
                currentSlide = slideIndex;
                resetTestimonialInterval();
            });
        });

        function startTestimonialInterval() {
            testimonialInterval = setInterval(() => {
                currentSlide = (currentSlide + 1) % testimonialCards.length;
                showSlide(currentSlide);
            }, 6000); // Change testimonial every 6 seconds
        }

        function resetTestimonialInterval() {
            clearInterval(testimonialInterval);
            startTestimonialInterval();
        }

        startTestimonialInterval();
    }
});
