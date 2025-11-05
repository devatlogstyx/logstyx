//@ts-check

import { FiSettings } from "react-icons/fi"
import PrimaryButton from "../../../component/button/PrimaryButton"
import { Modal, MultiSelect, NumberInput, TextInput } from "@mantine/core"
import SecondaryButton from "../../../component/button/SecondaryButton"
import useUpdateSettings from "./hooks"

const UpdateSettings = ({
    project
}) => {

    const {
        isModalVisible,
        openModal,
        closeModal
    } = useUpdateSettings()
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
                <div className="space-y-4">
                    <TextInput label="Project Title" defaultValue={project.title} />
                    <TextInput label="Slug" defaultValue={project.slug} disabled />
                    <MultiSelect
                        label="Indexed Fields"
                        data={['userId', 'sessionId', 'errorCode', 'timestamp', 'endpoint']}
                        defaultValue={project.settings.indexes}
                        placeholder="Select fields to index"
                    />
                    <MultiSelect
                        label="Allowed Origins"
                        data={project.settings.allowedOrigin}
                        defaultValue={project.settings.allowedOrigin}
                        placeholder="Add allowed origins"
                        searchable
                    />
                    <NumberInput
                        label="Retention Days"
                        defaultValue={project.settings.retentionDays}
                        min={1}
                        max={365}
                    />
                    <div className="flex justify-end gap-2 mt-4">
                        <SecondaryButton onClick={closeModal} >
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton>Save Changes</PrimaryButton>
                    </div>
                </div>
            </Modal>
        </>
    )
}

export default UpdateSettings