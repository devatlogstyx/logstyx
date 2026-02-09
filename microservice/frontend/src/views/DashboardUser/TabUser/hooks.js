//@ts-check

import React from "react";
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";
import { useErrorMessage } from "../../../hooks/useMessage";
import useAPI from "../../../hooks/useAPI";

const useTabUser = ({
    onDelete
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

    return {
        handleRemove,
        ConfirmDialogComponent,
    }
}

export default useTabUser