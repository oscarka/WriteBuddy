
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const API_BASE_URL = 'http://localhost:8080';
// You normally need to run the server with WEKNORA_BASE_URL and WEKNORA_API_KEY
// This script assumes the server is running.

async function testPhase1() {
    console.log('=== Starting Phase 1 API Verification ===');

    // 1. Health Check
    try {
        const healthRes = await fetch(`${API_BASE_URL}/health`);
        const health = await healthRes.json();
        console.log('Health Check:', health);
        if (!health.hasWeKnora) {
            console.error('CRITICAL: WeKnora is NOT configured on the server. Aborting tests.');
            return;
        }
    } catch (e) {
        console.error('Failed to connect to API server. Is it running?', e.message);
        return;
    }

    const projectId = `test-project-${Date.now()}`;
    let kbId = null;

    // 2. Create Knowledge Base
    console.log(`\n--- Testing Create KB for project: ${projectId} ---`);
    try {
        const createRes = await fetch(`${API_BASE_URL}/api/project/${projectId}/kb/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: `KB for ${projectId}`,
                description: 'Automated test KB'
            })
        });

        if (createRes.ok) {
            const kbData = await createRes.json();
            console.log('KB Created Successfully:', kbData);
            kbId = kbData.kb_id || (kbData.data && kbData.data.id) || null;
        } else {
            console.error('Create KB Failed:', await createRes.text());
        }
    } catch (e) {
        console.error('Create KB Error:', e);
    }

    if (!kbId) {
        console.log('Skipping Upload/List tests because KB creation failed.');
        return;
    }

    // 3. Upload Asset
    console.log(`\n--- Testing Upload Asset to KB: ${kbId} ---`);
    try {
        // Create a dummy file
        const dummyFilePath = path.join(process.cwd(), 'dummy_test_doc.txt');
        fs.writeFileSync(dummyFilePath, 'This is a test document for WeKnora integration.');

        const form = new FormData();
        form.append('kbId', kbId);
        form.append('file', fs.createReadStream(dummyFilePath));

        const uploadRes = await fetch(`${API_BASE_URL}/api/project/${projectId}/assets/upload`, {
            method: 'POST',
            body: form
        });

        if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            console.log('Asset Uploaded Successfully:', uploadData);
        } else {
            console.error('Asset Upload Failed:', await uploadRes.text());
        }

        // Cleanup
        fs.unlinkSync(dummyFilePath);
    } catch (e) {
        console.error('Upload Asset Error:', e);
    }

    // 4. List Assets
    console.log(`\n--- Testing List Assets for KB: ${kbId} ---`);
    try {
        const listRes = await fetch(`${API_BASE_URL}/api/project/${projectId}/assets?kbId=${kbId}`);
        if (listRes.ok) {
            const listData = await listRes.json();
            console.log('Assets List:', JSON.stringify(listData, null, 2));
        } else {
            console.error('List Assets Failed:', await listRes.text());
        }
    } catch (e) {
        console.error('List Assets Error:', e);
    }

    console.log('\n=== Verification Complete ===');
}

testPhase1();
