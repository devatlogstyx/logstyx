//@ts-check

import { FiPlus } from "react-icons/fi"
import PrimaryButton from "../../../component/button/PrimaryButton"
import { Modal, MultiSelect, Select, TextInput } from "@mantine/core"
import useAddUser from "./hooks"
import SecondaryButton from "../../../component/button/SecondaryButton"

const AddUser = ({
    projectId,
    projectUsers,
    onUpdate
}) => {

    const {
        isModalVisible,
        isSubmitting,
        form,
        users,
        openModal,
        closeModal,
        handleAddUser
    } = useAddUser({
        projectUsers,
        onUpdate,
        projectId,

    })

    return (
        <>
            <PrimaryButton leftSection={<FiPlus />} onClick={openModal}>
                Add User
            </PrimaryButton>
            {
                isModalVisible &&
                <Modal
                    opened={true}
                    title="Add Team Member"
                    onClose={closeModal}
                >
                    <div className="space-y-4">
                        <form onSubmit={form.onSubmit(handleAddUser)} >
                            <Select
                                placeholder="Select User"
                                data={users?.map((n) => {
                                    return {
                                        value: n?.id,
                                        label: n?.fullname
                                    }
                                })}
                                clearable
                                searchable
                                {...form.getInputProps('userId')}

                            />

                            <div className="flex justify-end gap-2 mt-4">
                                <SecondaryButton variant="subtle" onClick={closeModal}>
                                    Cancel
                                </SecondaryButton>
                                <PrimaryButton type="submit" disabled={isSubmitting} loading={isSubmitting}>Add User</PrimaryButton>
                            </div>
                        </form>

                    </div>
                </Modal>
            }

        </>
    )
}

export default AddUser