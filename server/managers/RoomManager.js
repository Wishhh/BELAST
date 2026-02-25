import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../utils/supabaseAdmin.js';
import { calculateElo } from '../utils/EloRating.js';

export class RoomManager {
    constructor(io) {
        this.io = io;
        this.rooms = new Map(); // roomId -> { players: [socketId], state, ... }
        this.queue = []; // [socketId]
    }

    addPlayerToQueue(socketId, dbId) {
        if (this.queue.find(p => p.socketId === socketId)) return;
        this.queue.push({ socketId, dbId });
        this.checkQueue();
    }

    removePlayerFromQueue(socketId) {
        this.queue = this.queue.filter(p => p.socketId !== socketId);
        console.log(`User ${socketId} cancelled matchmaking.`);
    }

    removePlayer(socketId) {
        // Remove from queue
        this.removePlayerFromQueue(socketId);

        // Remove from active room
        for (const [roomId, room] of this.rooms) {
            if (room.players.includes(socketId)) {
                this.handlePlayerDisconnect(roomId, socketId);
                break;
            }
        }
    }

    checkQueue() {
        if (this.queue.length >= 2) {
            const p1 = this.queue.shift();
            const p2 = this.queue.shift();
            this.createRoom(p1, p2);
        }
    }

    async createRoom(p1, p2) {
        const roomId = uuidv4();

        // Fetch profiles if registered users
        let p1Profile = null;
        let p2Profile = null;

        if (p1.dbId) {
            const { data } = await supabaseAdmin.from('profiles').select('*').eq('id', p1.dbId).single();
            p1Profile = data;
        }
        if (p2.dbId) {
            const { data } = await supabaseAdmin.from('profiles').select('*').eq('id', p2.dbId).single();
            p2Profile = data;
        }

        this.rooms.set(roomId, {
            id: roomId,
            players: [p1.socketId, p2.socketId],
            dbIds: { [p1.socketId]: p1.dbId, [p2.socketId]: p2.dbId },
            profiles: { [p1.socketId]: p1Profile, [p2.socketId]: p2Profile },
            scores: { [p1.socketId]: 0, [p2.socketId]: 0 },
            grids: { [p1.socketId]: null, [p2.socketId]: null },
            status: 'playing'
        });

        // Notify players
        this.io.to(p1.socketId).emit('match_found', { roomId, opponentProfile: p2Profile || { username: 'Guest', elo_rating: 1000 }, role: 'host' });
        this.io.to(p2.socketId).emit('match_found', { roomId, opponentProfile: p1Profile || { username: 'Guest', elo_rating: 1000 }, role: 'guest' });

        // Join socket room
        this.io.in(p1.socketId).socketsJoin(roomId);
        this.io.in(p2.socketId).socketsJoin(roomId);

        console.log(`Room ${roomId} created with ${p1.socketId} and ${p2.socketId}`);
    }

    async handlePlayerDisconnect(roomId, socketId) {
        const room = this.rooms.get(roomId);
        if (!room || room.status !== 'playing') return;

        room.status = 'finished';
        const opponent = room.players.find(id => id !== socketId);
        if (opponent) {
            this.io.to(opponent).emit('game_over', { result: 'win', reason: 'opponent_disconnected' });
            await this.recordMatchResults(room, opponent, socketId);
        }
        this.rooms.delete(roomId);
    }

    // Handle Game Moves / Updates
    handleUpdate(socketId, data) {
        // Find room
        let roomId = null;
        let room = null;
        for (const [rid, r] of this.rooms) {
            if (r.players.includes(socketId)) {
                roomId = rid;
                room = r;
                break;
            }
        }

        if (room) {
            const opponent = room.players.find(id => id !== socketId);

            // Calculate Attack
            // data.clearedLines check
            let garbage = 0;
            if (data.clearedLines > 1) {
                if (data.clearedLines === 2) garbage = 1;
                else if (data.clearedLines === 3) garbage = 2;
                else if (data.clearedLines >= 4) garbage = 4;
            }

            // Relay update (e.g. score, grid shadow, garbage)
            // data should contain { type: 'grid_update', grid: ..., score: ... } or { type: 'attack', lines: ... }
            this.io.to(opponent).emit('opponent_update', {
                ...data,
                garbage
            });

            // Update room state
            if (data.score) room.scores[socketId] = data.score;
        }
    }

    async handleGameOver(socketId, data) {
        const room = this.rooms.get(data.roomId);
        if (!room || room.status !== 'playing') return;

        room.status = 'finished';
        const opponent = room.players.find(id => id !== socketId);
        if (opponent) {
            // socketId sent gameOver = socketId lost
            this.io.to(opponent).emit('game_over', { result: 'win', reason: 'opponent_lost' });
            this.io.to(socketId).emit('game_over', { result: 'loss', reason: 'you_lost' });
            await this.recordMatchResults(room, opponent, socketId);
        }
        this.rooms.delete(data.roomId);
    }

    async recordMatchResults(room, winnerSocketId, loserSocketId) {
        const winnerDbId = room.dbIds[winnerSocketId];
        const loserDbId = room.dbIds[loserSocketId];
        const winnerScore = room.scores[winnerSocketId];
        const loserScore = room.scores[loserSocketId];

        // Skip DB update if both are guests
        if (!winnerDbId && !loserDbId) return;

        // Fetch or use cached profiles
        const winnerProfile = room.profiles[winnerSocketId] || { id: winnerDbId, elo_rating: 1000, wins: 0, losses: 0, matches_played: 0 };
        const loserProfile = room.profiles[loserSocketId] || { id: loserDbId, elo_rating: 1000, wins: 0, losses: 0, matches_played: 0 };

        // 1. Insert Match Record
        if (winnerDbId && loserDbId) {
            await supabaseAdmin.from('match_history').insert({
                player1_id: winnerDbId,
                player2_id: loserDbId,
                winner_id: winnerDbId,
                player1_score: winnerScore,
                player2_score: loserScore
            });
        }

        // 2. Update Elo profiles
        const newWinnerElo = calculateElo(winnerProfile.elo_rating, loserProfile.elo_rating, 1);
        const newLoserElo = calculateElo(loserProfile.elo_rating, winnerProfile.elo_rating, 0);

        if (winnerDbId) {
            await supabaseAdmin.from('profiles').update({
                elo_rating: newWinnerElo,
                wins: winnerProfile.wins + 1,
                matches_played: winnerProfile.matches_played + 1
            }).eq('id', winnerDbId);
        }

        if (loserDbId) {
            await supabaseAdmin.from('profiles').update({
                elo_rating: newLoserElo,
                losses: loserProfile.losses + 1,
                matches_played: loserProfile.matches_played + 1
            }).eq('id', loserDbId);
        }

        console.log(`Ranked Match recorded. Winner Elo: ${newWinnerElo}, Loser Elo: ${newLoserElo}`);
    }
}
