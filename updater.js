/**
 * K.O.S.T. UPDATER SYSTEM
 * Centralized Service Worker management and update notifications.
 */

class KostUpdater {
    constructor() {
        this.registration = null;
        this.updateInterval = 30 * 60 * 1000; // 30 minutes
        this.init();
    }

    init() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => this.registerSW());
            
            // Listen for the controlling service worker changing (on skipWaiting)
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                window.location.reload();
            });
        }
    }

    async registerSW() {
        try {
            this.registration = await navigator.serviceWorker.register('sw.js');
            console.log('SW Registered:', this.registration.scope);

            // Check for updates immediately
            this.checkUpdate(this.registration);

            // Set up periodic check
            setInterval(() => {
                console.log('Checking for updates...');
                this.registration.update();
            }, this.updateInterval);

            // Listen for new worker installation
            this.registration.addEventListener('updatefound', () => {
                const newWorker = this.registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        this.showUpdateBanner(newWorker);
                    }
                });
            });

            // If a worker is already waiting, show banner
            if (this.registration.waiting) {
                this.showUpdateBanner(this.registration.waiting);
            }

        } catch (error) {
            console.error('SW Registration failed:', error);
        }
    }

    checkUpdate(registration) {
        if (registration.waiting) {
            this.showUpdateBanner(registration.waiting);
        }
    }

    showUpdateBanner(worker) {
        if (document.getElementById('kost-update-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'kost-update-banner';
        banner.innerHTML = `
            <div class="update-content">
                <div class="update-icon">
                    <i data-lucide="zap" class="w-5 h-5"></i>
                </div>
                <div class="update-text">
                    <span class="update-title">Nouvelle version disponible !</span>
                    <span class="update-subtitle">Mise à jour prête pour installation.</span>
                </div>
                <button id="btn-apply-update" class="update-btn">
                    <span>Mettre à jour</span>
                    <i data-lucide="arrow-right" class="w-4 h-4"></i>
                </button>
            </div>
        `;

        document.body.appendChild(banner);
        
        // Initialize Lucide icons for the new elements
        if (window.lucide) {
            window.lucide.createIcons();
        }

        document.getElementById('btn-apply-update').addEventListener('click', () => {
            worker.postMessage('SKIP_WAITING');
            banner.classList.add('updating');
            document.getElementById('btn-apply-update').innerHTML = `
                <i data-lucide="loader" class="w-4 h-4 animate-spin"></i>
                <span>Installation...</span>
            `;
            if (window.lucide) window.lucide.createIcons();
        });
    }
}

// Initialize updater
window.kostUpdater = new KostUpdater();
