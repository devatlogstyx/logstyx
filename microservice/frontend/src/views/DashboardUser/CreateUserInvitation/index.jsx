//@ts-check

import { Button, Grid, Modal, MultiSelect, Text, TextInput } from "@mantine/core"

import useCreateUserInvitation from "./hooks";
import FormInviteUser from "../FormInviteUser";
import { FiPlus } from "react-icons/fi";
import PrimaryButton from "../../../component/button/PrimaryButton";

const CreateUserInvitation = ({
    onCreate
}) => {

    const {
        form,
        isInviteModalVisible,
        isSubmitting,
        showInviteModal,
        closeInviteModal,
        handleCreateInvitation
    } = useCreateUserInvitation({
        onCreate
    })

    return (
        <>
            <div className="flex gap-4 items-center justify-end">
                <PrimaryButton
                    leftSection={<FiPlus size={16} />}
                    onClick={showInviteModal}
                >
                    Invite User
                </PrimaryButton>
            </div>
            {
                isInviteModalVisible &&
                < Modal
                    opened={true}
                    onClose={closeInviteModal}
                    title={< Text className="font-bold text-lg" > Invite New User</Text >}
                    centered
                    classNames={{
                        content: 'rounded-lg',
                        header: 'border-b border-gray-200 pb-4',
                        body: 'pt-4'
                    }}
                >
                    <FormInviteUser
                        onSubmit={handleCreateInvitation}
                        onClose={closeInviteModal}
                        isSubmitting={isSubmitting}
                        form={form}
                    />
                </Modal >
            }

        </>

    )
}

export default CreateUserInvitation