/**
 * App Layout Component
 * 
 * Main layout wrapper that combines:
 * - DesktopSidebar (hidden on mobile)
 * - MobileHeader (hidden on desktop)
 * - MobileNav (bottom navigation)
 * - Main content area
 * 
 * Updated to include all required props for Integration Guide
 */

import React from 'react';
import { ViewState, User, Business, Staff } from '../../types';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileHeader } from './MobileHeader';
import MobileNav from '../MobileNav';

interface AppLayoutProps {
    children: React.ReactNode;
    user: User;
    view: ViewState;
    setView: (view: ViewState) => void;

    // Business data
    businesses: Business[];
    accessibleBusinesses: Business[];
    currentBusinessId: string | null;
    activeBusiness: Business | undefined;
    staffMemberships: Staff[];

    // Business dropdown
    isBusinessDropdownOpen: boolean;
    setIsBusinessDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;

    // Handlers
    onSwitchBusiness: (businessId: string | null) => void;
    onOpenJoinStore: () => void;
    onLogout: () => void;
}

export function AppLayout({
    children,
    user,
    view,
    setView,
    businesses,
    accessibleBusinesses,
    currentBusinessId,
    activeBusiness,
    staffMemberships,
    isBusinessDropdownOpen,
    setIsBusinessDropdownOpen,
    onSwitchBusiness,
    onOpenJoinStore,
    onLogout,
}: AppLayoutProps) {
    return (
        <div className="min-h-screen bg-background text-primary font-sans flex flex-col md:flex-row">
            {/* Desktop Sidebar */}
            <DesktopSidebar
                user={user}
                view={view}
                setView={setView}
                activeBusiness={activeBusiness || null}
                accessibleBusinesses={accessibleBusinesses}
                currentBusinessId={currentBusinessId}
                staffMemberships={staffMemberships}
                isBusinessDropdownOpen={isBusinessDropdownOpen}
                setIsBusinessDropdownOpen={setIsBusinessDropdownOpen}
                onSwitchBusiness={onSwitchBusiness}
                onOpenJoinStore={onOpenJoinStore}
                onLogout={onLogout}
            />

            {/* Main Content */}
            <main className="flex-1 md:ml-72 pb-20 md:pb-12 bg-gray-50 md:bg-white min-h-screen md:rounded-tl-2xl md:border-l md:border-border overflow-hidden relative">
                {/* Mobile Header */}
                <MobileHeader
                    user={user}
                    activeBusiness={activeBusiness || null}
                    accessibleBusinesses={accessibleBusinesses}
                    currentBusinessId={currentBusinessId}
                    staffMemberships={staffMemberships}
                    isBusinessDropdownOpen={isBusinessDropdownOpen}
                    setIsBusinessDropdownOpen={setIsBusinessDropdownOpen}
                    onSwitchBusiness={onSwitchBusiness}
                    onOpenJoinStore={onOpenJoinStore}
                    onLogout={onLogout}
                />

                {/* Page Content */}
                {children}
            </main>

            {/* Mobile Bottom Navigation */}
            <MobileNav view={view} setView={setView} />
        </div>
    );
}

export default AppLayout;
