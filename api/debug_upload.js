
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

const WEKNORA_BASE_URL = 'http://localhost:8080'; // Test against local proxy

async function run() {
    // 1. List KBs to find mock-2
    console.log('--- Listing KBs via Direct WeKnora Call (to find ID) ---');
    const WEKNORA_URL = 'https://weknora-app-339795034470.us-west1.run.app';
    const KEY = 'sk-cXgpE6LF3EmxuRG3CVcRLgegUqlHqoCffsba6U62qP6WBADL';

    const listRes = await fetch(`${WEKNORA_URL}/api/v1/knowledge-bases`, {
        headers: { 'x-api-key': KEY }
    });
    const listData = await listRes.json();
    const kbs = Array.isArray(listData) ? listData : (listData.data || []);
    console.log(`Found ${kbs.length} KBs`);

    const mockKB = kbs.find(k => k.name.includes('mock-2') || k.description.includes('mock-2'));
    if (!mockKB) {
        console.error('Could not find KB for mock-2');
        return;
    }
    console.log('Target KB:', mockKB.id, mockKB.name);

    // 2. Upload test file via Local Proxy
    console.log('\n--- Testing Upload via Proxy ---');
    const form = new FormData();
    // Create a dummy file buffer
    const buffer = Buffer.from('Testing Chinese filename upload - Attempt 3 (URI Encoded)');
    form.append('file', buffer, '测试文档_URI编码.txt');
    form.append('kbId', mockKB.id);

    try {
        const uploadRes = await fetch(`${WEKNORA_BASE_URL}/api/project/mock-2/assets/upload`, {
            method: 'POST',
            body: form,
            // node-fetch with FormData: do NOT set Content-Type manually, let form-data do it
            // checking if my proxy handles this
        });

        console.log('Response Status:', uploadRes.status);
        const text = await uploadRes.text();
        console.log('Response Body:', text);
    } catch (e) {
        console.error('Upload Error:', e);
    }
}

run();
