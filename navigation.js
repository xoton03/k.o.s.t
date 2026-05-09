/**
 * K.O.S.T. NAVIGATION SYSTEM
 * Shared logic for the principal navigation drawer.
 */

document.addEventListener('DOMContentLoaded', () => {
    const navDrawer = document.getElementById('nav-drawer');
    const navBackdrop = document.getElementById('nav-backdrop');
    const logoTrigger = document.getElementById('logo-trigger');
    const hamburgerTrigger = document.getElementById('hamburger-trigger');
    const btnCloseDrawer = document.getElementById('btn-close-drawer');

    if (!navDrawer || !navBackdrop) {
        console.warn('Navigation drawer elements not found in DOM.');
        return;
    }

    function openDrawer(e) {
        if (e) e.preventDefault();
        navBackdrop.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Lock scroll
        // Small delay to allow 'hidden' removal before opacity transition
        setTimeout(() => {
            navBackdrop.classList.add('opacity-100');
            navDrawer.classList.remove('-translate-x-full');
        }, 10);
    }

    function closeDrawer(e) {
        if (e) e.preventDefault();
        navBackdrop.classList.remove('opacity-100');
        navDrawer.classList.add('-translate-x-full');
        // Wait for transition to complete before hiding
        setTimeout(() => {
            navBackdrop.classList.add('hidden');
            document.body.style.overflow = ''; // Restore scroll
        }, 300);
    }

    // Event Listeners
    const triggers = [logoTrigger, hamburgerTrigger];
    triggers.forEach(trigger => {
        if (trigger) {
            trigger.addEventListener('click', openDrawer);
            trigger.addEventListener('touchstart', openDrawer, { passive: false });
        }
    });

    if (btnCloseDrawer) {
        btnCloseDrawer.addEventListener('click', closeDrawer);
        btnCloseDrawer.addEventListener('touchstart', closeDrawer, { passive: false });
    }
    
    if (navBackdrop) {
        navBackdrop.addEventListener('click', closeDrawer);
        navBackdrop.addEventListener('touchstart', closeDrawer, { passive: false });
    }

    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !navDrawer.classList.contains('-translate-x-full')) {
            closeDrawer();
        }
    });
});
