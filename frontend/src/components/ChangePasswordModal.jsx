import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Check, X, ShieldAlert, KeyRound, Loader2 } from 'lucide-react';
import api from '../api';
import { useData } from '../context/DataContext';

const ChangePasswordModal = ({ isOpen, onClose }) => {
    const { showNotification } = useData();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    if (!isOpen) return null;

    // Password complexity validations matching backend
    const hasLength = newPassword.length >= 8 && newPassword.length <= 12;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*]/.test(newPassword);
    const matchesConfirm = newPassword.length > 0 && newPassword === confirmPassword;

    const isValid = hasLength && hasUpper && hasNumber && hasSpecial && matchesConfirm && oldPassword.length > 0;

    const resetForm = () => {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowOld(false);
        setShowNew(false);
        setShowConfirm(false);
        setErrorMsg('');
    };

    const handleClose = () => {
        if (submitting) return;
        resetForm();
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (!oldPassword) {
            setErrorMsg('Please enter your existing password.');
            return;
        }

        if (!isValid) {
            if (!matchesConfirm) {
                setErrorMsg('New password and confirm password do not match.');
            } else {
                setErrorMsg('Please satisfy all password complexity rules.');
            }
            return;
        }

        setSubmitting(true);
        try {
            const res = await api.post('auth/change-password/', {
                old_password: oldPassword,
                new_password: newPassword
            });
            if (showNotification) {
                showNotification(res?.message || 'Password updated successfully!', 'success');
            }
            resetForm();
            onClose();
        } catch (err) {
            console.error('Password change error:', err);
            const msg = err?.error || err?.message || 'Failed to update password. Please check your existing password.';
            setErrorMsg(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                background: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                boxSizing: 'border-box'
            }}
            onClick={handleClose}
        >
            <style>{`
                @keyframes inline-spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .btn-spin-icon {
                    animation: inline-spin 0.8s linear infinite;
                }
            `}</style>

            <div
                className="fade-in"
                style={{
                    background: '#ffffff',
                    width: '100%',
                    maxWidth: '430px',
                    maxHeight: 'calc(100vh - 2rem)',
                    overflowY: 'auto',
                    borderRadius: '20px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.08)',
                    padding: '1.5rem',
                    position: 'relative',
                    boxSizing: 'border-box'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
                    <div
                        style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)',
                            flexShrink: 0
                        }}
                    >
                        <KeyRound size={22} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                            Change Password
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                            Verify current password & set a new one
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={submitting}
                        style={{
                            background: '#f1f5f9',
                            border: 'none',
                            borderRadius: '50%',
                            width: '30px',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            color: '#64748b',
                            flexShrink: 0
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                    <div
                        style={{
                            background: '#fef2f2',
                            border: '1px solid #fee2e2',
                            borderRadius: '10px',
                            padding: '10px 12px',
                            marginBottom: '1rem',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            color: '#991b1b',
                            fontSize: '0.82rem'
                        }}
                    >
                        <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span style={{ fontWeight: 600 }}>{errorMsg}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                    {/* Existing Password Input */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                            EXISTING (CURRENT) PASSWORD <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showOld ? 'text' : 'password'}
                                value={oldPassword}
                                onChange={e => setOldPassword(e.target.value)}
                                placeholder="Enter current existing password"
                                required
                                disabled={submitting}
                                style={{
                                    width: '100%',
                                    padding: '9px 38px 9px 12px',
                                    borderRadius: '10px',
                                    border: '1.5px solid #e2e8f0',
                                    fontSize: '0.9rem',
                                    color: '#0f172a',
                                    background: '#f8fafc',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowOld(!showOld)}
                                tabIndex={-1}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#94a3b8',
                                    padding: 0,
                                    display: 'flex'
                                }}
                            >
                                {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* New Password Input */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                            NEW PASSWORD <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showNew ? 'text' : 'password'}
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="8-12 chars, 1 Upper, 1 Number, 1 Special"
                                required
                                disabled={submitting}
                                style={{
                                    width: '100%',
                                    padding: '9px 38px 9px 12px',
                                    borderRadius: '10px',
                                    border: '1.5px solid #e2e8f0',
                                    fontSize: '0.9rem',
                                    color: '#0f172a',
                                    background: '#f8fafc',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                tabIndex={-1}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#94a3b8',
                                    padding: 0,
                                    display: 'flex'
                                }}
                            >
                                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm New Password Input */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                            CONFIRM NEW PASSWORD <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="Re-type your new password"
                                required
                                disabled={submitting}
                                style={{
                                    width: '100%',
                                    padding: '9px 38px 9px 12px',
                                    borderRadius: '10px',
                                    border: '1.5px solid #e2e8f0',
                                    fontSize: '0.9rem',
                                    color: '#0f172a',
                                    background: '#f8fafc',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                tabIndex={-1}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#94a3b8',
                                    padding: 0,
                                    display: 'flex'
                                }}
                            >
                                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Requirement Checklist */}
                    <div
                        style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '10px 12px',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '6px',
                            fontSize: '0.74rem'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasLength ? '#15803d' : '#64748b' }}>
                            {hasLength ? <Check size={13} color="#15803d" strokeWidth={3} /> : <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#cbd5e1', margin: '4px' }} />}
                            <span style={{ fontWeight: hasLength ? 700 : 500 }}>8 - 12 characters</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasUpper ? '#15803d' : '#64748b' }}>
                            {hasUpper ? <Check size={13} color="#15803d" strokeWidth={3} /> : <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#cbd5e1', margin: '4px' }} />}
                            <span style={{ fontWeight: hasUpper ? 700 : 500 }}>1 Uppercase (A-Z)</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasNumber ? '#15803d' : '#64748b' }}>
                            {hasNumber ? <Check size={13} color="#15803d" strokeWidth={3} /> : <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#cbd5e1', margin: '4px' }} />}
                            <span style={{ fontWeight: hasNumber ? 700 : 500 }}>1 Number (0-9)</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasSpecial ? '#15803d' : '#64748b' }}>
                            {hasSpecial ? <Check size={13} color="#15803d" strokeWidth={3} /> : <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#cbd5e1', margin: '4px' }} />}
                            <span style={{ fontWeight: hasSpecial ? 700 : 500 }}>1 Special (!@#$%^&*)</span>
                        </div>
                        <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '6px', color: matchesConfirm ? '#15803d' : '#64748b' }}>
                            {matchesConfirm ? <Check size={13} color="#15803d" strokeWidth={3} /> : <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#cbd5e1', margin: '4px' }} />}
                            <span style={{ fontWeight: matchesConfirm ? 700 : 500 }}>Passwords match</span>
                        </div>
                    </div>

                    {/* Action Buttons - Fixed compact height so it NEVER blows up */}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '0.4rem' }}>
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={submitting}
                            style={{
                                flex: 1,
                                height: '42px',
                                borderRadius: '10px',
                                border: '1.5px solid #e2e8f0',
                                background: '#ffffff',
                                color: '#475569',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: submitting ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!isValid || submitting}
                            style={{
                                flex: 1.5,
                                height: '42px',
                                borderRadius: '10px',
                                border: 'none',
                                background: isValid ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : '#e2e8f0',
                                color: isValid ? '#ffffff' : '#94a3b8',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                cursor: isValid && !submitting ? 'pointer' : 'not-allowed',
                                boxShadow: isValid ? '0 4px 12px rgba(245, 158, 11, 0.3)' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 size={16} className="btn-spin-icon" />
                                    <span>Updating...</span>
                                </>
                            ) : (
                                <>
                                    <Lock size={15} />
                                    <span>Update Password</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
