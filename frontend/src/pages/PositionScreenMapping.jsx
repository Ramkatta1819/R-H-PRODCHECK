import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
    Shield, 
    Layers, 
    Search, 
    AlertCircle, 
    Calendar, 
    UserSquare2, 
    Users, 
    Lock,
    Network,
    Globe,
    MapPin,
    Navigation,
    ClipboardList,
    Building2,
    FolderKanban,
    ChevronDown,
    ChevronUp,
    Check,
    X,
    Eye,
    PlusCircle,
    Edit3,
    Trash2,
    CheckCircle2,
    SlidersHorizontal,
    UserCheck,
    UserX,
    RefreshCw,
    Briefcase
} from 'lucide-react';
import { useData } from '../context/DataContext';
import BavyaSpinner from '../components/BavyaSpinner';
import api from '../api';

// Safe string extractors to guarantee no objects ever rendered as React children
const getEmployeeName = (pos) => {
    if (!pos) return null;
    const emp = pos.assigned_employee;
    if (typeof emp === 'object' && emp !== null) {
        return emp.name || emp.employee_name || (emp.id ? `ID: ${emp.id}` : '');
    }
    if (typeof emp === 'string' && emp.trim()) {
        return emp;
    }
    if (pos.assigned_employees_details && pos.assigned_employees_details.length > 0) {
        const first = pos.assigned_employees_details[0];
        if (typeof first === 'object' && first !== null) {
            return first.name || first.employee_name || '';
        }
        return String(first);
    }
    return null;
};

const getOfficeName = (pos) => {
    if (!pos) return null;
    if (typeof pos.office === 'object' && pos.office !== null) return pos.office.name || '';
    if (typeof pos.office_name === 'object' && pos.office_name !== null) return pos.office_name.name || '';
    if (pos.office_name) return String(pos.office_name);
    return null;
};

const getLevelName = (pos) => {
    if (!pos) return null;
    if (typeof pos.level === 'object' && pos.level !== null) return pos.level.name || '';
    if (typeof pos.level_name === 'object' && pos.level_name !== null) return pos.level_name.name || '';
    if (pos.level_name) return String(pos.level_name);
    return null;
};

// Lightweight, light-themed SearchableSelect
const LightSearchableSelect = ({ label, options, value, onChange, placeholder = "Select..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => String(opt.id) === String(value));
    const displayValue = selectedOption ? selectedOption.name : placeholder;

    const filteredOptions = options.filter(opt => 
        (opt.name || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{ position: 'relative', width: '100%' }} ref={containerRef}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>{label}</div>
            <div 
                onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
                style={{
                    background: '#ffffff',
                    border: isOpen ? '1.5px solid #3b82f6' : '1px solid #cbd5e1',
                    color: '#0f172a',
                    padding: '0.4rem 0.65rem',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    minHeight: '34px',
                    boxSizing: 'border-box',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                }}
            >
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '85%' }}>
                    {displayValue}
                </span>
                <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: '#64748b', flexShrink: 0 }} />
            </div>

            {isOpen && (
                <div 
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        marginTop: '4px',
                        zIndex: 9999,
                        maxHeight: '220px',
                        overflowY: 'auto',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        padding: '0.35rem'
                    }}
                >
                    <input 
                        type="text" 
                        placeholder="Type to filter..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                        style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '0.35rem 0.5rem',
                            color: '#0f172a',
                            fontSize: '0.78rem',
                            marginBottom: '0.35rem',
                            outline: 'none'
                        }}
                    />
                    <div>
                        {filteredOptions.length === 0 ? (
                            <div style={{ padding: '0.5rem', color: '#94a3b8', fontSize: '0.78rem', textAlign: 'center' }}>No matches</div>
                        ) : (
                            filteredOptions.map(opt => (
                                <div 
                                    key={opt.id}
                                    onClick={() => {
                                        onChange(opt.id);
                                        setIsOpen(false);
                                    }}
                                    style={{
                                        padding: '0.4rem 0.6rem',
                                        color: String(value) === String(opt.id) ? '#2563eb' : '#334155',
                                        fontWeight: String(value) === String(opt.id) ? 700 : 500,
                                        fontSize: '0.78rem',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        background: String(value) === String(opt.id) ? '#eff6ff' : 'transparent',
                                        transition: 'all 0.15s'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (String(value) !== String(opt.id)) e.currentTarget.style.background = '#f1f5f9';
                                    }}
                                    onMouseLeave={(e) => {
                                        if (String(value) !== String(opt.id)) e.currentTarget.style.background = 'transparent';
                                    }}
                                >
                                    {opt.name}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const PositionScreenMapping = () => {
    const { showNotification, offices, orgLevels } = useData();
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [positions, setPositions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedLevel, setSelectedLevel] = useState('all');
    const [selectedOffice, setSelectedOffice] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'assigned', 'vacant'
    const [selectedPosition, setSelectedPosition] = useState(null);
    const [permissions, setPermissions] = useState({});
    const [permLoading, setPermLoading] = useState(false);
    const [bulkActionLoading, setBulkActionLoading] = useState(false);
    const [screenSearch, setScreenSearch] = useState('');
    
    // Collapsible screen groups state
    const [expandedGroups, setExpandedGroups] = useState({
        'Dashboard & Administration': true,
        'Organization & Job Structure': true,
        'Workforce & Operations': true,
        'Geo Locations': true
    });

    const toggleGroup = (groupName) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupName]: !prev[groupName]
        }));
    };

    const toggleAllGroups = (expand) => {
        setExpandedGroups({
            'Dashboard & Administration': expand,
            'Organization & Job Structure': expand,
            'Workforce & Operations': expand,
            'Geo Locations': expand
        });
    };

    // Debounce search term
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 350);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    // Grouped screens list matching all system routes
    const screenGroups = useMemo(() => [
        {
            name: 'Dashboard & Administration',
            icon: <Building2 size={16} />,
            color: '#0284c7',
            screens: [
                { id: 'dashboard', name: 'Dashboard', icon: <Building2 size={15} /> },
                { id: 'users', name: 'User Management', icon: <UserSquare2 size={15} /> },
                { id: 'api-keys', name: 'API Key Management', icon: <Shield size={15} /> },
                { id: 'reactivations', name: 'Reactivations', icon: <UserSquare2 size={15} /> },
                { id: 'audit-logs', name: 'Audit Logs', icon: <ClipboardList size={15} /> },
                { id: 'login-history', name: 'Login History', icon: <AlertCircle size={15} /> },
                { id: 'position-screen-mappings', name: 'Position Screen Mapping', icon: <Shield size={15} /> }
            ]
        },
        {
            name: 'Organization & Job Structure',
            icon: <Layers size={16} />,
            color: '#7c3aed',
            screens: [
                { id: 'organization', name: 'Structure', icon: <Layers size={15} /> },
                { id: 'organization-levels', name: 'Levels', icon: <Layers size={15} /> },
                { id: 'offices', name: 'Offices', icon: <Building2 size={15} /> },
                { id: 'office-types', name: 'Facility Types', icon: <Layers size={15} /> },
                { id: 'departments', name: 'Departments', icon: <Building2 size={15} /> },
                { id: 'sections', name: 'Sections', icon: <Building2 size={15} /> },
                { id: 'facility-masters', name: 'Facility Master', icon: <Building2 size={15} /> },
                { id: 'facility-deployment-modes', name: 'Facility Deployment Modes', icon: <Layers size={15} /> },
                { id: 'facility-classes', name: 'Facility Classes', icon: <Layers size={15} /> },
                { id: 'facility-sub-classes', name: 'Facility Sub-Classes', icon: <Layers size={15} /> },
                { id: 'job-families', name: 'Job Families', icon: <Layers size={15} /> },
                { id: 'role-types', name: 'Role Types', icon: <Layers size={15} /> },
                { id: 'roles', name: 'Role Names', icon: <Layers size={15} /> },
                { id: 'role-sub-groups', name: 'Role Sub Groups', icon: <Layers size={15} /> },
                { id: 'position-role-mappings', name: 'Position & Role Types Mappings', icon: <Layers size={15} /> },
                { id: 'jobs', name: 'Jobs', icon: <Layers size={15} /> },
                { id: 'tasks', name: 'Tasks', icon: <Layers size={15} /> },
                { id: 'task-urls', name: 'Task URL Mapping', icon: <Layers size={15} /> }
            ]
        },
        {
            name: 'Workforce & Operations',
            icon: <Users size={16} />,
            color: '#059669',
            screens: [
                { id: 'employees', name: 'Employees', icon: <Users size={15} /> },
                { id: 'workforce-tracker', name: 'Workforce Tracker', icon: <Users size={15} /> },
                { id: 'position-employee-mapping', name: 'Position to Employee', icon: <UserSquare2 size={15} /> },
                { id: 'positions', name: 'Positions', icon: <Layers size={15} /> },
                { id: 'position-assignments', name: 'Position Assignments', icon: <Network size={15} /> },
                { id: 'position-levels', name: 'Position Levels', icon: <Layers size={15} /> },
                { id: 'position-types', name: 'Position Types', icon: <Layers size={15} /> },
                { id: 'shifts', name: 'Shifts', icon: <Calendar size={15} /> },
                { id: 'position-shift-rosters', name: 'Shift Roster', icon: <Calendar size={15} /> },
                { id: 'shift-change-requests', name: 'Shift Requests', icon: <Calendar size={15} /> },
                { id: 'projects', name: 'Projects', icon: <FolderKanban size={15} /> },
                { id: 'segments', name: 'Segments', icon: <Layers size={15} /> },
                { id: 'position-activity-logs', name: 'Delegate Activity', icon: <ClipboardList size={15} /> },
                { id: 'vehicle-swaps', name: 'Vehicle Swaps', icon: <Layers size={15} /> },
                { id: 'vehicle-swap-requests', name: 'Vehicle Swap Requests', icon: <Layers size={15} /> }
            ]
        },
        {
            name: 'Geo Locations',
            icon: <Globe size={16} />,
            color: '#db2777',
            screens: [
                { id: 'geo-continents', name: 'Geo Territory', icon: <Globe size={15} /> },
                { id: 'geo-countries', name: 'Countries', icon: <Globe size={15} /> },
                { id: 'geo-states', name: 'States', icon: <MapPin size={15} /> },
                { id: 'geo-districts', name: 'Districts', icon: <MapPin size={15} /> },
                { id: 'geo-mandals', name: 'Mandals', icon: <Navigation size={15} /> },
                { id: 'geo-clusters', name: 'Clusters', icon: <Layers size={15} /> },
                { id: 'visiting-locations', name: 'Hotspots', icon: <MapPin size={15} /> },
                { id: 'landmarks', name: 'Landmarks', icon: <MapPin size={15} /> }
            ]
        }
    ], []);

    // Load ALL positions using the high-performance mapping-list endpoint
    const fetchPositions = useCallback(async (isSilent = false) => {
        try {
            if (isSilent) {
                setIsRefreshing(true);
            } else {
                setLoading(true);
            }
            let data = [];
            try {
                const res = await api.get('positions/mapping-list/');
                data = Array.isArray(res) ? res : (res?.results || []);
            } catch (fastErr) {
                console.warn('mapping-list endpoint fallback to positions/?pagination=false:', fastErr);
                const res = await api.get('positions/?pagination=false');
                data = Array.isArray(res) ? res : (res?.results || []);
            }
            setPositions(data);
            
            if (data.length > 0) {
                const stillExists = data.find(p => p.id === selectedPosition?.id);
                if (!stillExists) {
                    handleSelectPosition(data[0]);
                }
            } else {
                setSelectedPosition(null);
            }
        } catch (err) {
            console.error('Error fetching positions:', err);
            showNotification('Failed to load positions list', 'error');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [showNotification, selectedPosition?.id]);

    const handleSelectPosition = async (pos) => {
        setSelectedPosition(pos);
        setPermLoading(true);
        try {
            const data = await api.get(`positions/${pos.id}/screen_permissions/`);
            setPermissions(data || {});
        } catch (err) {
            console.error('Error loading permissions:', err);
            showNotification('Failed to load screen permissions', 'error');
        } finally {
            setPermLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchPositions();
    }, [fetchPositions]);

    // When Level changes, reset Selected Office
    useEffect(() => {
        setSelectedOffice('all');
    }, [selectedLevel]);

    // Toggle individual permission
    const handleTogglePermission = async (pattern, permissionType, currentStatus) => {
        if (!selectedPosition) return;
        
        const nextStatus = !currentStatus;
        
        // Optimistic UI update
        setPermissions(prev => ({
            ...prev,
            [pattern]: {
                ...prev[pattern],
                [permissionType]: nextStatus
            }
        }));

        try {
            await api.post(`positions/${selectedPosition.id}/toggle_screen_permission/`, {
                pattern,
                permission_type: permissionType,
                enabled: nextStatus
            });
            showNotification(`${permissionType.toUpperCase()} permission updated`, 'success');
        } catch (err) {
            console.error('Failed to update permission:', err);
            showNotification('Failed to save permission update', 'error');
            if (selectedPosition) {
                handleSelectPosition(selectedPosition);
            }
        }
    };

    // Fast atomic bulk update
    const handleBulkUpdate = async (updates, actionName, userMessage) => {
        if (!selectedPosition || !updates.length) return;
        setBulkActionLoading(true);

        // Optimistic UI update
        setPermissions(prev => {
            const copy = { ...prev };
            updates.forEach(u => {
                copy[u.pattern] = {
                    view: u.view,
                    create: u.create,
                    edit: u.edit,
                    delete: u.delete,
                    is_enabled: u.view || u.create || u.edit || u.delete
                };
            });
            return copy;
        });

        try {
            const res = await api.post(`positions/${selectedPosition.id}/bulk_screen_permissions/`, {
                updates,
                action_name: actionName
            });
            if (res && res.permissions) {
                setPermissions(res.permissions);
            }
            showNotification(userMessage || res.message || 'Permissions updated successfully', 'success');
        } catch (err) {
            console.error('Failed bulk permissions update:', err);
            showNotification('Failed to execute bulk update', 'error');
            handleSelectPosition(selectedPosition);
        } finally {
            setBulkActionLoading(false);
        }
    };

    // Category quick action
    const handleCategoryBulk = (group, type) => {
        const isFull = type === 'FULL';
        const isView = type === 'VIEW';
        const isClear = type === 'CLEAR';

        const updates = group.screens.map(scr => ({
            pattern: scr.id,
            view: isFull || isView,
            create: isFull,
            edit: isFull,
            delete: isFull
        }));

        const label = isFull ? 'Granted Full Access' : (isView ? 'Granted View Only' : 'Cleared Permissions');
        handleBulkUpdate(updates, `${type}_GROUP_${group.name}`, `${label} for ${group.name}`);
    };

    // Global quick action
    const handleGlobalBulk = (type) => {
        const allScreens = screenGroups.flatMap(g => g.screens);
        const isFull = type === 'FULL';
        const isView = type === 'VIEW';
        const isClear = type === 'CLEAR';

        const updates = allScreens.map(scr => ({
            pattern: scr.id,
            view: isFull || isView,
            create: isFull,
            edit: isFull,
            delete: isFull
        }));

        const label = isFull ? 'Granted Full Admin Access to all screens' : (isView ? 'Granted View Only Access to all screens' : 'Cleared All Permissions');
        handleBulkUpdate(updates, `GLOBAL_${type}`, label);
    };

    // Single row shortcut (Full Access vs Clear)
    const handleRowQuickToggle = (pattern, isCurrentlyFull) => {
        const targetState = !isCurrentlyFull;
        const update = [{
            pattern,
            view: targetState,
            create: targetState,
            edit: targetState,
            delete: targetState
        }];
        handleBulkUpdate(update, targetState ? `FULL_ACCESS_${pattern}` : `CLEAR_${pattern}`, targetState ? 'Full access granted' : 'Permissions cleared');
    };

    // Filter positions based on Status, Level, Office, and Search (instant 0ms in-memory filtering)
    const filteredPositions = useMemo(() => {
        return positions.filter(pos => {
            // Status filter
            const hasEmp = !pos.is_vacant && !!getEmployeeName(pos);
            if (statusFilter === 'assigned' && !hasEmp) return false;
            if (statusFilter === 'vacant' && hasEmp) return false;

            // Level filter
            if (selectedLevel && selectedLevel !== 'all') {
                const posLevelId = String(pos.level_id || pos.office_level_id || pos.level?.id || pos.level || '');
                if (posLevelId !== String(selectedLevel)) return false;
            }

            // Office filter
            if (selectedOffice && selectedOffice !== 'all') {
                const posOfficeId = String(pos.office_id || pos.office?.id || pos.office || '');
                if (posOfficeId !== String(selectedOffice)) return false;
            }

            // Search filter
            if (debouncedSearch && debouncedSearch.trim()) {
                const term = debouncedSearch.toLowerCase().trim();
                const name = (pos.name || '').toLowerCase();
                const code = (pos.code || '').toLowerCase();
                const emp = (getEmployeeName(pos) || '').toLowerCase();
                if (!name.includes(term) && !code.includes(term) && !emp.includes(term)) return false;
            }

            return true;
        });
    }, [positions, statusFilter, selectedLevel, selectedOffice, debouncedSearch]);

    // Limit displayed items in DOM to 150 to keep scrolling lightning-fast
    const displayedPositions = useMemo(() => {
        return filteredPositions.slice(0, 150);
    }, [filteredPositions]);

    // Summary counts for KPI cards across all positions
    const kpiStats = useMemo(() => {
        let assigned = 0;
        positions.forEach(pos => {
            if (!pos.is_vacant && getEmployeeName(pos)) {
                assigned++;
            }
        });
        const vacant = positions.length - assigned;
        return {
            total: positions.length,
            assigned,
            vacant
        };
    }, [positions]);

    // Live permission stats for currently selected position
    const stats = useMemo(() => {
        let totalScreens = 0;
        let enabledScreens = 0;
        let viewCount = 0;
        let createCount = 0;
        let editCount = 0;
        let deleteCount = 0;

        screenGroups.forEach(g => {
            g.screens.forEach(s => {
                totalScreens++;
                const p = permissions[s.id];
                if (p) {
                    if (p.view || p.create || p.edit || p.delete) enabledScreens++;
                    if (p.view) viewCount++;
                    if (p.create) createCount++;
                    if (p.edit) editCount++;
                    if (p.delete) deleteCount++;
                }
            });
        });

        return { totalScreens, enabledScreens, viewCount, createCount, editCount, deleteCount };
    }, [permissions, screenGroups]);

    const levelOptions = [
        { id: 'all', name: 'All Levels' },
        ...(orgLevels || [])
    ];

    const filteredOffices = offices ? offices.filter(off => 
        selectedLevel === 'all' || 
        String(off.level) === String(selectedLevel) || 
        String(off.level_id) === String(selectedLevel)
    ) : [];

    const officeOptions = [
        { id: 'all', name: 'All Offices' },
        ...filteredOffices
    ];

    const selectedEmpName = getEmployeeName(selectedPosition);
    const selectedOfficeName = getOfficeName(selectedPosition);

    // Initial load: show clean, centered BavyaSpinner matching PositionEmployeeMapping and other HCM pages
    if (loading && positions.length === 0) {
        return (
            <div className="fade-in" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '65vh',
                width: '100%',
                padding: '2rem'
            }}>
                <BavyaSpinner label="Loading Position Screen Mappings..." />
            </div>
        );
    }

    return (
        <div className="fade-in" style={{ padding: '0.25rem 0', maxWidth: '100%', margin: '0 auto' }}>
            <style>{`
                .psm-switch {
                    position: relative;
                    display: inline-block;
                    width: 36px;
                    height: 19px;
                }
                .psm-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .psm-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #cbd5e1;
                    transition: .22s cubic-bezier(0.4, 0, 0.2, 1);
                    border-radius: 20px;
                }
                .psm-slider:before {
                    position: absolute;
                    content: "";
                    height: 13px;
                    width: 13px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: .22s cubic-bezier(0.4, 0, 0.2, 1);
                    border-radius: 50%;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.18);
                }
                .psm-switch.view input:checked + .psm-slider {
                    background-color: #0284c7;
                }
                .psm-switch.create input:checked + .psm-slider {
                    background-color: #10b981;
                }
                .psm-switch.edit input:checked + .psm-slider {
                    background-color: #f59e0b;
                }
                .psm-switch.delete input:checked + .psm-slider {
                    background-color: #ef4444;
                }
                .psm-switch input:checked + .psm-slider:before {
                    transform: translateX(17px);
                }
                .psm-pos-item {
                    padding: 0.65rem 0.85rem;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.15s ease-in-out;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 8px;
                }
                .psm-pos-item:hover {
                    background: #f8fafc;
                    border-color: #cbd5e1;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 5px rgba(0,0,0,0.03);
                }
                .psm-pos-item.active {
                    background: #eff6ff;
                    border-color: #3b82f6;
                    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.16);
                }
                .psm-screen-row {
                    transition: background 0.12s;
                }
                .psm-screen-row:hover {
                    background: #f8fafc;
                }
                .psm-action-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    padding: 0.4rem 0.8rem;
                    border-radius: 7px;
                    font-size: 0.78rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.15s;
                    border: 1px solid transparent;
                }
                .psm-chip-btn {
                    font-size: 0.68rem;
                    font-weight: 700;
                    padding: 2px 7px;
                    border-radius: 5px;
                    border: 1px solid transparent;
                    cursor: pointer;
                    transition: all 0.15s;
                }
            `}</style>

            {/* Header Title & Subtitle */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
                flexWrap: 'wrap',
                gap: '0.75rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        boxShadow: '0 6px 14px rgba(14, 165, 233, 0.25)'
                    }}>
                        <Shield size={20} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>
                            Position Screen Mapping
                        </h1>
                        <p style={{ margin: '1px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                            Configure screen permissions & action privileges for each organizational position
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    {selectedPosition && (
                        <>
                            <button
                                onClick={() => handleGlobalBulk('FULL')}
                                disabled={bulkActionLoading}
                                className="psm-action-btn"
                                style={{
                                    background: '#10b981',
                                    color: 'white',
                                    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
                                    opacity: bulkActionLoading ? 0.6 : 1
                                }}
                                title="Grant full privileges to all screens"
                            >
                                <UserCheck size={14} />
                                Full Access
                            </button>
                            <button
                                onClick={() => handleGlobalBulk('CLEAR')}
                                disabled={bulkActionLoading}
                                className="psm-action-btn"
                                style={{
                                    background: 'white',
                                    border: '1px solid #fecaca',
                                    color: '#dc2626',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                    opacity: bulkActionLoading ? 0.6 : 1
                                }}
                                title="Revoke all privileges"
                            >
                                <UserX size={14} />
                                Revoke All
                            </button>
                        </>
                    )}

                    <button
                        onClick={() => fetchPositions(true)}
                        disabled={loading || isRefreshing}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '0.45rem 0.95rem',
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            color: '#334155',
                            cursor: (loading || isRefreshing) ? 'not-allowed' : 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                            transition: 'all 0.2s'
                        }}
                        title="Reload positions list"
                    >
                        <RefreshCw size={14} className={isRefreshing ? 'inner-spin' : ''} />
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: '0.65rem',
                marginBottom: '0.75rem'
            }}>
                {/* Total Positions */}
                <div
                    onClick={() => setStatusFilter('all')}
                    style={{
                        background: 'white',
                        padding: '0.7rem 0.95rem',
                        borderRadius: '12px',
                        border: statusFilter === 'all' ? '2.5px solid #0ea5e9' : '1px solid #e2e8f0',
                        boxShadow: statusFilter === 'all' ? '0 4px 12px rgba(14, 165, 233, 0.18)' : '0 1px 3px rgba(0,0,0,0.02)',
                        transform: statusFilter === 'all' ? 'translateY(-1px)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                    }}
                    title="Filter all positions"
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: statusFilter === 'all' ? '#0284c7' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Total Positions
                        </span>
                        <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '4px', borderRadius: '6px' }}>
                            <Briefcase size={13} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', marginTop: '0.2rem', lineHeight: 1.1 }}>
                        {kpiStats.total.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                        All organization positions
                    </div>
                </div>

                {/* Assigned Positions */}
                <div
                    onClick={() => setStatusFilter('assigned')}
                    style={{
                        background: 'white',
                        padding: '0.7rem 0.95rem',
                        borderRadius: '12px',
                        border: statusFilter === 'assigned' ? '2.5px solid #6366f1' : '1px solid #e2e8f0',
                        boxShadow: statusFilter === 'assigned' ? '0 4px 12px rgba(99, 102, 241, 0.18)' : '0 1px 3px rgba(0,0,0,0.02)',
                        transform: statusFilter === 'assigned' ? 'translateY(-1px)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                    }}
                    title="Filter assigned positions"
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: statusFilter === 'assigned' ? '#4f46e5' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Assigned
                        </span>
                        <div style={{ background: '#eef2ff', color: '#4f46e5', padding: '4px', borderRadius: '6px' }}>
                            <UserCheck size={13} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#4f46e5', marginTop: '0.2rem', lineHeight: 1.1 }}>
                        {kpiStats.assigned.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                        Active staff tagged
                    </div>
                </div>

                {/* Vacant Positions */}
                <div
                    onClick={() => setStatusFilter('vacant')}
                    style={{
                        background: 'white',
                        padding: '0.7rem 0.95rem',
                        borderRadius: '12px',
                        border: statusFilter === 'vacant' ? '2.5px solid #d97706' : '1px solid #e2e8f0',
                        boxShadow: statusFilter === 'vacant' ? '0 4px 12px rgba(217, 119, 6, 0.2)' : '0 1px 3px rgba(0,0,0,0.02)',
                        transform: statusFilter === 'vacant' ? 'translateY(-1px)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                    }}
                    title="Filter vacant positions"
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: statusFilter === 'vacant' ? '#b45309' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Vacant
                        </span>
                        <div style={{ background: '#fffbeb', color: '#d97706', padding: '4px', borderRadius: '6px' }}>
                            <AlertCircle size={13} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#d97706', marginTop: '0.2rem', lineHeight: 1.1 }}>
                        {kpiStats.vacant.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                        Ready for assignment
                    </div>
                </div>

                {/* Active Modules KPI */}
                <div
                    style={{
                        background: 'linear-gradient(135deg, #0284c7 0%, #3b82f6 100%)',
                        padding: '0.7rem 0.95rem',
                        borderRadius: '12px',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(14, 165, 233, 0.22)'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Active Modules
                        </span>
                        <div style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '4px', borderRadius: '6px' }}>
                            <Layers size={13} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'white', marginTop: '0.2rem', lineHeight: 1.1 }}>
                        {stats.enabledScreens} <span style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.85 }}>/ {stats.totalScreens}</span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.85)', marginTop: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {stats.viewCount}V • {stats.createCount}C • {stats.editCount}E • {stats.deleteCount}D
                    </div>
                </div>
            </div>

            {/* Split Layout: Left Directory + Right Permissions Editor */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '360px 1fr',
                gap: '0.85rem',
                height: 'calc(100vh - 195px)',
                minHeight: '620px'
            }}>
                {/* Left Pane - Positions Directory */}
                <div style={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'visible',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
                }}>
                    {/* Top Search & Filter Bar */}
                    <div style={{
                        padding: '0.75rem 0.85rem',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.55rem',
                        background: '#f8fafc',
                        borderRadius: '14px 14px 0 0'
                    }}>
                        {/* Search Input */}
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input 
                                type="text" 
                                placeholder="Search position name or code..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    background: '#ffffff',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    padding: '0.45rem 0.65rem 0.45rem 2rem',
                                    color: '#0f172a',
                                    fontSize: '0.8rem',
                                    outline: 'none',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                }}
                            />
                            {searchTerm && (
                                <X 
                                    size={13} 
                                    onClick={() => setSearchTerm('')} 
                                    style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', cursor: 'pointer' }}
                                />
                            )}
                        </div>

                        {/* Dropdowns */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <LightSearchableSelect 
                                label="Org Level"
                                options={levelOptions}
                                value={selectedLevel}
                                onChange={setSelectedLevel}
                                placeholder="All Levels"
                            />
                            <LightSearchableSelect 
                                label="Office"
                                options={officeOptions}
                                value={selectedOffice}
                                onChange={setSelectedOffice}
                                placeholder="All Offices"
                            />
                        </div>

                        {/* Status Pills */}
                        <div style={{
                            display: 'flex',
                            background: '#f1f5f9',
                            padding: '3px',
                            borderRadius: '8px',
                            gap: '2px'
                        }}>
                            <button 
                                onClick={() => setStatusFilter('all')}
                                style={{
                                    flex: 1,
                                    padding: '4px',
                                    fontSize: '0.74rem',
                                    fontWeight: statusFilter === 'all' ? 700 : 500,
                                    border: 'none',
                                    borderRadius: '6px',
                                    background: statusFilter === 'all' ? 'white' : 'transparent',
                                    color: statusFilter === 'all' ? '#0f172a' : '#64748b',
                                    boxShadow: statusFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}
                            >
                                All ({kpiStats.total.toLocaleString()})
                            </button>
                            <button 
                                onClick={() => setStatusFilter('assigned')}
                                style={{
                                    flex: 1,
                                    padding: '4px',
                                    fontSize: '0.74rem',
                                    fontWeight: statusFilter === 'assigned' ? 700 : 500,
                                    border: 'none',
                                    borderRadius: '6px',
                                    background: statusFilter === 'assigned' ? 'white' : 'transparent',
                                    color: statusFilter === 'assigned' ? '#4f46e5' : '#64748b',
                                    boxShadow: statusFilter === 'assigned' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}
                            >
                                Assigned ({kpiStats.assigned.toLocaleString()})
                            </button>
                            <button 
                                onClick={() => setStatusFilter('vacant')}
                                style={{
                                    flex: 1,
                                    padding: '4px',
                                    fontSize: '0.74rem',
                                    fontWeight: statusFilter === 'vacant' ? 700 : 500,
                                    border: 'none',
                                    borderRadius: '6px',
                                    background: statusFilter === 'vacant' ? 'white' : 'transparent',
                                    color: statusFilter === 'vacant' ? '#d97706' : '#64748b',
                                    boxShadow: statusFilter === 'vacant' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}
                            >
                                Vacant ({kpiStats.vacant.toLocaleString()})
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Position Items */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '0.65rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.45rem'
                    }}>
                        {filteredPositions.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
                                <AlertCircle size={28} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                                <p style={{ fontSize: '0.85rem', margin: 0, fontWeight: 600 }}>No positions found</p>
                                <p style={{ fontSize: '0.75rem', margin: '4px 0 0' }}>Try clearing filters or search term</p>
                            </div>
                        ) : (
                            <>
                                {filteredPositions.length > 150 && (
                                    <div style={{ fontSize: '0.68rem', color: '#64748b', padding: '2px 4px', fontStyle: 'italic' }}>
                                        Showing 150 of {filteredPositions.length.toLocaleString()} matching positions
                                    </div>
                                )}
                                {displayedPositions.map(pos => {
                                    const empName = getEmployeeName(pos);
                                    const isAssigned = !pos.is_vacant && !!empName;
                                    const isSelected = selectedPosition?.id === pos.id;
                                    const officeName = getOfficeName(pos);
                                    const levelName = getLevelName(pos);

                                return (
                                    <div 
                                        key={pos.id} 
                                        className={`psm-pos-item ${isSelected ? 'active' : ''}`}
                                        onClick={() => handleSelectPosition(pos)}
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0f172a', lineHeight: 1.25 }}>
                                                {pos.name}
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace', marginTop: '0.15rem' }}>
                                                {pos.code}
                                            </div>
                                            {isAssigned ? (
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    marginTop: '0.3rem',
                                                    fontSize: '0.68rem',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    fontWeight: 600,
                                                    background: '#f0fdf4',
                                                    color: '#16a34a',
                                                    border: '1px solid #bbf7d0'
                                                }}>
                                                    <UserCheck size={11} />
                                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>
                                                        {empName}
                                                    </span>
                                                </span>
                                            ) : (
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    marginTop: '0.3rem',
                                                    fontSize: '0.68rem',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    fontWeight: 600,
                                                    background: '#f8fafc',
                                                    color: '#64748b',
                                                    border: '1px solid #e2e8f0'
                                                }}>
                                                    <UserX size={11} />
                                                    Vacant
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0 }}>
                                            {levelName && (
                                                <span style={{
                                                    fontSize: '0.65rem',
                                                    background: '#f1f5f9',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    color: '#4f46e5',
                                                    fontWeight: 700
                                                }}>
                                                    {levelName}
                                                </span>
                                            )}
                                            {officeName && (
                                                <span style={{
                                                    fontSize: '0.62rem',
                                                    color: '#64748b',
                                                    maxWidth: '100px',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}>
                                                    {officeName}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}
                    </div>
                </div>

                {/* Right Pane - Permissions Matrix */}
                <div style={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
                }}>
                    {selectedPosition ? (
                        <>
                            {/* Selected Position Details Header */}
                            <div style={{
                                padding: '0.85rem 1.25rem',
                                background: '#f8fafc',
                                borderBottom: '1px solid #e2e8f0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '0.75rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #0284c7 0%, #3b82f6 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        boxShadow: '0 4px 10px rgba(2, 132, 199, 0.25)'
                                    }}>
                                        <Shield size={20} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                                            {selectedPosition.name}
                                        </div>
                                        <div style={{ color: '#64748b', fontSize: '0.76rem', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <span>Code: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{selectedPosition.code}</strong></span>
                                            {selectedOfficeName && <span>• Office: <strong style={{ color: '#334155' }}>{selectedOfficeName}</strong></span>}
                                            {selectedEmpName && (
                                                <span>• Assigned: <strong style={{ color: '#16a34a' }}>{selectedEmpName}</strong></span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <button 
                                        onClick={() => toggleAllGroups(true)}
                                        className="psm-action-btn"
                                        style={{ background: 'white', border: '1px solid #cbd5e1', color: '#334155' }}
                                    >
                                        <ChevronDown size={13} />
                                        Expand All
                                    </button>
                                    <button 
                                        onClick={() => toggleAllGroups(false)}
                                        className="psm-action-btn"
                                        style={{ background: 'white', border: '1px solid #cbd5e1', color: '#334155' }}
                                    >
                                        <ChevronUp size={13} />
                                        Collapse All
                                    </button>
                                </div>
                            </div>

                            {/* Live Stats Bar & Quick Filter */}
                            <div style={{
                                padding: '0.55rem 1.25rem',
                                background: '#ffffff',
                                borderBottom: '1px solid #e2e8f0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '0.65rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0' }}>
                                        Modules: <strong>{stats.enabledScreens} / {stats.totalScreens}</strong>
                                    </span>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <Eye size={12} /> View: {stats.viewCount}
                                    </span>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <PlusCircle size={12} /> Create: {stats.createCount}
                                    </span>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <Edit3 size={12} /> Edit: {stats.editCount}
                                    </span>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <Trash2 size={12} /> Delete: {stats.deleteCount}
                                    </span>
                                </div>

                                {/* Filter screens */}
                                <div style={{ position: 'relative', width: '210px' }}>
                                    <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input 
                                        type="text" 
                                        placeholder="Filter screen names..."
                                        value={screenSearch}
                                        onChange={(e) => setScreenSearch(e.target.value)}
                                        style={{
                                            width: '100%',
                                            boxSizing: 'border-box',
                                            background: '#f8fafc',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '6px',
                                            padding: '4px 8px 4px 26px',
                                            fontSize: '0.75rem',
                                            color: '#0f172a',
                                            outline: 'none'
                                        }}
                                    />
                                    {screenSearch && (
                                        <X 
                                            size={12} 
                                            onClick={() => setScreenSearch('')}
                                            style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', cursor: 'pointer' }} 
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Scrollable Screens Groups List */}
                            {permLoading ? (
                                <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                    <BavyaSpinner label="Fetching screen permissions..." />
                                </div>
                            ) : (
                                <div style={{ flex: 1, overflowY: 'auto', padding: '0.85rem 1.25rem' }}>
                                    {screenGroups.map(group => {
                                        // Screen filtering
                                        const visibleScreens = group.screens.filter(scr => 
                                            !screenSearch ||
                                            scr.name.toLowerCase().includes(screenSearch.toLowerCase()) ||
                                            scr.id.toLowerCase().includes(screenSearch.toLowerCase())
                                        );

                                        if (screenSearch && visibleScreens.length === 0) {
                                            return null;
                                        }

                                        // Force expand if searching
                                        const isExpanded = screenSearch ? true : expandedGroups[group.name];

                                        // Count active in group
                                        const activeInGroup = group.screens.filter(s => {
                                            const p = permissions[s.id];
                                            return p && (p.view || p.create || p.edit || p.delete);
                                        }).length;

                                        return (
                                            <div 
                                                key={group.name} 
                                                style={{
                                                    marginBottom: '0.85rem',
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: '10px',
                                                    overflow: 'hidden',
                                                    background: 'white'
                                                }}
                                            >
                                                {/* Category Group Header */}
                                                <div 
                                                    onClick={() => toggleGroup(group.name)}
                                                    style={{
                                                        background: '#f8fafc',
                                                        padding: '0.65rem 0.95rem',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        cursor: 'pointer',
                                                        userSelect: 'none',
                                                        borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
                                                        transition: 'background 0.15s'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ color: group.color }}>{group.icon}</div>
                                                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>{group.name}</span>
                                                        <span style={{
                                                            fontSize: '0.68rem',
                                                            background: activeInGroup > 0 ? '#f0fdf4' : '#f1f5f9',
                                                            color: activeInGroup > 0 ? '#16a34a' : '#64748b',
                                                            border: activeInGroup > 0 ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                                                            padding: '1px 6px',
                                                            borderRadius: '10px',
                                                            fontWeight: 700
                                                        }}>
                                                            {activeInGroup} / {group.screens.length} active
                                                        </span>
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                                                        <button 
                                                            className="psm-chip-btn"
                                                            onClick={() => handleCategoryBulk(group, 'VIEW')}
                                                            style={{ background: '#f0f9ff', color: '#0284c7', borderColor: '#bae6fd' }}
                                                            title="Grant View to all screens in this category"
                                                        >
                                                            + View All
                                                        </button>
                                                        <button 
                                                            className="psm-chip-btn"
                                                            onClick={() => handleCategoryBulk(group, 'FULL')}
                                                            style={{ background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}
                                                            title="Grant Full Privileges to this category"
                                                        >
                                                            + Full Access
                                                        </button>
                                                        <button 
                                                            className="psm-chip-btn"
                                                            onClick={() => handleCategoryBulk(group, 'CLEAR')}
                                                            style={{ background: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }}
                                                            title="Clear permissions for this category"
                                                        >
                                                            ✕ Clear
                                                        </button>
                                                        <div style={{ marginLeft: '4px', color: '#64748b' }}>
                                                            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Screen Rows Table */}
                                                {isExpanded && (
                                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                        <thead>
                                                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                                <th style={{ textAlign: 'left', padding: '0.55rem 0.85rem', color: '#475569', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', width: '42%' }}>
                                                                    Screen / Module
                                                                </th>
                                                                <th style={{ textAlign: 'center', padding: '0.55rem 0.5rem', color: '#0284c7', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', width: '13%' }}>
                                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                        <Eye size={12} /> View
                                                                    </div>
                                                                </th>
                                                                <th style={{ textAlign: 'center', padding: '0.55rem 0.5rem', color: '#16a34a', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', width: '13%' }}>
                                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                        <PlusCircle size={12} /> Create
                                                                    </div>
                                                                </th>
                                                                <th style={{ textAlign: 'center', padding: '0.55rem 0.5rem', color: '#d97706', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', width: '13%' }}>
                                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                        <Edit3 size={12} /> Edit
                                                                    </div>
                                                                </th>
                                                                <th style={{ textAlign: 'center', padding: '0.55rem 0.5rem', color: '#dc2626', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', width: '13%' }}>
                                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                        <Trash2 size={12} /> Delete
                                                                    </div>
                                                                </th>
                                                                <th style={{ textAlign: 'center', padding: '0.55rem 0.5rem', color: '#64748b', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', width: '9%' }}>
                                                                    Shortcut
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {visibleScreens.map(scr => {
                                                                const permState = permissions[scr.id] || { view: false, create: false, edit: false, delete: false };
                                                                const isFull = permState.view && permState.create && permState.edit && permState.delete;
                                                                const isAny = permState.view || permState.create || permState.edit || permState.delete;

                                                                return (
                                                                    <tr key={scr.id} className="psm-screen-row" style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                                        <td style={{ padding: '0.55rem 0.85rem' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                <div style={{
                                                                                    width: '28px',
                                                                                    height: '28px',
                                                                                    borderRadius: '6px',
                                                                                    background: '#eff6ff',
                                                                                    color: '#2563eb',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'center',
                                                                                    flexShrink: 0
                                                                                }}>
                                                                                    {scr.icon}
                                                                                </div>
                                                                                <div>
                                                                                    <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#0f172a' }}>
                                                                                        {scr.name}
                                                                                    </div>
                                                                                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'monospace' }}>
                                                                                        /{scr.id}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </td>

                                                                        {/* View Toggle */}
                                                                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                                            <label className="psm-switch view">
                                                                                <input 
                                                                                    type="checkbox" 
                                                                                    checked={!!permState.view} 
                                                                                    onChange={() => handleTogglePermission(scr.id, 'view', !!permState.view)}
                                                                                />
                                                                                <span className="psm-slider"></span>
                                                                            </label>
                                                                        </td>

                                                                        {/* Create Toggle */}
                                                                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                                            <label className="psm-switch create">
                                                                                <input 
                                                                                    type="checkbox" 
                                                                                    checked={!!permState.create} 
                                                                                    onChange={() => handleTogglePermission(scr.id, 'create', !!permState.create)}
                                                                                />
                                                                                <span className="psm-slider"></span>
                                                                            </label>
                                                                        </td>

                                                                        {/* Edit Toggle */}
                                                                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                                            <label className="psm-switch edit">
                                                                                <input 
                                                                                    type="checkbox" 
                                                                                    checked={!!permState.edit} 
                                                                                    onChange={() => handleTogglePermission(scr.id, 'edit', !!permState.edit)}
                                                                                />
                                                                                <span className="psm-slider"></span>
                                                                            </label>
                                                                        </td>

                                                                        {/* Delete Toggle */}
                                                                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                                            <label className="psm-switch delete">
                                                                                <input 
                                                                                    type="checkbox" 
                                                                                    checked={!!permState.delete} 
                                                                                    onChange={() => handleTogglePermission(scr.id, 'delete', !!permState.delete)}
                                                                                />
                                                                                <span className="psm-slider"></span>
                                                                            </label>
                                                                        </td>

                                                                        {/* Row Shortcut: All / Partial / Off */}
                                                                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                                            <button 
                                                                                onClick={() => handleRowQuickToggle(scr.id, isFull)}
                                                                                style={{
                                                                                    padding: '2px 7px',
                                                                                    fontSize: '0.68rem',
                                                                                    fontWeight: 700,
                                                                                    borderRadius: '5px',
                                                                                    cursor: 'pointer',
                                                                                    border: isFull ? '1px solid #86efac' : (isAny ? '1px solid #fde68a' : '1px solid #cbd5e1'),
                                                                                    background: isFull ? '#f0fdf4' : (isAny ? '#fffbeb' : '#f8fafc'),
                                                                                    color: isFull ? '#16a34a' : (isAny ? '#d97706' : '#64748b'),
                                                                                    transition: 'all 0.15s'
                                                                                }}
                                                                                title={isFull ? 'Clear permissions for this screen' : 'Grant all 4 permissions for this screen'}
                                                                            >
                                                                                {isFull ? 'All' : (isAny ? 'Partial' : 'Off')}
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', padding: '2rem', textAlign: 'center' }}>
                            <Lock size={44} style={{ marginBottom: '0.85rem', opacity: 0.3 }} />
                            <h3 style={{ margin: '0 0 0.35rem', color: '#0f172a', fontWeight: 800 }}>No Position Selected</h3>
                            <p style={{ margin: 0, fontSize: '0.82rem', maxWidth: '320px' }}>
                                Select a position from the left list to review and configure its module and action permissions.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

class PositionScreenMappingErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error("PositionScreenMapping error caught:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2.5rem', textAlign: 'center', background: 'white', borderRadius: '14px', margin: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: '#fef2f2', color: '#dc2626', marginBottom: '1rem' }}>
                        <Shield size={24} />
                    </div>
                    <h3 style={{ color: '#0f172a', fontWeight: 800, margin: '0 0 0.5rem' }}>Unable to load Position Screen Mapping</h3>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 1.25rem' }}>
                        {this.state.error?.message || 'An unexpected rendering issue occurred.'}
                    </p>
                    <button 
                        onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
                        style={{ padding: '0.5rem 1.2rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem' }}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

const PositionScreenMappingWithBoundary = () => (
    <PositionScreenMappingErrorBoundary>
        <PositionScreenMapping />
    </PositionScreenMappingErrorBoundary>
);

export default PositionScreenMappingWithBoundary;
