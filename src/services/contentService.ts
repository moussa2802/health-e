import { getFirestoreInstance, retryFirestoreOperation, ensureFirestoreReady } from '../utils/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  Timestamp,
  limit
} from 'firebase/firestore';

// Types for content items
export interface ContentItem {
  id: string;
  type: 'testimonial' | 'health-tip';
  title: string;
  description: string;
  author: string;
  role?: string;
  imageUrl: string;
  videoUrl?: string;
  featured?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Get all content items
export async function getAllContent(): Promise<ContentItem[]> {
  try {
    console.log('📚 Fetching all content items...');
    
    // CRITICAL: Ensure Firestore is ready before fetching
    await ensureFirestoreReady();
    
    const db = getFirestoreInstance();
    if (!db) throw new Error('Firestore not available');
    
    // Ensure content collection exists
    const contentRef = collection(db, 'content');
    
    // Use a simple query to avoid index requirements
    const q = query(contentRef);
    
    const snapshot = await retryFirestoreOperation(async () => {
      return await getDocs(q);
    });
    
    const contentItems = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ContentItem));
    
    // Sort by createdAt on client side to avoid index requirement
    const sortedItems = contentItems.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime.getTime() - aTime.getTime();
    });
    
    console.log(`✅ Fetched ${sortedItems.length} content items`);
    return sortedItems;
  } catch (error) {
    console.error('❌ Error fetching content items:', error);
    throw new Error('Failed to fetch content items');
  }
}

// Get featured content items
export async function getFeaturedContent(): Promise<ContentItem[]> {
  try {
    console.log('🌟 Fetching featured content items...');
    
    const db = getFirestoreInstance();
    if (!db) throw new Error('Firestore not available');
    
    // Simple query without complex conditions to avoid permission issues
    const contentRef = collection(db, 'content');
    const snapshot = await getDocs(contentRef);
    
    const contentItems = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ContentItem));
    
    // Filter featured content on client side to avoid index issues
    const featuredItems = contentItems.filter(item => item.featured === true);
    
    console.log(`✅ Fetched ${featuredItems.length} featured content items`);
    return featuredItems;
  } catch (error) {
    console.error('❌ Error fetching featured content items:', error);
    // Return empty array instead of throwing to prevent app crash
    return [];
  }
}

// Get content by type
export async function getContentByType(type: 'testimonial' | 'health-tip'): Promise<ContentItem[]> {
  try {
    console.log(`🔍 Fetching content items of type: ${type}...`);
    
    // CRITICAL: Ensure Firestore is ready before fetching
    await ensureFirestoreReady();
    
    const db = getFirestoreInstance();
    if (!db) throw new Error('Firestore not available');
    
    // Ensure content collection exists
    const contentRef = collection(db, 'content');
    
    // Query for content by type
    const q = query(contentRef, where('type', '==', type));
    
    const snapshot = await retryFirestoreOperation(async () => {
      return await getDocs(q);
    });
    
    const contentItems = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ContentItem));
    
    console.log(`✅ Fetched ${contentItems.length} ${type} content items`);
    return contentItems;
  } catch (error) {
    console.error(`❌ Error fetching ${type} content items:`, error);
    throw new Error(`Failed to fetch ${type} content items`);
  }
}

// Create a new content item
export async function createContent(contentData: Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    console.log('📝 Creating new content item...');
    
    // CRITICAL: Ensure Firestore is ready before creating
    await ensureFirestoreReady();
    
    const db = getFirestoreInstance();
    if (!db) throw new Error('Firestore not available');
    
    // Ensure content collection exists
    const contentRef = collection(db, 'content');
    
    const result = await retryFirestoreOperation(async () => {
      return await addDoc(contentRef, {
        ...contentData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });
    
    console.log('✅ Content item created successfully:', result.id);
    return result.id;
  } catch (error) {
    console.error('❌ Error creating content item:', error);
    throw new Error('Failed to create content item');
  }
}

// Update an existing content item
export async function updateContent(id: string, updates: Partial<ContentItem>): Promise<void> {
  try {
    console.log(`🔄 Updating content item: ${id}...`);
    
    // CRITICAL: Ensure Firestore is ready before updating
    await ensureFirestoreReady();
    
    const db = getFirestoreInstance();
    if (!db) throw new Error('Firestore not available');
    
    // Ensure content collection exists
    const contentRef = collection(db, 'content');
    const contentDocRef = doc(contentRef, id);
    
    await retryFirestoreOperation(async () => {
      await updateDoc(contentDocRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    });
    
    console.log('✅ Content item updated successfully');
  } catch (error) {
    console.error('❌ Error updating content item:', error);
    throw new Error('Failed to update content item');
  }
}

// Delete a content item
export async function deleteContent(id: string): Promise<void> {
  try {
    console.log(`🗑️ Deleting content item: ${id}...`);
    
    // CRITICAL: Ensure Firestore is ready before deleting
    await ensureFirestoreReady();
    
    const db = getFirestoreInstance();
    if (!db) throw new Error('Firestore not available');
    
    // Ensure content collection exists
    const contentRef = collection(db, 'content');
    const contentDocRef = doc(contentRef, id);
    
    await retryFirestoreOperation(async () => {
      await deleteDoc(contentDocRef);
    });
    
    console.log('✅ Content item deleted successfully');
  } catch (error) {
    console.error('❌ Error deleting content item:', error);
    throw new Error('Failed to delete content item');
  }
}