
import fetch from 'node-fetch';

// Config
const API_URL = 'http://localhost:3000/api/project/project-123/agent-chat';
const KB_ID = 'kb-test-123';

async function testAgent(name, input, expectedAction) {
    console.log(`\n>>> Testing: ${name}`);
    console.log(`User Input: "${input}"`);

    const payload = {
        messages: [{ role: 'user', content: input }],
        kbId: KB_ID
    };

    try {
        const start = Date.now();
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        const duration = Date.now() - start;

        console.log(`Time: ${duration}ms`);
        if (data.agent_log) {
            console.log(`Router Action: ${data.agent_log.action}`);
            console.log(`Confidence: ${data.agent_log.confidence}`);
            if (data.agent_log.action === expectedAction) {
                console.log(`✅ PASS: Correctly routed to ${expectedAction}`);
            } else {
                console.log(`❌ FAIL: Expected ${expectedAction}, got ${data.agent_log.action}`);
            }
        } else {
            console.log(`⚠️ NO LOG: Agent log missing (Legacy fallback?)`);
        }

        console.log(`Response Preview: ${data.choices[0].message.content.substring(0, 50)}...`);

    } catch (error) {
        console.error('Request Failed:', error.message);
    }
}

async function runTests() {
    // Test 1: CHAT
    await testAgent('Greeting (Should be CHAT)', '你好，早上好', 'CHAT');

    // Test 2: RAG
    await testAgent('Setting Query (Should be SEARCH_KB)', '绫这个角色的主要动机是什么？', 'SEARCH_KB');

    // Test 3: DEEP_RESEARCH
    await testAgent('External Info (Should be DEEP_RESEARCH)', '帮我查一下维多利亚时代伦敦下水道的详细结构图和环境描写', 'DEEP_RESEARCH');
}

runTests();
