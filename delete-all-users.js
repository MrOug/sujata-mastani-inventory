// Script to delete all Firebase Authentication users
// Run with: node delete-all-users.js

const admin = require('firebase-admin');

// Initialize Firebase Admin with your service account
// You can also use default credentials if running in a Firebase environment
try {
  admin.initializeApp({
    projectId: 'sujata-inventory'
  });
} catch (error) {
  console.error('Error initializing Firebase Admin:', error.message);
  process.exit(1);
}

async function deleteAllUsers() {
  console.log('========================================');
  console.log('  Deleting All Firebase Auth Users');
  console.log('========================================\n');

  try {
    // List all users
    console.log('Fetching all users...');
    const listUsersResult = await admin.auth().listUsers();
    const users = listUsersResult.users;

    if (users.length === 0) {
      console.log('✓ No users found. Database is already clean!');
      return;
    }

    console.log(`Found ${users.length} user(s) to delete:\n`);
    
    // Display users before deletion
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email || user.phoneNumber || user.uid}`);
    });

    console.log('\nDeleting users...\n');

    // Delete each user
    let deletedCount = 0;
    let failedCount = 0;

    for (const user of users) {
      try {
        await admin.auth().deleteUser(user.uid);
        console.log(`✓ Deleted: ${user.email || user.phoneNumber || user.uid}`);
        deletedCount++;
      } catch (error) {
        console.log(`✗ Failed to delete: ${user.email || user.phoneNumber || user.uid}`);
        console.log(`  Error: ${error.message}`);
        failedCount++;
      }
    }

    console.log('\n========================================');
    console.log('  Deletion Complete!');
    console.log('========================================');
    console.log(`✓ Successfully deleted: ${deletedCount} user(s)`);
    if (failedCount > 0) {
      console.log(`✗ Failed to delete: ${failedCount} user(s)`);
    }
    console.log('\nYour Firebase is now completely clean! 🎉');
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  }
}

// Run the deletion
deleteAllUsers()
  .then(() => {
    console.log('\nExiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

