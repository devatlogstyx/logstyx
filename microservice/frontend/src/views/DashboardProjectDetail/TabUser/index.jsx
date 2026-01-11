//@ts-check

import { ActionIcon, Avatar, Button, Table } from "@mantine/core"
import { FiEdit, FiPlus, FiTrash2 } from "react-icons/fi"
import AddUser from "../AddUser"
import useTabUser from "./hook"
import { useUser } from "../../../context/useUser"
import { WRITE_PROJECT_ROLE } from "../../../utils/constant"
import moment from "moment-timezone"

const {
    Thead,
    Tbody,
    Td,
    Tr,
    Th
} = Table

const TabUser = ({
    projectId,
    users,
    onUpdate
}) => {

    const { user: currentUser } = useUser()

    const {
        handleRemoveUser,
        ConfirmDialogComponent
    } = useTabUser({
        projectId,
        onUpdate
    })

    return (
        <>

            <div className="p-6 rounded-md border shadow-sm bg-white">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Team Members</h3>
                    <AddUser
                        projectId={projectId}
                        projectUsers={users}
                        onUpdate={onUpdate}
                    />
                </div>
                <Table highlightOnHover>
                    <Thead>
                        <Tr>
                            <Th>User</Th>
                            <Th>Joined At</Th>
                            <Th></Th>
                        </Tr>
                    </Thead>
                    <tbody>
                        {users.map((user) => (
                            <Tr key={user.id}>
                                <Td>
                                    <div className="flex gap-2 items-center">
                                        <Avatar
                                            name={user?.fullname}
                                            src={user?.image}
                                        />
                                        <span className="font-medium">{user.fullname} {currentUser?.id === user?.id ? "(You)" : ""}</span>
                                    </div>
                                </Td>
                                <Td >
                                    <span className="text-sm text-gray-500">
                                        {moment(user.createdAt).format("MMM Do YYYY, HH:mm")}
                                    </span>
                                </Td>
                                <Td className="flex justify-end ">
                                    <div className="flex gap-2">
                                        {
                                            user?.id !== currentUser?.id &&
                                            currentUser?.permissions?.includes(WRITE_PROJECT_ROLE) &&
                                            <ActionIcon color="red"
                                                onClick={() => handleRemoveUser(user?.id)}
                                            >
                                                <FiTrash2 className="w-4 h-4" />
                                            </ActionIcon>
                                        }

                                    </div>
                                </Td>
                            </Tr>
                        ))}
                    </tbody>
                </Table>
            </div>
            <ConfirmDialogComponent />
        </>
    )
}

export default TabUser