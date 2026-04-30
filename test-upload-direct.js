async function testDirectUpload() {
  const payload = {
    tenantId: '6980e7a13862e2a30b667a62',
    templateKey: 'catalog-manager',
    products: [
      {
        title: '2-LAYERS WORKTABLE',
        category: '2 שכבות',
        sku: '2L-100-60-90',
        description: 'שולחן עבודה 2 שכבות',
        price: 211,  // Must be a number
        groupPrice: 141,  // Must be a number
        inStock: true,
        stockCount: 5,
        stainless: {
          length: 100,
          width: 60,
          height: 90,
          thickness: '1.2',
          material: '304',
          layers: 2
        }
      }
    ]
  };

  try {
    console.log('Sending test upload...');
    const response = await fetch('http://localhost:3001/api/catalog-manager/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n✅ SUCCESS! Product uploaded!');
    } else {
      console.log('\n❌ Failed:', data.error || 'Unknown error');
      if (data.errors) {
        console.log('Errors:', JSON.stringify(data.errors, null, 2));
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testDirectUpload();
