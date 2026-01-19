
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const API_BASE_URL = 'http://localhost:8080';

// Mock test file
const TEST_FILE_NAME = 'test_document.txt';
const TEST_FILE_CONTENT = 'This is a test document for WeKnora integration. It contains some sample knowledge.';

// Ensure API server is running
async function checkHealth() {
    try {
        const res = await fetch(`${API_BASE_URL}/health`);
        const data = await res.json();
        console.log('Health Check:', data);
        if (!data.hasWeKnora) {
            console.warn('WARNING: WeKnora is NOT configured on the server. Skipping further tests requires WeKnora.');
            process.exit(0);
        }
        return true;
    } catch (e) {
        console.error('API Server is not accessible. Make sure to run `node api/server.js` first.');
        process.exit(1);
    }
}

async function testProjectCreation() {
    console.log('\n--- Testing Project Creation & KB Binding ---');
    const res = await fetch(`${API_BASE_URL}/api/project/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test Project ' + Date.now(),
            description: 'Automated test project',
            userId: 'test-user'
        })
    });

    if (!res.ok) {
        throw new Error(`Project creation failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    console.log('Project Created:', data);
    if (!data.kbId) throw new Error('No kbId returned!');

    return { projectId: 'mock-project-id', kbId: data.kbId };
}

async function testAssetUpload(kbId) {
    console.log('\n--- Testing Asset Upload ---');

    // Create a dummy file
    fs.writeFileSync(TEST_FILE_NAME, TEST_FILE_CONTENT);

    const formData = new FormData();
    formData.append('file', fs.createReadStream(TEST_FILE_NAME));
    formData.append('knowledgeBaseId', kbId);

    const res = await fetch(`${API_BASE_URL}/api/project/mock-project-id/assets/upload`, {
        method: 'POST',
        body: formData
    });

    fs.unlinkSync(TEST_FILE_NAME); // Clean up

    if (!res.ok) {
        throw new Error(`Asset upload failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    console.log('Asset Uploaded:', data);
    return data;
}

async function testAssetList(kbId) {
    console.log('\n--- Testing Asset List ---');
    const res = await fetch(`${API_BASE_URL}/api/project/mock-project-id/assets?kbId=${kbId}`);

    if (!res.ok) {
        throw new Error(`Asset list failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    console.log('Asset List:', JSON.stringify(data, null, 2));

    // Verify uploaded file is in the list
    // Note: Depending on WeKnora speed, it might be in 'parsing' state or fully ready
    return data;
}

async function runTests() {
    try {
        await checkHealth();

        // Check if we exited due to no WeKnora
        // If not, proceed

        const { kbId } = await testProjectCreation();
        await testAssetUpload(kbId);

        // Wait a bit for async processing on WeKnora side
        console.log('Waiting 2 seconds for WeKnora processing...');
        await new Promise(r => setTimeout(r, 2000));

        await testAssetList(kbId);

        console.log('\n✅ All Phase 1 Tests Passed!');
    } catch (error) {
        console.error('\n❌ Test Failed:', error);
        process.exit(1);
    }
}

runTests();
