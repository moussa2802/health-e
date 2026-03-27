import {
  getDatabase,
  ref,
  set,
  onValue,
  update,
  get,
  remove,
} from "firebase/database";

// Initialize Firebase Realtime Database
const database = getDatabase();

// Types for Jitsi integration
export interface JitsiParticipant {
  id: string;
  name: string;
  type: "patient" | "professional" | "admin";
  joinedAt: string;
  isConnected: boolean;
}

export interface JitsiRoom {
  id: string;
  createdAt: string;
  createdBy: string;
  status: "pending" | "active" | "ended";
  participants: Record<string, JitsiParticipant>;
  type: "video" | "audio";
  connectionStatus: {
    patientConnected: boolean;
    professionalConnected: boolean;
    lastUpdated: string;
  };
}

/**
 * Create or join a consultation room
 * @param roomId The ID of the room to create or join
 * @param userId The ID of the user joining the room
 * @param userName The name of the user joining the room
 * @param userType The type of the user joining the room
 */
export const joinRoom = async (
  roomId: string,
  userId: string,
  userName: string,
  userType: "patient" | "professional" | "admin"
): Promise<() => void> => {
  try {

    // Create a reference to the room in Firebase
    const roomRef = ref(database, `rooms/${roomId}`);

    // Check if room exists
    const roomSnapshot = await get(roomRef);
    if (!roomSnapshot.exists()) {
      // Create the room if it doesn't exist
      await set(roomRef, {
        id: roomId,
        createdAt: new Date().toISOString(),
        createdBy: userId,
        status: "pending",
        type: "video", // Default to video
        connectionStatus: {
          patientConnected: false,
          professionalConnected: false,
          lastUpdated: new Date().toISOString(),
        },
      });
    }

    // Add the user to the room
    const participantRef = ref(
      database,
      `rooms/${roomId}/participants/${userId}`
    );
    await set(participantRef, {
      id: userId,
      name: userName,
      type: userType,
      joinedAt: new Date().toISOString(),
      isConnected: true,
    });


    // Update connection status in the room
    const connectionStatusRef = ref(
      database,
      `rooms/${roomId}/connectionStatus`
    );
    const connectionStatusField =
      userType === "patient" ? "patientConnected" : "professionalConnected";

    // Update the connection status
    await update(connectionStatusRef, {
      [connectionStatusField]: true,
      lastUpdated: new Date().toISOString(),
    });


    // Return a cleanup function
    return async () => {
      await remove(participantRef);
      // Cleanup function to manually set disconnected status
      update(userRef, {
        isConnected: false,
      });

      // Update connection status
      update(connectionStatusRef, {
        [connectionStatusField]: false,
        lastUpdated: new Date().toISOString(),
      });
    };
  } catch (error) {
    console.error("❌ Error joining room:", error);
    throw new Error("Failed to join consultation room");
  }
};

/**
 * Get the connection status of a room
 * @param roomId The ID of the room
 * @returns A function to unsubscribe from the connection status
 */
export const getConnectionStatus = (
  roomId: string,
  callback: (status: {
    patientConnected: boolean;
    professionalConnected: boolean;
  }) => void
): (() => void) => {
  const connectionStatusRef = ref(database, `rooms/${roomId}/connectionStatus`);

  const unsubscribe = onValue(connectionStatusRef, (snapshot) => {
    const status = snapshot.exists()
      ? snapshot.val()
      : {
          patientConnected: false,
          professionalConnected: false,
        };

    callback(status);
  });

  return unsubscribe;
};

/**
 * Get all participants in a room
 * @param roomId The ID of the room
 * @returns Array of participants
 */
export const getRoomParticipants = async (
  roomId: string
): Promise<JitsiParticipant[]> => {
  try {

    const participantsRef = ref(database, `rooms/${roomId}/participants`);
    const snapshot = await get(participantsRef);

    if (!snapshot.exists()) {
      return [];
    }

    const participantsData = snapshot.val();
    const participants = Object.values(participantsData) as JitsiParticipant[];

    return participants;
  } catch (error) {
    console.error("❌ Error getting room participants:", error);
    return [];
  }
};

/**
 * End a consultation and clean up resources
 * @param roomId The ID of the room
 * @param userId The ID of the user ending the consultation
 */
export const endConsultation = async (
  roomId: string,
  userId: string
): Promise<void> => {
  try {

    // Update the user's connection status
    const userRef = ref(database, `rooms/${roomId}/participants/${userId}`);
    await update(userRef, {
      isConnected: false,
    });

    // Update the room status
    const roomRef = ref(database, `rooms/${roomId}`);
    await update(roomRef, {
      status: "ended",
      endedAt: new Date().toISOString(),
      endedBy: userId,
    });

  } catch (error) {
    console.error("❌ Error ending consultation:", error);
    throw new Error("Failed to end consultation");
  }
};

/**
 * Create an instant consultation request
 * @param professionalId The ID of the professional
 * @param patientId The ID of the patient
 * @param patientName The name of the patient
 */
export const createInstantConsultationRequest = async (
  professionalId: string,
  patientId: string,
  patientName: string
): Promise<string> => {
  try {

    // Generate a unique ID for the consultation
    const consultationId = `instant-${patientId}-${Date.now()}`;

    // Create a reference to the room in Firebase
    const roomRef = ref(database, `rooms/${consultationId}`);

    // Create the room
    await set(roomRef, {
      id: consultationId,
      createdAt: new Date().toISOString(),
      createdBy: patientId,
      status: "pending",
      patientId,
      patientName,
      professionalId,
      type: "video", // Default to video for instant consultations
      connectionStatus: {
        patientConnected: false,
        professionalConnected: false,
        lastUpdated: new Date().toISOString(),
      },
    });

    // Also create a professional request entry
    const requestRef = ref(
      database,
      `professional_requests/${professionalId}/${consultationId}`
    );
    await set(requestRef, {
      id: consultationId,
      patientId,
      patientName,
      timestamp: Date.now(),
      status: "pending",
    });

    return consultationId;
  } catch (error) {
    console.error("❌ Error creating instant consultation request:", error);
    throw new Error("Failed to create instant consultation request");
  }
};

/**
 * Send a chat message to the room
 * @param roomId The ID of the room
 * @param userId The ID of the user sending the message
 * @param userName The name of the user sending the message
 * @param text The message text
 */
export const sendChatMessage = async (
  roomId: string,
  userId: string,
  userName: string,
  text: string
): Promise<void> => {
  try {

    // Create a reference to the chat in Firebase
    const chatRef = ref(database, `rooms/${roomId}/chat/${Date.now()}`);

    // Send the message
    await set(chatRef, {
      text,
      sender: userId,
      senderName: userName,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("❌ Error sending chat message:", error);
    throw new Error("Failed to send chat message");
  }
};
