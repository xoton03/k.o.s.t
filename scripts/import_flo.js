const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://jphzmgscxpejcyjlnspq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gshF6Y08DYJYO9c8Z_Cv2Q_9nEZr7J9';

async function importData() {
    const csvPath = path.join(__dirname, '../assets/Nouvelle base flo.csv');
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split(/\r?\n|\r/);
    
    const headers = lines[0].split(';');
    console.log('Headers:', headers);

    const records = new Map();

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const cols = line.split(';');
        
        // RZfZrences (0) ; Nom de l'article (1) ; Code-barres article (2) ; Brand (3) ; Type (4) ; Taille (5) ; Couleur (6) ; MarchZ (7) ; Genre (8) ; Groupe (9) ; Prix (10) ; Prix remise (11)
        const ref_article = cols[0] ? cols[0].trim() : null;
        const libelle = cols[1] ? cols[1].trim() : null;
        let gencod = cols[2] ? cols[2].trim() : null;
        
        if (!gencod) continue;
        // Fix scientific notation or extra spaces if any
        
        let prix_tarif = cols[10] ? cols[10].trim() : null;
        if (prix_tarif && prix_tarif.includes('da')) {
            prix_tarif = parseFloat(prix_tarif.replace('da', '').trim());
        } else if (prix_tarif) {
            prix_tarif = parseFloat(prix_tarif);
        } else {
            prix_tarif = null;
        }
        
        let prix_reduit = cols[11] ? cols[11].trim() : null;
        if (prix_reduit && prix_reduit.includes('da')) {
            prix_reduit = parseFloat(prix_reduit.replace('da', '').trim());
        } else if (prix_reduit) {
            prix_reduit = parseFloat(prix_reduit);
        } else {
            prix_reduit = null;
        }
        
        // Deduplicate using Map
        if (!records.has(gencod)) {
            records.set(gencod, {
                gencod,
                ref_article,
                libelle,
                prix_tarif: isNaN(prix_tarif) ? null : prix_tarif,
                prix_reduit: isNaN(prix_reduit) ? null : prix_reduit,
                rdc: null,
                prix_remis: null
            });
        }
    }

    const payload = Array.from(records.values());
    console.log(`Parsed ${payload.length} unique records to insert.`);

    // Chunk array
    const chunkSize = 1000;
    for (let i = 0; i < payload.length; i += chunkSize) {
        const chunk = payload.slice(i, i + chunkSize);
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/flo_stock`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(chunk)
        });

        if (!response.ok) {
            const error = await response.text();
            console.error(`Error inserting chunk ${i/chunkSize}:`, error);
        } else {
            console.log(`Successfully inserted chunk ${i/chunkSize} (${chunk.length} records)`);
        }
    }
    
    console.log('Import completed.');
}

importData().catch(console.error);
