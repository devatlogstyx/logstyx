//@ts-check

import { Avatar, ActionIcon, Menu } from "@mantine/core"
import { IoNotificationsOutline, IoSearchOutline, IoHelpCircleOutline, IoChevronDown } from "react-icons/io5"
import { useUser } from "../../../context/useUser"

const DashboardHeader = () => {
    const { user } = useUser()

    return (
        <header className="px-6 py-4 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 text-white shadow-lg">
            <div className="flex items-center justify-between">
                {/* Left: Brand & Greeting */}
                <div>
                    <h1 className="text-xl font-bold">Welcome back!</h1>
                    <p className="text-sm text-blue-50 opacity-90">{user?.fullname}</p>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    <ActionIcon
                        variant="subtle"
                        size="lg"
                        className="text-white hover:bg-white/20 transition-colors"
                        style={{ color: 'white' }}
                    >
                        <IoSearchOutline size={20} />
                    </ActionIcon>
                    <ActionIcon
                        variant="subtle"
                        size="lg"
                        className="text-white hover:bg-white/20 transition-colors"
                        style={{ color: 'white' }}
                    >
                        <IoHelpCircleOutline size={20} />
                    </ActionIcon>
                    <ActionIcon
                        variant="subtle"
                        size="lg"
                        className="text-white hover:bg-white/20 transition-colors"
                        style={{ color: 'white' }}
                    >
                        <IoNotificationsOutline size={20} />
                    </ActionIcon>
                    <Menu>
                        <Menu.Target>
                            <button className="ml-2 flex items-center gap-2 hover:bg-white/20 rounded-lg px-2 py-1 transition-colors">
                                <div className="bg-white/20 backdrop-blur-sm rounded-full p-0.5 cursor-pointer">
                                    <Avatar
                                        name={user?.fullname}
                                        size="sm"
                                        color="white"
                                    />
                                </div>
                                <IoChevronDown size={16} />
                            </button>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Item>Profile</Menu.Item>
                            <Menu.Divider />
                            <a href={`/logout`}>
                                <Menu.Item color="red">Logout</Menu.Item>
                            </a>
                        </Menu.Dropdown>
                    </Menu>
                </div>
            </div>
        </header>
    )
}

export default DashboardHeader