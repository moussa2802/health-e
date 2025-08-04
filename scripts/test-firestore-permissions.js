// Script pour tester les permissions Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Configuration Firebase (remplacez par vos vraies valeurs)
const firebaseConfig = {
  apiKey: "AIzaSyBqXqXqXqXqXqXqXqXqXqXqXqXqXqXqXq",
  authDomain: "health-e-af2bf.firebaseapp.com",
  projectId: "health-e-af2bf",
  storageBucket: "health-e-af2bf.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdefghijklmnop"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function testFirestorePermissions() {
  try {
    console.log("🧪 Testing Firestore permissions...");
    
    // Test 1: Vérifier l'authentification
    console.log("1. Testing authentication...");
    const userCredential = await signInWithEmailAndPassword(auth, "test@example.com", "password123");
    console.log("✅ User authenticated:", userCredential.user.uid);
    
    // Test 2: Essayer de lire les bookings
    console.log("2. Testing bookings read...");
    const bookingsRef = collection(db, "bookings");
    const bookingsQuery = query(bookingsRef, where("patientId", "==", userCredential.user.uid));
    const bookingsSnapshot = await getDocs(bookingsQuery);
    console.log("✅ Read bookings successful, count:", bookingsSnapshot.size);
    
    // Test 3: Essayer de créer un booking
    console.log("3. Testing booking creation...");
    const testBooking = {
      patientId: userCredential.user.uid,
      professionalId: "test-professional-id",
      patientName: "Test Patient",
      professionalName: "Test Professional",
      date: "2025-08-11",
      startTime: "16:00",
      endTime: "17:00",
      type: "video",
      duration: 60,
      price: 25000,
      status: "en_attente",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await addDoc(bookingsRef, testBooking);
    console.log("✅ Booking creation successful, ID:", docRef.id);
    
    // Test 4: Essayer de créer un payment
    console.log("4. Testing payment creation...");
    const paymentsRef = collection(db, "payments");
    const testPayment = {
      bookingId: docRef.id,
      status: "pending",
      amount: 25000,
      currency: "XOF",
      createdAt: new Date()
    };
    
    const paymentRef = await addDoc(paymentsRef, testPayment);
    console.log("✅ Payment creation successful, ID:", paymentRef.id);
    
    console.log("🎉 All Firestore permission tests passed!");
    
  } catch (error) {
    console.error("❌ Firestore permission test failed:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
  }
}

// Exécuter le test
testFirestorePermissions(); 