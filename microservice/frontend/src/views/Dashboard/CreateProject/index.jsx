//@ts-check

import { IoAdd } from "react-icons/io5"
import PrimaryButton from "../../../component/button/PrimaryButton"
import useCreateProject from "./hooks"
import { Modal, TagsInput, TextInput } from "@mantine/core"
import SecondaryButton from "../../../component/button/SecondaryButton"

const CreateProject = ({
    onUpdate
}) => {

    const {
        form,
        isSubmitting,
        isModalVisible,
        handleSubmit,
        openModal,
        closeModal
    } = useCreateProject({
        onUpdate
    })

    return (
        <>
            <PrimaryButton
                leftSection={<IoAdd size={16} />}
                onClick={openModal}

            >
                New Project
            </PrimaryButton>

            {
                isModalVisible &&
                <Modal
                    opened={true}
                    onClose={closeModal}
                    title="Create Project"
                    className="min-w-xl"
                >
                    <form className="space-y-4" onSubmit={form.onSubmit(handleSubmit)}>
                        <TextInput label="Project Title" {...form.getInputProps('title')} />
                        <TagsInput
                            label="Indexed Fields (Hashed)"
                            description="Initial indexes cannot be removed. Good for strings and IDs."
                            placeholder="Enter fields to index"
                            {...form.getInputProps('indexes')}
                        />
                        <TagsInput
                            label="Raw Indexed Fields"
                            description="Initial raw indexes cannot be removed. Good for numbers and sortable fields."
                            placeholder="Enter fields to index"
                            {...form.getInputProps('rawIndexes')}
                        />
                        <TagsInput
                            label="Allowed Origins"
                            placeholder="Add allowed origins"
                            {...form.getInputProps('allowedOrigin')}
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <SecondaryButton onClick={closeModal} >
                                Cancel
                            </SecondaryButton>
                            <PrimaryButton type="submit" disabled={isSubmitting}>Submit</PrimaryButton>
                        </div>
                    </form>
                </Modal>
            }

        </>
    )
}

export default CreateProject