//@ts-check

import { useForm } from "@mantine/form";
import React from "react";
import { useErrorMessage } from "../../../hooks/useMessage";
import { READ_BUCKET_USER_ROLE, READ_PROJECT_ROLE } from "../../../utils/constant";
import useAPI from "../../../hooks/useAPI";

const useCreateUserInvitation = ({
    onCreate
}) => {

    const [isInviteModalVisible, setIsInviteModalVisible] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const controller = React.useMemo(() => new AbortController(), []);
    const ErrorMessage = useErrorMessage()
    const InvitationAPI = useAPI(`/v1/user-invitations`)

    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            email: '',
            permissions: [READ_PROJECT_ROLE, READ_BUCKET_USER_ROLE],
            projects: []
        },

        validate: {
            email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Please enter a valid email'),
        },
    });


    const handleCreateInvitation = React.useCallback(async (payload) => {
        try {
            setIsSubmitting(true)
            await InvitationAPI.post(payload)
            onCreate()
            form.reset()
        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsInviteModalVisible(false)
            setIsSubmitting(false)
        }
    }, [ErrorMessage, InvitationAPI, onCreate, form])

    return {
        form,
        isInviteModalVisible,
        isSubmitting,
        showInviteModal: () => setIsInviteModalVisible(true),
        closeInviteModal: () => setIsInviteModalVisible(false),
        handleCreateInvitation
    }
}

export default useCreateUserInvitation