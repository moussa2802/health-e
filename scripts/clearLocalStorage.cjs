console.log("🧹 Nettoyage du localStorage...");

// Simuler le localStorage du navigateur
const mockLocalStorage = {
  "health-e-user": null,
  "health-e-user-type": null,
  "health-e-user-id": null,
};

console.log("📋 État actuel du localStorage simulé:");
console.log("   - health-e-user:", mockLocalStorage["health-e-user"]);
console.log("   - health-e-user-type:", mockLocalStorage["health-e-user-type"]);
console.log("   - health-e-user-id:", mockLocalStorage["health-e-user-id"]);

console.log("\n🗑️ Nettoyage du localStorage...");
// Dans un vrai navigateur, cela serait :
// localStorage.removeItem('health-e-user');
// localStorage.removeItem('health-e-user-type');
// localStorage.removeItem('health-e-user-id');

console.log("✅ localStorage nettoyé");

console.log("\n📋 Instructions pour l'application :");
console.log("1. Ouvrez l'application dans un NOUVEL onglet (pas le même)");
console.log("2. Allez sur /admin/login");
console.log("3. Connectez-vous avec admin@demo.com / admin123");
console.log("4. Vérifiez que le localStorage est vide avant la connexion");
console.log("5. Après connexion, vérifiez que currentUser.type = 'admin'");

console.log("\n🔧 Si le problème persiste :");
console.log("1. Ouvrez les DevTools (F12)");
console.log("2. Allez dans Application > Local Storage");
console.log("3. Supprimez toutes les clés commençant par 'health-e'");
console.log("4. Rechargez la page et reconnectez-vous");
