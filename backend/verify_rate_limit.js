const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
};

const makeRequest = (i) => {
    return new Promise((resolve) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                console.log(`Request ${i}: Status ${res.statusCode}`);
                resolve(res.statusCode);
            });
        });

        req.on('error', (e) => {
            console.error(`Request ${i} error: ${e.message}`);
            resolve(500);
        });

        // Send invalid credentials
        req.write(JSON.stringify({
            username: 'wrong_user',
            password: 'wrong_password'
        }));
        req.end();
    });
};

const runTest = async () => {
    console.log('Starting Rate Limit Verification...');
    let blocked = false;

    for (let i = 1; i <= 50; i++) {
        const status = await makeRequest(i);
        if (status === 429) {
            blocked = true;
        }
        // Small delay to ensure sequential processing
        await new Promise(r => setTimeout(r, 100));
    }

    if (blocked) {
        console.log('\nSUCCESS: Rate limiting is working. 429 responses received.');
    } else {
        console.log('\nFAILURE: Rate limiting did not block excessive requests.');
        process.exit(1);
    }
};

runTest();
