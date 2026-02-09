//@ts-check

import { useForm } from "@mantine/form";
import React from "react";
import { useErrorMessage } from "../../../hooks/useMessage";
import useAPI from "../../../hooks/useAPI";

const useUpdateUser = ({
    initialValues,
    userId,
    onUpdate
}) => {

    const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const ErrorMessage = useErrorMessage()

    const api = useAPI(`/v1/users`)

    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            ...initialValues
        },
    });


    const handleUpdateUser = React.useCallback(async (payload) => {
        try {
            setIsSubmitting(true)
            await api.put( userId, payload)
            onUpdate()
            form.reset()
        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsEditModalVisible(false)
            setIsSubmitting(false)
        }
    }, [ErrorMessage, api, onUpdate, form, userId])

    return {
        form,
        isEditModalVisible,
        isSubmitting,
        showEditModal: () => setIsEditModalVisible(true),
        closeEditModal: () => {
            setIsEditModalVisible(false)
            form.reset()
        },
        handleUpdateUser
    }
}

export default useUpdateUser