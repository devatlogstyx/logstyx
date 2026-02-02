//@ts-check

import React from "react";
import { createAlert, deleteAlert, findAlertById, paginateAlerts, updateAlert } from "../../api/alert";
import { useErrorMessage } from "../../hooks/useMessage";
import { useForm } from "@mantine/form";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";

const useDashboardAlert = () => {

    const [list, setList] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [page, setPage] = React.useState(1)
    const [isModalOpen, setIsModalOpen] = React.useState(false)
    const [editingAlert, setEditingAlert] = React.useState(null)
    const [isSubmitting, setIsSubmitting] = React.useState(null)

    const controller = React.useMemo(() => new AbortController(), []);

    const { openConfirmDialog, ConfirmDialogComponent } = useConfirmDialog();

    const ErrorMessage = useErrorMessage()

    const form = useForm({
        initialValues: {
            title: '',
            webhook: null,
            bucket: null,
            config: {
                filter: [],
                template: {},
                deduplicationMinutes: 0,
            }

        },
        validate: {
            title: (value) => (!value || value.trim() === '' ? 'Webhook name is required' : null),

        }
    });


    const fetchAlert = React.useCallback(async () => {
        try {
            setLoading(true);
            const data = await paginateAlerts(controller.signal, { page });
            setList(data);
        } catch (err) {
            ErrorMessage(err);
        } finally {
            setLoading(false);
        }
    }, [ErrorMessage, page, controller])

    React.useEffect(() => {
        fetchAlert();
    }, [fetchAlert]);

    const openModal = (alert = null) => {
        if (alert) {
            setEditingAlert(alert);
            form.setValues({
                title: alert?.title,
                webhook: alert?.webhook,
                bucket: alert?.bucket,
                config: {
                    filter: alert?.config?.filter,
                    template: alert?.config?.template,
                    deduplicationMinutes: alert?.config?.deduplicationMinutes,
                }
            });
        } else {
            setEditingAlert(null);
            form.reset();
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        if (editingAlert) {
            setEditingAlert(null);
            form.reset()
        }
        setIsModalOpen(false);
    };

    const handleDelete = (id) => {
        openConfirmDialog({
            title: 'Remove Alert',
            message: 'Are you sure you want to remove this Alert? This action cannot be undone.',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            onConfirm: async () => {
                try {
                    await deleteAlert(controller.signal, id);
                    await fetchAlert();
                } catch (err) {
                    ErrorMessage(err)
                }
            },
            onCancel: () => console.log('Delete cancelled'),
        })

    }
    const handleEdit = async (id) => {
        try {
            const data = await findAlertById(controller.signal, id)
            openModal(data)
        } catch (e) {
            ErrorMessage(e)
        }
    }

    /**
     * 
     * @param {*} values 
     */
    const handleSubmit = async (values) => {
        setIsSubmitting(true);
        try {
            // Parse JSON strings
            const payload = {
                title: values.title,
                webhook: values.webhook,
                bucket: values.bucket,
                config: {
                    filter: values?.config?.filter,
                    template: values?.config?.template,
                    deduplicationMinutes: values.config.deduplicationMinutes,
                }
            };

            if (editingAlert?.id) {
                await updateAlert(controller.signal, editingAlert.id, payload);
            } else {
                await createAlert(controller.signal, payload);
            }

            await fetchAlert();
            closeModal();
        } catch (err) {
            ErrorMessage(err)
        } finally {
            setIsSubmitting(false);
        }
    }

    return {
        page,
        setPage,
        loading,
        list,
        openModal,
        editingAlert,
        isModalOpen,
        closeModal,
        form,
        isSubmitting,
        handleDelete,
        handleEdit,
        handleSubmit,
        ConfirmDialogComponent
    }
}

export default useDashboardAlert