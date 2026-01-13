//@ts-check

import { useForm } from "@mantine/form";
import React, { useEffect, useState } from "react";
import { createWebhook, deleteWebhook, paginateWebhooks, testWebhook, updateWebhook } from "../../api/webhooks";
import { useErrorMessage, useSuccessMessage } from "../../hooks/useMessage";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";


export default function useDashboardWebhook() {
    const [webhooks, setWebhooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpened, setModalOpened] = useState(false);
    const [editingWebhook, setEditingWebhook] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const ErrorMessage = useErrorMessage()
    const SuccessMessage = useSuccessMessage()
    const { openConfirmDialog, ConfirmDialogComponent } = useConfirmDialog();

    const form = useForm({
        initialValues: {
            title: '',
            connection: {
                url: '',
                method: 'POST',
                headers: '{}',
                body_template: '{}',
                timeout: 10000,
                auth: {
                    type: 'none'
                }
            }
        },
        validate: {
            title: (value) => (!value || value.trim() === '' ? 'Webhook name is required' : null),
            connection: {
                url: (value) => {
                    if (!value || value.trim() === '') return 'URL is required';
                    try {
                        new URL(value);
                        return null;
                    } catch (e) {
                        return 'Invalid URL format';
                    }
                },
                headers: (value) => {
                    if (!value) return null;
                    try {
                        JSON.parse(value);
                        return null;
                    } catch (e) {
                        return 'Headers must be valid JSON';
                    }
                },
                body_template: (value) => {
                    if (!value) return 'Body template is required';
                    try {
                        JSON.parse(value);
                        return null;
                    } catch (e) {
                        return 'Body template must be valid JSON';
                    }
                }
            }
        }
    });

    const fetchWebhooks = React.useCallback(async () => {
        try {
            setLoading(true);
            const data = await paginateWebhooks();
            setWebhooks(data?.results || []);
        } catch (err) {
            ErrorMessage(err);
        } finally {
            setLoading(false);
        }
    }, [ErrorMessage])

    useEffect(() => {
        fetchWebhooks();
    }, [fetchWebhooks]);

    /**
     * 
     * @param {*} webhook 
     */
    const openModal = (webhook = null) => {
        if (webhook) {
            setEditingWebhook(webhook);
            form.setValues({
                title: webhook.title,
                connection: {
                    url: webhook.connection?.url || '',
                    method: webhook.connection?.method || 'POST',
                    headers: JSON.stringify(webhook.connection?.headers || {}, null, 2),
                    body_template: JSON.stringify(webhook.connection?.body_template || {}, null, 2),
                    timeout: webhook.connection?.timeout || 10000,
                    auth: webhook.connection?.auth || { type: 'none' }
                }
            });
        } else {
            setEditingWebhook(null);
            form.reset();
        }
        setModalOpened(true);
    };

    const closeModal = () => {
        setModalOpened(false);
        setEditingWebhook(null);
        form.reset();
    };

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
                connection: {
                    url: values.connection.url,
                    method: values.connection.method,
                    headers: JSON.parse(values.connection.headers),
                    body_template: JSON.parse(values.connection.body_template),
                    timeout: values.connection.timeout,
                    auth: values.connection.auth
                }
            };

            if (editingWebhook?.id) {
                await updateWebhook(editingWebhook.id, payload);
            } else {
                await createWebhook(payload);
            }

            await fetchWebhooks();
            closeModal();
        } catch (err) {
            ErrorMessage(err)
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = React.useCallback(async (id) => {
        openConfirmDialog({
            title: 'Remove Webhook',
            message: 'Are you sure you want to remove this webhook? This action cannot be undone.',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            onConfirm: async () => {
                try {
                    await deleteWebhook(id);
                    await fetchWebhooks();
                } catch (err) {
                    ErrorMessage(err)
                }
            },
            onCancel: () => console.log('Delete cancelled'),
        })

    }, [ErrorMessage, fetchWebhooks, openConfirmDialog])


    return {
        form,
        loading,
        openModal,
        webhooks,
        handleDelete,
        modalOpened,
        closeModal,
        editingWebhook,
        handleSubmit,
        isSubmitting,
        ConfirmDialogComponent
    }
}