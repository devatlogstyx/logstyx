//@ts-check

import { ActionIcon, Avatar, Badge, Paper, Text } from "@mantine/core"
import { IoMail, IoShield, IoTrash } from "react-icons/io5"
import { MdContentCopy } from 'react-icons/md'
import useTabUserInvitation from "./hooks"
import UpdateUserInvitation from "../UpdateUserInvitation"

const TabUserInvitation = ({
    invitations,
    onDelete,
    onUpdate
}) => {

    const {
        ConfirmDialogComponent,
        handleRemove,
        copyInvitationMessage
    } = useTabUserInvitation({
        onDelete
    })

    return (
        <>

            <div className="space-y-4">
                {invitations.length > 0 ? (
                    invitations.map(invitation => (
                        <Paper key={invitation.id} className="p-6 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Avatar className="w-12 h-12 rounded-full bg-gray-200">
                                        <IoMail size={24} className="text-gray-500" />
                                    </Avatar>
                                    <div>
                                        <Text className="font-semibold text-gray-900">{invitation.email}</Text>
                                        {
                                            invitation.projects?.length > 0 &&
                                            <div className="flex gap-2 flex-wrap mt-2">
                                                {invitation.projects?.length} Project(s)
                                            </div>
                                        }

                                        <div className="flex gap-2 flex-wrap mt-2">
                                            {invitation.permissions.map(perm => (
                                                <Badge
                                                    key={perm}
                                                    leftSection={<IoShield size={12} />}
                                                    variant="light"
                                                    className="bg-amber-50 text-amber-700 border border-amber-200"
                                                >
                                                    {perm}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <UpdateUserInvitation
                                        invitation={invitation}
                                        onUpdate={onUpdate}
                                    />
                                    <ActionIcon
                                        variant="light"
                                        onClick={() => {
                                            copyInvitationMessage(invitation.id)
                                        }}
                                    >
                                        <MdContentCopy size={18} />
                                    </ActionIcon>
                                    <ActionIcon
                                        variant="light"
                                        onClick={() => {
                                            handleRemove(invitation.id)
                                        }}
                                        className="!text-red-600 hover:bg-red-50 border border-gray-200 rounded-lg"
                                    >
                                        <IoTrash size={18} />
                                    </ActionIcon>
                                </div>
                            </div>
                        </Paper>
                    ))
                ) : (
                    <Paper className="p-12 border border-gray-200 rounded-lg shadow-sm">
                        <div className="flex flex-col items-center gap-4">
                            <IoMail size={48} className="text-gray-400" />
                            <Text className="text-gray-500">No pending invitations</Text>
                        </div>
                    </Paper>
                )}
            </div>
            <ConfirmDialogComponent />
        </>
    )
}

export default TabUserInvitation