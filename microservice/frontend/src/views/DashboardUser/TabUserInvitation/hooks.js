//@ts-check

import React from "react";
import { removeUserInvitation } from "../../../api/user.invitation";
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";
import { useErrorMessage } from "../../../hooks/useMessage";

const useTabUserInvitation = ({
    onDelete
}) => {
    const controller = React.useMemo(() => new AbortController(), []);

    const { openConfirmDialog, ConfirmDialogComponent } = useConfirmDialog();
    const ErrorMessage = useErrorMessage()

    const handleRemove = React.useCallback(async (id) => {
        openConfirmDialog({
            title: 'Remove Invitation',
            message: 'Are you sure you want to remove this Invitation? This action cannot be undone.',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            onConfirm: async () => {
                try {
                    await removeUserInvitation(controller.signal, id)
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
        ConfirmDialogComponent
    }
}

export default useTabUserInvitation