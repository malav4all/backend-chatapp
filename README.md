# Secure Chat Application Backend

This is the backend server for a secure chat application that provides real-time messaging with encryption and user status features.

## Features

- Real-time messaging using Socket.IO
- End-to-end encryption support (implemented on frontend)
- User presence detection (online/offline status)
- Typing indicators
- Message read receipts
- Conversation history management
- Automatic cleanup of inactive users and old conversations

## Technical Stack

- Node.js
- Express.js
- Socket.IO for real-time communication
- TypeScript for type safety

## Installation

1. Clone the repository
2. Install dependencies:
   ```
   yarn install
   ```
3. Start the server:
   ```
   yarn dev
   ```

## API and Socket Events

### Server Events (Listening)

- `connection`: Triggered when a user connects to the server
- `userJoined`: Registers a new user with the provided username
- `sendMessage`: Handles sending encrypted messages between users
- `getConversation`: Retrieves conversation history between two users
- `typing`: Manages typing indicators
- `messageRead`: Tracks message read status
- `userActivity`: Updates user's last active timestamp
- `setStatus`: Sets a user's online/offline status
- `disconnect`: Handles user disconnection

### Client Events (Emitting)

- `usersList`: Broadcasts the updated list of users
- `receiveMessage`: Sends a message to the recipient
- `conversationHistory`: Returns conversation history
- `userTyping`: Notifies a user when someone is typing
- `messageStatus`: Updates message read status

## Data Structures

### Users

The server maintains a record of all users with the following information:
- Socket ID
- Username
- Last active timestamp
- Online status
- Typing status and recipient

### Conversations

Conversations are stored with:
- Unique conversation ID (combination of both usernames)
- Array of messages with sender, receiver, encrypted message content, and timestamp

## Automatic Maintenance

- Users who are inactive for more than 5 minutes are marked as offline
- User data is removed 24 hours after disconnection
- Conversations older than 30 days (no recent messages) are automatically removed

## CORS Configuration

The server is configured to accept connections from:
- Origin: http://localhost:5173
- Methods: GET, POST

## Port

The server runs on port 8087 by default.
