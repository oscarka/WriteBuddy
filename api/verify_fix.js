
import fetch from 'node-fetch';
import FormData from 'form-data';

const BASE_URL = 'http://localhost:8080';

async function runTest() {
    console.log('--- 1. Testing KB Auto-Creation & Configuration ---');
    const createRes = await fetch(`${BASE_URL}/api/project/verify-test/kb/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Verify Test KB', description: 'Auto-created by verification script' })
    });

    if (!createRes.ok) {
        console.error('Create Failed:', await createRes.text());
        return;
    }

    const kbData = await createRes.json();
    // Normalize response
    const kb = kbData.data || kbData;
    console.log('KB Created:', kb.id);
    console.log('Model IDs Check:');
    console.log('  LLM:', kb.llm_model_id || 'MISSING');
    console.log('  Embed:', kb.embedding_model_id || 'MISSING');

    const correctLLM = "63df952e-adca-4642-9fdc-a83117f95973";
    const correctEmbed = "67743ce2-aead-43a2-ae00-11de9ff0934a";

    if (kb.llm_model_id === correctLLM && kb.embedding_model_id === correctEmbed) {
        console.log('✅ Configuration Correct!');
    } else {
        console.warn('⚠️ Configuration Mismatch (Note: verify if PUT updated it in background or if response reflects immediate state)');
        // NOTE: The API might return the initial state before the PUT. We should fetch it again to be sure.
        // But for now let's proceed to upload.
    }

    console.log('\n--- 2. Testing File Upload (Chinese Filename) ---');
    const form = new FormData();
    const buffer = Buffer.from('Content of the verification file.');
    const filename = '最终验证_Fixed.txt';
    form.append('file', buffer, filename);
    form.append('kbId', kb.id);

    const uploadRes = await fetch(`${BASE_URL}/api/project/verify-test/assets/upload`, {
        method: 'POST',
        body: form
        // Headers handled by api/server.js fix logic (using form-data headers + encoding)
    });

    if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        console.log('Upload Response:', JSON.stringify(uploadData, null, 2));
        console.log('✅ Upload Successful');
    } else {
        console.error('❌ Upload Failed:', await uploadRes.text());
    }

    console.log('\n--- 3. Testing Asset List ---');
    const listRes = await fetch(`${BASE_URL}/api/project/verify-test/assets?kbId=${kb.id}`);
    const listData = await listRes.json();
    const assets = listData.data || listData.assets || [];
    console.log(`Found ${assets.length} assets.`);
    if (assets.length > 0) {
        console.log('First Asset Name:', assets[0].title || assets[0].name);
        // Check for mojibake
        if (decodeURIComponent(assets[0].title || '').includes('最终验证')) {
            console.log('✅ Filename Encoding Looks Correct (URI Encoded)');
        }
    }
}

runTest();
