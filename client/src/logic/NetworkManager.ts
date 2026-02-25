import { io, Socket } from 'socket.io-client';

export class NetworkManager {
    private socket: Socket;
    private url: string;

    constructor(url: string = 'http://localhost:3000') {
        this.url = url;
        this.socket = io(this.url, { autoConnect: false });
        this.setupListeners();
    }

    connect() {
        this.socket.connect();
    }

    disconnect() {
        this.socket.disconnect();
    }

    findMatch(userId: string | null = null) {
        this.socket.emit('find_match', { userId });
    }

    cancelMatch() {
        this.socket.emit('cancel_match');
    }

    sendMove(grid: Int8Array, score: number, clearedLines: number) {
        this.socket.emit('player_move', {
            grid: Array.from(grid), // Socket.io handles arrays better than typed arrays usually unless binary
            score,
            clearedLines
        });
    }

    sendGameOver(roomId: string) {
        this.socket.emit('game_over', { roomId });
    }

    onMatchFound(callback: (data: any) => void) {
        this.socket.on('match_found', callback);
    }

    onOpponentUpdate(callback: (data: any) => void) {
        this.socket.on('opponent_update', callback);
    }

    onGameOver(callback: (data: any) => void) {
        this.socket.on('game_over', callback);
    }

    private setupListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to server', this.socket.id);
        });
    }
}
