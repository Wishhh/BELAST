import React, { useEffect, useState } from 'react';
import { useAuth } from '../logic/AuthContext';
import { supabase } from '../logic/supabaseClient';

interface ProfileModalProps {
    onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
    const { user, profile } = useAuth();
    const [activeTab, setActiveTab] = useState<'stats' | 'pvp' | 'solo'>('stats');
    const [pvpHistory, setPvpHistory] = useState<any[]>([]);
    const [soloHistory, setSoloHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchHistory = async () => {
            setLoading(true);

            // Fetch PvP Matches
            const { data: pvpData } = await supabase
                .from('match_history')
                .select(`
                    id, 
                    player1_score, player2_score, ended_at,
                    winner_id,
                    player1:profiles!match_history_player1_id_fkey(username),
                    player2:profiles!match_history_player2_id_fkey(username)
                `)
                .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
                .order('ended_at', { ascending: false })
                .limit(10);

            if (pvpData) setPvpHistory(pvpData);

            // Fetch Solo Matches
            const { data: soloData } = await supabase
                .from('solo_match_history')
                .select('*')
                .eq('player_id', user.id)
                .order('ended_at', { ascending: false })
                .limit(10);

            if (soloData) setSoloHistory(soloData);

            setLoading(false);
        };

        fetchHistory();
    }, [user]);

    if (!profile) return null;

    return (
        <div className="auth-modal-overlay" onClick={onClose}>
            <div className="auth-modal" style={{ maxWidth: '500px', width: '95%' }} onClick={e => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>✕</button>
                <h2>{profile.username}'s Profile</h2>

                <div className="profile-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '20px', width: '100%', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                    <button
                        className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
                        onClick={() => setActiveTab('stats')}
                    >
                        Stats
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'pvp' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pvp')}
                    >
                        PvP History
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'solo' ? 'active' : ''}`}
                        onClick={() => setActiveTab('solo')}
                    >
                        Solo History
                    </button>
                </div>

                <div className="tab-content" style={{ width: '100%', minHeight: '200px', maxHeight: '350px', overflowY: 'auto', paddingRight: '5px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>
                    ) : (
                        <>
                            {activeTab === 'stats' && (
                                <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <StatBox label="Elo Rating" value={profile.elo_rating} color="#FFD700" />
                                    <StatBox label="Highest Solo Score" value={profile.highest_solo_score || 0} color="#4FC3F7" />
                                    <StatBox label="Matches Played" value={profile.matches_played} color="#FFF" />
                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '5px' }}>Win Rate</div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>
                                            {profile.matches_played > 0 ? Math.round((profile.wins / profile.matches_played) * 100) : 0}%
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: '#90CAF9', marginTop: '5px' }}>{profile.wins}W - {profile.losses}L</div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'pvp' && (
                                <div className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {pvpHistory.length === 0 ? <div style={{ textAlign: 'center', opacity: 0.7 }}>No PvP matches played yet.</div> : null}
                                    {pvpHistory.map(match => {
                                        const isWin = match.winner_id === user?.id;
                                        const date = new Date(match.ended_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                                        return (
                                            <div key={match.id} style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px',
                                                borderLeft: `4px solid ${isWin ? '#4CAF50' : '#F44336'}`
                                            }}>
                                                <div>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                                                        {match.player1.username} vs {match.player2.username}
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{date}</div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontWeight: 'bold', color: isWin ? '#4CAF50' : '#F44336' }}>
                                                        {isWin ? 'VICTORY' : 'DEFEAT'}
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem' }}>{match.player1_score} - {match.player2_score}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {activeTab === 'solo' && (
                                <div className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {soloHistory.length === 0 ? <div style={{ textAlign: 'center', opacity: 0.7 }}>No solo runs recorded yet.</div> : null}
                                    {soloHistory.map(match => {
                                        const date = new Date(match.ended_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                                        return (
                                            <div key={match.id} style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px',
                                                borderLeft: '4px solid #4FC3F7'
                                            }}>
                                                <div>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Solo Run</div>
                                                    <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{date}</div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontWeight: 'bold', color: '#FFF' }}>Score: {match.score}</div>
                                                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Lines: {match.cleared_lines}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const StatBox = ({ label, value, color }: { label: string, value: string | number, color: string }) => (
    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
        <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '5px' }}>{label}</div>
        <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color }}>{value}</div>
    </div>
);
