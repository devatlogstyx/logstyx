//@ts-check

import { Modal, Select, TextInput } from "@mantine/core"
import { PRIVATE_REPORT_VISIBILITY, PUBLIC_REPORT_VISIBILITY } from "../../../utils/constant"
import SecondaryButton from "../../../component/button/SecondaryButton"
import PrimaryButton from "../../../component/button/PrimaryButton"

/**
 * 
 * @param {*} param0 
 * @returns 
 */
const EditModal = ({
    editModalOpened,
    closeEditModal,
    onEditSubmit,
    editTitle,
    setEditTitle,
    editVisibility,
    setEditVisibility,
    updating,
    canEditSubmit,

}) => {

    return (
        <Modal opened={editModalOpened} onClose={closeEditModal} title="Edit report" centered>
            <form onSubmit={onEditSubmit} className="flex flex-col gap-3">
                <TextInput
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Report title"
                    required
                />
                <Select
                    value={editVisibility}
                    onChange={(e) => setEditVisibility(e)}
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
                    <SecondaryButton onClick={closeEditModal} disabled={updating}>Cancel</SecondaryButton>
                    <PrimaryButton type="submit" disabled={!canEditSubmit}>
                        {updating ? 'Saving...' : 'Save'}
                    </PrimaryButton>
                </div>
            </form>
        </Modal>
    )
}

export default EditModal