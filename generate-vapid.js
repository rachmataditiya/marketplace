import webpush from 'web-push';

let vapidKeys;
do {
  vapidKeys = webpush.generateVAPIDKeys();
} while (!vapidKeys.publicKey.startsWith('BP'));

console.log('=======================================');
console.log('Public Key:');
console.log(vapidKeys.publicKey);
console.log('\nPrivate Key:');
console.log(vapidKeys.privateKey);
console.log('======================================='); 