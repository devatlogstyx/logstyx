//@ts-check

import { Modal, Select, TextInput } from "@mantine/core"
import PrimaryButton from "../../../component/button/PrimaryButton"
import { PRIVATE_REPORT_VISIBILITY, PUBLIC_REPORT_VISIBILITY } from "../../../utils/constant"
import SecondaryButton from "../../../component/button/SecondaryButton"

/**
 * 
 * @param {*} param0 
 * @returns 
 */
const CreateReport = ({
    openCreateModal,
    createModalOpened,
    closeCreateModal,
    title,
    setTitle,
    onCreateSubmit,
    visibility,
    setVisibility,
    creating,
    canSubmit
}) => {

    return (
        <>
            <PrimaryButton className="bg-blue-600 text-white px-4 py-2" onClick={openCreateModal}>Create</PrimaryButton>
            <Modal opened={createModalOpened} onClose={closeCreateModal} title="Create report" centered>
                <form onSubmit={onCreateSubmit} className="flex flex-col gap-3">
                    <TextInput
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Report title"
                        required
                    />
                    <Select
                        value={visibility}
                        onChange={(e) => setVisibility(e)}
                        data={[
                            {
                                value: PRIVATE_REPORT_VISIBILITY,
                                label: "Private"
                            },
                            {
                                value: PUBLIC_REPORT_VISIBILITY,
                                label: "Public"
                            }
                        ]}
                    />
                    <div className="flex justify-end gap-2 mt-2">
                        <SecondaryButton onClick={closeCreateModal} disabled={creating}>Cancel</SecondaryButton>
                        <PrimaryButton type="submit" disabled={!canSubmit}>
                            {creating ? 'Creating...' : 'Create'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal >
        </>
    )
}

export default CreateReport