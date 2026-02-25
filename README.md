# BeLast - Multiplayer Block Puzzle

A competitive, real-time multiplayer block puzzle game built with modern web technologies. Players compete head-to-head or practice solo, strategically placing blocks to clear lines and outlast their opponents.

## Features
- **Real-Time Multiplayer (PvP)**: Matchmake automatically against other players. Earning and losing points impacts your Elo rating.
- **Solo Practice Mode**: Hone your skills and attempt to beat your personal highest score.
- **Interactive Match History**: Track your wins, losses, solo scores, and Elo progress in your persistent profile.
- **Modern UI/UX**: Enjoy a sleek, glass-morphic interface optimized for both desktop and mobile layouts.
- **Live Leaderboards & Ratings**: Built on Supabase, the backend ensures data integrity and live player rankings.

## Tech Stack
- **Frontend**: React (Vite), TypeScript, HTML5 Canvas API
- **Backend**: Node.js, Express, Socket.IO
- **Database / Auth**: Supabase (PostgreSQL, Row Level Security)

## Local Development
To run BeLast locally, follow these steps:

### Prerequisites
- Node.js (v18+)
- Supabase Project & URL

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/belast.git
   ```

2. Install dependencies for both the client and server:
   ```bash
   cd belast/client
   npm install

   cd ../server
   npm install
   ```

3. Setup Environment Variables:
   - Create a `.env` file in the `server` directory and populate your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
   - Create a `.env` file in the `client` directory and populate your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

4. Run the development servers:
   ```bash
   # Terminal 1 (Server)
   cd server
   npm start

   # Terminal 2 (Client)
   cd client
   npm run dev
   ```

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](https://choosealicense.com/licenses/mit/)
