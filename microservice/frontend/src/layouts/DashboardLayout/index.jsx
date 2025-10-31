//@ts-check

import { Outlet } from "react-router-dom"
import DashboardHeader from "./Header"
import DashboardSidebar from "./Sidebar"

const DashboardLayout = () => {
    return (
        <div className="w-full h-screen flex flex-col">
            <DashboardHeader />
            <div className="flex flex-1 overflow-hidden">
                <DashboardSidebar />
                <main className="flex-1 overflow-auto bg-gray-50 p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}

export default DashboardLayout