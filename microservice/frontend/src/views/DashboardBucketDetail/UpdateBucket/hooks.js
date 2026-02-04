//@ts-check
import { useForm } from "@mantine/form";
import React from "react"
import { useErrorMessage } from "../../../hooks/useMessage";
import { updateBucket } from "../../../api/bucket";

const useUpdateBucket = ({
    bucket,
    onUpdate
}) => {

    const [isModalVisible, setIsModalVisible] = React.useState(false)
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const controller = React.useMemo(() => new AbortController(), []);

    const ErrorMessage = useErrorMessage()
    const initialHours = bucket?.settings?.retentionHours

    const isDays = initialHours > 0 && initialHours % 24 === 0;

    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            title: bucket?.title,
            projects: bucket?.projects ?? [],
            filter: bucket?.settings?.filter ?? [],
            indexes: bucket?.settings?.indexes,
            rawIndexes: bucket?.settings?.rawIndexes,
            deduplicationStrategy: bucket?.settings?.deduplicationStrategy,
            retentionHours: initialHours,
            // The display value (e.g., 168 becomes 7)
            retentionValue: isDays ? initialHours / 24 : initialHours,
            // The unit toggle state
            retentionUnit: isDays ? 'days' : 'hours',
        },
        validate: {
            projects: (value) => {
                // Check if it's an array
                if (!Array.isArray(value)) {
                    return 'Projects must be an array';
                }

                if (value?.length < 1) {
                    return 'Please select 1 or more project(s)';
                }

                return null;
            },
            indexes: (value) => {
                // Check if it's an array
                if (!Array.isArray(value)) {
                    return 'Indexes must be an array';
                }

                // Get initial indexes for comparison
                const initialIndexes = bucket?.settings?.indexes || [];

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
            rawIndexes: (value) => {
                // Check if it's an array
                if (!Array.isArray(value)) {
                    return 'RawIndexes must be an array';
                }

                // Get initial indexes for comparison
                const initialIndexes = bucket?.settings?.rawIndexes || [];

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

        },
    });

    const handleSubmit = React.useCallback(async (values) => {
        try {
            setIsSubmitting(true)
            await updateBucket(controller.signal, bucket?.id, values)
            onUpdate()
        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsSubmitting(false)
        }
    }, [ErrorMessage, controller, bucket, onUpdate])

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

export default useUpdateBucket