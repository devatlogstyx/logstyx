//@ts-check

import { FiPlus } from "react-icons/fi"
import PrimaryButton from "../../../component/button/PrimaryButton"
import { Modal, TextInput } from "@mantine/core"
import useAddUser from "./hooks"
import SecondaryButton from "../../../component/button/SecondaryButton"

const AddUser = ({
    onUpdate
}) => {

    const {
        isModalVisible,
        isSubmitting,
        openModal,
        closeModal,
        handleAddUser
    } = useAddUser()

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
                        <form onSubmit={handleAddUser} >
                            
                            <div className="flex justify-end gap-2 mt-4">
                                <SecondaryButton variant="subtle" onClick={closeModal}>
                                    Cancel
                                </SecondaryButton>
                                <PrimaryButton type="submit" disabled={isSubmitting}>Add User</PrimaryButton>
                            </div>
                        </form>

                    </div>
                </Modal>
            }

        </>
    )
}

export default AddUser