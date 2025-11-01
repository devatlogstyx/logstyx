//@ts-check

import { useNavigate, useLocation } from "react-router-dom"
import { IoHomeOutline, IoStatsChartOutline, IoPeopleOutline, IoSettingsOutline, IoDocumentTextOutline, IoLogOutOutline } from "react-icons/io5"

const DashboardSidebar = () => {
    const navigate = useNavigate()
    const location = useLocation()

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: IoHomeOutline, path: '/dashboard' },
        { id: 'users', label: 'Users', icon: IoPeopleOutline, path: '/dashboard/users' },
        { id: 'documents', label: 'Documents', icon: IoDocumentTextOutline, path: '/dashboard/documents' },
        { id: 'settings', label: 'Settings', icon: IoSettingsOutline, path: '/dashboard/settings' },
    ]

    return (
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
            {/* Logo/Brand */}
            <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 bg-clip-text text-transparent">
                    Your Brand
                </h2>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-1">
                {menuItems.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.path

                    return (
                        <button
                            key={item.id}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                                    ? 'bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 text-white shadow-md'
                                    : 'text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            <Icon size={20} />
                            <span className="font-medium">{item.label}</span>
                        </button>
                    )
                })}
            </nav>

            {/* Logout */}
            <div className="px-4 py-4 border-t border-gray-200">
                <a
                    href={`/logout`}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                >
                    <IoLogOutOutline size={20} />
                    <span className="font-medium">Logout</span>
                </a>
            </div>
        </aside>
    )
}

export default DashboardSidebar