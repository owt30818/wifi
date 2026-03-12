const BASE_URL = 'http://localhost:3000/api';

async function runTest() {
    try {
        console.log('1. Creating/Getting Test User...');
        // Ensure test user exists
        const testUser = {
            username: 'security_test_user',
            password: 'password123',
            grade: 1,
            class: 1,
            number: 1,
            real_name: 'TestUser'
        };

        // Helper to request
        const request = async (url, method, body, token) => {
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined
            });
            const data = await res.json().catch(() => ({}));
            return { status: res.status, data };
        };

        // Try login first
        let token = '';
        let loginRes = await request(`${BASE_URL}/auth/login`, 'POST', {
            username: testUser.username,
            password: testUser.password
        });

        if (loginRes.status === 200) {
            token = loginRes.data.token;
            console.log('Logged in as existing user.');
        } else {
            console.log('Login failed, creating user...');
            await request(`${BASE_URL}/auth/signup`, 'POST', testUser);
            loginRes = await request(`${BASE_URL}/auth/login`, 'POST', {
                username: testUser.username,
                password: testUser.password
            });
            token = loginRes.data.token;
            console.log('User created and logged in.');
        }

        console.log('\n2. Testing Access Points (Should Fail 403)...');
        const apRes = await request(`${BASE_URL}/access-points`, 'GET', null, token);
        if (apRes.status === 403) {
            console.log(`PASS: Access denied (403).`);
        } else {
            console.error(`FAIL: Access allowed or other error: ${apRes.status}`);
        }

        console.log('\n3. Testing Dashboard Stats (Should Fail 403)...');
        const dashRes = await request(`${BASE_URL}/dashboard/stats`, 'GET', null, token);
        if (dashRes.status === 403) {
            console.log(`PASS: Access denied (403).`);
        } else {
            console.error(`FAIL: Access allowed or other error: ${dashRes.status}`);
        }

        console.log('\n4. Testing Device Bulk Add (Should Fail 403)...');
        const bulkRes = await request(`${BASE_URL}/devices/bulk`, 'POST', { devices: [] }, token);
        if (bulkRes.status === 403) {
            console.log(`PASS: Access denied (403).`);
        } else {
            console.error(`FAIL: Access allowed or other error: ${bulkRes.status}`);
        }

    } catch (err) {
        console.error('Test execution failed:', err);
    } finally {
        process.exit();
    }
}

runTest();
