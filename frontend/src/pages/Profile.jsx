import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import {
    User, Mail, Phone, Calendar, MapPin, Briefcase, Users,
    Camera, Building2, Shield, Clock, Award, CheckCircle, ArrowLeft,
    KeyRound, Lock, ShieldCheck, RefreshCw, Layers, Compass, BadgeCheck,
    CheckCircle2, Sparkles, AlertCircle
} from 'lucide-react';
import api, { fileToBase64 } from '../api';
import { useNavigate } from 'react-router-dom';
import BavyaSpinner from '../components/BavyaSpinner';
import ChangePasswordModal from '../components/ChangePasswordModal';

const Profile = () => {
    const { user, showNotification, fetchData, refreshPermissions, getPhotoUrl, clearCache } = useData();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [imgError, setImgError] = useState(false);
    const [changePasswordOpen, setChangePasswordOpen] = useState(false);
    const navigate = useNavigate();

    const fetchProfile = async () => {
        setLoading(true);
        if (user?.employee_profile_id) {
            try {
                const res = await api.get(`employees/${user.employee_profile_id}`);
                setProfileData(res.data || res);
            } catch (err) {
                console.error("Failed to load profile:", err);
                showNotification("Failed to load profile details", "error");
            } finally {
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchProfile();
    }, [user]);

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showNotification('Please select an image file', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showNotification('Image size should be less than 5MB', 'error');
            return;
        }

        setUploading(true);
        try {
            const base64 = await fileToBase64(file);
            const res = await api.patch(`employees/${user.employee_profile_id}`, { photo: base64 });
            showNotification('Profile photo updated successfully', 'success');

            setProfileData(res.data || res);
            setImgError(false);

            if (clearCache) clearCache();
            if (refreshPermissions) refreshPermissions();
            if (fetchData) fetchData(true, true, 1, {}, true);
        } catch (err) {
            showNotification('Failed to upload photo', 'error');
        } finally {
            setUploading(false);
        }
    };

    const data = profileData;
    const pos = data?.positions_details?.[0] || {};
    const loc = data?.location_details || {};

    return (
        <div className="fade-in scroll-container" style={{ minHeight: '100vh', background: '#f8fafc', width: '100%' }}>
            
            {/* Top Navigation Bar with Deep Wine Tinted Glass */}
            <div style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                background: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(16px)',
                padding: '0.85rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}>
                <div
                    onClick={() => navigate('/')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        color: '#475569',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        padding: '8px 16px',
                        borderRadius: '10px',
                        transition: 'all 0.2s ease',
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#881337'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#881337'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                >
                    <ArrowLeft size={17} />
                    <span>Back to Dashboard</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#10b981',
                        boxShadow: '0 0 8px #10b981'
                    }} />
                    <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', letterSpacing: '-0.01em' }}>
                        Executive Profile Hub
                    </span>
                </div>

                <button
                    type="button"
                    onClick={fetchProfile}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '10px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        color: '#64748b',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#1e293b'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}
                    title="Refresh Profile Data"
                >
                    <RefreshCw size={14} className={loading ? 'spin' : ''} />
                    <span>Sync</span>
                </button>
            </div>

            {loading && (
                <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, background: 'rgba(248, 250, 252, 0.85)', backdropFilter: 'blur(8px)' }}>
                    <BavyaSpinner label="Syncing Profile Details..." />
                </div>
            )}

            <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '1.75rem 2rem 4rem 2rem' }}>
                
                {/* 1. SUPERVISOR / EMPLOYEE VIEW */}
                {data ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

                        {/* Top Hero Banner & Profile Identity Card */}
                        <div style={{
                            background: 'white',
                            borderRadius: '24px',
                            boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.03)',
                            border: '1px solid #e2e8f0',
                            overflow: 'hidden'
                        }}>
                            {/* Rich Wine Gradient Cover Banner */}
                            <div style={{
                                height: '140px',
                                background: 'linear-gradient(135deg, #1f020a 0%, #3d0517 40%, #5e0d26 75%, #25020c 100%)',
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'space-between',
                                padding: '1.25rem 2rem',
                                color: 'white'
                            }}>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: 'rgba(255, 255, 255, 0.12)',
                                    backdropFilter: 'blur(8px)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '100px',
                                    padding: '4px 12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    letterSpacing: '0.04em'
                                }}>
                                    <Sparkles size={13} color="#fecdd3" />
                                    <span>ONE HCM ENTERPRISE</span>
                                </div>

                                <div style={{
                                    fontSize: '0.78rem',
                                    color: '#fda4af',
                                    fontWeight: 600,
                                    letterSpacing: '0.03em'
                                }}>
                                    {data.project_name || pos.project_name || 'Enterprise System'}
                                </div>
                            </div>

                            {/* Overlapping Identity & Actions Row */}
                            <div style={{
                                padding: '0 2.25rem 2rem 2.25rem',
                                marginTop: '-55px',
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'flex-end',
                                justifyContent: 'space-between',
                                gap: '1.5rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem', flexWrap: 'wrap' }}>
                                    {/* Avatar with Camera Overlay */}
                                    <div style={{ position: 'relative' }}>
                                        <div style={{
                                            width: '124px',
                                            height: '124px',
                                            borderRadius: '24px',
                                            border: '5px solid white',
                                            background: 'linear-gradient(135deg, #881337 0%, #4c051e 100%)',
                                            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                                            overflow: 'hidden',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            fontSize: '3rem',
                                            fontWeight: 800
                                        }}>
                                            {data.photo && !imgError ? (
                                                <img
                                                    src={getPhotoUrl(data.photo)}
                                                    alt={data.name || ''}
                                                    onError={() => setImgError(true)}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <span>{data.name?.[0]?.toUpperCase() || 'E'}</span>
                                            )}
                                        </div>

                                        {/* Camera Trigger */}
                                        <label
                                            title="Upload Profile Picture"
                                            style={{
                                                position: 'absolute',
                                                bottom: '-6px',
                                                right: '-6px',
                                                background: '#881337',
                                                color: 'white',
                                                borderRadius: '50%',
                                                width: '36px',
                                                height: '36px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                boxShadow: '0 3px 10px rgba(136, 19, 55, 0.4)',
                                                border: '2px solid white',
                                                transition: 'transform 0.15s ease'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            <Camera size={16} />
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handlePhotoUpload}
                                                disabled={uploading}
                                                style={{ display: 'none' }}
                                            />
                                        </label>
                                    </div>

                                    {/* Name & Titles */}
                                    <div style={{ paddingBottom: '6px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <h1 style={{
                                                margin: 0,
                                                fontSize: '1.85rem',
                                                fontWeight: 800,
                                                color: '#0f172a',
                                                letterSpacing: '-0.02em'
                                            }}>
                                                {data.name}
                                            </h1>
                                            <div style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                background: '#ecfdf5',
                                                color: '#059669',
                                                padding: '3px 10px',
                                                borderRadius: '100px',
                                                fontSize: '0.74rem',
                                                fontWeight: 700,
                                                border: '1px solid #a7f3d0'
                                            }}>
                                                <CheckCircle2 size={13} />
                                                <span>Active</span>
                                            </div>
                                        </div>

                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            marginTop: '6px',
                                            color: '#64748b',
                                            fontSize: '0.98rem',
                                            fontWeight: 600,
                                            flexWrap: 'wrap'
                                        }}>
                                            <span style={{ color: '#881337', fontWeight: 800 }}>
                                                {data.primary_position || pos.name || 'Test engoinner'}
                                            </span>
                                            <span>•</span>
                                            <span>{pos.role_name || 'HR Manager'}</span>
                                            <span>•</span>
                                            <span style={{ color: '#475569' }}>
                                                {pos.department_name || 'HR DEPARTMENT'}
                                            </span>
                                        </div>

                                        {/* Quick Key Badges */}
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                                            <span style={{
                                                background: '#f1f5f9',
                                                color: '#334155',
                                                padding: '4px 10px',
                                                borderRadius: '8px',
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                border: '1px solid #e2e8f0'
                                            }}>
                                                ID: {data.employee_code}
                                            </span>
                                            <span style={{
                                                background: '#fff1f2',
                                                color: '#be123c',
                                                padding: '4px 10px',
                                                borderRadius: '8px',
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                border: '1px solid #fecdd3'
                                            }}>
                                                {pos.office_name || 'BAVYA HELTH SERVICE 104'}
                                            </span>
                                            <span style={{
                                                background: '#f0fdf4',
                                                color: '#166534',
                                                padding: '4px 10px',
                                                borderRadius: '8px',
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                border: '1px solid #bbf7d0'
                                            }}>
                                                Level: {pos.level_name || 'Level-2'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Quick Action: Change Password */}
                                <div style={{ display: 'flex', gap: '10px', paddingBottom: '6px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setChangePasswordOpen(true)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '11px 20px',
                                            borderRadius: '12px',
                                            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                                            color: '#92400e',
                                            border: '1.5px solid #fde68a',
                                            fontWeight: 800,
                                            fontSize: '0.88rem',
                                            cursor: 'pointer',
                                            boxShadow: '0 2px 6px rgba(245, 158, 11, 0.15)',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = '#fde68a'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                    >
                                        <KeyRound size={17} color="#b45309" />
                                        <span>Change Password</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 2x2 Grid of Rich Executive Details Cards */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
                            gap: '1.5rem'
                        }}>
                            
                            {/* Card 1: Organizational & Position Assignment */}
                            <div style={{
                                background: 'white',
                                borderRadius: '20px',
                                padding: '1.75rem',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #881337 0%, #be123c 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        boxShadow: '0 4px 10px rgba(136, 19, 55, 0.25)'
                                    }}>
                                        <Briefcase size={20} />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                                            Organization & Role
                                        </h3>
                                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                            Primary designation and hierarchy
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>POSITION</div>
                                        <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>
                                            {data.primary_position || pos.name || '--'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ORGANIZATIONAL ROLE</div>
                                        <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>
                                            {pos.role_name || '--'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>DEPARTMENT</div>
                                        <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>
                                            {pos.department_name || '--'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>SECTION</div>
                                        <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>
                                            {pos.section_name || '--'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>PROJECT NAME</div>
                                        <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>
                                            {data.project_name || pos.project_name || '--'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>GRADE / LEVEL</div>
                                        <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>
                                            {pos.level_name ? `${pos.level_name} (Rank ${pos.level_rank || pos.rank || 2})` : 'Level-2'}
                                        </div>
                                    </div>
                                </div>

                                {data.reporting_to_name && (
                                    <div style={{
                                        marginTop: '1.25rem',
                                        padding: '12px 14px',
                                        borderRadius: '12px',
                                        background: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px'
                                    }}>
                                        <div style={{
                                            width: '34px',
                                            height: '34px',
                                            borderRadius: '8px',
                                            background: '#881337',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 800,
                                            fontSize: '0.95rem'
                                        }}>
                                            {data.reporting_to_name[0]}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>REPORTING MANAGER</div>
                                            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>{data.reporting_to_name}</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Card 2: Work Location & Facility Details */}
                            <div style={{
                                background: 'white',
                                borderRadius: '20px',
                                padding: '1.75rem',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        boxShadow: '0 4px 10px rgba(2, 132, 199, 0.25)'
                                    }}>
                                        <Building2 size={20} />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                                            Work Location & Facility
                                        </h3>
                                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                            Office assignment and geo geography
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>OFFICE NAME</div>
                                        <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>
                                            {loc.office_name || pos.office_name || '--'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>OFFICE LEVEL</div>
                                        <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>
                                            {pos.office_level || 'HEAD OFFICE'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>SAC IDENTIFIER</div>
                                        <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>
                                            {loc.sac || 'HO-104-001'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>PARENT OFFICE</div>
                                        <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>
                                            {loc.reporting_office_name || 'BAVYA GROUP'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>CLUSTER / CITY</div>
                                        <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>
                                            {loc.cluster ? `${loc.cluster} (${loc.cluster_type || 'City'})` : 'VIJAYAWADA (City)'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>DISTRICT & MANDAL</div>
                                        <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>
                                            {loc.district || 'NTR'}, {loc.mandal || 'VIJAYAWADA'}
                                        </div>
                                    </div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>STATE & COUNTRY</div>
                                        <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>
                                            {[loc.state || 'ANDHRA PRADESH', loc.country || 'INDIA'].filter(Boolean).join(', ')}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 3: Personal & Contact Information */}
                            <div style={{
                                background: 'white',
                                borderRadius: '20px',
                                padding: '1.75rem',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        boxShadow: '0 4px 10px rgba(5, 150, 105, 0.25)'
                                    }}>
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                                            Personal & Contact
                                        </h3>
                                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                            Verified employee identity information
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>OFFICIAL EMAIL</div>
                                        <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Mail size={15} color="#64748b" />
                                            <span>{data.email || 'Not Provided'}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>MOBILE PHONE</div>
                                        <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Phone size={15} color="#64748b" />
                                            <span>{data.phone || 'Not Provided'}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>PERSONAL EMAIL</div>
                                        <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>
                                            {data.personal_email || 'Not Provided'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>GENDER</div>
                                        <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>
                                            {data.gender || 'Not Specified'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>DATE OF BIRTH</div>
                                        <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>
                                            {data.date_of_birth || 'Not Specified'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 4: Security & System Access */}
                            <div style={{
                                background: 'white',
                                borderRadius: '20px',
                                padding: '1.75rem',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        boxShadow: '0 4px 10px rgba(217, 119, 6, 0.25)'
                                    }}>
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                                            Security & Access
                                        </h3>
                                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                            Authentication and credential status
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>LOGIN USERNAME</div>
                                        <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a', marginTop: '3px' }}>
                                            {data.user_details?.username || data.employee_code}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ACCOUNT STATUS</div>
                                        <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#16a34a', marginTop: '3px' }}>
                                            Active
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>PASSWORD STATUS</div>
                                        <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>
                                            Active & Configured
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>RESET ON NEXT LOGIN</div>
                                        <div style={{ fontSize: '0.96rem', fontWeight: 700, color: data.is_password_reset_required ? '#dc2626' : '#16a34a', marginTop: '3px' }}>
                                            {data.is_password_reset_required ? 'Required' : 'No'}
                                        </div>
                                    </div>
                                </div>

                                <div style={{
                                    marginTop: 'auto',
                                    padding: '12px 14px',
                                    borderRadius: '12px',
                                    background: '#fffbeb',
                                    border: '1px solid #fde68a',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '12px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Lock size={16} color="#b45309" />
                                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#78350f' }}>
                                            Need to change your password?
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setChangePasswordOpen(true)}
                                        style={{
                                            background: '#b45309',
                                            color: 'white',
                                            border: 'none',
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            fontWeight: 700,
                                            fontSize: '0.78rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Update
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                ) : (
                    /* 2. SUPER ADMIN PROFILE VIEW (fallback when user has no linked employee profile) */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                        <div style={{
                            background: 'white',
                            borderRadius: '24px',
                            boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.06)',
                            border: '1px solid #e2e8f0',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                height: '140px',
                                background: 'linear-gradient(135deg, #1c0208 0%, #360413 50%, #4a061b 80%, #150106 100%)',
                                padding: '1.25rem 2rem',
                                color: 'white',
                                display: 'flex',
                                justifyContent: 'space-between'
                            }}>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: 'rgba(255, 255, 255, 0.12)',
                                    borderRadius: '100px',
                                    padding: '4px 12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700
                                }}>
                                    <ShieldCheck size={13} color="#fecdd3" />
                                    <span>SYSTEM ADMINISTRATOR</span>
                                </div>
                            </div>

                            <div style={{
                                padding: '0 2.25rem 2rem 2.25rem',
                                marginTop: '-55px',
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'flex-end',
                                justifyContent: 'space-between',
                                gap: '1.5rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem' }}>
                                    <div style={{
                                        width: '120px',
                                        height: '120px',
                                        borderRadius: '24px',
                                        border: '5px solid white',
                                        background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontSize: '3rem',
                                        fontWeight: 800,
                                        boxShadow: '0 10px 25px rgba(225, 29, 72, 0.3)'
                                    }}>
                                        {user?.username?.[0]?.toUpperCase() || 'A'}
                                    </div>

                                    <div style={{ paddingBottom: '6px' }}>
                                        <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 800, color: '#0f172a' }}>
                                            {user?.username || 'Super Administrator'}
                                        </h1>
                                        <div style={{ color: '#be123c', fontWeight: 700, fontSize: '0.95rem', marginTop: '4px' }}>
                                            Root Privilege • Global Access Control
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setChangePasswordOpen(true)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '11px 20px',
                                        borderRadius: '12px',
                                        background: '#881337',
                                        color: 'white',
                                        border: 'none',
                                        fontWeight: 800,
                                        fontSize: '0.88rem',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(136, 19, 55, 0.3)'
                                    }}
                                >
                                    <KeyRound size={17} />
                                    <span>Change Admin Password</span>
                                </button>
                            </div>
                        </div>

                        {/* Admin Info Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                            <div style={{ background: 'white', borderRadius: '20px', padding: '1.75rem', border: '1px solid #e2e8f0' }}>
                                <h3 style={{ margin: '0 0 1rem 0', fontWeight: 800, color: '#0f172a' }}>Administrative Scope</h3>
                                <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6 }}>
                                    This account possesses full global administration rights across offices, employee records, roles, permissions, vehicle operations, and integration webhooks.
                                </p>
                            </div>
                            <div style={{ background: 'white', borderRadius: '20px', padding: '1.75rem', border: '1px solid #e2e8f0' }}>
                                <h3 style={{ margin: '0 0 1rem 0', fontWeight: 800, color: '#0f172a' }}>Security Recommendation</h3>
                                <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6 }}>
                                    Keep administrative credentials confidential. For routine employee management, assign role-based position credentials rather than sharing root accounts.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <ChangePasswordModal
                isOpen={changePasswordOpen}
                onClose={() => setChangePasswordOpen(false)}
            />
        </div>
    );
};

export default Profile;
