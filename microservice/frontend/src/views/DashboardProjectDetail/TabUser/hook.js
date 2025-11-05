//@ts-check

import React from "react"
import { useErrorMessage } from "../../../hooks/useMessage"
import { removeUserFromProject } from "../../../api/project"
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";

const useTabUser = ({
    projectId,
    onUpdate
}) => {

    const controller = React.useMemo(() => new AbortController(), []);

    const ErrorMessage = useErrorMessage()
    const { openConfirmDialog, ConfirmDialogComponent } = useConfirmDialog();

    const handleRemoveUser = React.useCallback(async (userId) => {
        openConfirmDialog({
            title: 'Remove User',

            message: 'Are you sure you want to remove this User? This action cannot be undone.',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            onConfirm: async () => {
                try {
                    await removeUserFromProject(controller.signal, projectId, userId)
                    onUpdate()
                } catch (e) {
                    ErrorMessage(e)
                }
            },
            onCancel: () => console.log('Delete cancelled'),
        })

    }, [ErrorMessage, controller.signal, onUpdate, openConfirmDialog, projectId])

    return {
        handleRemoveUser,
        ConfirmDialogComponent
    }
}

export default useTabUser