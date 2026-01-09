//@ts-check

import { Modal } from "@mantine/core"
import PrimaryButton from "../../../component/button/PrimaryButton"
import { PRIVATE_REPORT_VISIBILITY, PUBLIC_REPORT_VISIBILITY } from "../../../utils/constant"

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
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Report title"
                        className="border p-2"
                        required
                    />
                    <select
                        value={visibility}
                        onChange={(e) => setVisibility(e.target.value)}
                        className="border p-2"
                    >
                        <option value={PRIVATE_REPORT_VISIBILITY}>Private</option>
                        <option value={PUBLIC_REPORT_VISIBILITY}>Public</option>
                    </select>
                    <div className="flex justify-end gap-2 mt-2">
                        <button type="button" className="px-4 py-2 border" onClick={closeCreateModal} disabled={creating}>Cancel</button>
                        <PrimaryButton className="bg-blue-600 text-white px-4 py-2" type="submit" disabled={!canSubmit}>
                            {creating ? 'Creating...' : 'Create'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </>
    )
}

export default CreateReport