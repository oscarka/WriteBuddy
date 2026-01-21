
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8080';

async function verifyFinal() {
    console.log('--- Final Config Verification ---');
    const projectId = 'verify-final-' + Date.now();

    // 1. Trigger KB Creation via Proxy
    console.log(`Creating KB for project: ${projectId}`);
    const res = await fetch(`${BASE_URL}/api/project/${projectId}/kb/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'VerifyFinal', description: 'Testing UUIDs' })
    });

    if (!res.ok) {
        console.error('Create Failed:', await res.text());
        return;
    }

    const json = await res.json();
    const headers = res.headers;
    // WeKnora sometimes returns wrapped data
    const kb = json.data || json;

    console.log('KB Created:', kb.id);
    console.log('LLM ID:', kb.llm_model_id);
    console.log('Embed ID:', kb.embedding_model_id);
    console.log('VLM ID:', kb.vlm_config?.model_id);

    const EXPECTED = {
        llm: "63df952e-adca-4642-9fdc-a83117f95973",
        embed: "67743ce2-aead-43a2-ae00-11de9ff0934a",
        vlm: "c18a630b-cf68-4e4c-b62d-9f13170cb027"
    };

    let pass = true;
    if (kb.llm_model_id !== EXPECTED.llm) { console.error(`❌ LLM Mismatch. Expected ${EXPECTED.llm}`); pass = false; }
    if (kb.embedding_model_id !== EXPECTED.embed) { console.error(`❌ Embed Mismatch. Expected ${EXPECTED.embed}`); pass = false; }
    if (kb.vlm_config?.model_id !== EXPECTED.vlm) { console.error(`❌ VLM Mismatch. Expected ${EXPECTED.vlm}`); pass = false; }

    if (pass) {
        console.log('✅ ALL CHECKS PASSED. Backend is correctly configuring models.');
    }

    // Cleanup (optional, but good practice)
    // We can't easily delete via proxy as we didn't implement DELETE proxy, 
    // but the ID is unique so it won't block user.
}

verifyFinal();
