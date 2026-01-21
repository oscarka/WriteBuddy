
import fetch from 'node-fetch';

const WEKNORA_BASE_URL = process.env.WEKNORA_BASE_URL || 'https://weknora-app-339795034470.us-west1.run.app';
const WEKNORA_API_KEY = process.env.WEKNORA_API_KEY || 'sk-cXgpE6LF3EmxuRG3CVcRLgegUqlHqoCffsba6U62qP6WBADL';

async function cleanup() {
    console.log('Listing all KBs...');
    const listRes = await fetch(`${WEKNORA_BASE_URL}/api/v1/knowledge-bases`, {
        headers: { 'x-api-key': WEKNORA_API_KEY }
    });

    if (!listRes.ok) {
        console.error('Failed to list KBs:', await listRes.text());
        return;
    }

    const data = await listRes.json();
    // Support inconsistent API returns (array vs {data: array})
    const kbs = Array.isArray(data) ? data : (data.data || []);
    console.log(`Found ${kbs.length} KBs.`);

    for (const kb of kbs) {
        console.log(`Deleting KB: ${kb.id} (${kb.name})...`);
        const delRes = await fetch(`${WEKNORA_BASE_URL}/api/v1/knowledge-bases/${kb.id}`, {
            method: 'DELETE',
            headers: { 'x-api-key': WEKNORA_API_KEY }
        });
        if (delRes.ok) {
            console.log(`Deleted ${kb.id}.`);
        } else {
            console.error(`Failed to delete ${kb.id}:`, await delRes.text());
        }
    }
    console.log('Cleanup complete.');
}

cleanup();
