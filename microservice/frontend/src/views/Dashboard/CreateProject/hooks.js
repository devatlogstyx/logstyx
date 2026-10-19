//@ts-check

import { useForm } from "@mantine/form";
import React from "react";
import { useErrorMessage } from "../../../hooks/useMessage";
import { FULL_PAYLOAD_DEDUPLICATION_STRATEGY } from "../../../utils/constant";
import useAPI from "../../../hooks/useAPI";

const useCreateProject = ({
    onUpdate
}) => {

    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [isModalVisible, setIsModalVisible] = React.useState(false)
    const [step, setStep] = React.useState(0)

    const ErrorMessage = useErrorMessage()

    const api = useAPI("/v1/projects")

    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            title: "",
            filter: [],
            indexes: [],
            rawIndexes: [],
            allowedOrigin: [],
            deduplicationStrategy: FULL_PAYLOAD_DEDUPLICATION_STRATEGY,
            retentionValue: 0,
            retentionUnit: "hours",
            retentionHours: 0
        },
        validate: {

            indexes: (value) => {
                // Check if it's an array
                if (!Array.isArray(value)) {
                    return 'Indexes must be an array';
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
            const payload = {
                title: values?.title,
                settings: {
                    filter: values?.filter,
                    indexes: values?.indexes,
                    rawIndexes: values?.rawIndexes,
                    allowedOrigin: values?.allowedOrigin,
                    retentionHours: values?.retentionUnit === "days" ? values.retentionValue * 24 : values.retentionValue,
                    deduplicationStrategy: values?.deduplicationStrategy
                }
            }
            await api.post(payload)
            setIsModalVisible(false)
            setStep(0)
            form.reset()
            onUpdate()
        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsSubmitting(false)
        }
    }, [ErrorMessage, api, onUpdate, form])

    // Fields on the first step are unmounted while on step 2, so their
    // validation errors would be invisible. Jump back and surface the message.
    const handleValidationError = React.useCallback((errors) => {
        const [field, message] = Object.entries(errors)[0] || []
        if (!field) return
        if (field === "title" || field === "allowedOrigin") {
            setStep(0)
        }
        ErrorMessage(new Error(String(message)))
    }, [ErrorMessage])

    return {
        form,
        isSubmitting,
        isModalVisible,
        openModal: () => setIsModalVisible(true),
        closeModal: () => {
            setIsModalVisible(false)
            setStep(0)
        },
        handleSubmit,
        handleValidationError,
        step,
        setStep
    }
}

export default useCreateProject