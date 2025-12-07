//@ts-check

import { FiSettings } from "react-icons/fi"
import PrimaryButton from "../../../component/button/PrimaryButton"
import { Modal, MultiSelect, NumberInput, TagsInput, TextInput } from "@mantine/core"
import SecondaryButton from "../../../component/button/SecondaryButton"
import useUpdateSettings from "./hooks"

const UpdateSettings = ({
    project,
    onUpdate
}) => {

    const {
        isSubmitting,
        form,
        isModalVisible,
        openModal,
        closeModal,
        handleSubmit
    } = useUpdateSettings({ project, onUpdate })
    return (
        <>
            <PrimaryButton leftSection={<FiSettings />} onClick={openModal} >
                Settings
            </PrimaryButton>
            {/* Settings Modal */}
            <Modal
                opened={isModalVisible}
                onClose={closeModal}
                title="Project Settings"
                className="min-w-xl"
            >
                <form className="space-y-4" onSubmit={form.onSubmit(handleSubmit)}>
                    <TextInput label="Project Title" {...form.getInputProps('title')} />
                    <TagsInput
                        label="Indexed Fields (Hashed)"
                        description="Initial indexes cannot be removed. Good for strings and IDs."
                        placeholder="Enter fields to index"
                        value={form.values.indexes}
                        onChange={(value) => {
                            const initialIndexes = project?.settings?.indexes || [];
                            // Get unique values that include all initial indexes
                            const uniqueValues = [...new Set([...initialIndexes, ...value])];
                            form.setFieldValue('indexes', uniqueValues);
                        }}
                        error={form.errors.indexes}
                    />

                    <TagsInput
                        label="Raw Indexed Fields"
                        description="Initial raw indexes cannot be removed. Good for numbers and sortable fields."
                        placeholder="Enter fields to index without hashing"
                        value={form.values.rawIndexes}
                        onChange={(value) => {
                            const initialRawIndexes = project?.settings?.rawIndexes || [];
                            // Get unique values that include all initial raw indexes
                            const uniqueValues = [...new Set([...initialRawIndexes, ...value])];
                            form.setFieldValue('rawIndexes', uniqueValues);
                        }}
                        error={form.errors.rawIndexes}
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
                        <PrimaryButton type="submit" disabled={isSubmitting}>Save Changes</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </>
    )
}

export default UpdateSettings