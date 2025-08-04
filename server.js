import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
if (serviceAccount.project_id) {
  initializeApp({
    credential: cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
  });
} else {
  console.warn(
    "⚠️ Firebase service account not configured, using default credentials"
  );
  initializeApp();
}

const db = getFirestore();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Middleware pour parser le JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// PayDunya IPN Endpoint
app.post("/api/paydunya-ipn", async (req, res) => {
  try {
    console.log("🔔 [PAYDUNYA IPN] Received notification");
    console.log("🔔 [PAYDUNYA IPN] Method:", req.method);
    console.log("🔔 [PAYDUNYA IPN] Headers:", req.headers);
    console.log("🔔 [PAYDUNYA IPN] Body:", JSON.stringify(req.body, null, 2));

    // Vérifier que c'est bien un POST
    if (req.method !== "POST") {
      console.error("❌ [PAYDUNYA IPN] Invalid method:", req.method);
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Vérifier la signature PayDunya (optionnel mais recommandé)
    const paydunyaToken = process.env.PAYDUNYA_MASTER_KEY || "test-token";
    const receivedToken = req.headers["paydunya-token"] || req.body.token;

    if (receivedToken && receivedToken !== paydunyaToken) {
      console.error("❌ [PAYDUNYA IPN] Invalid token");
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Extraire les données du paiement
    const paymentData = {
      token: req.body.token,
      status: req.body.status,
      transactionId: req.body.transaction_id || req.body.token,
      amount: req.body.amount,
      currency: req.body.currency || "XOF",
      customerName: req.body.customer_name,
      customerPhone: req.body.customer_phone,
      customerEmail: req.body.customer_email,
      paymentMethod: req.body.payment_method,
      bookingId: req.body.booking_id || req.body.custom_data?.booking_id,
      professionalId:
        req.body.professional_id || req.body.custom_data?.professional_id,
      patientId: req.body.patient_id || req.body.custom_data?.patient_id,
      timestamp: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      rawData: req.body,
    };

    console.log("✅ [PAYDUNYA IPN] Payment data extracted:", paymentData);

    // Enregistrer dans Firestore
    try {
      const paymentRef = await db.collection("payments").add({
        ...paymentData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(
        "✅ [PAYDUNYA IPN] Payment saved to Firestore with ID:",
        paymentRef.id
      );

      // Si c'est un paiement confirmé, mettre à jour le statut de la réservation
      if (paymentData.status === "COMPLETED" && paymentData.bookingId) {
        try {
          const bookingRef = db
            .collection("bookings")
            .doc(paymentData.bookingId);
          await bookingRef.update({
            paymentStatus: "paid",
            paymentId: paymentRef.id,
            paidAt: new Date(),
            updatedAt: new Date(),
          });
          console.log(
            "✅ [PAYDUNYA IPN] Booking status updated for:",
            paymentData.bookingId
          );
        } catch (bookingError) {
          console.error(
            "❌ [PAYDUNYA IPN] Error updating booking:",
            bookingError
          );
        }
      }

      // Envoyer une notification au professionnel si nécessaire
      if (paymentData.status === "COMPLETED" && paymentData.professionalId) {
        try {
          await db.collection("notifications").add({
            userId: paymentData.professionalId,
            type: "payment_received",
            title: "Paiement reçu",
            message: `Nouveau paiement reçu de ${paymentData.customerName} - ${paymentData.amount} ${paymentData.currency}`,
            data: {
              paymentId: paymentRef.id,
              bookingId: paymentData.bookingId,
              amount: paymentData.amount,
              currency: paymentData.currency,
            },
            createdAt: new Date(),
            read: false,
          });
          console.log("✅ [PAYDUNYA IPN] Notification sent to professional");
        } catch (notificationError) {
          console.error(
            "❌ [PAYDUNYA IPN] Error sending notification:",
            notificationError
          );
        }
      }
    } catch (firestoreError) {
      console.error(
        "❌ [PAYDUNYA IPN] Error saving to Firestore:",
        firestoreError
      );
      return res.status(500).json({ error: "Failed to save payment data" });
    }

    // Répondre avec succès
    console.log("✅ [PAYDUNYA IPN] Processing completed successfully");
    res.status(200).json({
      success: true,
      message: "Payment notification received and processed",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ [PAYDUNYA IPN] Unexpected error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

// Endpoint de test pour vérifier que le serveur fonctionne
app.get("/api/paydunya-ipn/test", (req, res) => {
  res.status(200).json({
    message: "PayDunya IPN endpoint is working",
    timestamp: new Date().toISOString(),
  });
});

// Serve static files from the dist directory
app.use(express.static(join(__dirname, "dist")));

// Handle all routes by serving index.html (for SPA routing)
app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

// Store active rooms
const rooms = new Map();

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join-room", (roomId) => {
    console.log(`Client ${socket.id} joining room ${roomId}`);

    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set([socket.id]));
    } else {
      rooms.get(roomId).add(socket.id);
    }

    // Notify client that they've joined the room
    socket.emit("room-joined", { roomId });

    // Notify other clients in the room
    socket.to(roomId).emit("user-joined", { userId: socket.id });
  });

  socket.on("signal", ({ roomId, signal, from }) => {
    console.log(`Signaling from ${from} in room ${roomId}`);
    socket.to(roomId).emit("signal", { signal, from });
  });

  socket.on("chat-message", ({ roomId, message }) => {
    socket.to(roomId).emit("chat-message", message);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    // Remove client from all rooms
    rooms.forEach((clients, roomId) => {
      if (clients.has(socket.id)) {
        clients.delete(socket.id);
        if (clients.size === 0) {
          rooms.delete(roomId);
        }
        io.to(roomId).emit("user-left", { userId: socket.id });
      }
    });
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
