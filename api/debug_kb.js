
const fetch = require('node-fetch');

async function test() {
    const response = await fetch('http://localhost:8080/api/project/debug-project/kb/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Debug KB' })
    });
    const text = await response.text();
    console.log('Raw Response:', text);
}

test();
