//@ts-check

import React from "react";
import { useErrorMessage } from "../../../hooks/useMessage";
import { useNavigate, useParams } from "react-router-dom";
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";
import useAPI from "../../../hooks/useAPI";

const useTabOverview = () => {

    const { slug } = useParams()
        const [isSubmitting, setIsSubmitting] = React.useState(false)
    const ErrorMessage = useErrorMessage()
    const navigate = useNavigate()
    const api = useAPI("/v1/projects")

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

                    await api.delete(slug)

                    navigate(`/dashboard`)

                } catch (e) {
                    ErrorMessage(e)
                } finally {
                    setIsSubmitting(false)
                }
            },
            onCancel: () => console.log('Delete cancelled'),
        })

    }, [ErrorMessage, api, slug, navigate, openConfirmDialog])

    return {
        isSubmitting,
        handleDelete,
        ConfirmDialogComponent
    }
}

export default useTabOverview;