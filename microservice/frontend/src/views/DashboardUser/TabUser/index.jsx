//@ts-check

import { ActionIcon, Avatar, Badge, Paper, Text } from "@mantine/core"
import { FiEdit, FiShield, FiTrash, FiUser } from "react-icons/fi"

const TabUser = ({
    users,
    onDelete
}) => {
    return (
        <div className="space-y-4">
            {users.length > 0 ? (
                users.map(user => (
                    <Paper key={user.id} className="p-6 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Avatar
                                    src={user.image}
                                    alt={user.fullname}
                                    name={user.fullname}
                                    className="w-12 h-12 rounded-full"
                                />
                                <div>
                                    <Text className="font-semibold text-gray-900">{user.fullname}</Text>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {user.permissions.map(perm => (
                                            <Badge
                                                key={perm}
                                                leftSection={<FiShield size={12} />}
                                                variant="light"
                                                className="bg-blue-50 text-blue-700 border border-blue-200"
                                            >
                                                {perm}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <ActionIcon
                                    variant="light"
                                    className="text-blue-600 hover:bg-blue-50 border border-gray-200 rounded-lg"
                                >
                                    <FiEdit size={18} />
                                </ActionIcon>
                                <ActionIcon
                                    variant="light"
                                    onClick={onDelete}
                                    className="text-red-600 hover:bg-red-50 border border-gray-200 rounded-lg"
                                >
                                    <FiTrash size={18} />
                                </ActionIcon>
                            </div>
                        </div>
                    </Paper>
                ))
            ) : (
                <Paper className="p-12 border border-gray-200 rounded-lg shadow-sm">
                    <div className="flex flex-col items-center gap-4">
                        <FiUser size={48} className="text-gray-400" />
                        <Text className="text-gray-500">No users found</Text>
                    </div>
                </Paper>
            )}
        </div>
    )
}

export default TabUser