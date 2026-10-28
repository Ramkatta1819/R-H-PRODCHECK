import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    Briefcase,
    Users,
    Search,
    Filter,
    CheckCircle2,
    XCircle,
    UserCheck,
    UserX,
    UserPlus,
    Building2,
    Layers,
    LayoutGrid,
    ArrowRightLeft,
    ShieldAlert,
    RefreshCw,
    X,
    AlertCircle,
    Check,
    Lock,
    FolderKanban,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import api, { BACKEND_BASE_URL } from '../api';
import { useData } from '../context/DataContext';
import BavyaSpinner from '../components/BavyaSpinner';
import SearchableSelect from '../components/SearchableSelect';

const PositionEmployeeMapping = () => {
    const {
        offices = [],
        departments = [],
        sections = [],
        orgLevels = [],
        projects = [],
        showNotification,
        refreshPermissions,
        fetchDropdownData,
        canEdit
    } = useData();

    // Data states
    const [positions, setPositions] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loadingPositions, setLoadingPositions] = useState(true);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ASSIGNED, VACANT
    const [projectFilter, setProjectFilter] = useState('');
    const [levelFilter, setLevelFilter] = useState('');
    const [officeFilter, setOfficeFilter] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [sectionFilter, setSectionFilter] = useState('');

    // Mapping Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [targetPosition, setTargetPosition] = useState(null);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
    const [empSearchTerm, setEmpSearchTerm] = useState('');
    const [empTabFilter, setEmpTabFilter] = useState('UNASSIGNED'); // UNASSIGNED, ALL, ASSIGNED

    // Unassign Confirmation State
    const [unassignConfirmPosition, setUnassignConfirmPosition] = useState(null);

    // Tag Vacant Employee to Position Modal state
    const [tagEmployeeModal, setTagEmployeeModal] = useState({
        isOpen: false,
        employee: null,
        selectedPositionId: null,
        searchQuery: ''
    });

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    // Fetch positions using fast mapping-list endpoint
    const loadPositions = useCallback(async (isSilent = false) => {
        if (!isSilent) {
            setLoadingPositions(true);
        } else {
            setIsRefreshing(true);
        }
        try {
            let data = [];
            try {
                const res = await api.get('positions/mapping-list/');
                data = Array.isArray(res) ? res : (res?.results || []);
            } catch (fastErr) {
                console.warn('mapping-list endpoint failed, falling back to positions/?pagination=false:', fastErr);
                const res = await api.get('positions/?pagination=false');
                data = Array.isArray(res) ? res : (res?.results || []);
            }
            setPositions(data);
        } catch (err) {
            console.error('Failed to fetch positions:', err);
            showNotification('Failed to load positions', 'error');
        } finally {
            setLoadingPositions(false);
            setIsRefreshing(false);
        }
    }, [showNotification]);

    // Fetch employees for dropdown selector
    const loadEmployees = useCallback(async () => {
        setLoadingEmployees(true);
        try {
            const res = await api.get('employees/dropdown/');
            const data = Array.isArray(res) ? res : (res?.results || []);
            setEmployees(data);
        } catch (err) {
            console.error('Failed to fetch employees dropdown:', err);
            // Fallback to standard employees endpoint
            try {
                const fallbackRes = await api.get('employees/?pagination=false');
                const fallbackData = Array.isArray(fallbackRes) ? fallbackRes : (fallbackRes?.results || []);
                setEmployees(fallbackData);
            } catch (e) {
                console.error('Fallback employee fetch also failed:', e);
            }
        } finally {
            setLoadingEmployees(false);
        }
    }, []);

    useEffect(() => {
        loadPositions();
        loadEmployees();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Helpers
    const getPhotoUrl = (photo) => {
        if (!photo || typeof photo !== 'string') return null;
        if (photo.startsWith('http') || photo.startsWith('data:image')) return photo;
        const clean = photo.startsWith('/') ? photo : `/${photo}`;
        return `${BACKEND_BASE_URL}${clean}`;
    };

    // Filter positions
    const filteredPositions = useMemo(() => {
        return positions.filter(pos => {
            // Text Search
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const posName = (pos.name || '').toLowerCase();
                const posCode = (pos.code || '').toLowerCase();
                const roleName = (pos.role_name || '').toLowerCase();
                const officeName = (pos.office_name || '').toLowerCase();
                const projName = (pos.project_name || '').toLowerCase();
                const repName = (pos.reporting_to_name || '').toLowerCase();
                const repEmpDetails = (pos.reporting_to || []).map(r => `${r.name || ''} ${r.employee_name || ''} ${r.employee_code || ''}`).join(' ').toLowerCase();
                const assignedEmp = pos.assigned_employee?.name || pos.assigned_employees_details?.[0]?.name || '';
                const assignedCode = pos.assigned_employees_details?.[0]?.code || '';

                const matchesSearch =
                    posName.includes(term) ||
                    posCode.includes(term) ||
                    roleName.includes(term) ||
                    officeName.includes(term) ||
                    projName.includes(term) ||
                    repName.includes(term) ||
                    repEmpDetails.includes(term) ||
                    assignedEmp.toLowerCase().includes(term) ||
                    assignedCode.toLowerCase().includes(term);

                if (!matchesSearch) return false;
            }

            // Status Filter
            const hasEmployee = Boolean(pos.assigned_employee || (pos.assigned_employees_details && pos.assigned_employees_details.length > 0));
            if (statusFilter === 'ASSIGNED' && !hasEmployee) return false;
            if (statusFilter === 'VACANT' && hasEmployee) return false;

            // Project Filter
            if (projectFilter && String(pos.project_id || pos.project) !== String(projectFilter)) return false;

            // Hierarchy Filters
            if (levelFilter && String(pos.office_level_id || pos.level_id || pos.level) !== String(levelFilter)) return false;
            if (officeFilter && String(pos.office_id || pos.office) !== String(officeFilter)) return false;
            if (deptFilter && String(pos.department_id || pos.department) !== String(deptFilter)) return false;
            if (sectionFilter && String(pos.section_id || pos.section) !== String(sectionFilter)) return false;

            return true;
        });
    }, [positions, searchTerm, statusFilter, projectFilter, levelFilter, officeFilter, deptFilter, sectionFilter]);

    // Smart Cascading Options for Hierarchy Filters
    const availableLevels = useMemo(() => {
        if (!projectFilter) return orgLevels || [];
        const projectLevelIds = new Set(
            positions
                .filter(p => String(p.project_id || p.project) === String(projectFilter) && p.office_level_id)
                .map(p => String(p.office_level_id))
        );
        return (orgLevels || []).filter(l => projectLevelIds.has(String(l.id)));
    }, [orgLevels, positions, projectFilter]);

    const availableOffices = useMemo(() => {
        let list = offices || [];
        if (projectFilter) {
            const projectOfficeIds = new Set(
                positions
                    .filter(p => String(p.project_id || p.project) === String(projectFilter) && p.office_id)
                    .map(p => String(p.office_id))
            );
            list = list.filter(o => projectOfficeIds.has(String(o.id)));
        }
        if (levelFilter) {
            list = list.filter(o => String(o.level_id || o.level?.id || o.level) === String(levelFilter));
        }
        return list;
    }, [offices, positions, projectFilter, levelFilter]);

    const availableDepartments = useMemo(() => {
        let list = departments || [];
        if (officeFilter) {
            list = list.filter(d => String(d.office || d.office_id) === String(officeFilter));
        } else if (projectFilter) {
            const projectDeptIds = new Set(
                positions
                    .filter(p => String(p.project_id || p.project) === String(projectFilter) && p.department_id)
                    .map(p => String(p.department_id))
            );
            list = list.filter(d => projectDeptIds.has(String(d.id)));
        }
        return list;
    }, [departments, positions, officeFilter, projectFilter]);

    const availableSections = useMemo(() => {
        let list = sections || [];
        if (deptFilter) {
            list = list.filter(s => String(s.department || s.department_id) === String(deptFilter));
        } else if (projectFilter) {
            const projectSecIds = new Set(
                positions
                    .filter(p => String(p.project_id || p.project) === String(projectFilter) && p.section_id)
                    .map(p => String(p.section_id))
            );
            list = list.filter(s => projectSecIds.has(String(s.id)));
        }
        return list;
    }, [sections, positions, deptFilter, projectFilter]);

    // Auto-clean child filters when parent filter changes and child is no longer valid
    useEffect(() => {
        if (levelFilter && availableLevels.length > 0) {
            if (!availableLevels.some(l => String(l.id) === String(levelFilter))) {
                setLevelFilter('');
            }
        }
    }, [availableLevels, levelFilter]);

    useEffect(() => {
        if (officeFilter && availableOffices.length > 0) {
            if (!availableOffices.some(o => String(o.id) === String(officeFilter))) {
                setOfficeFilter('');
                setDeptFilter('');
                setSectionFilter('');
            }
        }
    }, [availableOffices, officeFilter]);

    useEffect(() => {
        if (deptFilter && availableDepartments.length > 0) {
            if (!availableDepartments.some(d => String(d.id) === String(deptFilter))) {
                setDeptFilter('');
                setSectionFilter('');
            }
        }
    }, [availableDepartments, deptFilter]);

    useEffect(() => {
        if (sectionFilter && availableSections.length > 0) {
            if (!availableSections.some(s => String(s.id) === String(sectionFilter))) {
                setSectionFilter('');
            }
        }
    }, [availableSections, sectionFilter]);

    // Reset all filters function
    const handleResetAllFilters = useCallback(() => {
        setStatusFilter('ALL');
        setProjectFilter('');
        setLevelFilter('');
        setOfficeFilter('');
        setDeptFilter('');
        setSectionFilter('');
        setSearchTerm('');
        setCurrentPage(1);
    }, []);

    // Active filters list for display & one-click pill dismissal
    const activeFilterList = useMemo(() => {
        const list = [];
        if (projectFilter) {
            const proj = projects.find(p => String(p.id) === String(projectFilter));
            list.push({
                id: 'project',
                label: `Project: ${proj?.name || projectFilter}`,
                onClear: () => setProjectFilter('')
            });
        }
        if (levelFilter) {
            const lvl = orgLevels.find(l => String(l.id) === String(levelFilter));
            list.push({
                id: 'level',
                label: `Level: ${lvl?.name || levelFilter}`,
                onClear: () => setLevelFilter('')
            });
        }
        if (officeFilter) {
            const off = offices.find(o => String(o.id) === String(officeFilter));
            list.push({
                id: 'office',
                label: `Office: ${off?.name || officeFilter}`,
                onClear: () => setOfficeFilter('')
            });
        }
        if (deptFilter) {
            const d = departments.find(dep => String(dep.id) === String(deptFilter));
            list.push({
                id: 'dept',
                label: `Dept: ${d?.name || deptFilter}`,
                onClear: () => setDeptFilter('')
            });
        }
        if (sectionFilter) {
            const s = sections.find(sec => String(sec.id) === String(sectionFilter));
            list.push({
                id: 'section',
                label: `Section: ${s?.name || sectionFilter}`,
                onClear: () => setSectionFilter('')
            });
        }
        if (searchTerm.trim()) {
            list.push({
                id: 'search',
                label: `Search: "${searchTerm}"`,
                onClear: () => setSearchTerm('')
            });
        }
        return list;
    }, [statusFilter, projectFilter, levelFilter, officeFilter, deptFilter, sectionFilter, searchTerm, projects, orgLevels, offices, departments, sections]);

    // Reset pagination to page 1 on filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, projectFilter, levelFilter, officeFilter, deptFilter, sectionFilter]);

    // Paginated list
    const totalPages = Math.max(1, Math.ceil(filteredPositions.length / pageSize));
    const paginatedPositions = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredPositions.slice(start, start + pageSize);
    }, [filteredPositions, currentPage, pageSize]);

    // Metrics
    const stats = useMemo(() => {
        const total = positions.length;
        let assigned = 0;
        positions.forEach(p => {
            if (p.assigned_employee || (p.assigned_employees_details && p.assigned_employees_details.length > 0)) {
                assigned++;
            }
        });
        const vacant = total - assigned;
        const unassignedEmps = employees.filter(e => !e.positions_details || e.positions_details.length === 0).length;

        return {
            total,
            assigned,
            vacant,
            totalEmployees: employees.length,
            unassignedEmployees: unassignedEmps
        };
    }, [positions, employees]);

    // Vacant positions available for assignment
    const vacantPositions = useMemo(() => {
        return positions.filter(p => !p.assigned_employee && (!p.assigned_employees_details || p.assigned_employees_details.length === 0));
    }, [positions]);

    // Vacant / Unassigned employees list
    const filteredUnassignedEmployees = useMemo(() => {
        const unassigned = employees.filter(e => !e.positions_details || e.positions_details.length === 0);
        if (!searchTerm.trim()) return unassigned;
        const term = searchTerm.toLowerCase();
        return unassigned.filter(emp => {
            const name = (emp.name || '').toLowerCase();
            const code = (emp.employee_code || '').toLowerCase();
            const email = (emp.email || '').toLowerCase();
            const phone = (emp.phone || '').toLowerCase();
            return name.includes(term) || code.includes(term) || email.includes(term) || phone.includes(term);
        });
    }, [employees, searchTerm]);

    // Filter employees in the tagging modal
    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => {
            const posCount = emp.positions_details?.length || 0;
            if (empTabFilter === 'UNASSIGNED' && posCount > 0) return false;
            if (empTabFilter === 'ASSIGNED' && posCount === 0) return false;

            if (empSearchTerm.trim()) {
                const term = empSearchTerm.toLowerCase();
                const name = (emp.name || '').toLowerCase();
                const code = (emp.employee_code || '').toLowerCase();
                const email = (emp.email || '').toLowerCase();
                if (!name.includes(term) && !code.includes(term) && !email.includes(term)) return false;
            }
            return true;
        });
    }, [employees, empTabFilter, empSearchTerm]);

    // Limit displayed employees to 60 to guarantee instantaneous 0ms popup rendering
    const displayedEmployees = useMemo(() => {
        return filteredEmployees.slice(0, 60);
    }, [filteredEmployees]);

    // ESC key handler for modals
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsModalOpen(false);
                setUnassignConfirmPosition(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Open Assign Modal
    const openAssignModal = (pos) => {
        if (!canEdit('position-employee-mapping')) {
            showNotification('You do not have permission to modify position assignments', 'error');
            return;
        }
        setTargetPosition(pos);
        const currentEmp = pos.assigned_employee || pos.assigned_employees_details?.[0];
        const currentEmpId = typeof currentEmp === 'object' ? currentEmp?.id : currentEmp;
        setSelectedEmployeeId(currentEmpId ? Number(currentEmpId) : null);
        setEmpSearchTerm('');
        // Default to Unassigned employees tab if position is vacant, else show all
        setEmpTabFilter(currentEmp ? 'ALL' : 'UNASSIGNED');
        setIsModalOpen(true);
    };

    // Submit Assignment
    const handleSaveAssignment = async () => {
        if (!canEdit('position-employee-mapping')) {
            showNotification('You do not have permission to modify position assignments', 'error');
            return;
        }
        if (!targetPosition) return;
        if (!selectedEmployeeId) {
            showNotification('Please select an employee to assign', 'error');
            return;
        }

        setActionLoading(true);
        try {
            const res = await api.post(`positions/${targetPosition.id}/assign-employee/`, {
                employee_id: selectedEmployeeId
            });

            showNotification(res.message || 'Position assignment updated successfully!', 'success');
            setIsModalOpen(false);

            // Instant Local State Updates for seamless responsiveness
            setPositions(prev => prev.map(p => {
                if (p.id === targetPosition.id) {
                    return res.position || {
                        ...p,
                        assigned_employee: res.position?.assigned_employee,
                        assigned_employees_details: res.position?.assigned_employees_details,
                        is_vacant: false
                    };
                }
                return p;
            }));

            // Refresh full lists in background
            loadPositions();
            loadEmployees();
            if (refreshPermissions) refreshPermissions();
            if (fetchDropdownData) fetchDropdownData();
        } catch (err) {
            console.error('Failed to assign position:', err);
            const msg = err?.error || err?.detail || 'Failed to update position assignment';
            showNotification(msg, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // Submit Unassign
    const handleConfirmUnassign = async () => {
        if (!canEdit('position-employee-mapping')) {
            showNotification('You do not have permission to modify position assignments', 'error');
            return;
        }
        if (!unassignConfirmPosition) return;

        setActionLoading(true);
        try {
            const res = await api.post(`positions/${unassignConfirmPosition.id}/assign-employee/`, {
                employee_id: null
            });

            showNotification(res.message || 'Position unassigned successfully (now vacant).', 'success');
            setUnassignConfirmPosition(null);

            // Update local state
            setPositions(prev => prev.map(p => {
                if (p.id === unassignConfirmPosition.id) {
                    return {
                        ...p,
                        assigned_employee: null,
                        assigned_employees_details: [],
                        is_vacant: true
                    };
                }
                return p;
            }));

            loadPositions();
            loadEmployees();
            if (refreshPermissions) refreshPermissions();
        } catch (err) {
            console.error('Failed to unassign position:', err);
            showNotification('Failed to unassign position', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // Tag Vacant Employee to Position Handler
    const handleConfirmTagEmployeeToPosition = async () => {
        if (!canEdit('position-employee-mapping')) {
            showNotification('You do not have permission to modify position assignments', 'error');
            return;
        }
        if (!tagEmployeeModal.employee || !tagEmployeeModal.selectedPositionId) {
            showNotification('Please select a vacant position', 'error');
            return;
        }

        setActionLoading(true);
        try {
            const res = await api.post(`positions/${tagEmployeeModal.selectedPositionId}/assign-employee/`, {
                employee_id: tagEmployeeModal.employee.id
            });

            showNotification(res.message || `Successfully assigned ${tagEmployeeModal.employee.name} to position!`, 'success');
            setTagEmployeeModal({ isOpen: false, employee: null, selectedPositionId: null, searchQuery: '' });

            loadPositions(true);
            loadEmployees();
            if (refreshPermissions) refreshPermissions();
            if (fetchDropdownData) fetchDropdownData();
        } catch (err) {
            console.error('Failed to assign position:', err);
            const msg = err?.error || err?.detail || 'Failed to update position assignment';
            showNotification(msg, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // Initial load: show clean, centered BavyaSpinner matching other HCM pages
    if (loadingPositions && positions.length === 0) {
        return (
            <div className="fade-in" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '65vh',
                width: '100%',
                padding: '2rem'
            }}>
                <BavyaSpinner label="Loading Position & Employee Mappings..." />
            </div>
        );
    }

    return (
        <div className="fade-in" style={{ padding: '0.25rem 0', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Top Bar with Breadcrumbs matching reference (https://one.bhspl.in/tgs) */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(90deg, #2a0410 0%, #3d0517 100%)',
                padding: '0.65rem 1.25rem',
                borderRadius: '12px',
                marginBottom: '0.85rem',
                color: 'white',
                boxShadow: '0 4px 14px rgba(42, 4, 16, 0.25)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                    }}>
                        <Layers size={18} color="white" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', fontWeight: 600 }}>
                        <span style={{ color: '#fda4af', fontWeight: 700, letterSpacing: '0.04em' }}>ONE HCM</span>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>&gt;</span>
                        <span style={{ color: 'white', fontWeight: 800 }}>Position to Employee</span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={() => {
                            loadPositions();
                            loadEmployees();
                        }}
                        disabled={loadingPositions || isRefreshing || loadingEmployees}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '0.4rem 0.85rem',
                            background: 'rgba(255, 255, 255, 0.12)',
                            border: '1px solid rgba(255, 255, 255, 0.18)',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            color: 'white',
                            cursor: (loadingPositions || isRefreshing) ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s'
                        }}
                        title="Refresh positions and employees without losing table view"
                    >
                        <RefreshCw size={13} className={isRefreshing ? 'inner-spin' : ''} />
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {/* KPI Summary Cards (Interactive Filters) - 4 Vibrant Colored Cards matching reference (one.bhspl.in/tgs) */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: '0.75rem',
                marginBottom: '0.85rem'
            }}>
                {/* 1. Emerald Green Card: Total Positions */}
                <div
                    onClick={() => setStatusFilter('ALL')}
                    style={{
                        background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                        padding: '0.85rem 1.1rem',
                        borderRadius: '14px',
                        color: 'white',
                        boxShadow: statusFilter === 'ALL' ? '0 8px 20px rgba(5, 150, 105, 0.35), 0 0 0 3px #059669' : '0 6px 16px rgba(5, 150, 105, 0.25)',
                        transform: statusFilter === 'ALL' ? 'translateY(-2px)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxSizing: 'border-box',
                        minHeight: '94px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                    }}
                    title="Click to show All Positions"
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.88)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                TOTAL POSITIONS
                            </div>
                            <div style={{ fontSize: '1.55rem', fontWeight: 900, color: 'white', marginTop: '0.35rem', lineHeight: 1.1 }}>
                                {stats.total}
                            </div>
                        </div>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            padding: '8px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Briefcase size={18} />
                        </div>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.9)', marginTop: '0.45rem', fontWeight: 600 }}>
                        ↗ Active organizational slots
                    </div>
                </div>

                {/* 2. Amber Orange Card: Occupied / Assigned Positions */}
                <div
                    onClick={() => setStatusFilter('ASSIGNED')}
                    style={{
                        background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
                        padding: '0.85rem 1.1rem',
                        borderRadius: '14px',
                        color: 'white',
                        boxShadow: statusFilter === 'ASSIGNED' ? '0 8px 20px rgba(217, 119, 6, 0.35), 0 0 0 3px #d97706' : '0 6px 16px rgba(217, 119, 6, 0.25)',
                        transform: statusFilter === 'ASSIGNED' ? 'translateY(-2px)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxSizing: 'border-box',
                        minHeight: '94px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                    }}
                    title="Click to filter to Assigned Positions"
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.88)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                OCCUPIED POSITIONS
                            </div>
                            <div style={{ fontSize: '1.55rem', fontWeight: 900, color: 'white', marginTop: '0.35rem', lineHeight: 1.1 }}>
                                {stats.assigned}
                            </div>
                        </div>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            padding: '8px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <UserCheck size={18} />
                        </div>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.9)', marginTop: '0.45rem', fontWeight: 600 }}>
                        ● {stats.total > 0 ? `${Math.round((stats.assigned / stats.total) * 100)}% active staff assigned` : '0%'}
                    </div>
                </div>

                {/* 3. Cyan Blue Card: Vacant Positions */}
                <div
                    onClick={() => setStatusFilter('VACANT')}
                    style={{
                        background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)',
                        padding: '0.85rem 1.1rem',
                        borderRadius: '14px',
                        color: 'white',
                        boxShadow: statusFilter === 'VACANT' ? '0 8px 20px rgba(2, 132, 199, 0.35), 0 0 0 3px #0284c7' : '0 6px 16px rgba(2, 132, 199, 0.25)',
                        transform: statusFilter === 'VACANT' ? 'translateY(-2px)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxSizing: 'border-box',
                        minHeight: '94px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                    }}
                    title="Click to filter to Vacant Positions ready to tag"
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.88)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                VACANT POSITIONS
                            </div>
                            <div style={{ fontSize: '1.55rem', fontWeight: 900, color: 'white', marginTop: '0.35rem', lineHeight: 1.1 }}>
                                {stats.vacant}
                            </div>
                        </div>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            padding: '8px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <AlertCircle size={18} />
                        </div>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.9)', marginTop: '0.45rem', fontWeight: 600 }}>
                        ● Ready for employee allocation
                    </div>
                </div>

                {/* 4. Rose Red Card: Vacant Employees */}
                <div
                    onClick={() => setStatusFilter('UNASSIGNED_EMPLOYEES')}
                    style={{
                        background: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)',
                        padding: '0.85rem 1.1rem',
                        borderRadius: '14px',
                        color: 'white',
                        boxShadow: statusFilter === 'UNASSIGNED_EMPLOYEES' ? '0 8px 20px rgba(225, 29, 72, 0.35), 0 0 0 3px #e11d48' : '0 6px 16px rgba(225, 29, 72, 0.25)',
                        transform: statusFilter === 'UNASSIGNED_EMPLOYEES' ? 'translateY(-2px)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxSizing: 'border-box',
                        minHeight: '94px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                    }}
                    title="Click to view Vacant / Unassigned Employees"
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.88)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                VACANT EMPLOYEES
                            </div>
                            <div style={{ fontSize: '1.55rem', fontWeight: 900, color: 'white', marginTop: '0.35rem', lineHeight: 1.1 }}>
                                {stats.unassignedEmployees}
                            </div>
                        </div>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            padding: '8px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Users size={18} />
                        </div>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.9)', marginTop: '0.45rem', fontWeight: 600 }}>
                        ● Staff not tagged to any position
                    </div>
                </div>
            </div>

            {/* Main Filters Card */}
            <div style={{
                background: 'white',
                padding: '0.85rem 1.15rem',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                marginBottom: '0.75rem',
                boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
            }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Status Tabs */}
                    <div style={{
                        display: 'flex',
                        background: '#f1f5f9',
                        padding: '3px',
                        borderRadius: '10px',
                        gap: '3px'
                    }}>
                        {[
                            { id: 'ALL', label: `All Positions (${stats.total})` },
                            { id: 'ASSIGNED', label: `Occupied (${stats.assigned})` },
                            { id: 'VACANT', label: `Vacant Positions (${stats.vacant})` },
                            { id: 'UNASSIGNED_EMPLOYEES', label: `Vacant Employees (${stats.unassignedEmployees})` }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setStatusFilter(tab.id)}
                                style={{
                                    border: 'none',
                                    padding: '0.42rem 0.85rem',
                                    borderRadius: '7px',
                                    fontWeight: 700,
                                    fontSize: '0.78rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                    background: statusFilter === tab.id ? 'white' : 'transparent',
                                    color: statusFilter === tab.id ? (tab.id === 'UNASSIGNED_EMPLOYEES' ? '#e11d48' : '#0f172a') : '#64748b',
                                    boxShadow: statusFilter === tab.id ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Search & Active Filter Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '280px', maxWidth: '520px' }}>
                        <div style={{ flex: '1', position: 'relative' }}>
                            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="text"
                                placeholder={statusFilter === 'UNASSIGNED_EMPLOYEES' ? "Search vacant employee name, code, phone, or email..." : "Search position name, code, role, or assigned employee..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.55rem 0.9rem 0.55rem 2.4rem',
                                    borderRadius: '9px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '0.82rem',
                                    outline: 'none',
                                    background: '#f8fafc',
                                    boxSizing: 'border-box'
                                }}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    style={{
                                        position: 'absolute',
                                        right: '10px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#94a3b8',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <X size={15} />
                                </button>
                            )}
                        </div>

                        {activeFilterList.length > 0 && (
                            <button
                                type="button"
                                onClick={handleResetAllFilters}
                                style={{
                                    padding: '0.52rem 0.85rem',
                                    borderRadius: '9px',
                                    border: '1px solid #fecaca',
                                    background: '#fef2f2',
                                    color: '#dc2626',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                    transition: 'all 0.15s'
                                }}
                                title="Reset all active filters"
                            >
                                <RefreshCw size={12} /> Reset ({activeFilterList.length})
                            </button>
                        )}
                    </div>
                </div>

                {/* Hierarchy Dropdown Filter Row - STABLE 5 EQUAL COLUMNS - NEVER RESIZES OR SQUEEZES */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                    gap: '0.65rem',
                    marginTop: '0.65rem',
                    paddingTop: '0.65rem',
                    borderTop: '1px solid #f1f5f9',
                    alignItems: 'flex-end'
                }}>
                    <div style={{ minWidth: 0 }}>
                        <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '3px', display: 'block' }}>
                            Level
                        </label>
                        <SearchableSelect
                            options={availableLevels}
                            value={levelFilter}
                            onChange={(e) => {
                                setLevelFilter(e.target.value);
                                setOfficeFilter('');
                                setDeptFilter('');
                                setSectionFilter('');
                            }}
                            placeholder="All Levels"
                        />
                    </div>

                    <div style={{ minWidth: 0 }}>
                        <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '3px', display: 'block' }}>
                            Project
                        </label>
                        <SearchableSelect
                            options={projects || []}
                            value={projectFilter}
                            onChange={(e) => {
                                setProjectFilter(e.target.value);
                            }}
                            placeholder="All Projects"
                        />
                    </div>

                    <div style={{ minWidth: 0 }}>
                        <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '3px', display: 'block' }}>
                            Office
                        </label>
                        <SearchableSelect
                            options={availableOffices}
                            value={officeFilter}
                            onChange={(e) => {
                                setOfficeFilter(e.target.value);
                                setDeptFilter('');
                                setSectionFilter('');
                            }}
                            placeholder="All Offices"
                        />
                    </div>

                    <div style={{ minWidth: 0 }}>
                        <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '3px', display: 'block' }}>
                            Department
                        </label>
                        <SearchableSelect
                            options={availableDepartments}
                            value={deptFilter}
                            onChange={(e) => {
                                setDeptFilter(e.target.value);
                                setSectionFilter('');
                            }}
                            placeholder="All Departments"
                        />
                    </div>

                    <div style={{ minWidth: 0 }}>
                        <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '3px', display: 'block' }}>
                            Section
                        </label>
                        <SearchableSelect
                            options={availableSections}
                            value={sectionFilter}
                            onChange={(e) => setSectionFilter(e.target.value)}
                            placeholder="All Sections"
                        />
                    </div>
                </div>
            </div>

            {/* Position Table */}
            <div style={{
                background: 'white',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}>
                <div style={{
                    padding: '0.75rem 1.25rem',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px'
                }}>
                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {statusFilter === 'UNASSIGNED_EMPLOYEES' ? 'Vacant Employees List' : 'Positions List'}
                        <span style={{
                            color: (statusFilter === 'UNASSIGNED_EMPLOYEES' ? filteredUnassignedEmployees.length : filteredPositions.length) === 0 ? '#ef4444' : '#0369a1',
                            fontWeight: 800,
                            background: (statusFilter === 'UNASSIGNED_EMPLOYEES' ? filteredUnassignedEmployees.length : filteredPositions.length) === 0 ? '#fee2e2' : '#e0f2fe',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.78rem'
                        }}>
                            ({statusFilter === 'UNASSIGNED_EMPLOYEES' ? filteredUnassignedEmployees.length : filteredPositions.length})
                        </span>
                        {(statusFilter === 'UNASSIGNED_EMPLOYEES' ? filteredUnassignedEmployees.length : filteredPositions.length) === 0 && (
                            <span style={{ fontSize: '0.72rem', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                                0 Matching Records
                            </span>
                        )}
                        {isRefreshing && (
                            <span style={{ fontSize: '0.72rem', color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                <RefreshCw size={11} className="inner-spin" /> Syncing updates...
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {filteredPositions.length === 0 && activeFilterList.length > 0 && (
                            <button
                                type="button"
                                onClick={handleResetAllFilters}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '0.35rem 0.75rem',
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '7px',
                                    fontWeight: 700,
                                    fontSize: '0.74rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.25)'
                                }}
                            >
                                <RefreshCw size={11} /> Clear Filters ({positions.length})
                            </button>
                        )}
                        <div style={{ fontSize: '0.76rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Lock size={12} style={{ color: '#0ea5e9' }} /> Single Employee per Position Enforced
                        </div>
                    </div>
                </div>

                {isRefreshing && (
                    <div style={{
                        height: '3px',
                        width: '100%',
                        background: 'linear-gradient(90deg, #0ea5e9, #3b82f6, #0ea5e9)',
                        backgroundSize: '200% 100%',
                        animation: 'pulse 1s infinite'
                    }} />
                )}

                {loadingPositions && positions.length === 0 ? (
                    <div style={{ padding: '1.5rem' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            padding: '1rem',
                            background: '#f8fafc',
                            borderRadius: '12px',
                            marginBottom: '1.25rem',
                            border: '1px solid #e2e8f0'
                        }}>
                            <div className="inner-spin" style={{ width: '18px', height: '18px', border: '2.5px solid #cbd5e1', borderTopColor: '#0ea5e9', borderRadius: '50%' }} />
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0284c7' }}>
                                Loading 4,300+ positions & assignments...
                            </span>
                        </div>
                        {/* Shimmering Skeleton Rows */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '14px 18px',
                                    background: '#f8fafc',
                                    borderRadius: '12px',
                                    border: '1px solid #f1f5f9',
                                    gap: '1.5rem',
                                    opacity: 0.8
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 2 }}>
                                        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#e2e8f0' }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ width: '65%', height: '13px', background: '#cbd5e1', borderRadius: '4px', marginBottom: '6px' }} />
                                            <div style={{ width: '35%', height: '10px', background: '#e2e8f0', borderRadius: '4px' }} />
                                        </div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ width: '70%', height: '12px', background: '#cbd5e1', borderRadius: '4px', marginBottom: '4px' }} />
                                        <div style={{ width: '50%', height: '10px', background: '#e2e8f0', borderRadius: '4px' }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ width: '60%', height: '12px', background: '#cbd5e1', borderRadius: '4px', marginBottom: '4px' }} />
                                        <div style={{ width: '45px', height: '16px', background: '#e0f2fe', borderRadius: '6px' }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ width: '75%', height: '12px', background: '#e2e8f0', borderRadius: '4px' }} />
                                    </div>
                                    <div style={{ width: '105px', height: '32px', background: '#e2e8f0', borderRadius: '8px' }} />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : statusFilter === 'UNASSIGNED_EMPLOYEES' ? (
                    /* UNASSIGNED / VACANT EMPLOYEES TABLE - 5 COLUMNS WITH RICH LAYOUT & FULL FOOTER BAR */
                    <>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <th style={{ padding: '14px 20px', fontWeight: 800, width: '28%' }}>Employee Name & Code</th>
                                        <th style={{ padding: '14px 16px', fontWeight: 800, width: '24%' }}>Contact Details</th>
                                        <th style={{ padding: '14px 16px', fontWeight: 800, width: '18%' }}>Designation / Role</th>
                                        <th style={{ padding: '14px 16px', fontWeight: 800, width: '18%' }}>Allocation Status</th>
                                        <th style={{ padding: '14px 20px', fontWeight: 800, width: '12%', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUnassignedEmployees.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ padding: '4rem 1rem', textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                                                    No Vacant Employees Found
                                                </div>
                                                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '6px' }}>
                                                    {searchTerm ? 'No unassigned employee matches your search term.' : 'All staff are currently assigned to active organizational positions!'}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUnassignedEmployees.map(emp => (
                                            <tr
                                                key={emp.id}
                                                style={{
                                                    borderBottom: '1px solid #f1f5f9',
                                                    background: '#ffffff',
                                                    transition: 'background 0.15s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#fff5f7'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                                            >
                                                {/* 1. Employee Name & Code */}
                                                <td style={{ padding: '16px 20px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{
                                                            width: '42px',
                                                            height: '42px',
                                                            borderRadius: '12px',
                                                            background: '#fff1f2',
                                                            color: '#e11d48',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: 800,
                                                            fontSize: '0.95rem',
                                                            flexShrink: 0,
                                                            border: '1.5px solid #fecdd3',
                                                            boxShadow: '0 2px 4px rgba(225, 29, 72, 0.08)'
                                                        }}>
                                                            {emp.photo ? (
                                                                <img
                                                                    src={getPhotoUrl(emp.photo)}
                                                                    alt=""
                                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '11px' }}
                                                                />
                                                            ) : (
                                                                emp.name?.[0]?.toUpperCase() || 'E'
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem' }}>
                                                                {emp.name}
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                                                                <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', color: '#475569' }}>
                                                                    {emp.employee_code}
                                                                </span>
                                                                <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700 }}>
                                                                    ● {emp.status || 'Active'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* 2. Contact Details */}
                                                <td style={{ padding: '16px 16px' }}>
                                                    <div style={{ fontSize: '0.84rem', color: '#334155', fontWeight: 600 }}>
                                                        {emp.email || 'No email provided'}
                                                    </div>
                                                    <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '3px' }}>
                                                        Phone: {emp.phone || '--'}
                                                    </div>
                                                </td>

                                                {/* 3. Designation / Role */}
                                                <td style={{ padding: '16px 16px' }}>
                                                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1e293b' }}>
                                                        {emp.designation || emp.role_name || emp.role || 'Unassigned Role'}
                                                    </div>
                                                    <div style={{ marginTop: '3px' }}>
                                                        <span style={{
                                                            fontSize: '0.7rem',
                                                            fontWeight: 600,
                                                            color: '#64748b',
                                                            background: '#f8fafc',
                                                            border: '1px solid #e2e8f0',
                                                            padding: '1px 6px',
                                                            borderRadius: '5px'
                                                        }}>
                                                            Awaiting Position Tag
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* 4. Allocation Status */}
                                                <td style={{ padding: '16px 16px' }}>
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        padding: '4px 10px',
                                                        borderRadius: '8px',
                                                        background: '#fef2f2',
                                                        color: '#be123c',
                                                        border: '1px solid #fecdd3',
                                                        fontSize: '0.76rem',
                                                        fontWeight: 700
                                                    }}>
                                                        <AlertCircle size={13} />
                                                        Vacant (No Position Tagged)
                                                    </span>
                                                </td>

                                                {/* 5. Actions */}
                                                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => setTagEmployeeModal({
                                                            isOpen: true,
                                                            employee: emp,
                                                            selectedPositionId: null,
                                                            searchQuery: ''
                                                        })}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            padding: '7px 14px',
                                                            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            color: 'white',
                                                            fontWeight: 700,
                                                            fontSize: '0.8rem',
                                                            cursor: 'pointer',
                                                            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                                                            transition: 'all 0.15s'
                                                        }}
                                                    >
                                                        <UserPlus size={14} /> Tag to Position
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Vacant Employees Summary Footer */}
                        <div style={{
                            padding: '1rem 1.5rem',
                            background: '#f8fafc',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '1rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                                    Showing <strong>{filteredUnassignedEmployees.length}</strong> of{' '}
                                    <strong>{stats.unassignedEmployees}</strong> vacant staff ready for position allocation
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                    fontSize: '0.74rem',
                                    color: '#0284c7',
                                    background: '#e0f2fe',
                                    border: '1px solid #bae6fd',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                }}>
                                    <Lock size={12} /> Single Employee Per Position Enforced
                                </span>
                            </div>
                        </div>
                    </>
                ) : filteredPositions.length === 0 ? (
                    <div style={{ padding: '2rem 1.5rem', textAlign: 'center', background: '#fafbfc' }}>
                        <div style={{
                            width: '50px',
                            height: '50px',
                            borderRadius: '14px',
                            background: '#fef2f2',
                            border: '1px solid #fee2e2',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 0.75rem',
                            color: '#ef4444'
                        }}>
                            <Search size={22} />
                        </div>
                        <h3 style={{ margin: 0, color: '#0f172a', fontWeight: 800, fontSize: '1.1rem' }}>
                            No Positions Found
                        </h3>
                        <p style={{ margin: '0.35rem auto 1rem', color: '#64748b', fontSize: '0.84rem', maxWidth: '520px', lineHeight: 1.45 }}>
                            No positions match your currently selected filters. Remove one or more filter tags below or reset to show all {positions.length} positions.
                        </p>

                        {/* Dismissible Filter Badges */}
                        {activeFilterList.length > 0 && (
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                                gap: '6px',
                                marginBottom: '1.25rem',
                                maxWidth: '650px',
                                margin: '0 auto 1.25rem'
                            }}>
                                {activeFilterList.map(item => (
                                    <span
                                        key={item.id}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '0.28rem 0.65rem',
                                            background: 'white',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '20px',
                                            fontSize: '0.74rem',
                                            color: '#334155',
                                            fontWeight: 600,
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                        }}
                                    >
                                        {item.label}
                                        <button
                                            type="button"
                                            onClick={item.onClear}
                                            title={`Remove ${item.label} filter`}
                                            style={{
                                                border: 'none',
                                                background: '#fee2e2',
                                                color: '#ef4444',
                                                borderRadius: '50%',
                                                width: '16px',
                                                height: '16px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                padding: 0
                                            }}
                                        >
                                            <X size={10} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                onClick={handleResetAllFilters}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '7px',
                                    padding: '0.55rem 1.25rem',
                                    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.82rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(14, 165, 233, 0.25)',
                                    transition: 'all 0.15s'
                                }}
                            >
                                <RefreshCw size={13} /> Reset All Filters (Show {positions.length} Positions)
                            </button>

                            {(levelFilter || officeFilter || deptFilter || sectionFilter) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setLevelFilter('');
                                        setOfficeFilter('');
                                        setDeptFilter('');
                                        setSectionFilter('');
                                    }}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '0.55rem 1rem',
                                        background: 'white',
                                        color: '#475569',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '8px',
                                        fontWeight: 600,
                                        fontSize: '0.82rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Clear Hierarchy Only
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <th style={{ padding: '12px 20px', fontWeight: 800 }}>Position Name & Code</th>
                                        <th style={{ padding: '12px 16px', fontWeight: 800 }}>Office & Department</th>
                                        <th style={{ padding: '12px 16px', fontWeight: 800 }}>Role / Level</th>
                                        <th style={{ padding: '12px 16px', fontWeight: 800 }}>Currently Tagged Employee</th>
                                        <th style={{ padding: '12px 20px', fontWeight: 800, textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedPositions.map(pos => {
                                        const assignedEmp = pos.assigned_employee || (pos.assigned_employees_details && pos.assigned_employees_details[0]);
                                        const isAssigned = Boolean(assignedEmp);

                                        return (
                                            <tr
                                                key={pos.id}
                                                style={{
                                                    borderBottom: '1px solid #f1f5f9',
                                                    transition: 'background 0.15s',
                                                    background: isAssigned ? 'white' : '#fffdfa'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = isAssigned ? 'white' : '#fffdfa'}
                                            >
                                                {/* Position Name & Code */}
                                                <td style={{ padding: '16px 20px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{
                                                            width: '40px',
                                                            height: '40px',
                                                            borderRadius: '12px',
                                                            background: isAssigned ? '#f0fdf4' : '#fffbeb',
                                                            color: isAssigned ? '#16a34a' : '#d97706',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: 800,
                                                            flexShrink: 0,
                                                            border: `1px solid ${isAssigned ? '#bbf7d0' : '#fde68a'}`
                                                        }}>
                                                            <Briefcase size={18} />
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                                                                {pos.name}
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
                                                                {pos.code && (
                                                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', color: '#475569' }}>
                                                                        {pos.code}
                                                                    </span>
                                                                )}
                                                                {pos.position_type_name && (
                                                                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6366f1' }}>
                                                                        {pos.position_type_name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {/* Reporting to Position & Tagged Employee */}
                                                            {pos.reporting_to && pos.reporting_to.length > 0 ? (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '5px' }}>
                                                                    {pos.reporting_to.map(rep => (
                                                                        <div
                                                                            key={rep.id}
                                                                            style={{
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                flexWrap: 'wrap',
                                                                                gap: '5px',
                                                                                background: '#f5f3ff',
                                                                                border: '1px solid #ede9fe',
                                                                                color: '#5b21b6',
                                                                                padding: '2px 8px',
                                                                                borderRadius: '6px',
                                                                                fontSize: '0.71rem',
                                                                                fontWeight: 600,
                                                                                width: 'fit-content'
                                                                            }}
                                                                        >
                                                                            <ArrowRightLeft size={11} style={{ transform: 'rotate(90deg)', color: '#7c3aed', flexShrink: 0 }} />
                                                                            <span>Reports to: <strong>{rep.name}</strong></span>
                                                                            {rep.employee_name ? (
                                                                                <span
                                                                                    style={{
                                                                                        display: 'inline-flex',
                                                                                        alignItems: 'center',
                                                                                        gap: '3px',
                                                                                        background: '#ecfdf5',
                                                                                        border: '1px solid #a7f3d0',
                                                                                        color: '#047857',
                                                                                        padding: '1px 6px',
                                                                                        borderRadius: '4px',
                                                                                        fontSize: '0.68rem',
                                                                                        fontWeight: 700
                                                                                    }}
                                                                                    title={`Tagged Manager/Supervisor: ${rep.employee_name} (${rep.employee_code || 'No Code'})`}
                                                                                >
                                                                                    <UserCheck size={10} />
                                                                                    {rep.employee_name}
                                                                                    {rep.employee_code && (
                                                                                        <span style={{ opacity: 0.75, fontWeight: 500 }}>({rep.employee_code})</span>
                                                                                    )}
                                                                                </span>
                                                                            ) : (
                                                                                <span style={{
                                                                                    background: '#fffbeb',
                                                                                    border: '1px solid #fde68a',
                                                                                    color: '#b45309',
                                                                                    padding: '1px 6px',
                                                                                    borderRadius: '4px',
                                                                                    fontSize: '0.67rem',
                                                                                    fontWeight: 700
                                                                                }}>
                                                                                    Vacant
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : pos.reporting_to_name ? (
                                                                <div style={{
                                                                    marginTop: '5px',
                                                                    fontSize: '0.72rem',
                                                                    color: '#4338ca',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    background: '#eef2ff',
                                                                    padding: '2px 8px',
                                                                    borderRadius: '6px',
                                                                    fontWeight: 700,
                                                                    border: '1px solid #e0e7ff',
                                                                    width: 'fit-content'
                                                                }}>
                                                                    <ArrowRightLeft size={11} style={{ transform: 'rotate(90deg)', color: '#6366f1' }} />
                                                                    Reports to: {pos.reporting_to_name}
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Office & Department */}
                                                <td style={{ padding: '16px 16px' }}>
                                                    {pos.project_name && (
                                                        <div style={{
                                                            fontSize: '0.72rem',
                                                            color: '#0369a1',
                                                            fontWeight: 700,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            background: '#f0f9ff',
                                                            padding: '1px 7px',
                                                            borderRadius: '5px',
                                                            marginBottom: '4px',
                                                            border: '1px solid #bae6fd'
                                                        }}>
                                                            <FolderKanban size={11} /> {pos.project_name}
                                                        </div>
                                                    )}
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                                                        {pos.office_name || 'N/A'}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                                        {pos.department_name || 'All Depts'}
                                                        {pos.section_name ? ` • ${pos.section_name}` : ''}
                                                    </div>
                                                </td>

                                                {/* Role & Level */}
                                                <td style={{ padding: '16px 16px' }}>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                                                        {pos.role_name || 'Unassigned Role'}
                                                    </div>
                                                    {pos.level_name && (
                                                        <span style={{
                                                            display: 'inline-block',
                                                            marginTop: '3px',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 700,
                                                            background: '#e0f2fe',
                                                            color: '#0284c7',
                                                            padding: '1px 7px',
                                                            borderRadius: '6px'
                                                        }}>
                                                            {pos.level_name}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Currently Tagged Employee */}
                                                <td style={{ padding: '16px 16px' }}>
                                                    {isAssigned ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <div style={{
                                                                width: '36px',
                                                                height: '36px',
                                                                borderRadius: '10px',
                                                                background: '#e2e8f0',
                                                                overflow: 'hidden',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontWeight: 800,
                                                                color: '#475569',
                                                                fontSize: '0.9rem',
                                                                border: '1.5px solid white',
                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                                                flexShrink: 0
                                                            }}>
                                                                {assignedEmp.photo ? (
                                                                    <img
                                                                        src={getPhotoUrl(assignedEmp.photo)}
                                                                        alt=""
                                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                    />
                                                                ) : (
                                                                    assignedEmp.name?.[0]?.toUpperCase() || 'E'
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.875rem' }}>
                                                                    {assignedEmp.name}
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                                                    {assignedEmp.code && (
                                                                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>
                                                                            {assignedEmp.code}
                                                                        </span>
                                                                    )}
                                                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#16a34a' }}>
                                                                        • Active
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '5px',
                                                            padding: '4px 10px',
                                                            borderRadius: '8px',
                                                            background: '#fffbeb',
                                                            border: '1px solid #fde68a',
                                                            color: '#b45309',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 700
                                                        }}>
                                                            <AlertCircle size={13} /> Vacant (No Employee)
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Action Buttons */}
                                                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                                        {!canEdit('position-employee-mapping') ? (
                                                            <span style={{
                                                                fontSize: '0.74rem',
                                                                color: '#64748b',
                                                                background: '#f1f5f9',
                                                                padding: '4px 10px',
                                                                borderRadius: '6px',
                                                                fontWeight: 600,
                                                                border: '1px solid #e2e8f0'
                                                            }}>
                                                                View Only
                                                            </span>
                                                        ) : isAssigned ? (
                                                            <>
                                                                <button
                                                                    onClick={() => openAssignModal(pos)}
                                                                    style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px',
                                                                        padding: '6px 12px',
                                                                        background: '#eff6ff',
                                                                        border: '1px solid #bfdbfe',
                                                                        borderRadius: '8px',
                                                                        color: '#1d4ed8',
                                                                        fontWeight: 700,
                                                                        fontSize: '0.78rem',
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.15s'
                                                                    }}
                                                                    title="Reassign to another employee (will remove current employee)"
                                                                >
                                                                    <ArrowRightLeft size={13} /> Reassign
                                                                </button>

                                                                <button
                                                                    onClick={() => setUnassignConfirmPosition(pos)}
                                                                    style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px',
                                                                        padding: '6px 10px',
                                                                        background: '#fef2f2',
                                                                        border: '1px solid #fecaca',
                                                                        borderRadius: '8px',
                                                                        color: '#dc2626',
                                                                        fontWeight: 700,
                                                                        fontSize: '0.78rem',
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.15s'
                                                                    }}
                                                                    title="Remove employee and make vacant"
                                                                >
                                                                    <UserX size={13} /> Untag
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                onClick={() => openAssignModal(pos)}
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '6px',
                                                                    padding: '7px 14px',
                                                                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                                                    border: 'none',
                                                                    borderRadius: '8px',
                                                                    color: 'white',
                                                                    fontWeight: 700,
                                                                    fontSize: '0.8rem',
                                                                    cursor: 'pointer',
                                                                    boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                                                                    transition: 'all 0.15s'
                                                                }}
                                                            >
                                                                <UserPlus size={14} /> Tag Employee
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Bar */}
                        <div style={{
                            padding: '1rem 1.5rem',
                            background: '#f8fafc',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '1rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                                    Showing <strong>{filteredPositions.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{' '}
                                    <strong>{Math.min(currentPage * pageSize, filteredPositions.length)}</strong> of{' '}
                                    <strong>{filteredPositions.length}</strong> positions
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Per page:</span>
                                    <select
                                        value={pageSize}
                                        onChange={(e) => {
                                            setPageSize(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            border: '1px solid #cbd5e1',
                                            background: 'white',
                                            fontSize: '0.78rem',
                                            fontWeight: 700,
                                            color: '#334155',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                        <option value={250}>250</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        background: currentPage === 1 ? '#f1f5f9' : 'white',
                                        color: currentPage === 1 ? '#cbd5e1' : '#475569',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    First
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        background: currentPage === 1 ? '#f1f5f9' : 'white',
                                        color: currentPage === 1 ? '#cbd5e1' : '#475569',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    <ChevronLeft size={14} /> Previous
                                </button>

                                <span style={{
                                    padding: '6px 12px',
                                    fontSize: '0.8rem',
                                    fontWeight: 800,
                                    color: '#1e293b',
                                    background: '#e2e8f0',
                                    borderRadius: '8px'
                                }}>
                                    Page {currentPage} of {totalPages}
                                </span>

                                <button
                                    type="button"
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage >= totalPages}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        background: currentPage >= totalPages ? '#f1f5f9' : 'white',
                                        color: currentPage >= totalPages ? '#cbd5e1' : '#475569',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Next <ChevronRight size={14} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage >= totalPages}
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        background: currentPage >= totalPages ? '#f1f5f9' : 'white',
                                        color: currentPage >= totalPages ? '#cbd5e1' : '#475569',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Last
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ASSIGN / REASSIGN EMPLOYEE MODAL (PORTALED DIRECTLY TO BODY FOR VIEWPORT CENTERING) */}
            {isModalOpen && targetPosition && createPortal(
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(6px)',
                    zIndex: 999999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem'
                }} onClick={(e) => {
                    if (e.target === e.currentTarget) setIsModalOpen(false);
                }}>
                    <div style={{
                        background: 'white',
                        width: '100%',
                        maxWidth: '680px',
                        maxHeight: '90vh',
                        borderRadius: '24px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                        animation: 'fadeIn 0.15s ease-out'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '1.25rem 1.75rem',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#f8fafc',
                            flexShrink: 0
                        }}>
                            <div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {targetPosition.assigned_employee || targetPosition.assigned_employees_details?.length ? 'Reassign Position' : 'Position Mapping'}
                                </span>
                                <h2 style={{ margin: '2px 0 0', fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                                    {targetPosition.assigned_employee || targetPosition.assigned_employees_details?.length ? 'Reassign to New Employee' : 'Tag Employee to Position'}
                                </h2>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    padding: '6px',
                                    borderRadius: '8px'
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1 }}>
                            {/* Position Details Card */}
                            <div style={{
                                padding: '1.25rem',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '16px',
                                marginBottom: '1.25rem'
                            }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Target Position</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                                    {targetPosition.name}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                                    {targetPosition.office_name || 'Office'} • {targetPosition.department_name || 'Department'} {targetPosition.section_name ? `• ${targetPosition.section_name}` : ''}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                                    {targetPosition.project_name && (
                                        <span style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f0f9ff', padding: '2px 8px', borderRadius: '5px', border: '1px solid #bae6fd' }}>
                                            <FolderKanban size={12} /> {targetPosition.project_name}
                                        </span>
                                    )}
                                    {targetPosition.reporting_to && targetPosition.reporting_to.length > 0 ? (
                                        targetPosition.reporting_to.map(rep => (
                                            <span key={rep.id} style={{ fontSize: '0.75rem', color: '#4338ca', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#eef2ff', padding: '3px 9px', borderRadius: '6px', border: '1px solid #e0e7ff', flexWrap: 'wrap' }}>
                                                <ArrowRightLeft size={11} style={{ transform: 'rotate(90deg)', color: '#6366f1' }} />
                                                <span>Reports to: <strong>{rep.name}</strong></span>
                                                {rep.employee_name ? (
                                                    <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                        <UserCheck size={10} /> {rep.employee_name} {rep.employee_code && <span style={{ opacity: 0.75, fontWeight: 500 }}>({rep.employee_code})</span>}
                                                    </span>
                                                ) : (
                                                    <span style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                                                        Vacant
                                                    </span>
                                                )}
                                            </span>
                                        ))
                                    ) : targetPosition.reporting_to_name ? (
                                        <span style={{ fontSize: '0.75rem', color: '#4338ca', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#eef2ff', padding: '2px 8px', borderRadius: '5px', border: '1px solid #e0e7ff' }}>
                                            <ArrowRightLeft size={11} style={{ transform: 'rotate(90deg)', color: '#6366f1' }} /> Reports to: {targetPosition.reporting_to_name}
                                        </span>
                                    ) : null}
                                </div>
                            </div>

                            {/* Reassignment Warning if currently held by another employee */}
                            {(() => {
                                const currentEmp = targetPosition.assigned_employee || targetPosition.assigned_employees_details?.[0];
                                const currentEmpName = typeof currentEmp === 'object' ? (currentEmp?.name || '') : String(currentEmp || '');
                                if (!currentEmpName) return null;

                                return (
                                    <div style={{
                                        padding: '1rem 1.25rem',
                                        background: '#fffbeb',
                                        border: '1px solid #fde68a',
                                        borderRadius: '14px',
                                        color: '#92400e',
                                        fontSize: '0.85rem',
                                        marginBottom: '1.25rem',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '12px'
                                    }}>
                                        <AlertCircle size={20} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                                        <div>
                                            <strong>Current Assignee: {currentEmpName}</strong>
                                            <div style={{ marginTop: '2px', color: '#b45309', fontSize: '0.8rem' }}>
                                                Per HCM business rules, <strong>1 position can only belong to 1 employee</strong>. Tagging a different employee will automatically untag <strong>{currentEmpName}</strong> from this position and trigger sync webhooks.
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Employee Selection Controls */}
                            <div style={{ marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>
                                        Select Employee to Tag
                                    </label>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                        {filteredEmployees.length} matching
                                    </span>
                                </div>

                                {/* Employee Quick Filter Tabs */}
                                <div style={{
                                    display: 'flex',
                                    background: '#f1f5f9',
                                    padding: '3px',
                                    borderRadius: '10px',
                                    gap: '4px',
                                    marginBottom: '10px'
                                }}>
                                    {[
                                        { id: 'UNASSIGNED', label: `Available Staff (${employees.filter(e => !e.positions_details?.length).length})` },
                                        { id: 'ALL', label: `All Employees (${employees.length})` },
                                        { id: 'ASSIGNED', label: `Already Assigned (${employees.filter(e => e.positions_details?.length > 0).length})` }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setEmpTabFilter(tab.id)}
                                            style={{
                                                flex: 1,
                                                border: 'none',
                                                padding: '0.45rem 0.5rem',
                                                borderRadius: '8px',
                                                fontWeight: 700,
                                                fontSize: '0.75rem',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s',
                                                background: empTabFilter === tab.id ? 'white' : 'transparent',
                                                color: empTabFilter === tab.id ? '#0f172a' : '#64748b',
                                                boxShadow: empTabFilter === tab.id ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
                                            }}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Employee Search Input */}
                                <div style={{ position: 'relative' }}>
                                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input
                                        type="text"
                                        placeholder="Search employee by name or code..."
                                        value={empSearchTerm}
                                        onChange={(e) => setEmpSearchTerm(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.6rem 1rem 0.6rem 2.4rem',
                                            borderRadius: '10px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '0.85rem',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                            background: '#f8fafc'
                                        }}
                                    />
                                    {empSearchTerm && (
                                        <button
                                            onClick={() => setEmpSearchTerm('')}
                                            style={{
                                                position: 'absolute',
                                                right: '10px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#94a3b8',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <X size={15} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Employee List */}
                            <div style={{
                                maxHeight: '280px',
                                overflowY: 'auto',
                                border: '1px solid #e2e8f0',
                                borderRadius: '16px',
                                padding: '6px'
                            }}>
                                {loadingEmployees ? (
                                    <div style={{ padding: '2rem', textAlign: 'center' }}>
                                        <div className="inner-spin" style={{ width: '22px', height: '22px', border: '3px solid #cbd5e1', borderTopColor: '#0ea5e9', borderRadius: '50%', margin: '0 auto 8px' }} />
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Loading staff list...</div>
                                    </div>
                                ) : filteredEmployees.length === 0 ? (
                                    <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
                                        <Users size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>No matching employees found</div>
                                        <div style={{ fontSize: '0.8rem', marginTop: '2px' }}>Try selecting "All Employees" or clearing search</div>
                                    </div>
                                ) : (
                                    <>
                                        {filteredEmployees.length > 60 && (
                                            <div style={{
                                                padding: '6px 12px',
                                                background: '#f8fafc',
                                                borderBottom: '1px solid #f1f5f9',
                                                fontSize: '0.72rem',
                                                color: '#64748b',
                                                marginBottom: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between'
                                            }}>
                                                <span>Showing top 60 of {filteredEmployees.length} staff</span>
                                                <span style={{ color: '#0ea5e9', fontWeight: 600 }}>Type above to filter</span>
                                            </div>
                                        )}
                                        {displayedEmployees.map(emp => {
                                            const isSelected = selectedEmployeeId && Number(selectedEmployeeId) === Number(emp.id);
                                            const posCount = emp.positions_details?.length || 0;

                                            return (
                                                <div
                                                    key={emp.id}
                                                    onClick={() => setSelectedEmployeeId(emp.id)}
                                                    style={{
                                                        padding: '10px 14px',
                                                        borderRadius: '12px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        cursor: 'pointer',
                                                        marginBottom: '4px',
                                                        background: isSelected ? '#eff6ff' : 'white',
                                                        border: isSelected ? '1.5px solid #3b82f6' : '1px solid transparent',
                                                        transition: 'all 0.15s'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{
                                                            width: '36px',
                                                            height: '36px',
                                                            borderRadius: '10px',
                                                            background: isSelected ? '#3b82f6' : '#e2e8f0',
                                                            color: isSelected ? 'white' : '#475569',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: 800,
                                                            fontSize: '0.9rem',
                                                            overflow: 'hidden'
                                                        }}>
                                                            {emp.photo ? (
                                                                <img src={getPhotoUrl(emp.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            ) : (
                                                                emp.name?.[0]?.toUpperCase() || 'E'
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                                                                {emp.name}
                                                            </div>
                                                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                                                                {emp.employee_code && <span style={{ fontWeight: 700 }}>{emp.employee_code}</span>}
                                                                {emp.email && ` • ${emp.email}`}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        {posCount === 0 ? (
                                                            <span style={{
                                                                fontSize: '0.7rem',
                                                                fontWeight: 700,
                                                                background: '#dcfce7',
                                                                color: '#15803d',
                                                                padding: '2px 8px',
                                                                borderRadius: '6px'
                                                            }}>
                                                                Ready to Tag (0 Pos)
                                                            </span>
                                                        ) : (
                                                            <span style={{
                                                                fontSize: '0.7rem',
                                                                fontWeight: 600,
                                                                background: '#f1f5f9',
                                                                color: '#64748b',
                                                                padding: '2px 8px',
                                                                borderRadius: '6px'
                                                            }}>
                                                                {posCount} Position{posCount > 1 ? 's' : ''} held
                                                            </span>
                                                        )}

                                                        <div style={{
                                                            width: '18px',
                                                            height: '18px',
                                                            borderRadius: '50%',
                                                            border: isSelected ? '5px solid #3b82f6' : '2px solid #cbd5e1',
                                                            background: 'white',
                                                            boxSizing: 'border-box'
                                                        }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                            padding: '1.25rem 1.75rem',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '1rem',
                            background: '#f8fafc',
                            flexShrink: 0
                        }}>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                disabled={actionLoading}
                                style={{
                                    padding: '0.65rem 1.25rem',
                                    background: 'white',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '10px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    color: '#475569',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleSaveAssignment}
                                disabled={actionLoading || !selectedEmployeeId}
                                style={{
                                    padding: '0.65rem 1.5rem',
                                    background: selectedEmployeeId ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : '#cbd5e1',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontWeight: 800,
                                    fontSize: '0.85rem',
                                    color: 'white',
                                    cursor: selectedEmployeeId ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: selectedEmployeeId ? '0 4px 10px rgba(2, 132, 199, 0.3)' : 'none'
                                }}
                            >
                                {actionLoading ? (
                                    <>
                                        <div className="inner-spin" style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} />
                                        Tagging...
                                    </>
                                ) : (
                                    <>
                                        <Check size={16} /> Confirm & Tag Employee
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* UNASSIGN CONFIRMATION MODAL (PORTALED DIRECTLY TO BODY) */}
            {unassignConfirmPosition && createPortal(
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(6px)',
                    zIndex: 999999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem'
                }} onClick={(e) => {
                    if (e.target === e.currentTarget) setUnassignConfirmPosition(null);
                }}>
                    <div style={{
                        background: 'white',
                        width: '100%',
                        maxWidth: '460px',
                        borderRadius: '20px',
                        padding: '1.75rem',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '16px',
                            background: '#fef2f2',
                            color: '#dc2626',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.25rem'
                        }}>
                            <UserX size={26} />
                        </div>

                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                            Untag Employee from Position?
                        </h3>

                        <p style={{ margin: '0.75rem 0 1.5rem', color: '#64748b', fontSize: '0.85rem', lineHeight: '1.5' }}>
                            Are you sure you want to untag{' '}
                            <strong>
                                {typeof unassignConfirmPosition.assigned_employee === 'object'
                                    ? unassignConfirmPosition.assigned_employee?.name
                                    : (unassignConfirmPosition.assigned_employee || unassignConfirmPosition.assigned_employees_details?.[0]?.name || 'Employee')}
                            </strong>{' '}
                            from <strong>{unassignConfirmPosition.name}</strong>?
                            <br />
                            This will make the position vacant and dispatch webhook synchronization.
                        </p>

                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                            <button
                                type="button"
                                onClick={() => setUnassignConfirmPosition(null)}
                                disabled={actionLoading}
                                style={{
                                    flex: 1,
                                    padding: '0.65rem',
                                    background: 'white',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '10px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    color: '#475569',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmUnassign}
                                disabled={actionLoading}
                                style={{
                                    flex: 1,
                                    padding: '0.65rem',
                                    background: '#dc2626',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontWeight: 800,
                                    fontSize: '0.85rem',
                                    color: 'white',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 10px rgba(220, 38, 38, 0.25)'
                                }}
                            >
                                {actionLoading ? 'Untagging...' : 'Yes, Untag'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* TAG VACANT EMPLOYEE TO POSITION MODAL */}
            {tagEmployeeModal.isOpen && tagEmployeeModal.employee && createPortal(
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(6px)',
                    zIndex: 999999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem'
                }} onClick={(e) => {
                    if (e.target === e.currentTarget) setTagEmployeeModal({ isOpen: false, employee: null, selectedPositionId: null, searchQuery: '' });
                }}>
                    <div style={{
                        background: 'white',
                        width: '100%',
                        maxWidth: '680px',
                        maxHeight: '90vh',
                        borderRadius: '24px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                        animation: 'fadeIn 0.15s ease-out'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '1.25rem 1.75rem',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#f8fafc',
                            flexShrink: 0
                        }}>
                            <div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#e11d48', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Vacant Employee Allocation
                                </span>
                                <h2 style={{ margin: '2px 0 0', fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                                    Tag Employee to Vacant Position
                                </h2>
                            </div>
                            <button
                                onClick={() => setTagEmployeeModal({ isOpen: false, employee: null, selectedPositionId: null, searchQuery: '' })}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    padding: '6px',
                                    borderRadius: '8px'
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1 }}>
                            {/* Selected Employee Card */}
                            <div style={{
                                padding: '1rem 1.25rem',
                                background: '#fff1f2',
                                border: '1px solid #fecdd3',
                                borderRadius: '16px',
                                marginBottom: '1.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                <div style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '12px',
                                    background: '#e11d48',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    fontSize: '1.1rem'
                                }}>
                                    {tagEmployeeModal.employee.name?.[0]?.toUpperCase() || 'E'}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>
                                        {tagEmployeeModal.employee.name}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: '#be123c', fontWeight: 700, marginTop: '2px' }}>
                                        ID: {tagEmployeeModal.employee.employee_code} • {tagEmployeeModal.employee.phone || 'No phone'}
                                    </div>
                                </div>
                            </div>

                            {/* Vacant Positions Picker */}
                            <div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Select an Available Vacant Position ({vacantPositions.length} available)
                                </div>
                                <div style={{ position: 'relative', marginBottom: '12px' }}>
                                    <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input
                                        type="text"
                                        placeholder="Filter vacant positions by name, office, department..."
                                        value={tagEmployeeModal.searchQuery}
                                        onChange={(e) => setTagEmployeeModal(prev => ({ ...prev, searchQuery: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            padding: '0.6rem 0.9rem 0.6rem 2.3rem',
                                            borderRadius: '10px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '0.84rem',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {vacantPositions
                                        .filter(p => {
                                            if (!tagEmployeeModal.searchQuery.trim()) return true;
                                            const q = tagEmployeeModal.searchQuery.toLowerCase();
                                            return (p.name || '').toLowerCase().includes(q) ||
                                                   (p.code || '').toLowerCase().includes(q) ||
                                                   (p.office_name || '').toLowerCase().includes(q) ||
                                                   (p.department_name || '').toLowerCase().includes(q) ||
                                                   (p.role_name || '').toLowerCase().includes(q);
                                        })
                                        .slice(0, 50)
                                        .map(pos => {
                                            const isSelected = tagEmployeeModal.selectedPositionId === pos.id;
                                            return (
                                                <div
                                                    key={pos.id}
                                                    onClick={() => setTagEmployeeModal(prev => ({ ...prev, selectedPositionId: pos.id }))}
                                                    style={{
                                                        padding: '12px 14px',
                                                        borderRadius: '12px',
                                                        border: `1.5px solid ${isSelected ? '#0284c7' : '#e2e8f0'}`,
                                                        background: isSelected ? '#f0f9ff' : 'white',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                >
                                                    <div>
                                                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem' }}>
                                                            {pos.name}
                                                        </div>
                                                        <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '3px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                            {pos.code && <span style={{ fontWeight: 700 }}>Code: {pos.code}</span>}
                                                            {pos.office_name && <span>• Office: {pos.office_name}</span>}
                                                            {pos.department_name && <span>• Dept: {pos.department_name}</span>}
                                                        </div>
                                                    </div>
                                                    <div style={{
                                                        width: '22px',
                                                        height: '22px',
                                                        borderRadius: '50%',
                                                        border: `2px solid ${isSelected ? '#0284c7' : '#cbd5e1'}`,
                                                        background: isSelected ? '#0284c7' : 'transparent',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: 'white',
                                                        flexShrink: 0
                                                    }}>
                                                        {isSelected && <Check size={14} />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                            padding: '1.25rem 1.75rem',
                            borderTop: '1px solid #e2e8f0',
                            background: '#f8fafc',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '10px'
                        }}>
                            <button
                                type="button"
                                onClick={() => setTagEmployeeModal({ isOpen: false, employee: null, selectedPositionId: null, searchQuery: '' })}
                                style={{
                                    padding: '9px 18px',
                                    borderRadius: '10px',
                                    background: 'white',
                                    border: '1px solid #cbd5e1',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    color: '#475569',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmTagEmployeeToPosition}
                                disabled={actionLoading || !tagEmployeeModal.selectedPositionId}
                                style={{
                                    padding: '9px 20px',
                                    borderRadius: '10px',
                                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                    border: 'none',
                                    fontWeight: 800,
                                    fontSize: '0.85rem',
                                    color: 'white',
                                    cursor: (actionLoading || !tagEmployeeModal.selectedPositionId) ? 'not-allowed' : 'pointer',
                                    opacity: (actionLoading || !tagEmployeeModal.selectedPositionId) ? 0.6 : 1,
                                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                                }}
                            >
                                {actionLoading ? 'Assigning...' : 'Confirm Assignment'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default PositionEmployeeMapping;
