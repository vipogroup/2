const webPush = require('web-push');

// Generate VAPID keys
const vapidKeys = webPush.generateVAPIDKeys();

console.log('VAPID Keys:');
console.log('='.repeat(50));
console.log('Public Key:');
console.log(vapidKeys.publicKey);
console.log('\nPrivate Key:');
console.log(vapidKeys.privateKey);
console.log('='.repeat(50));
console.log('\nAdd these to your .env file:');
console.log(`WEB_PUSH_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`WEB_PUSH_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`WEB_PUSH_CONTACT_EMAIL=mailto:vipogroup1@gmail.com`);
