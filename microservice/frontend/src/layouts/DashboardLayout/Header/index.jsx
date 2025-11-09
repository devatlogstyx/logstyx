//@ts-check

import { Avatar, ActionIcon, Menu } from "@mantine/core"
import { IoNotificationsOutline, IoSearchOutline, IoHelpCircleOutline, IoChevronDown, IoMenuOutline } from "react-icons/io5"
import { useUser } from "../../../context/useUser"
import useHeader from "./hook"
import ModalUpdateProfile from "../ModalUpdateProfile"

const DashboardHeader = ({
    onMenuClick
}) => {
    const { user } = useUser()
    const {
        isEditProfileModalVisible,
        OpenEditModal,
        CloseEditModal
    } = useHeader()
    return (
        <>
            <header className="px-6 py-4 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 text-white shadow-lg">
                <div className="flex items-center justify-between">
                    {/* Left: Brand & Greeting */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onMenuClick}
                            className="lg:hidden p-2 hover:bg-white/20 rounded-lg transition-colors"
                            aria-label="Toggle menu"
                        >
                            <IoMenuOutline size={24} />
                        </button>
                        <div>
                            <h1 className="text-lg md:text-xl font-bold">Welcome back!</h1>
                            <p className="text-xs md:text-sm text-blue-50 opacity-90 truncate max-w-[150px] md:max-w-none">
                                {user?.fullname}
                            </p>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
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
                                <Menu.Item onClick={OpenEditModal}>Profile</Menu.Item>
                                <a href={`/logout`}>
                                    <Menu.Item color="red">Logout</Menu.Item>
                                </a>
                            </Menu.Dropdown>
                        </Menu>
                    </div>
                </div>
            </header>
            {
                isEditProfileModalVisible &&
                <ModalUpdateProfile
                    opened={isEditProfileModalVisible}
                    onClose={CloseEditModal}
                />
            }
        </>
    )
}

export default DashboardHeader