//@ts-check

import { Outlet } from "react-router-dom"
import DashboardHeader from "./Header"
import DashboardSidebar from "./Sidebar"
import React from "react";

const DashboardLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

    return (
        <div className="w-full h-screen flex flex-col">
            <DashboardHeader onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
            <div className="flex flex-1 overflow-hidden relative">
                <DashboardSidebar
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                />
                {/* Overlay for mobile */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}
                <main className="flex-1 overflow-auto bg-gray-50">
                    <div className="p-4 md:p-6">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    )
}

export default DashboardLayout