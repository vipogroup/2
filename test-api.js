async function testAPI() {
  const testProduct = {
    tenantId: '6980e7a13862e2a30b667a62',
    templateKey: 'catalog-manager',
    products: [
      {
        title: '2-LAYERS WORKTABLE',
        sku: 'TEST-API-001',
        category: '2 שכבות',
        price: 100,
        groupPrice: 90,
        description: 'מוצר בדיקה API',
        inStock: true,
        stockCount: 10,
        stainless: {
          length: 100,
          width: 60,
          height: 90
        }
      }
    ]
  };

  try {
    console.log('Sending request to API...');
    const response = await fetch('http://localhost:3001/api/catalog-manager/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testProduct)
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAPI();
