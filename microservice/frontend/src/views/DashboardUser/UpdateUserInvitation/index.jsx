//@ts-check

import { ActionIcon, Modal, Text } from "@mantine/core"
import { FiEdit } from "react-icons/fi"
import useUpdateUserInvitation from "./hook"
import FormInviteUser from "../FormInviteUser"

const UpdateUserInvitation = ({
    invitation,
    onUpdate
}) => {

    const {
        form,
        isEditModalVisible,
        isSubmitting,
        showInviteModal,
        closeInviteModal,
        handleUpdateInvitation
    } = useUpdateUserInvitation({
        initialValues: {
            email: invitation?.email,
            permissions: invitation?.permissions,
            projects: invitation?.projects,
        },
        invitationId: invitation?.id,
        onUpdate
    })

    return (
        <>
            <ActionIcon
                variant="light"
                onClick={showInviteModal}
            >
                <FiEdit size={18} />
            </ActionIcon>
            {
                isEditModalVisible &&
                < Modal
                    opened={true}
                    onClose={closeInviteModal}
                    title={< Text className="font-bold text-lg" > Edit Invitation </Text >}
                    centered
                    classNames={{
                        content: 'rounded-lg',
                        header: 'border-b border-gray-200 pb-4',
                        body: 'pt-4'
                    }}
                >
                    <FormInviteUser
                        onSubmit={handleUpdateInvitation}
                        onClose={closeInviteModal}
                        isSubmitting={isSubmitting}
                        form={form}
                        isEditing={true}
                    />
                </Modal >
            }
        </>
    )
}

export default UpdateUserInvitation