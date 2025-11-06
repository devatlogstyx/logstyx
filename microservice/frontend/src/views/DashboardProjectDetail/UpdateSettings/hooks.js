//@ts-check
import { useForm } from "@mantine/form";
import React from "react"
import { useErrorMessage } from "../../../hooks/useMessage";
import { updateProject } from "../../../api/project";
const useUpdateSettings = ({
    project,
    onUpdate
}) => {

    const [isModalVisible, setIsModalVisible] = React.useState(false)
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const controller = React.useMemo(() => new AbortController(), []);

    const ErrorMessage = useErrorMessage()

    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            title: project?.title,
            indexes: project?.settings?.indexes,
            allowedOrigin: project?.settings?.allowedOrigin
        },
        validate: {

            indexes: (value) => {
                // Check if it's an array
                if (!Array.isArray(value)) {
                    return 'Indexes must be an array';
                }

                // Get initial indexes for comparison
                const initialIndexes = project?.settings?.indexes || [];

                // Check if all initial values are still present
                for (const initialIndex of initialIndexes) {
                    if (!value.includes(initialIndex)) {
                        return `Cannot remove initial index: "${initialIndex}"`;
                    }
                }

                // Validate each index
                for (let i = 0; i < value.length; i++) {
                    const index = value[i]?.trim();

                    if (!index) {
                        return `Empty index at position ${i + 1}`;
                    }

                    // Check if it starts with context.* or data.*
                    const hasValidPrefix = index.startsWith('context.') || index.startsWith('data.');

                    if (!hasValidPrefix) {
                        return `Invalid index at position ${i + 1}: "${index}". Must start with "context." or "data."`;
                    }

                    // Optional: Check if there's something after the prefix
                    const afterPrefix = index.startsWith('context.')
                        ? index.substring(8) // 'context.'.length
                        : index.substring(5); // 'data.'.length

                    if (!afterPrefix) {
                        return `Invalid index at position ${i + 1}: "${index}". Must have a field name after the prefix`;
                    }
                }

                return null;
            },
            allowedOrigin: (value) => {
                // Check if it's an array
                if (!Array.isArray(value)) {
                    return 'Allowed origins must be an array';
                }

                // Check if array is empty (optional, remove if you allow empty arrays)
                if (value.length === 0) {
                    return 'At least one origin is required';
                }

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

                return null; // Valid
            }
        },
    });

    const handleSubmit = React.useCallback(async (values) => {
        try {
            await updateProject(controller.signal, project?.id, values)
            onUpdate()
        } catch (e) {
            ErrorMessage(e)
        }
    }, [ErrorMessage, controller, project, onUpdate])

    return {
        form,
        isModalVisible,
        isSubmitting,
        handleSubmit,
        openModal: () => setIsModalVisible(true),
        closeModal: () => setIsModalVisible(false),
    }
}

export default useUpdateSettings