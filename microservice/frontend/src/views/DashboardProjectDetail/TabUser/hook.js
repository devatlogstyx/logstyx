//@ts-check

import React from "react"
import { useErrorMessage } from "../../../hooks/useMessage"
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";
import useAPI from "../../../hooks/useAPI";

const useTabUser = ({
    projectId,
    onUpdate
}) => {

    const ErrorMessage = useErrorMessage()
    const { openConfirmDialog, ConfirmDialogComponent } = useConfirmDialog();
    const api = useAPI("/v1/projects")

    const handleRemoveUser = React.useCallback(async (userId) => {
        openConfirmDialog({
            title: 'Remove User',

            message: 'Are you sure you want to remove this User? This action cannot be undone.',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            onConfirm: async () => {
                try {
                    await api.custom(`delete`, `/${projectId}/users/${userId}`, {})
                    onUpdate()
                } catch (e) {
                    ErrorMessage(e)
                }
            },
            onCancel: () => console.log('Delete cancelled'),
        })

    }, [ErrorMessage, api, onUpdate, openConfirmDialog, projectId])

    return {
        handleRemoveUser,
        ConfirmDialogComponent
    }
}

export default useTabUser