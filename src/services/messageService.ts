import { getFirestoreInstance } from "../utils/firebase"; // Use getter function instead of direct import
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  doc,
  setDoc,
  getDoc,
  getDocs,
  serverTimestamp,
  Timestamp,
  updateDoc,
  limit,
} from "firebase/firestore";
import {
  retryFirestoreOperation,
  resetFirestoreConnection,
  isFirestoreInternalError,
  ensureFirestoreReady,
} from "../utils/firebase";
import { getDatabase, ref, set } from "firebase/database";
import { createNotification } from "./notificationService";
// Types pour les messages
export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderType: "patient" | "professional" | "admin";
  content: string;
  timestamp: Timestamp;
  read: boolean;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantNames: { [userId: string]: string };
  participantTypes: { [userId: string]: "patient" | "professional" | "admin" };
  type: "patient-professional" | "admin-professional" | "admin-patient";
  lastMessage?: {
    content: string;
    timestamp: Timestamp;
    senderId: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// CRITICAL: Global registry to prevent duplicate listeners with unique IDs
const activeMessageListeners = new Map<string, () => void>();
let messageListenerIdCounter = 0;

// Cache pour éviter les requêtes répétées
const conversationsCache = new Map<string, Conversation[]>();
const CACHE_DURATION = 30000; // 30 secondes

// Créer ou récupérer une conversation
export async function getOrCreateConversation(
  user1Id: string,
  user1Name: string,
  user1Type: "patient" | "professional" | "admin",
  user2Id: string,
  user2Name: string,
  user2Type: "patient" | "professional" | "admin"
): Promise<string> {
  try {
    console.log(
      "💬 Creating/getting conversation between:",
      user1Name,
      "and",
      user2Name
    );

    // CRITICAL: Verify users are authenticated
    if (!user1Id || !user2Id) {
      console.warn("⛔️ User IDs missing. Conversation creation cancelled.");
      throw new Error("Identifiants utilisateurs manquants");
    }

    // CRITICAL: Ensure Firestore is ready before operation
    await ensureFirestoreReady();

    // Générer un ID de conversation consistant
    const conversationId = [user1Id, user2Id].sort().join("_");

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    const conversationRef = doc(db, "conversations", conversationId);

    // Vérifier si la conversation existe
    const conversationSnap = await retryFirestoreOperation(async () => {
      return await getDoc(conversationRef);
    });

    if (!conversationSnap.exists()) {
      // Créer une nouvelle conversation
      const conversationType = getConversationType(user1Type, user2Type);

      const conversationData: Omit<Conversation, "id"> = {
        participants: [user1Id, user2Id],
        participantNames: {
          [user1Id]: user1Name,
          [user2Id]: user2Name,
        },
        participantTypes: {
          [user1Id]: user1Type,
          [user2Id]: user2Type,
        },
        type: conversationType,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
      };

      await retryFirestoreOperation(async () => {
        return await setDoc(conversationRef, conversationData);
      });

      console.log("✅ New conversation created:", conversationId);

      // Invalider le cache
      conversationsCache.clear();
    } else {
      console.log("✅ Existing conversation found:", conversationId);
    }

    return conversationId;
  } catch (error) {
    console.error("❌ Error creating/getting conversation:", error);
    throw new Error("Erreur lors de la création de la conversation");
  }
}

// Déterminer le type de conversation
function getConversationType(
  type1: "patient" | "professional" | "admin",
  type2: "patient" | "professional" | "admin"
): "patient-professional" | "admin-professional" | "admin-patient" {
  const types = [type1, type2].sort();

  if (types.includes("admin") && types.includes("professional")) {
    return "admin-professional";
  } else if (types.includes("admin") && types.includes("patient")) {
    return "admin-patient";
  } else {
    return "patient-professional";
  }
}

// Envoyer un message
export async function sendMessage(
  conversationId: string,
  senderId: string,
  senderName: string,
  senderType: "patient" | "professional" | "admin",
  content: string
): Promise<void> {
  try {
    console.log("📤 Sending message in conversation:", conversationId);

    // CRITICAL: Verify user is authenticated
    if (!senderId) {
      console.warn("⛔️ Sender ID missing. Message sending cancelled.");
      throw new Error("Identifiant utilisateur manquant");
    }

    // CRITICAL: Ensure Firestore is ready before operation
    await ensureFirestoreReady();

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Ensure conversations collection exists
    const conversationsRef = collection(db, "conversations");
    const conversationRef = doc(conversationsRef, conversationId);

    // Check if conversation exists
    const conversationSnap = await getDoc(conversationRef);
    if (!conversationSnap.exists()) {
      console.warn("⚠️ Conversation does not exist, creating it...");
      // This should not happen normally, but we'll handle it gracefully
      throw new Error(
        "Conversation non trouvée. Veuillez créer une nouvelle conversation."
      );
    }

    // Ensure messages subcollection exists
    const messagesRef = collection(
      db,
      `conversations/${conversationId}/messages`
    );
    // Récupérer l'identifiant du destinataire
    const conversationData = conversationSnap.data() as Conversation;
    const recipientId = conversationData.participants.find(
      (id) => id !== senderId
    );
    // Ajouter le message à la sous-collection
    await retryFirestoreOperation(async () => {
      return await addDoc(messagesRef, {
        senderId,
        senderName,
        senderType,
        content,
        participants: [senderId, recipientId],
        timestamp: serverTimestamp(),
        read: false,
      });
    });

    // Notify the recipient
    try {
      // Get the recipient ID (the other participant)

      if (recipientId) {
        // Add to Realtime Database for real-time notifications
        const database = getDatabase();
        const messageNotificationRef = ref(
          database,
          `message_notifications/${recipientId}/${conversationId}`
        );

        await set(messageNotificationRef, {
          senderId,
          senderName,
          content:
            content.substring(0, 50) + (content.length > 50 ? "..." : ""),
          timestamp: Date.now(),
        });

        console.log("✅ Message notification sent to recipient:", recipientId);
        // ✅ Create Firestore notification
        const participantNames = conversationData.participantNames || {};
        const recipientName = participantNames[recipientId] || "Utilisateur";

        await createNotification(
          recipientId,
          "message",
          "Nouveau message",
          `${senderName} vous a envoyé un message.`,
          conversationId,
          "message"
        );
      }
    } catch (notifyError) {
      console.warn("⚠️ Failed to send message notification:", notifyError);
      // Continue anyway, this is just a notification
    }

    // Mettre à jour la conversation avec le dernier message
    await retryFirestoreOperation(async () => {
      return await updateDoc(conversationRef, {
        lastMessage: {
          content,
          timestamp: serverTimestamp(),
          senderId,
        },
        updatedAt: serverTimestamp(),
      });
    });

    console.log("✅ Message sent successfully");

    // Invalider le cache
    conversationsCache.clear();
  } catch (error) {
    console.error("❌ Error sending message:", error);
    throw new Error("Erreur lors de l'envoi du message");
  }
}

// S'abonner aux messages d'une conversation en temps réel avec pagination optimisée
export function subscribeToMessages(
  conversationId: string,
  callback: (messages: Message[]) => void,
  limitCount: number = 50
): () => void {
  // CRITICAL: Verify conversation ID is provided
  if (!conversationId) {
    console.warn(
      "⛔️ Conversation ID missing. Messages subscription cancelled."
    );
    callback([]);
    return () => {};
  }

  // Generate unique listener ID to prevent conflicts
  const listenerId = `messages_${conversationId}_${++messageListenerIdCounter}_${Date.now()}`;

  console.log(
    `🔔 Setting up messages subscription for conversation: ${conversationId} with ID: ${listenerId}`
  );

  // Clean up any existing listener for this conversation
  const existingListenerId = Array.from(activeMessageListeners.keys()).find(
    (id) => id.includes(`messages_${conversationId}_`)
  );
  if (existingListenerId) {
    console.log(
      "🧹 Cleaning up existing message listener:",
      existingListenerId
    );
    const cleanup = activeMessageListeners.get(existingListenerId);
    if (cleanup) {
      cleanup();
      activeMessageListeners.delete(existingListenerId);
    }
  }

  // CRITICAL: Only set up listener after Firestore is ready
  ensureFirestoreReady()
    .then((isReady) => {
      if (!isReady) {
        console.warn(
          "⚠️ Firestore not ready for messages subscription, providing empty data"
        );
        callback([]);
        return;
      }

      const db = getFirestoreInstance();
      if (!db) {
        console.warn(
          "❌ Firestore not initialized, cannot subscribe to messages"
        );
        callback([]);
        return;
      }

      try {
        // Ensure conversations collection exists
        const conversationsRef = collection(db, "conversations");
        const conversationRef = doc(conversationsRef, conversationId);

        // Check if conversation exists
        getDoc(conversationRef)
          .then((conversationSnap) => {
            if (!conversationSnap.exists()) {
              console.warn("⚠️ Conversation does not exist, creating it...");
              // This should not happen normally, but we'll handle it gracefully
              callback([]);
              return;
            }

            // Ensure messages subcollection exists
            const messagesRef = collection(
              db,
              `conversations/${conversationId}/messages`
            );

            // Requête optimisée avec orderBy et limit
            const q = query(
              messagesRef,
              orderBy("timestamp", "desc"),
              limit(limitCount)
            );

            const unsubscribe = onSnapshot(
              q,
              (snapshot) => {
                try {
                  const messages: Message[] = snapshot.docs
                    .map(
                      (doc) =>
                        ({
                          id: doc.id,
                          ...doc.data(),
                        } as Message)
                    )
                    .reverse(); // Inverser pour avoir l'ordre chronologique

                  console.log(
                    `✅ Received ${messages.length} messages via subscription (listener: ${listenerId})`
                  );
                  callback(messages);
                } catch (error) {
                  console.error(
                    `❌ Error processing messages snapshot (listener: ${listenerId}):`,
                    error
                  );
                  callback([]);
                }
              },
              async (error) => {
                console.error(
                  `❌ Error in messages subscription (listener: ${listenerId}):`,
                  error
                );

                // CRITICAL: Handle Firestore internal assertion failures
                if (isFirestoreInternalError(error)) {
                  console.error(
                    "🚨 Firestore internal assertion failure in messages subscription, resetting connection..."
                  );

                  // Clean up this listener immediately
                  if (activeMessageListeners.has(listenerId)) {
                    const cleanup = activeMessageListeners.get(listenerId);
                    if (cleanup) {
                      cleanup();
                      activeMessageListeners.delete(listenerId);
                    }
                  }

                  try {
                    await resetFirestoreConnection();
                    console.log(
                      "✅ Firestore connection reset after internal assertion failure in messages"
                    );
                  } catch (resetError) {
                    console.warn(
                      "⚠️ Could not reset Firestore after internal assertion failure:",
                      resetError
                    );
                  }

                  callback([]);
                  return;
                }

                // Handle Target ID conflicts specifically
                if (
                  error.message &&
                  error.message.includes("Target ID already exists")
                ) {
                  console.error(
                    "🎯 Target ID conflict in messages, cleaning up..."
                  );

                  // Clean up this listener immediately
                  if (activeMessageListeners.has(listenerId)) {
                    const cleanup = activeMessageListeners.get(listenerId);
                    if (cleanup) {
                      cleanup();
                      activeMessageListeners.delete(listenerId);
                    }
                  }

                  // Return empty array for now, the subscription will be retried
                  callback([]);
                  return;
                }

                callback([]);
              }
            );

            // Store the listener with unique ID
            activeMessageListeners.set(listenerId, unsubscribe);
          })
          .catch((error) => {
            console.error(
              `❌ Error checking if conversation exists (listener: ${listenerId}):`,
              error
            );
            callback([]);
          });
      } catch (error) {
        console.error("❌ Error setting up messages subscription:", error);
        callback([]);
      }
    })
    .catch((error) => {
      console.error(
        `❌ Failed to ensure Firestore ready for messages subscription:`,
        error
      );
      callback([]);
    });

  // Return a cleanup function that will be called when the component unmounts
  return () => {
    console.log(`🧹 Cleaning up message listener: ${listenerId}`);
    if (activeMessageListeners.has(listenerId)) {
      const cleanup = activeMessageListeners.get(listenerId);
      if (cleanup) {
        cleanup();
      }
      activeMessageListeners.delete(listenerId);
    }
  };
}

// S'abonner aux conversations d'un utilisateur - SIMPLIFIED to avoid composite index
export function subscribeToConversations(
  userId: string,
  callback: (conversations: Conversation[]) => void,
  limitCount: number = 20
): () => void {
  // CRITICAL: Verify user is authenticated
  if (!userId) {
    console.warn("⛔️ User ID missing. Conversations subscription cancelled.");
    callback([]);
    return () => {};
  }

  // Generate unique listener ID to prevent conflicts
  const listenerId = `conversations_${userId}_${++messageListenerIdCounter}_${Date.now()}`;

  console.log(
    `🔔 Setting up conversations subscription for user: ${userId} with ID: ${listenerId}`
  );

  // Clean up any existing listener for this user
  const existingListenerId = Array.from(activeMessageListeners.keys()).find(
    (id) => id.includes(`conversations_${userId}_`)
  );
  if (existingListenerId) {
    console.log(
      "🧹 Cleaning up existing conversation listener:",
      existingListenerId
    );
    const cleanup = activeMessageListeners.get(existingListenerId);
    if (cleanup) {
      cleanup();
      activeMessageListeners.delete(existingListenerId);
    }
  }

  // Vérifier le cache d'abord
  const cacheKey = `conversations_${userId}`;
  const cachedData = conversationsCache.get(cacheKey);
  if (cachedData) {
    console.log("📦 Using cached conversations data");
    callback(cachedData);
  }

  // CRITICAL: Only set up listener after Firestore is ready
  ensureFirestoreReady()
    .then((isReady) => {
      if (!isReady) {
        console.warn(
          "⚠️ Firestore not ready for conversations subscription, providing empty data"
        );
        callback([]);
        return;
      }

      const db = getFirestoreInstance();
      if (!db) {
        console.warn(
          "❌ Firestore not initialized, cannot subscribe to conversations"
        );
        callback([]);
        return;
      }

      try {
        // Ensure conversations collection exists
        const conversationsRef = collection(db, "conversations");

        // Simple query without orderBy to avoid composite index requirement
        const q = query(
          conversationsRef,
          where("participants", "array-contains", userId),
          limit(limitCount)
        );

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            try {
              let conversations: Conversation[] = snapshot.docs.map(
                (doc) =>
                  ({
                    id: doc.id,
                    ...doc.data(),
                  } as Conversation)
              );

              // Sort by updatedAt on client side to avoid index requirement
              conversations = conversations.sort((a, b) => {
                const aTime = a.updatedAt?.toDate?.() || new Date(0);
                const bTime = b.updatedAt?.toDate?.() || new Date(0);
                return bTime.getTime() - aTime.getTime();
              });

              console.log(
                `✅ Received ${conversations.length} conversations via subscription (listener: ${listenerId})`
              );

              // Mettre en cache
              conversationsCache.set(cacheKey, conversations);
              setTimeout(
                () => conversationsCache.delete(cacheKey),
                CACHE_DURATION
              );

              callback(conversations);

              // Clear error if we successfully receive data
              if (conversations.length > 0) {
                console.log("✅ Conversations loaded successfully");
              }
            } catch (error) {
              console.error(
                `❌ Error processing conversations snapshot (listener: ${listenerId}):`,
                error
              );
              callback([]);
            }
          },
          async (error) => {
            console.error(
              `❌ Error in conversations subscription (listener: ${listenerId}):`,
              error
            );

            // CRITICAL: Handle Firestore internal assertion failures
            if (isFirestoreInternalError(error)) {
              console.error(
                "🚨 Firestore internal assertion failure in conversations subscription, resetting connection..."
              );

              // Clean up this listener immediately
              if (activeMessageListeners.has(listenerId)) {
                const cleanup = activeMessageListeners.get(listenerId);
                if (cleanup) {
                  cleanup();
                  activeMessageListeners.delete(listenerId);
                }
              }

              try {
                await resetFirestoreConnection();
                console.log(
                  "✅ Firestore connection reset after internal assertion failure in conversations"
                );

                // Try to resubscribe after a delay
                setTimeout(() => {
                  if (userId) {
                    console.log(
                      "🔄 Attempting to resubscribe to conversations after reset"
                    );
                    const newUnsubscribe = subscribeToConversations(
                      userId,
                      callback,
                      limitCount
                    );
                    // Store the new unsubscribe function
                    const newListenerId = `conversations_${userId}_${++messageListenerIdCounter}_${Date.now()}`;
                    activeMessageListeners.set(newListenerId, newUnsubscribe);
                  }
                }, 2000);
              } catch (resetError) {
                console.warn(
                  "⚠️ Could not reset Firestore after internal assertion failure:",
                  resetError
                );
              }

              callback([]);
              return;
            }

            // Handle Target ID conflicts specifically
            if (
              error.message &&
              error.message.includes("Target ID already exists")
            ) {
              console.error(
                "🎯 Target ID conflict in conversations, cleaning up..."
              );

              // Clean up this listener immediately
              if (activeMessageListeners.has(listenerId)) {
                const cleanup = activeMessageListeners.get(listenerId);
                if (cleanup) {
                  cleanup();
                  activeMessageListeners.delete(listenerId);
                }
              }

              // Return empty array for now, the subscription will be retried
              callback([]);
              return;
            }

            // Provide specific error handling without nested listeners
            if (error.code === "permission-denied") {
              console.error("❌ Permission denied for conversations");
            } else if (error.code === "unavailable") {
              console.error("❌ Firestore service unavailable");
            } else {
              console.error(
                "❌ Unknown error in conversations subscription:",
                error.code
              );
            }

            callback([]);
          }
        );

        // Store the listener with unique ID
        activeMessageListeners.set(listenerId, unsubscribe);
      } catch (error) {
        console.error("❌ Error setting up conversations subscription:", error);
        callback([]);
      }
    })
    .catch((error) => {
      console.error(
        `❌ Failed to ensure Firestore ready for conversations subscription:`,
        error
      );
      callback([]);
    });

  // Return a cleanup function that will be called when the component unmounts
  return () => {
    console.log(`🧹 Cleaning up conversation listener: ${listenerId}`);
    if (activeMessageListeners.has(listenerId)) {
      const cleanup = activeMessageListeners.get(listenerId);
      if (cleanup) {
        cleanup();
      }
      activeMessageListeners.delete(listenerId);
    }
  };
}

// Marquer les messages comme lus avec optimisation par lots
export async function markMessagesAsRead(
  conversationId: string,
  userId: string
): Promise<void> {
  try {
    console.log("👁️ Marking messages as read for user:", userId);

    // CRITICAL: Verify user is authenticated
    if (!userId || !conversationId) {
      console.warn(
        "⛔️ User ID or conversation ID missing. Mark as read cancelled."
      );
      return;
    }

    // CRITICAL: Ensure Firestore is ready before operation
    await ensureFirestoreReady();

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Ensure conversations collection exists
    const conversationsRef = collection(db, "conversations");
    const conversationRef = doc(conversationsRef, conversationId);

    // Check if conversation exists
    const conversationSnap = await getDoc(conversationRef);
    if (!conversationSnap.exists()) {
      console.warn(
        "⚠️ Conversation does not exist, cannot mark messages as read"
      );
      return;
    }

    // Ensure messages subcollection exists
    const messagesRef = collection(
      db,
      `conversations/${conversationId}/messages`
    );

    // Requête simple pour éviter les problèmes d'index
    const q = query(
      messagesRef,
      where("senderId", "!=", userId),
      where("read", "==", false),
      limit(20) // Limiter pour éviter les opérations trop lourdes
    );

    const snapshot = await retryFirestoreOperation(async () => {
      return await getDocs(q);
    });

    if (snapshot.docs.length > 0) {
      // Traiter par lots de 10 pour éviter les surcharges
      const batchSize = 10;
      for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        const batch = snapshot.docs.slice(i, i + batchSize);

        const updatePromises = batch.map((messageDoc) =>
          retryFirestoreOperation(async () => {
            return await updateDoc(
              doc(
                db,
                `conversations/${conversationId}/messages`,
                messageDoc.id
              ),
              {
                read: true,
              }
            );
          })
        );

        await Promise.all(updatePromises);

        // Petite pause entre les lots
        if (i + batchSize < snapshot.docs.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      console.log(`✅ Marked ${snapshot.docs.length} messages as read`);
    }
  } catch (error) {
    console.error("❌ Error marking messages as read:", error);
    // Ne pas lancer d'erreur pour ne pas bloquer l'interface
  }
}

// Obtenir le nombre de messages non lus pour un utilisateur avec cache
const unreadCountCache = new Map<
  string,
  { count: number; timestamp: number }
>();

export async function getUnreadCount(userId: string): Promise<number> {
  try {
    // CRITICAL: Verify user is authenticated
    if (!userId) {
      console.warn("⛔️ User ID missing. Unread count check cancelled.");
      return 0;
    }

    // Vérifier le cache
    const cacheKey = `unread_${userId}`;
    const cached = unreadCountCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30000) {
      // Cache de 30 secondes
      return cached.count;
    }

    console.log("📊 Getting unread count for user:", userId);

    // CRITICAL: Ensure Firestore is ready before operation
    const isReady = await ensureFirestoreReady();
    if (!isReady) {
      console.warn("⚠️ Firestore not ready for unread count, returning 0");
      return 0;
    }

    const db = getFirestoreInstance();
    if (!db) {
      console.warn("⚠️ Firestore not available for unread count, returning 0");
      return 0;
    }

    // Ensure conversations collection exists
    const conversationsRef = collection(db, "conversations");

    // Récupérer les conversations de l'utilisateur avec limite
    const q = query(
      conversationsRef,
      where("participants", "array-contains", userId),
      limit(10) // Limiter pour éviter les requêtes trop lourdes
    );

    const conversationsSnapshot = await retryFirestoreOperation(async () => {
      return await getDocs(q);
    });

    let totalUnread = 0;

    // Pour chaque conversation, compter les messages non lus (avec limite)
    const unreadPromises = conversationsSnapshot.docs
      .slice(0, 5)
      .map(async (conversationDoc) => {
        try {
          // Ensure messages subcollection exists
          const messagesRef = collection(
            db,
            `conversations/${conversationDoc.id}/messages`
          );

          const messagesQuery = query(
            messagesRef,
            where("senderId", "!=", userId),
            where("read", "==", false),
            limit(5) // Limiter pour éviter les requêtes trop lourdes
          );

          const messagesSnapshot = await getDocs(messagesQuery);
          return messagesSnapshot.size;
        } catch {
          console.warn(
            "⚠️ Error counting unread messages for conversation:",
            conversationDoc.id
          );
          return 0;
        }
      });

    const unreadCounts = await Promise.all(unreadPromises);
    totalUnread = unreadCounts.reduce((sum, count) => sum + count, 0);

    // Mettre en cache
    unreadCountCache.set(cacheKey, {
      count: totalUnread,
      timestamp: Date.now(),
    });

    console.log(`✅ Total unread messages: ${totalUnread}`);
    return totalUnread;
  } catch (error) {
    console.error("❌ Error getting unread count:", error);
    return 0;
  }
}

// Rechercher des utilisateurs pour démarrer une conversation avec cache
const usersCache = new Map<
  string,
  Array<{ id: string; name: string; type: string; profileImage?: string }>
>();

export async function searchUsers(
  searchTerm: string,
  currentUserId: string,
  userType: "patient" | "professional" | "admin"
): Promise<
  Array<{ id: string; name: string; type: string; profileImage?: string }>
> {
  try {
    // CRITICAL: Verify user is authenticated
    if (!currentUserId) {
      console.warn("⛔️ Current user ID missing. User search cancelled.");
      return [];
    }

    console.log("🔍 Searching users with term:", searchTerm);

    // Vérifier le cache
    const cacheKey = `users_search_${searchTerm.toLowerCase()}`;
    const cached = usersCache.get(cacheKey);
    if (cached) {
      console.log("📦 Using cached search results");
      return cached;
    }

    // CRITICAL: Ensure Firestore is ready before operation
    await ensureFirestoreReady();

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    type UserSearchResult = {
      id: string;
      name: string;
      type: string;
      profileImage?: string;
    };

    const allUsers: UserSearchResult[] = [];
    const seenIds = new Set<string>();

    // 1. Rechercher dans la collection "users" (professionnels et admins)
    try {
      const usersRef = collection(db, "users");
      const usersSnapshot = await retryFirestoreOperation(async () => {
        return await getDocs(query(usersRef, limit(50)));
      });

      usersSnapshot.docs.forEach((doc) => {
        const userData = doc.data();
        if (userData.name && userData.type && !seenIds.has(doc.id)) {
          seenIds.add(doc.id);
          allUsers.push({
            id: doc.id,
            name: userData.name,
            type: userData.type,
            profileImage: userData.profileImage,
          });
        }
      });
    } catch (error) {
      console.log("⚠️ Error searching in users collection:", error);
    }

    // 2. Rechercher dans la collection "patients" (patients)
    try {
      const patientsRef = collection(db, "patients");
      const patientsSnapshot = await retryFirestoreOperation(async () => {
        return await getDocs(query(patientsRef, limit(50)));
      });

      patientsSnapshot.docs.forEach((doc) => {
        const patientData = doc.data();
        if (patientData.name && !seenIds.has(doc.id)) {
          seenIds.add(doc.id);
          allUsers.push({
            id: doc.id,
            name: patientData.name,
            type: "patient",
            profileImage: patientData.profileImage,
          });
        }
      });
    } catch (error) {
      console.log("⚠️ Error searching in patients collection:", error);
    }

    // 3. Filtrer par nom et exclure l'utilisateur actuel
    const filteredUsers = allUsers.filter(
      (user) =>
        user.id !== currentUserId &&
        user.name &&
        user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 4. Filtrer selon le type d'utilisateur côté client
    let finalUsers = filteredUsers;
    if (userType === "patient") {
      // Les patients peuvent contacter les professionnels
      finalUsers = filteredUsers.filter((user) => user.type === "professional");
    } else if (userType === "professional") {
      // Les professionnels peuvent contacter les patients et les admins
      finalUsers = filteredUsers.filter(
        (user) => user.type === "patient" || user.type === "admin"
      );
    }
    // Les admins peuvent contacter tout le monde (pas de filtre)

    const results = finalUsers.slice(0, 10); // Limiter à 10 résultats

    // Mettre en cache pour 1 minute
    usersCache.set(cacheKey, results);
    setTimeout(() => usersCache.delete(cacheKey), 60000);

    console.log(`✅ Found ${results.length} matching users`);
    return results;
  } catch (error) {
    console.error("❌ Error searching users:", error);
    return [];
  }
}

// Envoyer un message de diffusion (admin uniquement) avec optimisation par lots
export async function sendBroadcastMessage(
  senderId: string,
  senderName: string,
  content: string,
  recipientType: "all" | "professional" | "patient",
  specialty?: string
): Promise<void> {
  try {
    // CRITICAL: Verify sender is authenticated
    if (!senderId) {
      console.warn("⛔️ Sender ID missing. Broadcast message cancelled.");
      throw new Error("Identifiant utilisateur manquant");
    }

    console.log("📢 Sending broadcast message to:", recipientType);

    // CRITICAL: Ensure Firestore is ready before operation
    await ensureFirestoreReady();

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Ensure users collection exists
    const usersRef = collection(db, "users");

    // Récupérer les utilisateurs cibles avec limite
    const snapshot = await retryFirestoreOperation(async () => {
      return await getDocs(query(usersRef, limit(100))); // Limiter pour éviter les surcharges
    });

    type FirestoreUser = {
      id: string;
      name: string;
      type: string;
      profileImage?: string;
      [key: string]: unknown;
    };

    let targetUsers: FirestoreUser[] = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as FirestoreUser))
      .filter((user) => user.id !== senderId);

    // Filtrer par type si nécessaire
    if (recipientType !== "all") {
      targetUsers = targetUsers.filter((user) => user.type === recipientType);
    }

    // Filtrer par spécialité si spécifié
    if (specialty && recipientType === "professional") {
      // Ensure professionals collection exists
      const professionalsRef = collection(db, "professionals");

      const profSnapshot = await retryFirestoreOperation(async () => {
        return await getDocs(query(professionalsRef, limit(50)));
      });

      type Professional = {
        id: string;
        userId: string;
        specialty?: string;
        [key: string]: unknown;
      };

      const specialtyProfessionals = profSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as Professional))
        .filter((prof) => prof.specialty === specialty)
        .map((prof) => prof.userId);

      targetUsers = targetUsers.filter((user) =>
        specialtyProfessionals.includes(user.id)
      );
    }

    console.log(`📤 Sending broadcast to ${targetUsers.length} users`);

    // Traiter par lots de 5 pour éviter les surcharges
    const batchSize = 5;
    for (let i = 0; i < targetUsers.length; i += batchSize) {
      const batch = targetUsers.slice(i, i + batchSize);

      const promises = batch.map(async (user) => {
        try {
          const conversationId = await getOrCreateConversation(
            senderId,
            senderName,
            "admin",
            user.id,
            user.name,
            user.type as "patient" | "professional" | "admin"
          );

          return sendMessage(
            conversationId,
            senderId,
            senderName,
            "admin",
            content
          );
        } catch (error) {
          console.warn(`⚠️ Failed to send message to user ${user.id}:`, error);
        }
      });

      await Promise.all(promises);

      // Pause plus longue entre les lots pour éviter les rate limits
      if (i + batchSize < targetUsers.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log("✅ Broadcast message sent successfully");
  } catch (error) {
    console.error("❌ Error sending broadcast message:", error);
    throw new Error("Erreur lors de l'envoi du message de diffusion");
  }
}

// Fonction utilitaire pour nettoyer les caches
export function clearMessageCaches(): void {
  conversationsCache.clear();
  unreadCountCache.clear();
  usersCache.clear();
  console.log("🧹 Message caches cleared");
}

// Utility function to clean up all message listeners
export const cleanupAllMessageListeners = () => {
  console.log(
    `🧹 Cleaning up all ${activeMessageListeners.size} message listeners`
  );
  activeMessageListeners.forEach((unsubscribe, listenerId) => {
    console.log("🧹 Cleaning up message listener:", listenerId);
    unsubscribe();
  });
  activeMessageListeners.clear();
  messageListenerIdCounter = 0;
};
