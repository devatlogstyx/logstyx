//@ts-check

import { useForm } from "@mantine/form";
import React from "react";
import { useErrorMessage } from "../../../hooks/useMessage";
import { FULL_PAYLOAD_DEDUPLICATION_STRATEGY } from "../../../utils/constant";
import useAPI from "../../../hooks/useAPI";

const useCreateBucket = ({
    onUpdate
}) => {

    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [isModalVisible, setIsModalVisible] = React.useState(false)
    const [step, setStep] = React.useState(0)

    const api = useAPI("/v1/buckets")
    const ErrorMessage = useErrorMessage()

    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            title: "",
            projects: [],
            filter: [],
            indexes: [],
            rawIndexes: [],
            deduplicationStrategy: FULL_PAYLOAD_DEDUPLICATION_STRATEGY
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

        },
    });

    const handleSubmit = React.useCallback(async (values) => {
        try {
            setIsSubmitting(true)
            const payload = {
                title: values?.title,
                projects: values?.projects,
                settings: {
                    filter: values?.filter,
                    indexes: values?.indexes,
                    rawIndexes: values?.rawIndexes,
                    retentionHours: values?.retentionUnit === "days" ? values.retentionValue * 24 : values.retentionValue,
                    deduplicationStrategy: values?.deduplicationStrategy
                }
            }
            await api.post(payload)
            onUpdate()
        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsSubmitting(false)
        }
    }, [ErrorMessage, api, onUpdate])

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
        step,
        setStep
    }
}

export default useCreateBucket