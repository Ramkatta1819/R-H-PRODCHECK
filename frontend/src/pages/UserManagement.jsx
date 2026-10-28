import React, { useState, useEffect, useRef } from 'react';
import { Users, ShieldCheck, UserCheck, UserMinus, Settings, Search, ShieldAlert, Lock, Mail, RefreshCw, Key, Eye, EyeOff, Copy, Check, CheckCircle2, X, Clock, AlertTriangle, KeyRound } from 'lucide-react';
import { useData } from '../context/DataContext';
import api from '../api';
import BavyaSpinner from '../components/BavyaSpinner';
import PermissionMatrix from './PermissionMatrix';

const generateRandomPassword = () => {
    const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowers = 'abcdefghijkmnopqrstuvwxyz';
    const nums = '23456789';
    const specials = '!@#$%&*';
    let pwd = '';
    pwd += uppers[Math.floor(Math.random() * uppers.length)];
    pwd += lowers[Math.floor(Math.random() * lowers.length)];
    pwd += nums[Math.floor(Math.random() * nums.length)];
    pwd += specials[Math.floor(Math.random() * specials.length)];
    const all = uppers + lowers + nums + specials;
    for (let i = 0; i < 6; i++) {
        pwd += all[Math.floor(Math.random() * all.length)];
    }
    return pwd.split('').sort(() => 0.5 - Math.random()).join('');
};

const UserManagement = () => {
    const { showNotification, offices, departments, orgLevels, getPhotoUrl, allEmployees } = useData();
    const [employees, setEmployees] = useState(allEmployees || []);

    const getInitialFilters = () => {
        const saved = sessionStorage.getItem(`filters_users`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // HEAL STALE FILTERS: If levelFilter is a name from an older version, reset it.
                if (parsed.levelFilter && isNaN(parsed.levelFilter) && parsed.levelFilter !== 'all') {
                    parsed.levelFilter = 'all';
                    parsed.officeFilter = 'all';
                    parsed.deptFilter = 'all';
                }
                return parsed;
            } catch (e) { }
        }
        return {
            searchTerm: '',
            levelFilter: 'all',
            officeFilter: 'all',
            deptFilter: 'all'
        };
    };

    const [filters, setFilters] = useState(getInitialFilters);
    const { searchTerm, levelFilter, officeFilter, deptFilter } = filters;
    const updateFilter = (newVal) => setFilters(prev => ({ ...prev, ...newVal }));

    const [localLoading, setLocalLoading] = useState(allEmployees?.length === 0);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [view, setView] = useState('list'); // 'list' or 'permissions'
    const [processingId, setProcessingId] = useState(null);
    const [searchError, setSearchError] = useState('');

    // Modal state for Provisioning / Setting custom password
    const [provisionModal, setProvisionModal] = useState({
        isOpen: false,
        employee: null,
        password: '',
        showPassword: true,
        requireReset: false,
        loading: false
    });

    // Modal state for Changing / Resetting password
    const [resetModal, setResetModal] = useState({
        isOpen: false,
        employee: null,
        password: '',
        showPassword: true,
        requireReset: false,
        loading: false
    });

    // Modal state for Success / Copy Credentials
    const [successCreds, setSuccessCreds] = useState(null);
    const [copied, setCopied] = useState(false);
    const [visiblePasswords, setVisiblePasswords] = useState({});
    const [copiedEmpId, setCopiedEmpId] = useState(null);

    const togglePasswordVisibility = (empId) => {
        setVisiblePasswords(prev => ({ ...prev, [empId]: !prev[empId] }));
    };

    const copyPassword = (pwd, empId) => {
        if (!pwd) return;
        navigator.clipboard.writeText(pwd);
        setCopiedEmpId(empId);
        showNotification("Password copied to clipboard!", "success");
        setTimeout(() => setCopiedEmpId(null), 2000);
    };

    // Save filters
    useEffect(() => {
        sessionStorage.setItem('filters_users', JSON.stringify(filters));
    }, [filters]);

    const openProvisionModal = (emp) => {
        setProvisionModal({
            isOpen: true,
            employee: emp,
            password: '',
            showPassword: true,
            requireReset: false,
            loading: false
        });
    };

    const handleConfirmProvision = async () => {
        if (!provisionModal.employee) return;
        const emp = provisionModal.employee;
        const pwd = provisionModal.password.trim();
        if (pwd && pwd.length < 4) {
            showNotification("Password must be at least 4 characters", "error");
            return;
        }
        setProvisionModal(prev => ({ ...prev, loading: true }));
        try {
            const payload = {};
            if (pwd) payload.password = pwd;
            payload.require_reset = provisionModal.requireReset;
            
            const res = await api.post(`employees/${emp.id}/create_user`, payload);
            showNotification(res.message || "User account provisioned successfully!", "success");
            setProvisionModal({ isOpen: false, employee: null, password: '', showPassword: true, requireReset: false, loading: false });
            
            setSuccessCreds({
                title: 'Account Provisioned Successfully',
                name: emp.name,
                username: res.username || emp.employee_code,
                password: res.password,
                requireReset: res.require_reset
            });
            setEmployees(prev => prev.map(e => e.id === emp.id ? {
                ...e,
                user: res.user || res.user_id || 1,
                plain_password: res.password,
                is_password_reset_required: res.require_reset,
                user_details: { username: res.username || emp.employee_code }
            } : e));
            fetchEmployees(pagination.current || 1);
        } catch (err) {
            const msg = err.error || err.detail || (typeof err === 'string' ? err : "Failed to create user");
            showNotification(msg, "error");
            setProvisionModal(prev => ({ ...prev, loading: false }));
        }
    };

    const openResetModal = (emp) => {
        setResetModal({
            isOpen: true,
            employee: emp,
            password: '',
            showPassword: true,
            requireReset: false,
            loading: false
        });
    };

    const handleConfirmReset = async () => {
        if (!resetModal.employee) return;
        const emp = resetModal.employee;
        const pwd = resetModal.password.trim();
        if (pwd && pwd.length < 4) {
            showNotification("Password must be at least 4 characters", "error");
            return;
        }
        setResetModal(prev => ({ ...prev, loading: true }));
        try {
            const payload = {};
            if (pwd) payload.password = pwd;
            payload.require_reset = resetModal.requireReset;

            const res = await api.post(`employees/${emp.id}/reset_password`, payload);
            showNotification(res.message || "Password updated successfully!", "success");
            setResetModal({ isOpen: false, employee: null, password: '', showPassword: true, requireReset: false, loading: false });

            setSuccessCreds({
                title: 'Password Updated Successfully',
                name: emp.name,
                username: res.username || emp.employee_code,
                password: res.password,
                requireReset: res.require_reset
            });
            setEmployees(prev => prev.map(e => e.id === emp.id ? {
                ...e,
                plain_password: res.password,
                is_password_reset_required: res.require_reset
            } : e));
            fetchEmployees(pagination.current || 1);
        } catch (err) {
            const msg = err.error || err.detail || (typeof err === 'string' ? err : "Failed to update password");
            showNotification(msg, "error");
            setResetModal(prev => ({ ...prev, loading: false }));
        }
    };

    const handleCopyCredentials = () => {
        if (!successCreds) return;
        const loginUrl = `${window.location.origin}/login`;
        const text = `BAVYA ERP Login Credentials\nEmployee: ${successCreds.name}\nUsername / Employee ID: ${successCreds.username}\nPassword: ${successCreds.password}\nLogin URL: ${loginUrl}\nChange Password on Login: ${successCreds.requireReset ? 'Yes' : 'No'}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        showNotification("Login credentials copied to clipboard!", "success");
        setTimeout(() => setCopied(false), 2500);
    };

    const [pagination, setPagination] = useState({
        count: 0,
        next: null,
        previous: null,
        current: 1
    });

    const fetchEmployees = async (page = 1) => {
        setLocalLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (levelFilter !== 'all') params.append('level', levelFilter);
            if (officeFilter !== 'all') params.append('office', officeFilter);
            if (deptFilter !== 'all') params.append('department', deptFilter);
            params.append('page', page);

            const res = await api.get(`employees?${params.toString()}`);
            setEmployees(res.results || res);
            setPagination({
                count: res.count || 0,
                next: res.next,
                previous: res.previous,
                current: page
            });
        } catch (err) {
            showNotification("Failed to load user data", "error");
        } finally {
            setLocalLoading(false);
        }
    };

    // Use a ref to track if it's the first mount
    const isFirstMount = useRef(true);

    useEffect(() => {
        // Initial load happens immediately
        if (isFirstMount.current) {
            fetchEmployees(1);
            isFirstMount.current = false;
            return;
        }

        // Subsequent changes are debounced
        const delayDebounceFn = setTimeout(() => {
            fetchEmployees(1);
        }, 600);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, levelFilter, officeFilter, deptFilter]);

    const handleToggleStatus = async (employee) => {
        const currentStatus = employee.status ? employee.status.trim().toLowerCase() : '';
        const newStatus = (currentStatus === 'active' || currentStatus === 'suspicious') ? 'Inactive' : 'Active';
        try {
            await api.patch(`employees/${employee.id}`, { status: newStatus });
            setEmployees(employees.map(e => e.id === employee.id ? { ...e, status: newStatus } : e));
            showNotification(`User ${newStatus === 'Active' ? 'enabled' : 'disabled'} successfully`);
        } catch (err) {
            showNotification("Failed to update user status", "error");
        }
    };

    const filteredEmployees = (Array.isArray(employees) ? employees : []).filter(e => {
        // Exclude root admin
        if (e.employee_code === 'ADM-001') return false;
        return true;
    }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    if (view === 'permissions' && selectedEmployee) {
        return <PermissionMatrix employee={selectedEmployee} onBack={() => { setView('list'); setSelectedEmployee(null); }} />;
    }

    return (
        <div className="fade-in stagger-in">
            <header className="section-header" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="section-title hero-gradient-text">Identity & Access Management</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <p className="section-subtitle" style={{ margin: 0 }}>
                            Oversee system users and manage high-level security permissions
                        </p>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: localLoading ? 'rgba(136, 19, 55, 0.05)' : 'rgba(34, 197, 94, 0.05)',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            border: `1px solid ${localLoading ? 'rgba(136, 19, 55, 0.1)' : 'rgba(34, 197, 94, 0.1)'}`,
                            transition: 'all 0.3s ease'
                        }}>
                            <div style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: localLoading ? 'var(--primary)' : '#22c55e',
                                animation: localLoading ? 'pulse 1s infinite' : 'none'
                            }} />
                            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: localLoading ? 'var(--primary)' : '#166534', letterSpacing: '0.05em' }}>
                                {localLoading ? 'SYNCING...' : 'LIVE'}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Advanced Filtering Section */}
            <div className="glass" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderRadius: '16px', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
                <div style={{ flex: '1', minWidth: '200px' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Search Identity</label>
                    <div style={{ position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
                        <input
                            type="text"
                            placeholder="Name or Employee Code..."
                            style={{ width: '100%', padding: '10px 10px 10px 40px', border: searchError ? '2px solid #ef4444' : '2px solid #f1f5f9', borderRadius: '12px', fontSize: '0.85rem', outline: 'none' }}
                            value={searchTerm}
                            maxLength={30}
                            onChange={(e) => {
                                const raw = e.target.value;
                                let errorMsg = '';
                                if (raw.length >= 30) {
                                    errorMsg = 'Maximum limit of 30 characters reached';
                                } else if (/[^a-zA-Z0-9\- \.\/&\(\),]/.test(raw)) {
                                    errorMsg = 'Special characters not allowed in filters';
                                }
                                setSearchError(errorMsg);
                                
                                const sanitized = raw.replace(/[^a-zA-Z0-9\- \.\/&\(\),]/g, '');
                                updateFilter({ searchTerm: sanitized });
                            }}
                        />
                        {searchError && (
                            <div style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 600, marginTop: '4px', position: 'absolute' }}>
                                {searchError}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ width: '180px' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Org Level</label>
                    <select
                        value={levelFilter}
                        onChange={(e) => {
                            updateFilter({ levelFilter: e.target.value, officeFilter: 'all', deptFilter: 'all' });
                        }}
                        style={{ width: '100%', padding: '10px 12px', border: '2px solid #f1f5f9', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, outline: 'none' }}
                    >
                        <option value="all">All Levels</option>
                        {orgLevels.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                    </select>
                </div>

                <div style={{ width: '200px' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Office / Unit</label>
                    <select
                        value={officeFilter}
                        onChange={(e) => {
                            updateFilter({ officeFilter: e.target.value, deptFilter: 'all' });
                        }}
                        style={{ width: '100%', padding: '10px 12px', border: '2px solid #f1f5f9', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, outline: 'none' }}
                    >
                        <option value="all">All Offices</option>
                        {offices
                            .filter(o => levelFilter === 'all' || String(o.level) === String(levelFilter) || String(o.level_id) === String(levelFilter))
                            .map(o => (
                                <option key={o.id} value={o.id}>{o.name}</option>
                            ))}
                    </select>
                </div>

                <div style={{ width: '200px' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Department</label>
                    <select
                        value={deptFilter}
                        onChange={(e) => updateFilter({ deptFilter: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', border: '2px solid #f1f5f9', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, outline: 'none' }}
                    >
                        <option value="all">All Departments</option>
                        {departments
                            .filter(d => (officeFilter === 'all' || d.office?.toString() === officeFilter || d.office_id?.toString() === officeFilter) &&
                                (levelFilter === 'all' || String(d.office_level_id) === String(levelFilter)))
                            .map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                    </select>
                </div>

                <button
                    className="btn-secondary"
                    style={{ padding: '10px 15px', borderRadius: '12px', fontWeight: 800, fontSize: '0.75rem' }}
                    onClick={() => {
                        updateFilter({
                            searchTerm: '',
                            levelFilter: 'all',
                            officeFilter: 'all',
                            deptFilter: 'all'
                        });
                    }}
                >
                    Reset
                </button>
            </div>

            <div className="glass section-card" style={{ padding: '0', position: 'relative', minHeight: '200px' }}>
                {localLoading && employees.length === 0 && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(255,255,255,0.75)',
                        zIndex: 99999,
                        backdropFilter: 'blur(8px)'
                    }}>
                        <BavyaSpinner label="Initialising Identity Directory..." />
                    </div>
                )}
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>User Identity</th>
                            <th>Organizational Role</th>
                            <th>Password & Access Status</th>
                            <th>Last Activity</th>
                            <th style={{ textAlign: 'right' }}>Security Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEmployees.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#94a3b8' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                        <Users size={36} style={{ opacity: 0.35, color: '#94a3b8' }} />
                                        <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#475569' }}>No users found matching current criteria</span>
                                        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Try adjusting your filters or clearing search terms</span>
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                setFilters({ searchTerm: '', levelFilter: 'all', officeFilter: 'all', deptFilter: 'all' });
                                                fetchEmployees(1);
                                            }}
                                            style={{
                                                marginTop: '8px',
                                                padding: '6px 14px',
                                                borderRadius: '8px',
                                                border: '1px solid #cbd5e1',
                                                background: '#f8fafc',
                                                color: '#0284c7',
                                                fontSize: '0.8rem',
                                                fontWeight: 700,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Reset All Filters
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredEmployees.map((emp) => {
                            const isActive = emp.status && emp.status.trim().toLowerCase() === 'active';
                            const isSuspicious = emp.status && emp.status.trim().toLowerCase() === 'suspicious';
                            
                            return (
                            <tr key={emp.id} className="stagger-in">
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '12px',
                                            background: 'var(--primary-light)',
                                            color: 'var(--primary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 800,
                                            overflow: 'hidden'
                                        }}>
                                            {emp.photo ? (
                                                <img
                                                    src={getPhotoUrl(emp.photo)}
                                                    alt=""
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                emp.name[0]
                                            )}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{emp.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{emp.employee_code}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ fontWeight: 600, color: '#475569' }}>
                                        {emp.positions_details?.[0]?.name || 'Unassigned'}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                        {emp.positions_details?.[0]?.role_name || 'Generic User'}
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                padding: '3px 8px',
                                                borderRadius: '20px',
                                                fontSize: '0.68rem',
                                                fontWeight: 800,
                                                background: isActive ? '#f0fdf4' : '#fef2f2',
                                                color: isActive ? '#166534' : '#991b1b',
                                                border: `1px solid ${isActive ? '#dcfce7' : '#fee2e2'}`
                                            }}>
                                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: isActive ? '#22c55e' : '#ef4444' }}></span>
                                                {emp.status ? emp.status.toUpperCase() : 'UNKNOWN'}
                                            </span>
                                            {emp.is_blocked && (
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '3px',
                                                    padding: '2px 6px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.68rem',
                                                    fontWeight: 800,
                                                    background: '#fee2e2',
                                                    color: '#991b1b'
                                                }}>
                                                    <AlertTriangle size={11} /> LOCKED
                                                </span>
                                            )}
                                        </div>

                                        {emp.user ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '2px' }}>
                                                {/* Password Display Chip */}
                                                <div style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    background: '#f8fafc',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '6px',
                                                    padding: '3px 7px',
                                                    width: 'fit-content',
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                                }}>
                                                    <Key size={12} color="#64748b" />
                                                    <span style={{
                                                        fontFamily: 'monospace',
                                                        fontSize: '0.78rem',
                                                        fontWeight: 700,
                                                        color: '#0f172a',
                                                        letterSpacing: visiblePasswords[emp.id] ? '0' : '2px'
                                                    }}>
                                                        {visiblePasswords[emp.id]
                                                            ? (emp.plain_password || '••••••••')
                                                            : '••••••••'}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            togglePasswordVisibility(emp.id);
                                                        }}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            padding: '1px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            color: visiblePasswords[emp.id] ? '#0284c7' : '#64748b'
                                                        }}
                                                        title={visiblePasswords[emp.id] ? "Hide password" : "Show password"}
                                                    >
                                                        {visiblePasswords[emp.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                                                    </button>
                                                    {emp.plain_password && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                copyPassword(emp.plain_password, emp.id);
                                                            }}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                padding: '1px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                color: copiedEmpId === emp.id ? '#10b981' : '#64748b'
                                                            }}
                                                            title="Copy password"
                                                        >
                                                            {copiedEmpId === emp.id ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Reset Status Badge */}
                                                {emp.is_password_reset_required ? (
                                                    <div style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        fontSize: '0.68rem',
                                                        fontWeight: 700,
                                                        color: '#b45309',
                                                        background: '#fffbeb',
                                                        padding: '2px 6px',
                                                        borderRadius: '5px',
                                                        border: '1px solid #fde68a',
                                                        width: 'fit-content'
                                                    }}>
                                                        <KeyRound size={10} /> Pending 1st Login Reset
                                                    </div>
                                                ) : (
                                                    <div style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        fontSize: '0.68rem',
                                                        fontWeight: 700,
                                                        color: '#047857',
                                                        background: '#ecfdf5',
                                                        padding: '2px 6px',
                                                        borderRadius: '5px',
                                                        border: '1px solid #a7f3d0',
                                                        width: 'fit-content'
                                                    }}>
                                                        <CheckCircle2 size={10} /> Active Password
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '2px' }}>
                                                No User Account
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    {emp.user_details?.last_login ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>
                                            <Clock size={12} color="#64748b" />
                                            {new Date(emp.user_details.last_login).toLocaleString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                    ) : emp.user ? (
                                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                            Never logged in
                                        </span>
                                    ) : (
                                        <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>—</span>
                                    )}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                                        {!emp.user ? (
                                            <button
                                                className="btn-primary"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '8px 14px',
                                                    fontSize: '0.78rem',
                                                    background: 'linear-gradient(135deg, #881337 0%, #be123c 100%)',
                                                    fontWeight: 800,
                                                    cursor: 'pointer',
                                                    borderRadius: '10px',
                                                    boxShadow: '0 4px 10px rgba(136, 19, 55, 0.2)',
                                                    border: 'none',
                                                    color: 'white'
                                                }}
                                                onClick={() => openProvisionModal(emp)}
                                                title="Create login credentials and decide password"
                                            >
                                                <Lock size={14} />
                                                Provision Account
                                            </button>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <div style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    color: '#059669',
                                                    fontSize: '0.72rem',
                                                    fontWeight: 800,
                                                    background: '#ecfdf5',
                                                    padding: '4px 8px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #a7f3d0'
                                                }}>
                                                    <ShieldCheck size={13} /> Active
                                                </div>
                                                <button
                                                    className="btn-secondary"
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        padding: '6px 12px',
                                                        fontSize: '0.74rem',
                                                        fontWeight: 800,
                                                        color: '#0369a1',
                                                        background: '#f0f9ff',
                                                        border: '1px solid #bae6fd',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => openResetModal(emp)}
                                                    title="Set or change password manually"
                                                >
                                                    <Key size={13} />
                                                    Set Password
                                                </button>
                                            </div>
                                        )}
                                        <button
                                            className="btn-secondary"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '6px 12px',
                                                fontSize: '0.74rem',
                                                fontWeight: 700,
                                                color: '#475569',
                                                borderRadius: '8px'
                                            }}
                                            onClick={() => { setSelectedEmployee(emp); setView('permissions'); }}
                                            title="Manage individual page & screen access overrides"
                                        >
                                            <ShieldAlert size={14} color="#8b5cf6" /> Page Access
                                        </button>
                                        {/* Show Disable for Active/Suspicious users with accounts, Enable for Inactive */}
                                        {emp.user && (
                                            <button
                                                className="btn-secondary"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '6px 12px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    color: (isActive || isSuspicious) ? '#ef4444' : '#166534',
                                                    background: (isActive || isSuspicious) ? '#fff1f2' : '#dcfce7',
                                                    border: `1px solid ${(isActive || isSuspicious) ? '#fee2e2' : '#bbf7d0'}`,
                                                    width: '100px',
                                                    justifyContent: 'center'
                                                }}
                                                onClick={() => handleToggleStatus(emp)}
                                            >
                                                {(isActive || isSuspicious) ? <UserMinus size={14} /> : <UserCheck size={14} />}
                                                {(isActive || isSuspicious) ? 'Disable' : 'Enable'}
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                        }))}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {pagination.count > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 0.5rem' }}>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        Page <b>{pagination.current}</b> of <b>{Math.ceil(pagination.count / 100)}</b>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            className="btn-secondary"
                            disabled={!pagination.previous}
                            onClick={() => fetchEmployees(pagination.current - 1)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '0.5rem 1rem',
                                opacity: !pagination.previous ? 0.5 : 1,
                                cursor: !pagination.previous ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg> Previous
                        </button>
                        <button
                            className="btn-secondary"
                            disabled={!pagination.next}
                            onClick={() => fetchEmployees(pagination.current + 1)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '0.5rem 1rem',
                                opacity: !pagination.next ? 0.5 : 1,
                                cursor: !pagination.next ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Next <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                        </button>
                    </div>
                </div>
            )}
            {/* Provision Modal */}
            {provisionModal.isOpen && provisionModal.employee && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(6px)',
                    zIndex: 99999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                    overflowY: 'auto'
                }}>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '18px',
                        width: '100%',
                        maxWidth: '480px',
                        maxHeight: 'min(90vh, 560px)',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden',
                        margin: 'auto'
                    }}>
                        {/* Header */}
                        <div style={{
                            background: 'linear-gradient(135deg, #881337 0%, #be123c 100%)',
                            padding: '1rem 1.25rem',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexShrink: 0
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '7px', borderRadius: '10px', display: 'flex' }}>
                                    <Lock size={18} color="white" />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: 'white' }}>Create User Account</h3>
                                    <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#fecdd3' }}>Provision login credentials for employee</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setProvisionModal({ isOpen: false, employee: null, password: '', showPassword: true, requireReset: false, loading: false })}
                                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.8, padding: '4px' }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '1.15rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
                            {/* Employee Card */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 12px',
                                background: '#f8fafc',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0'
                            }}>
                                <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '10px',
                                    background: 'var(--primary-light)',
                                    color: 'var(--primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    fontSize: '0.95rem',
                                    overflow: 'hidden'
                                }}>
                                    {provisionModal.employee.photo ? (
                                        <img src={getPhotoUrl(provisionModal.employee.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        provisionModal.employee.name[0]
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1e293b' }}>
                                        {provisionModal.employee.name}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>LOGIN USERNAME:</span>
                                        <span style={{
                                            fontSize: '0.74rem',
                                            fontWeight: 800,
                                            color: '#0369a1',
                                            background: '#e0f2fe',
                                            padding: '2px 7px',
                                            borderRadius: '5px',
                                            fontFamily: 'monospace'
                                        }}>
                                            {provisionModal.employee.employee_code}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Password Field */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Set Login Password
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setProvisionModal(prev => ({ ...prev, password: generateRandomPassword() }))}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#4f46e5',
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <RefreshCw size={12} /> Auto-Generate
                                    </button>
                                </div>

                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={provisionModal.showPassword ? 'text' : 'password'}
                                        value={provisionModal.password}
                                        onChange={(e) => setProvisionModal(prev => ({ ...prev, password: e.target.value }))}
                                        placeholder="Enter custom password (e.g. Welcome@123)"
                                        style={{
                                            width: '100%',
                                            padding: '9px 40px 9px 12px',
                                            border: '1.5px solid #cbd5e1',
                                            borderRadius: '10px',
                                            fontSize: '0.86rem',
                                            fontWeight: 600,
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                            fontFamily: provisionModal.showPassword ? 'inherit' : 'monospace'
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setProvisionModal(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                                        style={{
                                            position: 'absolute',
                                            right: '10px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#64748b',
                                            cursor: 'pointer',
                                            padding: '4px',
                                            display: 'flex'
                                        }}
                                        title={provisionModal.showPassword ? "Hide Password" : "Show Password"}
                                    >
                                        {provisionModal.showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                                <p style={{ margin: '5px 0 0 0', fontSize: '0.7rem', color: '#64748b' }}>
                                    Type password for employee, or leave blank to auto-generate.
                                </p>
                            </div>

                            {/* Checkbox */}
                            <label style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                padding: '9px 11px',
                                background: '#f8fafc',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0',
                                cursor: 'pointer'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={provisionModal.requireReset}
                                    onChange={(e) => setProvisionModal(prev => ({ ...prev, requireReset: e.target.checked }))}
                                    style={{ marginTop: '2px', cursor: 'pointer', width: '15px', height: '15px' }}
                                />
                                <div>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>
                                        Require employee to change password on first login
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px' }}>
                                        If unchecked, employee can directly use the password you entered.
                                    </div>
                                </div>
                            </label>
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '0.85rem 1.25rem',
                            background: '#f8fafc',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '10px',
                            flexShrink: 0
                        }}>
                            <button
                                className="btn-secondary"
                                disabled={provisionModal.loading}
                                onClick={() => setProvisionModal({ isOpen: false, employee: null, password: '', showPassword: true, requireReset: false, loading: false })}
                                style={{ padding: '7px 15px', borderRadius: '9px', fontWeight: 700, fontSize: '0.82rem' }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                disabled={provisionModal.loading}
                                onClick={handleConfirmProvision}
                                style={{
                                    padding: '7px 18px',
                                    borderRadius: '9px',
                                    fontWeight: 800,
                                    fontSize: '0.82rem',
                                    background: 'linear-gradient(135deg, #881337 0%, #be123c 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: provisionModal.loading ? 'wait' : 'pointer',
                                    opacity: provisionModal.loading ? 0.7 : 1
                                }}
                            >
                                <Lock size={14} className={provisionModal.loading ? 'spin' : ''} />
                                {provisionModal.loading ? 'Creating Account...' : 'Set Password & Create Account'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {resetModal.isOpen && resetModal.employee && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(6px)',
                    zIndex: 99999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                    overflowY: 'auto'
                }}>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '18px',
                        width: '100%',
                        maxWidth: '480px',
                        maxHeight: 'min(90vh, 560px)',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden',
                        margin: 'auto'
                    }}>
                        {/* Header */}
                        <div style={{
                            background: 'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)',
                            padding: '1rem 1.25rem',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexShrink: 0
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '7px', borderRadius: '10px', display: 'flex' }}>
                                    <Key size={18} color="white" />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: 'white' }}>Set / Change Password</h3>
                                    <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#e0f2fe' }}>Update password for {resetModal.employee.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setResetModal({ isOpen: false, employee: null, password: '', showPassword: true, requireReset: false, loading: false })}
                                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.8, padding: '4px' }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '1.15rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 12px',
                                background: '#f8fafc',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0'
                            }}>
                                <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '10px',
                                    background: '#e0f2fe',
                                    color: '#0369a1',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    fontSize: '0.95rem',
                                    overflow: 'hidden'
                                }}>
                                    {resetModal.employee.photo ? (
                                        <img src={getPhotoUrl(resetModal.employee.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        resetModal.employee.name[0]
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1e293b' }}>
                                        {resetModal.employee.name}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>LOGIN USERNAME:</span>
                                        <span style={{
                                            fontSize: '0.74rem',
                                            fontWeight: 800,
                                            color: '#0369a1',
                                            background: '#e0f2fe',
                                            padding: '2px 7px',
                                            borderRadius: '5px',
                                            fontFamily: 'monospace'
                                        }}>
                                            {resetModal.employee.employee_code}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Password Field */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Enter New Password
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setResetModal(prev => ({ ...prev, password: generateRandomPassword() }))}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#0284c7',
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <RefreshCw size={12} /> Auto-Generate
                                    </button>
                                </div>

                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={resetModal.showPassword ? 'text' : 'password'}
                                        value={resetModal.password}
                                        onChange={(e) => setResetModal(prev => ({ ...prev, password: e.target.value }))}
                                        placeholder="Enter new custom password"
                                        style={{
                                            width: '100%',
                                            padding: '9px 40px 9px 12px',
                                            border: '1.5px solid #cbd5e1',
                                            borderRadius: '10px',
                                            fontSize: '0.86rem',
                                            fontWeight: 600,
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                            fontFamily: resetModal.showPassword ? 'inherit' : 'monospace'
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setResetModal(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                                        style={{
                                            position: 'absolute',
                                            right: '10px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#64748b',
                                            cursor: 'pointer',
                                            padding: '4px',
                                            display: 'flex'
                                        }}
                                        title={resetModal.showPassword ? "Hide Password" : "Show Password"}
                                    >
                                        {resetModal.showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                                <p style={{ margin: '5px 0 0 0', fontSize: '0.7rem', color: '#64748b' }}>
                                    Also unblocks the account if it was temporarily locked due to failed attempts.
                                </p>
                            </div>

                            {/* Checkbox */}
                            <label style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                padding: '9px 11px',
                                background: '#f8fafc',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0',
                                cursor: 'pointer'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={resetModal.requireReset}
                                    onChange={(e) => setResetModal(prev => ({ ...prev, requireReset: e.target.checked }))}
                                    style={{ marginTop: '2px', cursor: 'pointer', width: '15px', height: '15px' }}
                                />
                                <div>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>
                                        Require employee to change password on next login
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px' }}>
                                        If unchecked, employee can directly log in using this password.
                                    </div>
                                </div>
                            </label>
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '0.85rem 1.25rem',
                            background: '#f8fafc',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '10px',
                            flexShrink: 0
                        }}>
                            <button
                                className="btn-secondary"
                                disabled={resetModal.loading}
                                onClick={() => setResetModal({ isOpen: false, employee: null, password: '', showPassword: true, requireReset: false, loading: false })}
                                style={{ padding: '7px 15px', borderRadius: '9px', fontWeight: 700, fontSize: '0.82rem' }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                disabled={resetModal.loading}
                                onClick={handleConfirmReset}
                                style={{
                                    padding: '7px 18px',
                                    borderRadius: '9px',
                                    fontWeight: 800,
                                    fontSize: '0.82rem',
                                    background: 'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: resetModal.loading ? 'wait' : 'pointer',
                                    opacity: resetModal.loading ? 0.7 : 1
                                }}
                            >
                                <Key size={14} className={resetModal.loading ? 'spin' : ''} />
                                {resetModal.loading ? 'Updating Password...' : 'Update Password'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success / Copy Credentials Modal */}
            {successCreds && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(6px)',
                    zIndex: 99999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem'
                }}>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '20px',
                        width: '100%',
                        maxWidth: '480px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #166534 0%, #15803d 100%)',
                            padding: '1.25rem 1.5rem',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px', display: 'flex' }}>
                                    <CheckCircle2 size={22} color="white" />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'white' }}>{successCreds.title}</h3>
                                    <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#bbf7d0' }}>Ready to provide to {successCreds.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSuccessCreds(null)}
                                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
                                Share these credentials directly with <b>{successCreds.name}</b> so they can log into BAVYA HCM:
                            </p>

                            <div style={{
                                background: '#f8fafc',
                                borderRadius: '14px',
                                border: '1px solid #e2e8f0',
                                padding: '14px 16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>LOGIN ID (USERNAME)</span>
                                    <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0369a1', fontFamily: 'monospace' }}>
                                        {successCreds.username}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>PASSWORD</span>
                                    <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', background: '#fef08a', padding: '2px 8px', borderRadius: '6px' }}>
                                        {successCreds.password}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>CHANGE PASSWORD ON LOGIN</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: successCreds.requireReset ? '#b45309' : '#15803d' }}>
                                        {successCreds.requireReset ? 'YES (On First Login)' : 'NO (Direct Login)'}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={handleCopyCredentials}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '12px 16px',
                                    background: copied ? '#15803d' : '#0f172a',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontWeight: 800,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                {copied ? 'Credentials Copied to Clipboard!' : 'Copy Employee ID & Password'}
                            </button>
                        </div>

                        <div style={{
                            padding: '1rem 1.5rem',
                            background: '#f8fafc',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'flex-end'
                        }}>
                            <button
                                className="btn-secondary"
                                onClick={() => setSuccessCreds(null)}
                                style={{ padding: '8px 20px', borderRadius: '10px', fontWeight: 800, fontSize: '0.85rem' }}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
