
import fetch from 'node-fetch';

const WEKNORA_BASE_URL = 'https://weknora-app-339795034470.us-west1.run.app';
const WEKNORA_API_KEY = 'sk-cXgpE6LF3EmxuRG3CVcRLgegUqlHqoCffsba6U62qP6WBADL';

async function debugPut() {
    // 1. Create a Temp KB
    console.log('Creating Temp KB...');
    const createRes = await fetch(`${WEKNORA_BASE_URL}/api/v1/knowledge-bases`, {
        method: 'POST',
        headers: { 'x-api-key': WEKNORA_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'DebugPUT', description: 'Testing PUT structure', type: 'document' })
    });
    const createData = await createRes.json();
    const kb = createData.data || createData;
    const kbId = kb.id || kb.kb_id;
    console.log('Temp KB ID:', kbId);

    // 2. Try Payload Variant A: Flat with empty config
    console.log('\n--- Variant A: Flat + Empty Config ---');
    await tryPut(kbId, {
        name: 'DebugPUT-A',
        description: 'Update A',
        llm_model_id: "63df952e-adca-4642-9fdc-a83117f95973",
        embedding_model_id: "67743ce2-aead-43a2-ae00-11de9ff0934a",
        config: {}
    });

    // 3. Try Payload Variant B: IDs inside Config
    console.log('\n--- Variant B: IDs Inside Config ---');
    await tryPut(kbId, {
        name: 'DebugPUT-B',
        description: 'Update B',
        config: {
            llm_model_id: "63df952e-adca-4642-9fdc-a83117f95973",
            embedding_model_id: "67743ce2-aead-43a2-ae00-11de9ff0934a"
        }
    });

    // 4. Try Payload Variant C: Config with dummy fields
    console.log('\n--- Variant C: Config with basic params ---');
    await tryPut(kbId, {
        name: 'DebugPUT-C',
        llm_model_id: "63df952e-adca-4642-9fdc-a83117f95973",
        embedding_model_id: "67743ce2-aead-43a2-ae00-11de9ff0934a",
        config: { "chunk_size": 512, "overlap": 50 }
    });

    // Clean up
    console.log('\nCleaning up...');
    await fetch(`${WEKNORA_BASE_URL}/api/v1/knowledge-bases/${kbId}`, {
        method: 'DELETE',
        headers: { 'x-api-key': WEKNORA_API_KEY }
    });
}

async function tryPut(id, body) {
    const res = await fetch(`${WEKNORA_BASE_URL}/api/v1/knowledge-bases/${id}`, {
        method: 'PUT',
        headers: { 'x-api-key': WEKNORA_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log(`Response: ${text}`);
}

debugPut();
