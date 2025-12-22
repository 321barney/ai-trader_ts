/**
 * Quick test script to verify AsterDex API credentials
 */

import crypto from 'crypto';

const API_KEY = '02ece7140a38868bcddddadaf109dfd48cf9ec53ca409ef15206abfdd41b50b9';
const API_SECRET = '3a5bae4bd43987f6d25b41f5b3b357318171e34fab623c3e09af8243d0aef488';
const BASE_URL = 'https://fapi.asterdex.com';

function sign(queryString: string): string {
    return crypto
        .createHmac('sha256', API_SECRET)
        .update(queryString)
        .digest('hex');
}

async function testConnection() {
    console.log('Testing AsterDex API connection...\n');

    // Test 1: Public endpoint (ping)
    console.log('1. Testing public endpoint /fapi/v1/ping...');
    try {
        const pingRes = await fetch(`${BASE_URL}/fapi/v1/ping`);
        console.log('   Ping response:', pingRes.status, await pingRes.text());
    } catch (e: any) {
        console.log('   Ping failed:', e.message);
    }

    // Test 2: Public endpoint (time)
    console.log('\n2. Testing server time /fapi/v1/time...');
    try {
        const timeRes = await fetch(`${BASE_URL}/fapi/v1/time`);
        const timeData = await timeRes.json();
        console.log('   Server time:', timeData);
        console.log('   Local time:', Date.now());
        console.log('   Difference:', timeData.serverTime - Date.now(), 'ms');
    } catch (e: any) {
        console.log('   Time failed:', e.message);
    }

    // Test 3: Signed endpoint (balance) with V2
    console.log('\n3. Testing signed endpoint /fapi/v2/balance...');
    try {
        const timestamp = Date.now();
        const params = { recvWindow: '5000', timestamp: String(timestamp) };
        const queryString = new URLSearchParams(params).toString();
        const signature = sign(queryString);

        const url = `${BASE_URL}/fapi/v2/balance?${queryString}&signature=${signature}`;
        console.log('   URL:', url.substring(0, 80) + '...');
        console.log('   API Key (first 16):', API_KEY.substring(0, 16) + '...');

        const balanceRes = await fetch(url, {
            method: 'GET',
            headers: {
                'X-MBX-APIKEY': API_KEY,
                'Content-Type': 'application/json',
            },
        });

        const balanceData = await balanceRes.text();
        console.log('   Status:', balanceRes.status);
        console.log('   Response:', balanceData);
    } catch (e: any) {
        console.log('   Balance failed:', e.message);
    }
}

testConnection();
