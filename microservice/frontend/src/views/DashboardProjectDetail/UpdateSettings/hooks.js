//@ts-check
import { useForm } from "@mantine/form";
import React from "react"
import { useErrorMessage } from "../../../hooks/useMessage";
import useAPI from "../../../hooks/useAPI";
const useUpdateSettings = ({
    project,
    onUpdate
}) => {

    const [isModalVisible, setIsModalVisible] = React.useState(false)
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const api = useAPI(`/v1/projects`)

    const ErrorMessage = useErrorMessage()
    const initialHours = project?.settings?.retentionHours

    const isDays = initialHours > 0 && initialHours % 24 === 0;

    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            title: project?.title,
            allowedOrigin: project?.settings?.allowedOrigin,        },
        validate: {
            allowedOrigin: (value) => {
                // Check if it's an array
                if (!Array.isArray(value)) {
                    return 'Allowed origins must be an array';
                }

                // Check if array is empty (optional, remove if you allow empty arrays)
                if (value.length > 0) {
                    // Validate each origin
                    for (let i = 0; i < value.length; i++) {
                        const origin = value[i];

                        // Check for wildcard
                        if (origin === '*') {
                            continue; // Allow wildcard
                        }

                        // Check for valid URL format
                        try {
                            const url = new URL(origin);
                            // Ensure it has protocol and hostname
                            if (!url.protocol || !url.hostname) {
                                return `Invalid origin at index ${i}: ${origin}`;
                            }
                        } catch (e) {
                            return `${e?.name}:Invalid origin format at index ${i}: ${origin}`;
                        }
                    }
                }

                return null; // Valid
            }
        },
    });

    const handleSubmit = React.useCallback(async (values) => {
        try {
            setIsSubmitting(true)
            await api.put(project?.id, values)
            onUpdate()
        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsSubmitting(false)
        }
    }, [ErrorMessage, api, project, onUpdate])

    return {
        form,
        isModalVisible,
        isSubmitting,
        handleSubmit,
        openModal: () => setIsModalVisible(true),
        closeModal: () => {
            setIsModalVisible(false);
            form.reset()
        },
    }
}

export default useUpdateSettings