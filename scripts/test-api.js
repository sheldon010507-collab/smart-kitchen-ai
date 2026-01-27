// Simple API Test for Gemini Connection
const https = require('https');

const GEMINI_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_KEY) {
    console.error('❌ GEMINI_API_KEY not found in environment');
    console.log('\n💡 Fix: Set environment variable:');
    console.log('   PowerShell: $env:GEMINI_API_KEY="AIzaSyBVNcAqZ0Oo8tzSdVKHYh0dEq9LnPZ5-fI"');
    process.exit(1);
}

console.log('🔍 Testing Gemini API...');
console.log(`   Key: ${GEMINI_KEY.substring(0, 10)}...`);

const testPayload = JSON.stringify({
    contents: [{
        parts: [{ text: 'Respond with JSON: {"test":"ok"}' }]
    }]
});

const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models/gemini-1.5-flash-8b:generateContent?key=${GEMINI_KEY}`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(testPayload)
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        if (res.statusCode === 200) {
            console.log('✅ Gemini API is working!');
            console.log('\n🎉 Success! Your API connection is configured correctly.');
            console.log('\n📝 Next: Run "npm run dev" and test scanner');
        } else {
            console.error(`❌ API Error (${res.statusCode})`);
            console.error(data.substring(0, 200));
        }
    });
});

req.on('error', (e) => {
    console.error('❌ Connection error:', e.message);
});

req.write(testPayload);
req.end();
