//@ts-check

import { useNavigate, useLocation } from "react-router-dom"
import { IoPeopleOutline, IoLogOutOutline,  IoBriefcaseOutline } from "react-icons/io5"
import { useUser } from "../../../context/useUser"
import { PROJECT_TITLE, READ_PROJECT_USER_ROLE, READ_SETTINGS_USER_ROLE, READ_USER_USER_ROLE } from "../../../utils/constant"
import React from "react"
import { LuRadar } from 'react-icons/lu';

const DashboardSidebar = ({
    isOpen,
    onClose
}) => {
    const [activeItem, setActiveItem] = React.useState('projects');

    const navigate = useNavigate()
    const location = useLocation()
    const {
        user,
        isLoading
    } = useUser()

    if (isLoading) {
        return <></>
    }


    const menuItems = [];

    if (user?.permissions?.includes(READ_PROJECT_USER_ROLE)) {
        menuItems.push({
            id: 'projects',
            label: 'Projects',
            icon: IoBriefcaseOutline,
            path: '/dashboard'
        });

        menuItems.push({
            id: 'probes',
            label: 'Probes',
            icon: LuRadar,
            path: '/dashboard/probes'
        });
    }

    if (user?.permissions?.includes(READ_USER_USER_ROLE)) {
        menuItems.push({
            id: 'users',
            label: 'Users',
            icon: IoPeopleOutline,
            path: '/dashboard/users'
        });
    }
    // if (user?.permissions?.includes(READ_SETTINGS_USER_ROLE)) {
    //     menuItems.push({ id: 'settings', label: 'Settings', icon: IoSettingsOutline, path: '/dashboard/settings' })
    // }

    const handleNavigation = (itemId, path) => {
        setActiveItem(itemId);
        onClose(); // Close sidebar on mobile after navigation
        navigate(path)
    };

    return (
        <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-white border-r border-gray-200 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
            {/* Logo/Brand */}
            <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 bg-clip-text text-transparent">
                    {PROJECT_TITLE}
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
                            onClick={() => handleNavigation(item.id, item.path)}
                            className={`cursor-pointer w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
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