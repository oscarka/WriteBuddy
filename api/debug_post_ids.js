
import fetch from 'node-fetch';

const BASE = 'https://weknora-app-339795034470.us-west1.run.app';
const KEY = 'sk-cXgpE6LF3EmxuRG3CVcRLgegUqlHqoCffsba6U62qP6WBADL';
const IDs = {
    llm: "63df952e-adca-4642-9fdc-a83117f95973",
    embed: "67743ce2-aead-43a2-ae00-11de9ff0934a",
    vlm: "c18a630b-cf68-4e4c-b62d-9f13170cb027"
};

async function testPostIDs() {
    console.log('--- Testing POST with Model IDs ---');
    const body = {
        name: 'DebugPOST-IDs',
        type: 'document',
        llm_model_id: IDs.llm,
        embedding_model_id: IDs.embed,
        vllm_model_id: IDs.vlm
        // Maybe try vlm_config too?
    };

    // Also try vlm_config variant if flat fails
    // But let's try flat first as that's what the response keys looked like

    const res = await fetch(`${BASE}/api/v1/knowledge-bases`, {
        method: 'POST',
        headers: { 'x-api-key': KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const data = await res.json();
    const d = data.data || data;
    console.log('Status:', res.status);
    console.log('KB ID:', d.id);
    console.log('Embed ID:', d.embedding_model_id);
    console.log('VLM ID:', d.vlm_config?.model_id);

    // Cleanup
    if (d.id) {
        await fetch(`${BASE}/api/v1/knowledge-bases/${d.id}`, { method: 'DELETE', headers: { 'x-api-key': KEY } });
    }
}

testPostIDs();
