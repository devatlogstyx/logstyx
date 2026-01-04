//@ts-check

import React from "react";
import { useErrorMessage } from "../../../hooks/useMessage";
import { useNavigate, useParams } from "react-router-dom";
import { removeProject } from "../../../api/project";
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";

const useTabOverview = () => {

    const { slug } = useParams()
    const controller = React.useMemo(() => new AbortController(), []);
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const ErrorMessage = useErrorMessage()
    const navigate = useNavigate()

    const { openConfirmDialog, ConfirmDialogComponent } = useConfirmDialog();

    const handleDelete = React.useCallback(async () => {
        openConfirmDialog({
            title: 'Remove Prohect',

            message: 'Are you sure you want to remove this project? This action cannot be undone.',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            onConfirm: async () => {
                try {
                    setIsSubmitting(true)

                    await removeProject(controller.signal, slug)

                    navigate(`/dashboard`)

                } catch (e) {
                    ErrorMessage(e)
                } finally {
                    setIsSubmitting(false)
                }
            },
            onCancel: () => console.log('Delete cancelled'),
        })

    }, [ErrorMessage, controller, slug, navigate, openConfirmDialog])

    return {
        isSubmitting,
        handleDelete,
        ConfirmDialogComponent
    }
}

export default useTabOverview;