// Script to delete all Firebase Authentication users - FAST BATCH MODE
// Run with: node delete-all-users.cjs
// Requires: serviceAccountKey.json in the same directory

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Check if service account key exists
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.log('\n❌ Service Account Key Not Found');
  console.log('Please download your service account key first.');
  process.exit(1);
}

// Initialize Firebase Admin with service account
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'sujata-inventory'
});

async function deleteAllUsersFast() {
  console.log('\n========================================');
  console.log('  🗑️  FAST Batch User Deletion');
  console.log('========================================\n');

  try {
    // List all users
    console.log('📋 Fetching all users...\n');
    
    let allUids = [];
    let pageToken;
    
    // Fetch all user UIDs
    do {
      const listUsersResult = await admin.auth().listUsers(1000, pageToken);
      allUids = allUids.concat(listUsersResult.users.map(user => user.uid));
      pageToken = listUsersResult.pageToken;
    } while (pageToken);

    if (allUids.length === 0) {
      console.log('✅ No users found. Authentication is already clean!\n');
      return;
    }

    console.log(`Found ${allUids.length} user(s) to delete\n`);
    console.log('🚀 Starting BATCH deletion (much faster!)...\n');

    // Delete in batches of 1000 (Firebase limit)
    const batchSize = 1000;
    let deletedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < allUids.length; i += batchSize) {
      const batch = allUids.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(allUids.length / batchSize);
      
      console.log(`⚡ Deleting batch ${batchNumber}/${totalBatches} (${batch.length} users)...`);
      
      try {
        const result = await admin.auth().deleteUsers(batch);
        deletedCount += result.successCount;
        failedCount += result.failureCount;
        
        if (result.failureCount > 0) {
          console.log(`  ⚠️  ${result.failureCount} failed in this batch`);
        } else {
          console.log(`  ✅ Batch complete!`);
        }
      } catch (error) {
        console.log(`  ❌ Batch failed: ${error.message}`);
        failedCount += batch.length;
      }
    }

    console.log('\n========================================');
    console.log('  ✨ Deletion Complete!');
    console.log('========================================');
    console.log(`✅ Successfully deleted: ${deletedCount} user(s)`);
    if (failedCount > 0) {
      console.log(`❌ Failed to delete: ${failedCount} user(s)`);
    }
    console.log('\n🎉 Your Firebase Authentication is now clean!');
    console.log('   The first user to register will become the admin.\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the deletion
deleteAllUsersFast()
  .then(() => {
    console.log('Exiting...\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
