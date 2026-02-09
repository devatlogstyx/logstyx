//@ts-check

import { useForm } from "@mantine/form";
import React, { useCallback, useEffect, useState } from "react";
import { useErrorMessage } from "../../hooks/useMessage";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import useAPI from "../../hooks/useAPI";


const useDashboardProbes = () => {
    const [list, setList] = useState([]);
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProbe, setEditingProbe] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [page, setPage] = useState(1)

    const ProbeAPI = useAPI("/v1/probes")
    const UserAPI = useAPI("/v1/users/me")

    const ErrorMessage = useErrorMessage()
    const { openConfirmDialog, ConfirmDialogComponent } = useConfirmDialog();

    const form = useForm({
        initialValues: {
            title: '',
            project: '',
            delay: 60,
            connection: {
                method: 'GET',
                url: '',
                timeout: 10000,
                auth: {
                    type: 'none',
                },
                context: "{}"
            }
        }
    });

    const fetchProbes = useCallback(async () => {
        try {
            const res = await ProbeAPI.paginate({ page });
            setList(res);
        } catch (err) {
            ErrorMessage(err)
        } finally {
            setIsLoading(false);
        }
    }, [ErrorMessage, ProbeAPI, page])

    const fetchProjects = useCallback(async () => {
        try {
            const data = await UserAPI.get("projects");

            // @ts-ignore
            setProjects(data?.map((n) => {
                return {
                    value: n?.id,
                    label: n?.title
                }
            })?.sort((a, b) => a.label.localeCompare(b.label)));
        } catch (err) {
            ErrorMessage(err)
        }
    }, [ErrorMessage, UserAPI])

    useEffect(() => {
        fetchProbes();
        fetchProjects();
    }, [fetchProbes, fetchProjects]);

    const openModal = (probe = null) => {
        if (probe) {
            setEditingProbe(probe);
            form.setValues({
                title: probe.title,
                project: probe.project.id,
                delay: probe.delay,
                connection: probe.connection || {
                    method: 'GET',
                    url: '',
                    timeout: 10000,
                    auth: { type: 'none' },
                    context: JSON.stringify(probe.connection?.context || {}, null, 2) // ← Stringify
                }
            });
        } else {
            setEditingProbe(null);
            form.reset();
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingProbe(null);
        form.reset();
    };

    const handleSubmit = async (values) => {
        setIsSubmitting(true);

        try {


            // Parse the context JSON string back to object
            const payload = {
                ...values,
                connection: {
                    ...values.connection,
                    context: values.connection.context
                        ? JSON.parse(values.connection.context)
                        : {}
                }
            };

            if (editingProbe) {
                await ProbeAPI.put(editingProbe.id, payload)
            } else {
                await ProbeAPI.post(payload)
            }

            await fetchProbes();
            form.reset()

            closeModal();
        } catch (err) {
            console.error(err)
            ErrorMessage(err)
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = React.useCallback(async (id) => {
        openConfirmDialog({
            title: 'Remove Probe',

            message: 'Are you sure you want to remove this probe? This action cannot be undone.',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            onConfirm: async () => {
                try {
                    await ProbeAPI.delete(id)
                    await fetchProbes();
                } catch (err) {
                    ErrorMessage(err)
                }
            },
            onCancel: () => console.log('Delete cancelled'),
        })

    }, [ErrorMessage, ProbeAPI, fetchProbes, openConfirmDialog])

    const authType = form.values.connection.auth.type;


    return {
        isLoading,
        openModal,
        list,
        page,
        setPage,
        handleDelete,
        isModalOpen,
        closeModal,
        editingProbe,
        form,
        handleSubmit,
        projectOptions: projects,
        authType,
        isSubmitting,
        ConfirmDialogComponent
    }
}

export default useDashboardProbes