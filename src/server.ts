import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

interface UserInfo {
  username: string;
  lastActive: number;
  isOnline: boolean;
  isTyping: boolean;
  typingTo: string | null;
}

interface Users {
  [socketId: string]: UserInfo;
}

interface Message {
  sender: string;
  receiver: string;
  encryptedMessage: string;
  timestamp: number;
}

interface Conversations {
  [conversationId: string]: Message[];
}

let users: Users = {};

let conversations: Conversations = {};

const getConversationId = (user1: string, user2: string): string => {
  return [user1, user2].sort().join("_");
};

const getUsersList = () => {
  const usersList = Object.values(users).map((user) => ({
    username: user.username,
    isOnline: user.isOnline,
    lastActive: user.lastActive,
  }));
  return usersList;
};

io.on("connection", (socket: Socket) => {
  console.log("A user connected", socket.id);

  socket.on("userJoined", (username: string) => {
    users[socket.id] = {
      username,
      lastActive: Date.now(),
      isOnline: true,
      isTyping: false,
      typingTo: null,
    };

    io.emit("usersList", getUsersList());
  });

  socket.on(
    "sendMessage",
    ({
      sender,
      receiver,
      encryptedMessage,
      conversationId,
    }: {
      sender: string;
      receiver: string;
      encryptedMessage: string;
      conversationId: string;
    }) => {
      if (users[socket.id]) {
        users[socket.id].lastActive = Date.now();
        users[socket.id].isTyping = false;
        users[socket.id].typingTo = null;
      }

      if (!conversationId) {
        conversationId = getConversationId(sender, receiver);
      }

      if (!conversations[conversationId]) {
        conversations[conversationId] = [];
      }

      const message: Message = {
        sender,
        receiver,
        encryptedMessage,
        timestamp: Date.now(),
      };

      conversations[conversationId].push(message);

      const recipientSocketId = Object.keys(users).find(
        (key) => users[key].username === receiver
      );

      if (recipientSocketId) {
        io.to(recipientSocketId).emit("receiveMessage", {
          sender,
          encryptedMessage,
          timestamp: message.timestamp,
          conversationId,
        });
      }

      io.emit("usersList", getUsersList());
    }
  );

  socket.on(
    "getConversation",
    ({
      user1,
      user2,
      conversationId,
    }: {
      user1: string;
      user2: string;
      conversationId: string;
    }) => {
      if (!conversationId) {
        conversationId = getConversationId(user1, user2);
      }

      socket.emit("conversationHistory", {
        conversationId,
        messages: conversations[conversationId] || [],
      });
    }
  );

  socket.on(
    "typing",
    ({ sender, receiver }: { sender: string; receiver: string }) => {
      if (users[socket.id]) {
        users[socket.id].isTyping = true;
        users[socket.id].typingTo = receiver;
        users[socket.id].lastActive = Date.now();
      }

      const recipientSocketId = Object.keys(users).find(
        (key) => users[key].username === receiver
      );

      if (recipientSocketId) {
        io.to(recipientSocketId).emit("userTyping", {
          sender,
          isTyping: true,
        });
      }

      setTimeout(() => {
        if (users[socket.id] && users[socket.id].isTyping) {
          users[socket.id].isTyping = false;
          users[socket.id].typingTo = null;

          if (recipientSocketId) {
            io.to(recipientSocketId).emit("userTyping", {
              sender,
              isTyping: false,
            });
          }
        }
      }, 3000);
    }
  );

  socket.on(
    "messageRead",
    ({
      sender,
      receiver,
      conversationId,
    }: {
      sender: string;
      receiver: string;
      conversationId: string;
    }) => {
      if (!conversationId) {
        conversationId = getConversationId(sender, receiver);
      }

      const senderSocketId = Object.keys(users).find(
        (key) => users[key].username === sender
      );

      if (senderSocketId) {
        io.to(senderSocketId).emit("messageStatus", {
          reader: receiver,
          status: "read",
          conversationId,
        });
      }
    }
  );

  socket.on("userActivity", () => {
    if (users[socket.id]) {
      users[socket.id].lastActive = Date.now();
    }
  });

  socket.on("setStatus", ({ status }: { status: "online" | "offline" }) => {
    if (users[socket.id]) {
      users[socket.id].isOnline = status === "online";
      users[socket.id].lastActive = Date.now();
      io.emit("usersList", getUsersList());
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);

    if (users[socket.id]) {
      users[socket.id].isOnline = false;
      users[socket.id].lastActive = Date.now();

      setTimeout(() => {
        delete users[socket.id];
      }, 24 * 60 * 60 * 1000);

      io.emit("usersList", getUsersList());
    }
  });
});

setInterval(() => {
  const now = Date.now();
  const inactiveTimeout = 5 * 60 * 1000;

  for (const socketId in users) {
    if (
      users[socketId].isOnline &&
      now - users[socketId].lastActive > inactiveTimeout
    ) {
      users[socketId].isOnline = false;
      io.emit("usersList", getUsersList());
    }
  }
}, 60 * 1000);

setInterval(() => {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  for (const conversationId in conversations) {
    const hasRecentMessages = conversations[conversationId].some(
      (msg) => msg.timestamp > thirtyDaysAgo
    );

    if (!hasRecentMessages) {
      delete conversations[conversationId];
    }
  }
}, 24 * 60 * 60 * 1000);

server.listen(8087, () => {
  console.log("Server running on port 8087");
});
