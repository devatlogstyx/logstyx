//@ts-check

import React from "react";
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";
import { useErrorMessage } from "../../../hooks/useMessage";
import { removeUser } from "../../../api/user";

const useTabUser = ({
    onDelete
}) => {
    const controller = React.useMemo(() => new AbortController(), []);

    const { openConfirmDialog, ConfirmDialogComponent } = useConfirmDialog();
    const ErrorMessage = useErrorMessage()

    const handleRemove = React.useCallback(async (id) => {
        openConfirmDialog({
            title: 'Remove User',
            message: 'Are you sure you want to remove this User? This action cannot be undone.',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            onConfirm: async () => {
                try {
                    await removeUser(controller.signal, id)
                    onDelete()
                } catch (e) {
                    ErrorMessage(e)
                }
            },
            onCancel: () => console.log('Delete cancelled'),
        })
    }, [ErrorMessage, controller, openConfirmDialog, onDelete])

    return {
        handleRemove,
        ConfirmDialogComponent,
    }
}

export default useTabUser