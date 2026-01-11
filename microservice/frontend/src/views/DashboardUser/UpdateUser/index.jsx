//@ts-check

import { ActionIcon, Modal, Text } from "@mantine/core"
import { FiEdit } from "react-icons/fi"
import useUpdateUser from "./hook"
import FormUser from "../FormUser"

const UpdateUser = ({
    user,
    onUpdate
}) => {

    const {
        form,
        isEditModalVisible,
        isSubmitting,
        showEditModal,
        closeEditModal,
        handleUpdateUser
    } = useUpdateUser({
        initialValues: {
            fullname: user?.fullname,
            email: user?.email,
            permissions: user?.permissions
        },
        userId: user?.id,
        onUpdate
    })

    return (
        <>
            <ActionIcon
                variant="light"
                onClick={showEditModal}
            >
                <FiEdit size={18} />
            </ActionIcon>
            {
                isEditModalVisible &&
                < Modal
                    opened={true}
                    onClose={closeEditModal}
                    title={< Text className="font-bold text-lg" > Edit User Permission </Text >}
                    centered
                    classNames={{
                        content: 'rounded-lg',
                        header: 'border-b border-gray-200 pb-4',
                        body: 'pt-4'
                    }}
                >
                    <FormUser
                        onSubmit={handleUpdateUser}
                        onClose={closeEditModal}
                        isSubmitting={isSubmitting}
                        form={form}
                        isEditing={true}
                    />
                </Modal >
            }
        </>
    )
}

export default UpdateUser