
import fetch from 'node-fetch';

const WEKNORA_BASE_URL = 'https://weknora-app-339795034470.us-west1.run.app';
const WEKNORA_API_KEY = 'sk-cXgpE6LF3EmxuRG3CVcRLgegUqlHqoCffsba6U62qP6WBADL';

async function fetchModels() {
    console.log('Fetching Models...');
    try {
        const res = await fetch(`${WEKNORA_BASE_URL}/api/v1/models`, {
            headers: { 'x-api-key': WEKNORA_API_KEY }
        });
        if (res.ok) {
            const data = await res.json();
            const models = data.data || [];
            models.forEach(m => {
                console.log(`ID: ${m.id} | Name: ${m.name} | Type: ${m.type}`);
            });
        } else {
            console.log(`Failed /api/v1/models: ${res.status}`);
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

fetchModels();
