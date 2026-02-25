export function calculateElo(playerRating, opponentRating, actualScore, kFactor = 32) {
    // actualScore: 1 (win), 0 (loss), 0.5 (draw)
    const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
    return Math.round(playerRating + kFactor * (actualScore - expectedScore));
}
