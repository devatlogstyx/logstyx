//@ts-check

import React from "react";
import { removeUserInvitation } from "../../../api/user.invitation";
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";
import { useErrorMessage, useSuccessMessage } from "../../../hooks/useMessage";
import { useClipboard } from "@mantine/hooks";
import { PROJECT_TITLE } from "../../../utils/constant";

const useTabUserInvitation = ({
    onDelete
}) => {
    const controller = React.useMemo(() => new AbortController(), []);

    const { openConfirmDialog, ConfirmDialogComponent } = useConfirmDialog();
    const ErrorMessage = useErrorMessage()
    const SuccessMessage = useSuccessMessage()

    const clipboard = useClipboard({ timeout: 500 });

    /**
     * 
     * @param {object} invitation 
     * @param {string} invitation.id
     * @param {string} invitation.email
     * @returns 
     */
    const copyInvitationMessage = (invitation) => {
        clipboard.copy(`${PROJECT_TITLE || 'LOGSTYX'} invitation: Visit ${window.location.protocol}//${window.location.host}/invitations/${invitation?.id} and use ${invitation?.email} to activate your access.`)
        SuccessMessage(`Invitation copied!`)
        return null
    }

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
        ConfirmDialogComponent,
        copyInvitationMessage
    }
}

export default useTabUserInvitation