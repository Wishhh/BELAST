import React from 'react';

interface ConfirmModalProps {
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ title, message, onConfirm, onCancel }) => {
    return (
        <div className="auth-modal-overlay" style={{ zIndex: 10000 }}>
            <div className="auth-modal" style={{ maxWidth: '350px' }}>
                <h2 style={{ fontSize: '1.4rem' }}>{title}</h2>
                <p style={{ textAlign: 'center', marginBottom: '25px', opacity: 0.8, fontSize: '0.95rem' }}>{message}</p>
                <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
                    <button className="cancel-btn" style={{ flex: 1, marginTop: 0 }} onClick={onCancel}>Cancel</button>
                    <button
                        style={{
                            flex: 1, marginTop: 0, padding: '14px', borderRadius: '8px',
                            border: 'none', background: 'var(--btn-gradient)', color: 'white',
                            fontFamily: "'Fredoka One', cursive", cursor: 'pointer', textTransform: 'uppercase'
                        }}
                        onClick={onConfirm}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};
