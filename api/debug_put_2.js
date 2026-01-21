
import fetch from 'node-fetch';

const WEKNORA_BASE_URL = 'https://weknora-app-339795034470.us-west1.run.app';
const WEKNORA_API_KEY = 'sk-cXgpE6LF3EmxuRG3CVcRLgegUqlHqoCffsba6U62qP6WBADL';
const IDs = {
    llm: "63df952e-adca-4642-9fdc-a83117f95973",
    embed: "67743ce2-aead-43a2-ae00-11de9ff0934a",
    vlm: "c18a630b-cf68-4e4c-b62d-9f13170cb027"
};

async function debugPut2() {
    // 1. Create Temp KB
    const createRes = await fetch(`${WEKNORA_BASE_URL}/api/v1/knowledge-bases`, {
        method: 'POST',
        headers: { 'x-api-key': WEKNORA_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'DebugPUT-2', type: 'document', advanced: true })
    });
    const kb = (await createRes.json()).data;
    console.log('Temp KB:', kb.id);

    // 2. Try updating embedding_model_id explicitly
    console.log('\n--- Test 1: Explicit Embedding + Config ---');
    await tryPut(kb.id, {
        name: 'Update-1',
        embedding_model_id: IDs.embed,
        config: {}
    });

    // 3. Try updating vlm_config
    console.log('\n--- Test 2: VLM Config + LLM ---');
    await tryPut(kb.id, {
        name: 'Update-2',
        llm_model_id: IDs.llm,
        vlm_config: { model_id: IDs.vlm, enabled: true },
        config: {}
    });

    // Clean up
    await fetch(`${WEKNORA_BASE_URL}/api/v1/knowledge-bases/${kb.id}`, { method: 'DELETE', headers: { 'x-api-key': WEKNORA_API_KEY } });
}

async function tryPut(id, body) {
    const res = await fetch(`${WEKNORA_BASE_URL}/api/v1/knowledge-bases/${id}`, {
        method: 'PUT',
        headers: { 'x-api-key': WEKNORA_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    console.log('Status:', res.status);
    const d = data.data || data;
    console.log('Embed ID:', d.embedding_model_id);
    console.log('VLM ID:', d.vlm_config?.model_id);
    // console.log('Full:', JSON.stringify(d).slice(0,200));
}

debugPut2();
