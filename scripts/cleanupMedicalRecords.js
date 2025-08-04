// Script pour nettoyer les dossiers médicaux de test
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  deleteDoc, 
  doc,
  query,
  where,
  collectionGroup
} from 'firebase/firestore';

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCQP_KoMF6uoNNlSAC4MtPbQM_cUC3atow",
  authDomain: "health-e-af2bf.firebaseapp.com",
  projectId: "health-e-af2bf",
  storageBucket: "health-e-af2bf.firebasestorage.app",
  messagingSenderId: "309913232683",
  appId: "1:309913232683:web:4af084bc334d3d3513d16e",
  measurementId: "G-2PPQMDQYPN",
  databaseURL: "https://health-e-af2bf-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Fonction pour supprimer les dossiers médicaux de test
async function cleanupTestMedicalRecords() {
  console.log('🧹 Nettoyage des dossiers médicaux de test...');
  
  try {
    // IDs des dossiers à supprimer (basés sur vos logs)
    const recordsToDelete = [
      { patientId: 'demo-patient-1', recordId: 'wuKVsFPmyiumJfA3NanF' },
      { patientId: 'qYQ1L5E8cYUggGrEjv0PrDFjsxr1', recordId: 'MKUuHPhB3PhTQsqBDDND' }
    ];
    
    let deletedCount = 0;
    
    for (const record of recordsToDelete) {
      try {
        const recordRef = doc(db, 'patients', record.patientId, 'medicalRecords', record.recordId);
        await deleteDoc(recordRef);
        console.log(`✅ Supprimé: ${record.recordId} pour patient ${record.patientId}`);
        deletedCount++;
      } catch (error) {
        console.error(`❌ Erreur suppression ${record.recordId}:`, error);
      }
    }
    
    console.log(`🎉 Nettoyage terminé ! ${deletedCount} dossiers supprimés.`);
    
    // Optionnel : Supprimer aussi tous les dossiers médicaux pour ce professionnel
    console.log('🔍 Recherche d\'autres dossiers pour ce professionnel...');
    
    const allRecordsQuery = query(
      collectionGroup(db, 'medicalRecords'),
      where('professionalId', '==', 'OUyxGskGgYZ66R0PuxyIqiHj31X2')
    );
    
    const snapshot = await getDocs(allRecordsQuery);
    console.log(`📊 Trouvé ${snapshot.docs.length} dossiers au total pour ce professionnel`);
    
    for (const docSnap of snapshot.docs) {
      try {
        await deleteDoc(docSnap.ref);
        console.log(`✅ Supprimé: ${docSnap.id}`);
        deletedCount++;
      } catch (error) {
        console.error(`❌ Erreur suppression ${docSnap.id}:`, error);
      }
    }
    
    console.log(`🎉 Nettoyage complet ! ${deletedCount} dossiers supprimés au total.`);
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  }
}

// Exécuter le nettoyage
cleanupTestMedicalRecords().catch(console.error);