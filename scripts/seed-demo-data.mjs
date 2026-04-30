import { MongoClient, ObjectId } from 'mongodb';
import bcryptjs from 'bcryptjs';

const uri =
  process.env.MONGODB_URI ||
  'mongodb+srv://danielco1:ZAQ!1qaz@cluster0.mongodb.net/vipogroup?retryWrites=true&w=majority';

async function seedDemoData() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('vipogroup');
    const usersCollection = db.collection('users');
    const salesCollection = db.collection('sales');
    const visitsCollection = db.collection('visits');

    // Hash password for demo users
    const hashedPassword = await bcryptjs.hash('123456', 10);

    // Create demo agents
    console.log('\n📊 Creating demo agents...');
    const agents = [
      {
        _id: new ObjectId(),
        fullName: 'יוסי כהן',
        email: 'yossi@agent.com',
        password: hashedPassword,
        role: 'agent',
        phone: '053-375-2633',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      },
      {
        _id: new ObjectId(),
        fullName: 'רונית לוי',
        email: 'ronit@agent.com',
        password: hashedPassword,
        role: 'agent',
        phone: '052-2345678',
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-01'),
      },
      {
        _id: new ObjectId(),
        fullName: 'דוד אברהם',
        email: 'david@agent.com',
        password: hashedPassword,
        role: 'agent',
        phone: '054-3456789',
        createdAt: new Date('2024-02-15'),
        updatedAt: new Date('2024-02-15'),
      },
      {
        _id: new ObjectId(),
        fullName: 'מיכל שרון',
        email: 'michal@agent.com',
        password: hashedPassword,
        role: 'agent',
        phone: '053-4567890',
        createdAt: new Date('2024-03-01'),
        updatedAt: new Date('2024-03-01'),
      },
    ];

    await usersCollection.insertMany(agents);
    console.log(`✅ Created ${agents.length} agents`);

    // Create demo customers
    console.log('\n👥 Creating demo customers...');
    const customers = [
      {
        _id: new ObjectId(),
        fullName: 'אורי ישראלי',
        email: 'uri@customer.com',
        password: hashedPassword,
        role: 'customer',
        phone: '050-1111111',
        referredBy: agents[0]._id, // Referred by Yossi
        createdAt: new Date('2024-03-10'),
        updatedAt: new Date('2024-03-10'),
      },
      {
        _id: new ObjectId(),
        fullName: 'שרה מזרחי',
        email: 'sara@customer.com',
        password: hashedPassword,
        role: 'customer',
        phone: '052-2222222',
        referredBy: agents[0]._id, // Referred by Yossi
        createdAt: new Date('2024-03-12'),
        updatedAt: new Date('2024-03-12'),
      },
      {
        _id: new ObjectId(),
        fullName: 'אבי גולן',
        email: 'avi@customer.com',
        password: hashedPassword,
        role: 'customer',
        phone: '054-3333333',
        referredBy: agents[1]._id, // Referred by Ronit
        createdAt: new Date('2024-03-15'),
        updatedAt: new Date('2024-03-15'),
      },
      {
        _id: new ObjectId(),
        fullName: 'רחל כץ',
        email: 'rachel@customer.com',
        password: hashedPassword,
        role: 'customer',
        phone: '053-4444444',
        referredBy: agents[1]._id, // Referred by Ronit
        createdAt: new Date('2024-03-18'),
        updatedAt: new Date('2024-03-18'),
      },
      {
        _id: new ObjectId(),
        fullName: 'משה דהן',
        email: 'moshe@customer.com',
        password: hashedPassword,
        role: 'customer',
        phone: '050-5555555',
        referredBy: agents[2]._id, // Referred by David
        createdAt: new Date('2024-03-20'),
        updatedAt: new Date('2024-03-20'),
      },
      {
        _id: new ObjectId(),
        fullName: 'לאה ברק',
        email: 'lea@customer.com',
        password: hashedPassword,
        role: 'customer',
        phone: '052-6666666',
        referredBy: agents[2]._id, // Referred by David
        createdAt: new Date('2024-03-22'),
        updatedAt: new Date('2024-03-22'),
      },
      {
        _id: new ObjectId(),
        fullName: 'אלי פרידמן',
        email: 'eli@customer.com',
        password: hashedPassword,
        role: 'customer',
        phone: '054-7777777',
        referredBy: agents[3]._id, // Referred by Michal
        createdAt: new Date('2024-03-25'),
        updatedAt: new Date('2024-03-25'),
      },
      {
        _id: new ObjectId(),
        fullName: 'נועה ארד',
        email: 'noa@customer.com',
        password: hashedPassword,
        role: 'customer',
        phone: '053-8888888',
        referredBy: agents[3]._id, // Referred by Michal
        createdAt: new Date('2024-03-28'),
        updatedAt: new Date('2024-03-28'),
      },
    ];

    await usersCollection.insertMany(customers);
    console.log(`✅ Created ${customers.length} customers`);

    // Create demo visits
    console.log('\n👀 Creating demo visits...');
    const visits = [];

    // Visits for agent 1 (Yossi)
    for (let i = 0; i < 15; i++) {
      visits.push({
        agentId: agents[0]._id,
        productId: '1', // Keyboard
        ts: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      });
    }

    for (let i = 0; i < 10; i++) {
      visits.push({
        agentId: agents[0]._id,
        productId: '2', // Mouse
        ts: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      });
    }

    // Visits for agent 2 (Ronit)
    for (let i = 0; i < 20; i++) {
      visits.push({
        agentId: agents[1]._id,
        productId: '3', // Headset
        ts: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      });
    }

    // Visits for agent 3 (David)
    for (let i = 0; i < 12; i++) {
      visits.push({
        agentId: agents[2]._id,
        productId: '4', // Monitor
        ts: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      });
    }

    // Visits for agent 4 (Michal)
    for (let i = 0; i < 8; i++) {
      visits.push({
        agentId: agents[3]._id,
        productId: '5', // Chair
        ts: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      });
    }

    await visitsCollection.insertMany(visits);
    console.log(`✅ Created ${visits.length} visits`);

    // Create demo sales
    console.log('\n💰 Creating demo sales...');
    const sales = [
      // Sales from Yossi's referrals
      {
        agentId: agents[0]._id,
        customerId: customers[0]._id,
        productId: '1',
        productName: 'מקלדת מכנית RGB',
        salePrice: 450,
        commission: 45, // 10%
        commissionMeta: {
          basePct: 0.1,
          levelBoostPct: 0,
          bonusPct: 0,
          fixedBonus: 0,
        },
        createdAt: new Date('2024-03-11'),
        updatedAt: new Date('2024-03-11'),
      },
      {
        agentId: agents[0]._id,
        customerId: customers[1]._id,
        productId: '2',
        productName: 'עכבר גיימינג אלחוטי',
        salePrice: 280,
        commission: 28,
        commissionMeta: {
          basePct: 0.1,
          levelBoostPct: 0,
          bonusPct: 0,
          fixedBonus: 0,
        },
        createdAt: new Date('2024-03-13'),
        updatedAt: new Date('2024-03-13'),
      },
      {
        agentId: agents[0]._id,
        customerId: customers[0]._id,
        productId: '3',
        productName: 'אוזניות גיימינג 7.1',
        salePrice: 320,
        commission: 32,
        commissionMeta: {
          basePct: 0.1,
          levelBoostPct: 0,
          bonusPct: 0,
          fixedBonus: 0,
        },
        createdAt: new Date('2024-03-16'),
        updatedAt: new Date('2024-03-16'),
      },

      // Sales from Ronit's referrals
      {
        agentId: agents[1]._id,
        customerId: customers[2]._id,
        productId: '4',
        productName: "מסך גיימינג 27 אינץ'",
        salePrice: 1299,
        commission: 129.9,
        commissionMeta: {
          basePct: 0.1,
          levelBoostPct: 0,
          bonusPct: 0,
          fixedBonus: 0,
        },
        createdAt: new Date('2024-03-17'),
        updatedAt: new Date('2024-03-17'),
      },
      {
        agentId: agents[1]._id,
        customerId: customers[3]._id,
        productId: '3',
        productName: 'אוזניות גיימינג 7.1',
        salePrice: 320,
        commission: 32,
        commissionMeta: {
          basePct: 0.1,
          levelBoostPct: 0,
          bonusPct: 0,
          fixedBonus: 0,
        },
        createdAt: new Date('2024-03-19'),
        updatedAt: new Date('2024-03-19'),
      },
      {
        agentId: agents[1]._id,
        customerId: customers[2]._id,
        productId: '1',
        productName: 'מקלדת מכנית RGB',
        salePrice: 450,
        commission: 45,
        commissionMeta: {
          basePct: 0.1,
          levelBoostPct: 0,
          bonusPct: 0,
          fixedBonus: 0,
        },
        createdAt: new Date('2024-03-21'),
        updatedAt: new Date('2024-03-21'),
      },

      // Sales from David's referrals
      {
        agentId: agents[2]._id,
        customerId: customers[4]._id,
        productId: '5',
        productName: 'כיסא גיימינג ארגונומי',
        salePrice: 899,
        commission: 89.9,
        commissionMeta: {
          basePct: 0.1,
          levelBoostPct: 0,
          bonusPct: 0,
          fixedBonus: 0,
        },
        createdAt: new Date('2024-03-23'),
        updatedAt: new Date('2024-03-23'),
      },
      {
        agentId: agents[2]._id,
        customerId: customers[5]._id,
        productId: '2',
        productName: 'עכבר גיימינג אלחוטי',
        salePrice: 280,
        commission: 28,
        commissionMeta: {
          basePct: 0.1,
          levelBoostPct: 0,
          bonusPct: 0,
          fixedBonus: 0,
        },
        createdAt: new Date('2024-03-24'),
        updatedAt: new Date('2024-03-24'),
      },

      // Sales from Michal's referrals
      {
        agentId: agents[3]._id,
        customerId: customers[6]._id,
        productId: '6',
        productName: 'מצלמת רשת 4K',
        salePrice: 550,
        commission: 55,
        commissionMeta: {
          basePct: 0.1,
          levelBoostPct: 0,
          bonusPct: 0,
          fixedBonus: 0,
        },
        createdAt: new Date('2024-03-26'),
        updatedAt: new Date('2024-03-26'),
      },
      {
        agentId: agents[3]._id,
        customerId: customers[7]._id,
        productId: '1',
        productName: 'מקלדת מכנית RGB',
        salePrice: 450,
        commission: 45,
        commissionMeta: {
          basePct: 0.1,
          levelBoostPct: 0,
          bonusPct: 0,
          fixedBonus: 0,
        },
        createdAt: new Date('2024-03-29'),
        updatedAt: new Date('2024-03-29'),
      },
    ];

    await salesCollection.insertMany(sales);
    console.log(`✅ Created ${sales.length} sales`);

    // Summary
    console.log('\n📊 Summary:');
    console.log('═══════════════════════════════════════');
    console.log(`👥 Agents: ${agents.length}`);
    console.log(`🛍️  Customers: ${customers.length}`);
    console.log(`👀 Visits: ${visits.length}`);
    console.log(`💰 Sales: ${sales.length}`);
    console.log('═══════════════════════════════════════');

    // Agent-wise summary
    console.log('\n📈 Agent Performance:');
    console.log('═══════════════════════════════════════');

    for (const agent of agents) {
      const agentCustomers = customers.filter((c) => c.referredBy.equals(agent._id));
      const agentSales = sales.filter((s) => s.agentId.equals(agent._id));
      const totalCommission = agentSales.reduce((sum, s) => sum + s.commission, 0);
      const agentVisits = visits.filter((v) => v.agentId.equals(agent._id));

      console.log(`\n${agent.fullName} (${agent.email})`);
      console.log(`  👥 Referrals: ${agentCustomers.length}`);
      console.log(`  👀 Visits: ${agentVisits.length}`);
      console.log(`  💰 Sales: ${agentSales.length}`);
      console.log(`  💵 Total Commission: ₪${totalCommission.toFixed(2)}`);
    }

    console.log('\n═══════════════════════════════════════');
    console.log('✅ Demo data seeded successfully!');
    console.log('\n🔐 Login credentials (password for all: 123456):');
    console.log('═══════════════════════════════════════');
    console.log('\nAgents:');
    agents.forEach((a) => console.log(`  📧 ${a.email}`));
    console.log('\nCustomers:');
    customers.forEach((c) => console.log(`  📧 ${c.email}`));
    console.log('═══════════════════════════════════════');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the seed
seedDemoData().catch(console.error);
