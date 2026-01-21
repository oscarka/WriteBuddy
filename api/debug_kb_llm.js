
import fetch from 'node-fetch';

const BASE = 'https://weknora-app-339795034470.us-west1.run.app';
const KEY = 'sk-cXgpE6LF3EmxuRG3CVcRLgegUqlHqoCffsba6U62qP6WBADL';
const LLM_ID = "63df952e-adca-4642-9fdc-a83117f95973"; // deepseek-chat

async function createKB(variant, extraBody) {
    console.log(`\n--- Testing Variant: ${variant} ---`);
    const body = {
        name: `DebugLLM-${variant}`,
        type: 'document',
        embedding_model_id: "67743ce2-aead-43a2-ae00-11de9ff0934a",
        ...extraBody
    };

    const res = await fetch(`${BASE}/api/v1/knowledge-bases`, {
        method: 'POST',
        headers: { 'x-api-key': KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        console.log(`Failed: ${res.status}`);
        return;
    }

    const json = await res.json();
    const data = json.data || json;

    // Check where the ID ended up
    console.log(`Result keys: ${Object.keys(data).join(', ')}`);
    console.log(`llm_model_id: ${data.llm_model_id}`);
    console.log(`model_id: ${data.model_id}`);
    console.log(`config:`, JSON.stringify(data.config));

    // Cleanup
    if (data.id) {
        await fetch(`${BASE}/api/v1/knowledge-bases/${data.id}`, { method: 'DELETE', headers: { 'x-api-key': KEY } });
    }
}

async function run() {
    await createKB('A: llm_model_id (Root)', { llm_model_id: LLM_ID });
    await createKB('B: model_id (Root)', { model_id: LLM_ID });
    await createKB('C: config.llm_model_id', { config: { llm_model_id: LLM_ID } });
    await createKB('D: llm_config', { llm_config: { model_id: LLM_ID } });
}

run();
