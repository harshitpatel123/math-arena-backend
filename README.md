# 📘 Math Arena Backend

This is the **backend API** for the **Math Arena** game.  
It is built with **Node.js**, **Express.js**, and **MongoDB**.  
It handles authentication, game logic, answers, and profile picture management.

---

## 📂 Project Structure

```
math-arena-backend/
│-- src/
│   │-- routes/
│   │   ├─ auth.js        # Authentication routes (register, login)
│   │   ├─ game.js        # Game logic routes (questions, answers, results)
│   │
│   ├─ server.js          # Main Express server
│
│-- profilePictures/       # Stores uploaded profile pictures
│-- .env                   # Environment variables
│-- package.json
│-- README.md
```

---

## ⚙️ Server Setup

### 1️⃣ Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)  
- [MongoDB](https://www.mongodb.com/) (local or Atlas cloud instance)  

---

### 2️⃣ Install Dependencies
```bash
cd math-arena-backend
npm install
```

---

### 3️⃣ Environment Variables
Create a `.env` file in the project root (`math-arena-backend/.env`) with:

```env
PORT=4000
MONGO_URI=your_mongo_db_uri
CLIENT_URL=http://localhost:3000
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
ACCESS_EXP=minutes(eg:- 30m)
REFRESH_EXP=days(eg:- 5d)
```

---

### 4️⃣ Start the Server
```bash
# Development
npm run dev

```

Server runs at:  
👉 http://localhost:4000

---

## 🔑 API Endpoints

### Auth Routes (`/api/auth`)
- `POST /register` → Register a new user  
- `POST /login` → Login and receive tokens  

### Game Routes (`/api/game`)
- `POST /start` → Start a new game session  
- `GET /questions/:gameId` → Get game questions  
- `POST /answer/:gameId/:questionId` → Submit answer  
- `GET /result/:gameId` → Get game result  

---

## 🖼️ Profile Pictures

Profile pictures are stored in the **`profilePictures/`** folder at the project root.  
They are served statically from:

```
http://localhost:4000/profilePictures/<filename>
```

✅ Example:  
http://localhost:4000/profilePictures/1757238120367.jpeg

---
