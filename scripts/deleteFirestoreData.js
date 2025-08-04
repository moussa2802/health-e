// Script to delete all Firestore collections and documents
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  deleteDoc, 
  doc,
  writeBatch,
  query,
  limit
} from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCQP_KoMF6uoNNlSAC4MtPbQM_cUC3atow",
  authDomain: "health-e-af2bf.firebaseapp.com",
  projectId: "health-e-af2bf",
  storageBucket: "health-e-af2bf.firebasestorage.app",
  messagingSenderId: "309913232683",
  appId: "1:309913232683:web:4af084bc334d3d3513d16e",
  measurementId: "G-2PPQMDQYPN",
  databaseURL: "https://health-e-af2bf-default-rtdb.europe-west1.firebasedatabase.app"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Collections to delete
const collectionsToDelete = [
  'professionals',
  'patients',
  'users',
  'bookings',
  'messages',
  'conversations',
  'reviews',
  'notifications'
];

// Function to delete documents in batches
async function deleteCollection(collectionName) {
  console.log(`🗑️ Deleting collection: ${collectionName}`);
  
  try {
    // Get all documents from the collection
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    
    if (snapshot.empty) {
      console.log(`ℹ️ Collection ${collectionName} is empty`);
      return 0;
    }
    
    console.log(`📊 Found ${snapshot.size} documents in ${collectionName}`);
    
    // Delete documents in batches of 500 (Firestore limit)
    const batchSize = 500;
    let count = 0;
    
    // Process in batches to avoid memory issues with large collections
    for (let i = 0; i < snapshot.size; i += batchSize) {
      const batch = writeBatch(db);
      const currentBatch = snapshot.docs.slice(i, i + batchSize);
      
      currentBatch.forEach(document => {
        batch.delete(doc(db, collectionName, document.id));
        count++;
        console.log(`🗑️ Deleting document ${document.id} from ${collectionName}`);
      });
      
      await batch.commit();
      console.log(`✅ Batch of ${currentBatch.length} documents deleted from ${collectionName}`);
      
      // Small delay to avoid overwhelming Firestore
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return count;
  } catch (error) {
    console.error(`❌ Error deleting collection ${collectionName}:`, error);
    throw error;
  }
}

// Function to delete subcollections
async function deleteSubcollection(parentCollection, documentId, subcollectionName) {
  console.log(`🗑️ Deleting subcollection: ${parentCollection}/${documentId}/${subcollectionName}`);
  
  try {
    const subcollectionRef = collection(db, parentCollection, documentId, subcollectionName);
    const snapshot = await getDocs(subcollectionRef);
    
    if (snapshot.empty) {
      console.log(`ℹ️ Subcollection ${subcollectionName} is empty`);
      return 0;
    }
    
    console.log(`📊 Found ${snapshot.size} documents in subcollection`);
    
    let count = 0;
    for (const document of snapshot.docs) {
      await deleteDoc(doc(db, parentCollection, documentId, subcollectionName, document.id));
      count++;
      console.log(`🗑️ Deleted document ${document.id} from subcollection ${subcollectionName}`);
    }
    
    return count;
  } catch (error) {
    console.error(`❌ Error deleting subcollection ${subcollectionName}:`, error);
    throw error;
  }
}

// Function to handle conversation messages subcollections
async function deleteConversationMessages() {
  console.log('🗑️ Deleting messages subcollections from conversations');
  
  try {
    const conversationsRef = collection(db, 'conversations');
    const snapshot = await getDocs(conversationsRef);
    
    if (snapshot.empty) {
      console.log('ℹ️ No conversations found');
      return 0;
    }
    
    let totalCount = 0;
    
    for (const conversationDoc of snapshot.docs) {
      const count = await deleteSubcollection('conversations', conversationDoc.id, 'messages');
      totalCount += count;
    }
    
    console.log(`✅ Deleted ${totalCount} messages from all conversations`);
    return totalCount;
  } catch (error) {
    console.error('❌ Error deleting conversation messages:', error);
    throw error;
  }
}

// Main function to delete all collections
async function deleteAllCollections() {
  console.log('🧹 Starting deletion of all Firestore data...');
  
  try {
    // First delete subcollections
    await deleteConversationMessages();
    
    // Then delete main collections
    let totalDeleted = 0;
    
    for (const collectionName of collectionsToDelete) {
      const count = await deleteCollection(collectionName);
      totalDeleted += count;
      
      // Small delay between collections
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`✅ Toutes les données ont été supprimées avec succès. Total: ${totalDeleted} documents.`);
  } catch (error) {
    console.error('❌ Error during data deletion:', error);
  }
}

// Run the deletion process
deleteAllCollections().catch(console.error);