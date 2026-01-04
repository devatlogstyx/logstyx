//@ts-check

import { useForm } from "@mantine/form";
import React, { useCallback, useEffect, useState } from "react";
import { useErrorMessage } from "../../hooks/useMessage";
import { paginateProbe } from "../../api/probes";
import { listAllMyProject } from "../../api/project";

const useDashboardProbes = () => {
    const [list, setList] = useState([]);
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProbe, setEditingProbe] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [page, setPage] = useState(1)

    const controller = React.useMemo(() => new AbortController(), []);

    const ErrorMessage = useErrorMessage()

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
            const res = await paginateProbe(controller.signal, { page });
            setList(res);
        } catch (err) {
            ErrorMessage(err)
        } finally {
            setIsLoading(false);
        }
    }, [ErrorMessage, controller, page])

    const fetchProjects = useCallback(async () => {
        try {
            const data = await listAllMyProject(controller.signal);

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
    }, [ErrorMessage, controller])

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
            const url = editingProbe ? `/api/probes/${editingProbe.id}` : '/api/probes';
            const method = editingProbe ? 'PUT' : 'POST';

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

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to save probe');
            }

            await fetchProbes();
            closeModal();
        } catch (err) {
            ErrorMessage(err)
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this probe?')) return;

        try {
            const res = await fetch(`/api/probes/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete probe');
            await fetchProbes();
        } catch (err) {
            ErrorMessage(err)
        }
    };

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
        isSubmitting
    }
}

export default useDashboardProbes