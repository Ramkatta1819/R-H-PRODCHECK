import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronLeft, Search, X } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useData, SECTION_GROUPS, SECTIONS } from '../context/DataContext';

const Sidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const currentPath = location.pathname.substring(1).split('/')[0] || 'dashboard';
    const [menuSearch, setMenuSearch] = useState('');

    const {
        activeSection,
        expandedGroups,
        toggleGroup,
        selectSection: originalSelectSection,
        canView,
        isSidebarOpen,
        toggleSidebar
    } = useData();

    const selectSection = (id) => {
        originalSelectSection(id);
        if (window.innerWidth <= 1024) {
            toggleSidebar();
        }
    };

    // Category display name mapping for professional enterprise feel matching reference
    const getCategoryHeader = (groupName) => {
        if (groupName === 'Dashboard Overview') return 'QUICK ACCESS';
        if (groupName === 'Organization') return 'ORGANIZATION';
        if (groupName === 'Job Structure') return 'JOB STRUCTURE';
        if (groupName === 'Workforce') return 'WORKFORCE';
        if (groupName === 'Geo Locations') return 'GEO LOCATIONS';
        if (groupName === 'Security & Access') return 'SECURITY & ACCESS';
        return groupName.toUpperCase();
    };

    return (
        <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
            {/* Header / Brand */}
            <div className="sidebar-header">
                <div className="sidebar-logo-icon">
                    <Layers size={20} color="white" />
                </div>
                <div className="sidebar-logo-text">
                    <div style={{ color: 'white', fontWeight: 900, fontSize: '1.05rem', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                        ONE HCM
                    </div>
                    <div style={{ fontSize: '0.62rem', letterSpacing: '0.12em', fontWeight: 700, color: '#fda4af', textTransform: 'uppercase', marginTop: '1px' }}>
                        Enterprise Platform
                    </div>
                </div>
                <button
                    className="sidebar-collapse-btn"
                    onClick={toggleSidebar}
                    title="Collapse Sidebar"
                    type="button"
                >
                    <ChevronLeft size={16} />
                </button>
            </div>

            {/* Menu Search Input (Reference: Search menu...) */}
            <div className="sidebar-search-box">
                <Search
                    size={14}
                    style={{
                        position: 'absolute',
                        left: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'rgba(253, 164, 175, 0.65)',
                        pointerEvents: 'none'
                    }}
                />
                <input
                    type="text"
                    className="sidebar-search-input"
                    placeholder="Search menu..."
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                />
                {menuSearch && (
                    <button
                        type="button"
                        onClick={() => setMenuSearch('')}
                        style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'transparent',
                            border: 'none',
                            color: '#fda4af',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '2px'
                        }}
                    >
                        <X size={13} />
                    </button>
                )}
            </div>

            {/* Navigation List - Strictly filtered by permission & search */}
            <nav className="sidebar-nav">
                {SECTION_GROUPS.map((group) => {
                    // Filter items strictly based on user access permission & search term
                    const visibleItems = group.items.filter((itemId) => {
                        if (!canView(itemId)) return false;
                        if (!menuSearch.trim()) return true;
                        const section = SECTIONS.find((s) => s.id === itemId);
                        return section?.name?.toLowerCase().includes(menuSearch.toLowerCase().trim());
                    });

                    // Hide empty groups completely
                    if (visibleItems.length === 0) return null;

                    const categoryTitle = getCategoryHeader(group.name);

                    // Standalone groups (e.g. Quick Access: Dashboard, Users)
                    if (group.standalone) {
                        return (
                            <div key={group.name} style={{ marginBottom: '0.65rem' }}>
                                <div className="sidebar-category-header">
                                    {categoryTitle}
                                </div>
                                {visibleItems.map((itemId) => {
                                    const section = SECTIONS.find((s) => s.id === itemId);
                                    if (!section) return null;
                                    const isActive = currentPath === section.id || activeSection === section.id;

                                    return (
                                        <NavLink
                                            key={section.id}
                                            to={section.id === 'dashboard' ? '/' : `/${section.id}`}
                                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                                            onClick={() => selectSection(section.id)}
                                        >
                                            <div style={{
                                                color: isActive ? 'white' : '#fda4af',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}>
                                                {React.cloneElement(section.icon, { size: 18 })}
                                            </div>
                                            <span style={{ color: isActive ? 'white' : '#fecdd3', fontWeight: isActive ? 700 : 500 }}>
                                                {section.name}
                                            </span>
                                        </NavLink>
                                    );
                                })}
                            </div>
                        );
                    }

                    // Collapsible or search-expanded groups
                    const isExpanded = menuSearch.trim() ? true : expandedGroups.includes(group.name);
                    const hasActiveChild = group.items.includes(currentPath) || group.items.includes(activeSection);

                    return (
                        <div key={group.name} style={{ marginBottom: '0.45rem' }}>
                            <div className="sidebar-category-header">
                                {categoryTitle}
                            </div>
                            <div
                                className={`sidebar-group-header ${hasActiveChild ? 'active-group' : ''}`}
                                onClick={() => toggleGroup(group.name)}
                            >
                                <div className="group-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        color: hasActiveChild ? 'white' : '#fda4af',
                                        transition: 'color 0.2s ease'
                                    }}>
                                        {React.cloneElement(group.icon, { size: 18 })}
                                    </div>
                                    <span style={{
                                        color: hasActiveChild ? 'white' : '#fecdd3',
                                        fontWeight: hasActiveChild ? 800 : 600
                                    }}>
                                        {group.name}
                                    </span>
                                </div>
                                <ChevronDown
                                    size={15}
                                    style={{
                                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s ease',
                                        color: hasActiveChild ? 'white' : '#fda4af'
                                    }}
                                />
                            </div>

                            {isExpanded && (
                                <div className="sidebar-group-content" style={{ marginTop: '2px' }}>
                                    {visibleItems.map((sectionId) => {
                                        const section = SECTIONS.find(s => s.id === sectionId);
                                        if (!section) return null;
                                        const isActive = currentPath === sectionId || activeSection === sectionId;

                                        return (
                                            <NavLink
                                                key={sectionId}
                                                to={`/${sectionId}`}
                                                className={({ isActive }) => `sidebar-sub-link ${isActive ? 'active' : ''}`}
                                                onClick={() => selectSection(sectionId)}
                                            >
                                                <div style={{
                                                    color: isActive ? 'white' : '#fda4af',
                                                    opacity: isActive ? 1 : 0.85,
                                                    display: 'flex',
                                                    alignItems: 'center'
                                                }}>
                                                    {React.cloneElement(section.icon, { size: 16 })}
                                                </div>
                                                <span style={{
                                                    color: isActive ? 'white' : '#fecdd3',
                                                    fontWeight: isActive ? 700 : 500
                                                }}>
                                                    {section.name}
                                                </span>
                                            </NavLink>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>
        </aside>
    );
};

export default Sidebar;
