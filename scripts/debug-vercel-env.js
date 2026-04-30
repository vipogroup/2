// scripts/debug-vercel-env.js
// Check what environment variables Vercel actually has
console.log('🔍 Checking Vercel Environment Variables...');
console.log('');

(async () => {
  try {
    const url = 'https://vipo-agents-test.vercel.app/api/debug/env';
    
    console.log('📡 Fetching from:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('📦 Response:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.log('');
    console.log('💡 The debug endpoint might not exist yet.');
    console.log('   Creating it now...');
  }
})();
