// Lazy Loading for Images

document.addEventListener('DOMContentLoaded', function() {
    // Get all images with lazy-load class
    const lazyImages = document.querySelectorAll('img.lazy-load');
    
    // Check if Intersection Observer API is supported
    if ('IntersectionObserver' in window) {
        // Create new observer
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                // If element is in viewport
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const src = img.getAttribute('data-src');
                    
                    if (src) {
                        // Load the image
                        img.src = src;
                        
                        // Add loaded class and remove skeleton loading effect
                        img.addEventListener('load', () => {
                            img.classList.add('loaded');
                            const parent = img.closest('.skeleton-loading');
                            if (parent) {
                                parent.classList.remove('skeleton-loading');
                            }
                        });
                        
                        // Stop observing the image
                        observer.unobserve(img);
                    }
                }
            });
        }, {
            // Options
            rootMargin: '0px 0px 200px 0px', // Load images 200px before they appear in viewport
            threshold: 0.01
        });
        
        // Observe all lazy images
        lazyImages.forEach(img => {
            imageObserver.observe(img);
        });
    } else {
        // Fallback for browsers that don't support Intersection Observer
        function lazyLoadFallback() {
            let scrollTop = window.pageYOffset;
            
            lazyImages.forEach(img => {
                if (img.offsetTop < window.innerHeight + scrollTop) {
                    const src = img.getAttribute('data-src');
                    
                    if (src) {
                        img.src = src;
                        img.addEventListener('load', () => {
                            img.classList.add('loaded');
                            const parent = img.closest('.skeleton-loading');
                            if (parent) {
                                parent.classList.remove('skeleton-loading');
                            }
                        });
                    }
                }
            });
            
            // If all images have been loaded, remove the scroll event listener
            if (lazyImages.length === 0) {
                window.removeEventListener('scroll', lazyLoadFallback);
                window.removeEventListener('resize', lazyLoadFallback);
                window.removeEventListener('orientationchange', lazyLoadFallback);
            }
        }
        
        // Add event listeners for fallback
        window.addEventListener('scroll', lazyLoadFallback);
        window.addEventListener('resize', lazyLoadFallback);
        window.addEventListener('orientationchange', lazyLoadFallback);
        
        // Initial check
        lazyLoadFallback();
    }
});
