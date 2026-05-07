// State Management
let inventory = [];
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyLTx3UJtcZ96MNOYq7Kdkm8BDcOYzu-gLOkFDALPpdzrGmsKsUx_IdOZenLq8a0AdM-w/exec';

// Supabase Config
const SUPABASE_URL = "https://jphzmgscxpejcyjlnspq.supabase.co";
const SUPABASE_KEY = "sb_publishable_gshF6Y08DYJYO9c8Z_Cv2Q_9nEZr7J9";

// Supabase Helper
async function supabaseFetch(table, select = '*', filters = {}) {
    let url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}`;
    Object.entries(filters).forEach(([key, val]) => {
        url += `&${key}=eq.${encodeURIComponent(val)}`;
    });
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) throw new Error('Erreur réseau Supabase');
    return await response.json();
}

// Persistence Logic
function saveToLocal() {
    localStorage.setItem('kost_backup', JSON.stringify(inventory));
}

function loadFromLocal() {
    const backup = localStorage.getItem('kost_backup');
    if (backup) {
        try {
            inventory = JSON.parse(backup);
            renderList();
            showToast('Données locales restaurées.', 'success');
        } catch (e) {
            console.error('Erreur LocalStorage:', e);
        }
    }
}

function clearCache() {
    if (confirm('Voulez-vous vraiment vider le cache local ? Cela supprimera tous les scans non synchronisés.')) {
        localStorage.removeItem('kost_backup');
        inventory = [];
        renderList();
        showToast('Cache vidé.', 'error');
    }
}

const form = document.getElementById('stock-form');
const inventoryList = document.getElementById('inventory-list');
const emptyState = document.getElementById('empty-state');
const itemCountSpan = document.getElementById('item-count');
const statValidated = document.getElementById('stat-validated');
const statPending = document.getElementById('stat-pending');
const btnCloud = document.getElementById('btn-cloud');
const btnRefresh = document.getElementById('btn-refresh');
const toastContainer = document.getElementById('toast-container');
const dbStatus = document.getElementById('db-status');
const barcodeInput = document.getElementById('barcode');
const emplacementInput = document.getElementById('emplacement');

// Modal Elements
const searchModal = document.getElementById('search-modal');
const modalContent = document.getElementById('modal-content');
const btnOpenSearch = document.getElementById('btn-open-search');
const btnCloseModal = document.getElementById('btn-close-modal');
const modalSearchForm = document.getElementById('modal-search-form');
const searchLoader = document.getElementById('search-loader');

// Initialize Lucide Icons
lucide.createIcons();

// Update Clock
function updateClock() {
    const now = new Date();
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
        timeElement.textContent = now.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
}
setInterval(updateClock, 1000);
updateClock();

// Modal Logic
function resetModalState() {
    const refInput = document.getElementById('modal-ref');
    const colorSelect = document.getElementById('modal-color');
    const sizeSelect = document.getElementById('modal-size');
    const colorGroup = document.getElementById('color-group');
    const sizeGroup = document.getElementById('size-group');
    
    if(refInput) refInput.value = '';
    
    if(colorSelect) {
        colorSelect.innerHTML = '<option value="">Choisir une couleur...</option>';
        colorSelect.value = '';
    }
    if(sizeSelect) {
        sizeSelect.innerHTML = '<option value="">Choisir une taille...</option>';
        sizeSelect.value = '';
    }
    
    if(colorGroup) colorGroup.classList.add('hidden');
    if(sizeGroup) sizeGroup.classList.add('hidden');
    if(searchLoader) searchLoader.classList.add('hidden');
}

function openModal() {
    resetModalState();
    if (searchModal) {
        searchModal.classList.remove('hidden');
        searchModal.classList.add('flex');
    }
    setTimeout(() => {
        if (modalContent) {
            modalContent.classList.remove('scale-95', 'opacity-0');
            modalContent.classList.add('scale-100', 'opacity-100');
        }
        const refInput = document.getElementById('modal-ref');
        if (refInput) refInput.focus();
    }, 10);
}

function closeModal() {
    if (modalContent) {
        modalContent.classList.remove('scale-100', 'opacity-100');
        modalContent.classList.add('scale-95', 'opacity-0');
    }
    setTimeout(() => {
        if (searchModal) {
            searchModal.classList.add('hidden');
            searchModal.classList.remove('flex');
        }
    }, 300);
}

if (btnOpenSearch) btnOpenSearch.addEventListener('click', openModal);
if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
if (searchModal) {
    searchModal.addEventListener('click', (e) => {
        if (e.target === searchModal) closeModal();
    });
}

// Automated Barcode Handling
barcodeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        performSearch();
    }
});

// Cascade Funnel Logic (Supabase)
const modalRef = document.getElementById('modal-ref');
const modalColor = document.getElementById('modal-color');
const modalSize = document.getElementById('modal-size');
const colorGroup = document.getElementById('color-group');
const sizeGroup = document.getElementById('size-group');

if (modalRef) {
    modalRef.addEventListener('input', async (e) => {
        let val = e.target.value.trim();
        if (val.length === 5) {
            val = val.toUpperCase();
            e.target.value = val;
            
            searchLoader.classList.remove('hidden');
            colorGroup.classList.add('hidden');
            sizeGroup.classList.add('hidden');

            try {
                const data = await supabaseFetch('produits_kiabi', 'couleur', { code_article: val });
                
                if (data && data.length > 0) {
                    const uniqueColors = [...new Set(data.map(i => i.couleur))];
                    modalColor.innerHTML = '<option value="">Choisir une couleur...</option>';
                    uniqueColors.forEach(color => {
                        modalColor.innerHTML += `<option value="${color}">${color}</option>`;
                    });
                    colorGroup.classList.remove('hidden');
                } else {
                    showToast('Référence introuvable sur Supabase', 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('Erreur de connexion Supabase', 'error');
            } finally {
                searchLoader.classList.add('hidden');
            }
        } else {
            colorGroup.classList.add('hidden');
            sizeGroup.classList.add('hidden');
        }
    });
}

if (modalColor) {
    modalColor.addEventListener('change', async (e) => {
        const color = e.target.value;
        const ref = modalRef.value;
        
        if (!color) {
            sizeGroup.classList.add('hidden');
            return;
        }

        searchLoader.classList.remove('hidden');
        sizeGroup.classList.add('hidden');

        try {
            const data = await supabaseFetch('produits_kiabi', 'taille', { 
                code_article: ref, 
                couleur: color 
            });
            
            if (data && data.length > 0) {
                const uniqueSizes = [...new Set(data.map(i => i.taille))];
                modalSize.innerHTML = '<option value="">Choisir une taille...</option>';
                uniqueSizes.forEach(size => {
                    modalSize.innerHTML += `<option value="${size}">${size}</option>`;
                });
                sizeGroup.classList.remove('hidden');
            }
        } catch (err) {
            console.error(err);
            showToast('Erreur récupération tailles', 'error');
        } finally {
            searchLoader.classList.add('hidden');
        }
    });
}

if (modalSize) {
    modalSize.addEventListener('change', async (e) => {
        const size = e.target.value;
        const ref = modalRef.value;
        const color = modalColor.value;

        if (!size) return;

        searchLoader.classList.remove('hidden');

        try {
            const data = await supabaseFetch('produits_kiabi', 'code_barres', { 
                code_article: ref, 
                couleur: color,
                taille: size
            });
            
            if (data && data.length > 0) {
                const barcode = data[0].code_barres;
                barcodeInput.value = barcode;
                closeModal();
                showToast(`Code-barres récupéré : ${barcode}`, 'success');
                barcodeInput.focus();
            }
        } catch (err) {
            console.error(err);
            showToast('Erreur récupération code-barres', 'error');
        } finally {
            searchLoader.classList.add('hidden');
        }
    });
}


// Main Search Logic
function performSearch() {
    const barcode = barcodeInput.value.trim();
    if (!barcode) return;

    const newItem = {
        id: Date.now(),
        uuid: crypto.randomUUID(),
        barcode: barcode,
        emplacement: emplacementInput.value || 'N/A',
        timestamp: new Date().toLocaleTimeString('fr-FR'),
        status: 'En attente'
    };

    inventory.unshift(newItem);
    renderList();
    
    barcodeInput.value = '';
    barcodeInput.focus();
}

// Render List
function renderList() {
    if (inventory.length === 0) {
        inventoryList.innerHTML = '';
        inventoryList.appendChild(emptyState);
    } else {
        emptyState.remove();
        inventoryList.innerHTML = inventory.map((item, index) => {
            let statusClass = 'status-pending';
            let dotColor = 'bg-yellow-400';
            
            if (item.status === 'Validé (Cloud)') {
                statusClass = 'status-cloud';
                dotColor = 'bg-cyan-400';
            } else if (item.status === 'Validé') {
                statusClass = 'status-validated';
                dotColor = 'bg-[#00FFC2]';
            } else if (item.status === 'Supprimé (Cloud)') {
                statusClass = 'status-deleted';
                dotColor = 'bg-red-500';
            }

            const rowClass = item.status === 'Supprimé (Cloud)' 
                ? 'row-deleted animate-entrance group hover:bg-white/[0.03] transition-all border-b border-white/[0.03]' 
                : 'animate-entrance group hover:bg-white/[0.03] transition-all border-b border-white/[0.03]';

            // Barcode dynamic styling
            const barcodeStr = String(item.barcode || '').trim();
            const barcodeColor = barcodeStr.length === 13 ? 'text-white' : 'text-red-500 font-black';
            
            // Icon selection
            let statusIcon = 'hourglass'; 
            if (item.status === 'Validé (Cloud)') statusIcon = 'cloud-check';
            if (item.status === 'Supprimé (Cloud)') statusIcon = 'cloud-off';
            if (item.status === 'Validé') statusIcon = 'check-circle';

            return `
                <tr class="${rowClass}" style="animation-delay: ${index * 40}ms">
                    <td class="px-8 py-5">
                        <div class="flex flex-col">
                            <span class="font-bold text-white tracking-tight">${item.emplacement}</span>
                            <span class="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">${item.timestamp}</span>
                        </div>
                    </td>
                    <td class="px-8 py-5">
                        <span class="font-mono ${barcodeColor} tracking-widest text-sm transition-colors">${item.barcode}</span>
                    </td>
                    <td class="px-8 py-5">
                        <span class="status-pill ${statusClass}">
                            <i data-lucide="${statusIcon}" class="w-3 h-3"></i>
                            ${item.status}
                        </span>
                    </td>
                    <td class="px-8 py-5 text-right flex justify-end gap-2">
                        <button id="btn-edit-${item.id}" onclick="editItem(${item.id})" class="text-slate-700 hover:text-cyan-400 p-2 transition-all hover:scale-110 active:scale-90">
                            <i data-lucide="pencil" class="w-5 h-5"></i>
                        </button>
                        <button id="btn-delete-${item.id}" onclick="deleteItem(${item.id})" class="text-slate-700 hover:text-red-400 p-2 transition-all hover:scale-110 active:scale-90">
                            <i data-lucide="trash-2" class="w-5 h-5"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        lucide.createIcons();
    }

    itemCountSpan.textContent = `${inventory.length} article${inventory.length > 1 ? 's' : ''}`;
    statValidated.textContent = inventory.filter(i => i.status.includes('Validé')).length;
    statPending.textContent = inventory.filter(i => i.status === 'En attente').length;
    
    // Sauvegarde auto à chaque changement de l'état
    saveToLocal();
}

// Edit Item UI Logic
const editModal = document.getElementById('edit-modal');
const editModalContent = document.getElementById('edit-modal-content');
const btnCloseEdit = document.getElementById('btn-close-edit');
const modalEditForm = document.getElementById('modal-edit-form');

window.editItem = (id) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    
    document.getElementById('edit-id').value = item.id;
    document.getElementById('edit-uuid').value = item.uuid || '';
    document.getElementById('edit-emplacement').value = item.emplacement;
    document.getElementById('edit-barcode').value = item.barcode;
    
    if (editModal) {
        editModal.classList.remove('hidden');
        editModal.classList.add('flex');
    }
    setTimeout(() => {
        if (editModalContent) {
            editModalContent.classList.remove('scale-95', 'opacity-0');
            editModalContent.classList.add('scale-100', 'opacity-100');
        }
        document.getElementById('edit-emplacement').focus();
    }, 10);
};

function closeModalEdit() {
    if (editModalContent) {
        editModalContent.classList.remove('scale-100', 'opacity-100');
        editModalContent.classList.add('scale-95', 'opacity-0');
    }
    setTimeout(() => {
        if (editModal) {
            editModal.classList.add('hidden');
            editModal.classList.remove('flex');
        }
    }, 300);
}

if (btnCloseEdit) btnCloseEdit.addEventListener('click', closeModalEdit);
if (editModal) {
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) closeModalEdit();
    });
}

// Save Edit Logic
if (modalEditForm) {
    modalEditForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = parseFloat(document.getElementById('edit-id').value);
        const newEmplacement = document.getElementById('edit-emplacement').value.trim();
        const newBarcode = document.getElementById('edit-barcode').value.trim();
        
        const item = inventory.find(i => i.id === id);
        if (!item) return;
        
        item.emplacement = newEmplacement;
        item.barcode = newBarcode;
        
        closeModalEdit();
        renderList();
        
        if (item.status === 'Validé (Cloud)') {
            try {
                const payload = {
                    action: 'UPDATE',
                    data: {
                        uuid: item.uuid,
                        emplacement: newEmplacement,
                        barcode: newBarcode
                    }
                };
                
                await fetch(GAS_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                showToast('Article modifié sur le Cloud.', 'cloud');
            } catch (err) {
                console.error(err);
                showToast('Erreur lors de la modification Cloud.', 'error');
            }
        } else {
            showToast('Article modifié localement.', 'success');
        }
    });
}

// Delete Item
window.deleteItem = async (id) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    
    // Disable button to prevent double clicks
    const btn = document.getElementById(`btn-delete-${id}`);
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>`;
        lucide.createIcons();
    }
    
    if (item.status === 'Validé (Cloud)') {
        try {
            const payload = {
                action: 'DELETE',
                data: { uuid: item.uuid }
            };
            
            await fetch(GAS_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            showToast('Article supprimé du Cloud.', 'cloud');
        } catch (err) {
            console.error(err);
            showToast('Échec de la suppression Cloud.', 'error');
        }
    } else {
        showToast('Article supprimé localement.', 'success');
    }
    
    inventory = inventory.filter(i => i.id !== id);
    renderList();
};

// Real Cloud Synchronization (Google Apps Script)
async function envoyerAuCloud() {
    // Filter to get only 'En attente' lines as requested
    const itemsToSend = inventory.filter(item => item.status === 'En attente');
    
    if (itemsToSend.length === 0) {
        showToast('Aucun article "En attente" à envoyer.', 'info');
        return;
    }

    const originalContent = btnCloud.innerHTML;
    btnCloud.disabled = true;
    btnCloud.innerHTML = `
        <i data-lucide="loader-2" class="w-6 h-6 animate-spin"></i>
        Envoi en cours...
    `;
    lucide.createIcons();

    try {
        const payload = {
            action: 'ADD',
            data: itemsToSend.map(item => ({
                emplacement: item.emplacement,
                barcode: item.barcode,
                uuid: item.uuid
            }))
        };

        // Execute fetch with no-cors to bypass security policies in local context
        await fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // Since no-cors gives an opaque response, we assume success if no network error occurred
        itemsToSend.forEach(item => {
            item.status = 'Validé (Cloud)';
        });

        renderList();
        showToast(`${itemsToSend.length} articles envoyés au Cloud avec succès !`, 'cloud');
    } catch (err) {
        console.error('Cloud Sync Error:', err);
        showToast('Échec de la connexion réseau au Cloud.', 'error');
    } finally {
        btnCloud.disabled = false;
        btnCloud.innerHTML = originalContent;
        lucide.createIcons();
    }
}

btnCloud.addEventListener('click', envoyerAuCloud);

// Synchroniser avec le Cloud (GET)
async function actualiserCloud() {
    const originalContent = btnRefresh.innerHTML;
    btnRefresh.disabled = true;
    btnRefresh.innerHTML = `<i data-lucide="loader-2" class="w-6 h-6 animate-spin"></i> ACTUALISATION...`;
    lucide.createIcons();

    try {
        const response = await fetch(GAS_URL, {
            method: 'GET',
            redirect: 'follow'
        });
        
        const data = await response.json();
        
        if (data && data.status === 'success' && Array.isArray(data.items)) {
            // Conserver uniquement les articles locaux "En attente"
            const pendingItems = inventory.filter(item => item.status === 'En attente');
            
            // Transformer les données du Cloud en format local
            const cloudItems = data.items.map(cloudItem => ({
                id: Date.now() + Math.random(),
                emplacement: cloudItem.emplacement || 'INCONNU',
                barcode: cloudItem.barcode || 'INCONNU',
                uuid: cloudItem.uuid,
                status: 'Validé (Cloud)',
                timestamp: new Date().toISOString()
            }));
            
            // Fusionner : Nouveaux items du Cloud + articles locaux en attente
            inventory = [...cloudItems, ...pendingItems];
            
            // Tri décroissant
            inventory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            renderList();
            showToast(`Mise à jour terminée : ${cloudItems.length} articles récupérés.`, 'cloud');
        } else {
            showToast('Erreur dans la réponse du serveur.', 'error');
        }
    } catch (err) {
        console.error('Erreur GET:', err);
        showToast('Impossible de récupérer les données du Cloud. Vérifiez les règles CORS.', 'error');
    } finally {
        btnRefresh.disabled = false;
        btnRefresh.innerHTML = originalContent;
        lucide.createIcons();
    }
}

if (btnRefresh) {
    btnRefresh.addEventListener('click', actualiserCloud);
}

// Toast Notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    let icon = 'info';
    let color = 'text-blue-400';
    if (type === 'success') { icon = 'check-circle'; color = 'text-green-400'; }
    if (type === 'error') { icon = 'alert-circle'; color = 'text-red-400'; }
    if (type === 'cloud') { icon = 'cloud-check'; color = 'text-indigo-400'; }
    toast.innerHTML = `<i data-lucide="${icon}" class="w-5 h-5 ${color}"></i><span class="text-sm font-medium">${message}</span>`;
    toastContainer.appendChild(toast);
    lucide.createIcons();
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Event Listeners for Cache
const btnClearCache = document.getElementById('btn-clear-cache');
if (btnClearCache) btnClearCache.addEventListener('click', clearCache);

// Initialization sequence
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocal();
    // Auto-Sync with Cloud
    setTimeout(() => {
        actualiserCloud();
    }, 1000);
});
