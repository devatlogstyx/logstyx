//@ts-check

import { useForm } from "@mantine/form";
import React from "react";
import { useErrorMessage } from "../../../hooks/useMessage";
import { updateUser } from "../../../api/user";

const useUpdateUser = ({
    initialValues,
    userId,
    onUpdate
}) => {

    const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const controller = React.useMemo(() => new AbortController(), []);
    const ErrorMessage = useErrorMessage()

    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            ...initialValues
        },
    });


    const handleUpdateUser = React.useCallback(async (payload) => {
        try {
            setIsSubmitting(true)
            await updateUser(controller.signal, userId, payload)
            onUpdate()
            form.reset()
        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsEditModalVisible(false)
            setIsSubmitting(false)
        }
    }, [ErrorMessage, controller, onUpdate, form, userId])

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