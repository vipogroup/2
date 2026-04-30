// Main JavaScript File

// Scroll to top on page refresh/load
window.addEventListener('load', function() {
    window.scrollTo(0, 0);
});

// DOM Elements
const mobileMenu = document.getElementById('mobile-menu');
const navMenu = document.querySelector('.nav-menu');
const closeMenu = document.getElementById('close-menu');
const accordionButtons = document.querySelectorAll('.accordion-button');
const copyLinkBtn = document.getElementById('copy-link-btn');
const referralLink = document.getElementById('referral-link');
const copyTooltip = document.querySelector('.copy-tooltip');
const videoEmbed = document.querySelector('.video-embed');
const referralInfoToggle = document.getElementById('referralInfoToggle');
const referralInfoPanel = document.getElementById('referral-info-panel');
// האלמנטים הבאים הוסרו מהדף והוחלפו בתג וידאו ישיר
// const videoPlaceholder = document.querySelector('.video-placeholder');
// const playButton = document.querySelector('.play-button');

// Mobile Menu Toggle
if (mobileMenu) {
    mobileMenu.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
        navMenu.classList.toggle('active');
    });
}

// Referral explainer toggle
if (referralInfoToggle && referralInfoPanel) {
    referralInfoToggle.addEventListener('click', () => {
        const isOpen = referralInfoPanel.classList.toggle('open');
        referralInfoToggle.classList.toggle('active', isOpen);
        referralInfoToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        referralInfoPanel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    });
}

// Close Menu Button
if (closeMenu) {
    closeMenu.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        navMenu.classList.remove('active');
    });
}

// Close mobile menu when clicking on a nav link
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// Accordion functionality
accordionButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Toggle active class on the clicked button
        button.classList.toggle('active');
        
        // Close all other accordion items
        accordionButtons.forEach(otherButton => {
            if (otherButton !== button && otherButton.classList.contains('active')) {
                otherButton.classList.remove('active');
                otherButton.nextElementSibling.style.maxHeight = '0';
            }
        });
        
        // Toggle content visibility
        const content = button.nextElementSibling;
        if (button.classList.contains('active')) {
            content.style.maxHeight = content.scrollHeight + 'px';
        } else {
            content.style.maxHeight = '0';
        }
    });
});

// Referral agent registration CTA
if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', () => {
        window.open('http://localhost:3001/', '_blank', 'noopener');

        if (copyTooltip) {
            copyTooltip.classList.add('show');
            setTimeout(() => {
                copyTooltip.classList.remove('show');
            }, 2000);
        }

        if (typeof gtag === 'function') {
            gtag('event', 'referral_agent_signup_click', {
                event_category: 'engagement',
                event_label: 'referral agent signup'
            });
        }
    });
}

// Video player functionality - עודכן למבנה החדש עם תג video
const videoElement = document.querySelector('.video-embed video');
if (videoElement) {
    videoElement.addEventListener('play', () => {
        // Track video play event for analytics
        if (typeof gtag === 'function') {
            gtag('event', 'play_video', {
                'event_category': 'engagement',
                'event_label': 'explanation video played'
            });
        }
    });
}

// Scroll animation for elements
function animateOnScroll() {
    const elements = document.querySelectorAll('.reveal-on-scroll');
    const screenPosition = window.innerHeight * 0.8;

    elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        if (elementTop < screenPosition) {
            element.classList.add('fade-in');
        }
    });
}

// Add scroll event listener
window.addEventListener('scroll', animateOnScroll);
// Initial check for elements in view
document.addEventListener('DOMContentLoaded', animateOnScroll);

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 80, // Offset for fixed navbar
                behavior: 'smooth'
            });
            
            // Update URL without page reload
            history.pushState(null, null, targetId);
        }
    });
});

// Scroll arrow functionality
const scrollArrow = document.querySelector('.scroll-arrow');
if (scrollArrow) {
    scrollArrow.addEventListener('click', () => {
        const videoSection = document.getElementById('video-section');
        if (videoSection) {
            window.scrollTo({
                top: videoSection.offsetTop - 80,
                behavior: 'smooth'
            });
        }
    });
}

// Track CTA clicks for analytics
document.querySelectorAll('.btn-primary, .btn-secondary').forEach(button => {
    button.addEventListener('click', function() {
        if (typeof gtag === 'function') {
            gtag('event', 'cta_click', {
                'event_category': 'engagement',
                'event_label': this.textContent.trim()
            });
        }
    });
});

// Magnetic button effect
const magneticBtn = document.getElementById('magneticBtn');
if (magneticBtn) {
    magneticBtn.addEventListener('mousemove', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        const moveX = x * 0.15;
        const moveY = y * 0.15;
        
        this.style.transform = `translate(${moveX}px, ${moveY}px)`;
    });
    
    magneticBtn.addEventListener('mouseleave', function() {
        this.style.transform = 'translate(0, 0)';
    });
}

// Counter animation for stats
function animateCounter(element, target, duration = 2000) {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target.toLocaleString('he-IL');
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current).toLocaleString('he-IL');
        }
    }, 16);
}

// 3D Tilt effect for audience cards
function init3DTilt() {
    const cards = document.querySelectorAll('.audience-card');
    
    cards.forEach(card => {
        card.addEventListener('mousemove', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;
            
            this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
        });
    });
}

// Initialize page on load
document.addEventListener('DOMContentLoaded', function() {
    // Open first FAQ item by default
    if (accordionButtons.length > 0) {
        accordionButtons[0].click();
    }
    
    // Initialize 3D tilt effect
    init3DTilt();
    
    // Animate stat counters when in view
    const statNumbers = document.querySelectorAll('.stat-number');
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
                entry.target.classList.add('counted', 'counting');
                const text = entry.target.textContent.replace(/[^0-9]/g, '');
                const target = parseInt(text);
                if (!isNaN(target)) {
                    animateCounter(entry.target, target);
                }
            }
        });
    }, { threshold: 0.5 });
    
    statNumbers.forEach(stat => statsObserver.observe(stat));
    
    // Set up demo referral metrics (for display purposes)
    const friendsCount = document.getElementById('friends-count');
    const earnings = document.getElementById('earnings');
    const meterProgress = document.querySelector('.meter-progress');
    
    if (friendsCount && earnings && meterProgress) {
        // Simulate referral data (would come from backend in real app)
        const demoFriends = 3;
        const demoEarnings = demoFriends * 150;
        const progressPercent = Math.min((demoFriends / 10) * 100, 100);
        
        // Update UI with demo data
        friendsCount.textContent = demoFriends;
        earnings.textContent = demoEarnings;
        meterProgress.style.width = progressPercent + '%';
    }
    
    // Newsletter form handling
    const newsletterForm = document.querySelector('.newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const emailInput = this.querySelector('input[type="email"]');
            const submitBtn = this.querySelector('button');
            
            if (emailInput && emailInput.value) {
                // Show success feedback
                const originalBtnContent = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-check"></i>';
                submitBtn.style.background = 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)';
                
                // Reset after 2 seconds
                setTimeout(() => {
                    submitBtn.innerHTML = originalBtnContent;
                    submitBtn.style.background = '';
                    emailInput.value = '';
                }, 2000);
                
                // Track newsletter signup for analytics
                if (typeof gtag === 'function') {
                    gtag('event', 'newsletter_signup', {
                        'event_category': 'engagement',
                        'event_label': 'footer newsletter'
                    });
                }
            }
        });
    }
    
    // FAQ Accordion
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const answer = question.nextElementSibling;
            const isActive = question.classList.contains('active');
            
            // Close all other FAQs
            faqQuestions.forEach(q => {
                q.classList.remove('active');
                const siblingAnswer = q.nextElementSibling;
                if (siblingAnswer) {
                    siblingAnswer.classList.remove('active');
                    siblingAnswer.style.maxHeight = '0';
                }
            });
            
            // Toggle current FAQ
            if (!isActive) {
                question.classList.add('active');
                answer.classList.add('active');
                answer.style.maxHeight = answer.scrollHeight + 'px';
            } else {
                answer.style.maxHeight = '0';
            }
        });
    });
    
    // Testimonials Slider
    const testimonialSlides = document.querySelectorAll('.testimonial-slide');
    const testimonialDots = document.querySelectorAll('.testimonial-dot');
    let currentTestimonial = 0;
    
    function showTestimonial(index) {
        testimonialSlides.forEach(slide => slide.classList.remove('active'));
        testimonialDots.forEach(dot => dot.classList.remove('active'));
        
        testimonialSlides[index].classList.add('active');
        testimonialDots[index].classList.add('active');
    }
    
    function nextTestimonial() {
        currentTestimonial = (currentTestimonial + 1) % testimonialSlides.length;
        showTestimonial(currentTestimonial);
    }
    
    // Auto-advance every 5 seconds
    if (testimonialSlides.length > 0) {
        setInterval(nextTestimonial, 5000);
        
        // Dot click handlers
        testimonialDots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                currentTestimonial = index;
                showTestimonial(currentTestimonial);
            });
        });
    }
    
    // Product Cards Auto-Rotation is handled in slider.js
});
