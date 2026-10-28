//@ts-check

import React from "react";
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";
import { useErrorMessage } from "../../../hooks/useMessage";
import useAPI from "../../../hooks/useAPI";

const useTabUser = ({
    onDelete,
    onUpdate
}) => {

    const { openConfirmDialog, ConfirmDialogComponent } = useConfirmDialog();
    const ErrorMessage = useErrorMessage()

    const api = useAPI(`/v1/users`)

    const handleRemove = React.useCallback(async (id) => {
        openConfirmDialog({
            title: 'Remove User',
            
            message: 'Are you sure you want to remove this User? This action cannot be undone.',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            onConfirm: async () => {
                try {
                    await api.delete(id)
                    onDelete()
                } catch (e) {
                    ErrorMessage(e)
                }
            },
            onCancel: () => console.log('Delete cancelled'),
        })
    }, [ErrorMessage, api, openConfirmDialog, onDelete])

    // for a user who lost both the phone and the recovery codes
    const handleResetMfa = React.useCallback(async (id) => {
        openConfirmDialog({
            title: 'Reset Two-factor Authentication',
            message: 'This turns two-factor authentication off for this user. They can sign in with their password only until they set it up again.',
            confirmLabel: 'Reset',
            cancelLabel: 'Cancel',
            onConfirm: async () => {
                try {
                    await api.delete(`${id}/2fa`)
                    onUpdate()
                } catch (e) {
                    ErrorMessage(e)
                }
            },
        })
    }, [ErrorMessage, api, openConfirmDialog, onUpdate])

    return {
        handleRemove,
        handleResetMfa,
        ConfirmDialogComponent,
    }
}

export default useTabUser