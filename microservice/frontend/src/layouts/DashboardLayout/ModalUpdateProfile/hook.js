import { useForm } from "@mantine/form";
import { useUser } from "../../../context/useUser";
import React from "react";
import { useErrorMessage } from "../../../hooks/useMessage";
import useAPI from "../../../hooks/useAPI";

//@ts-check
const useModalUpdateProfile = ({
    onClose
}) => {

    const { user } = useUser()
    const [activeTab, setActiveTab] = React.useState("profile")
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const ErrorMessage = useErrorMessage()

    const api = useAPI("/v1/users")

    const profileForm = useForm({
        mode: 'uncontrolled',
        initialValues: {
            fullname: user?.fullname,
            email: user?.email
        },
        validate: {
            fullname: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Full name is required';
                }
                if (value.trim().length < 2) {
                    return 'Full name must be at least 2 characters';
                }
                return null;
            },
            email: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Email is required';
                }
                if (!/^\S+@\S+\.\S+$/.test(value)) {
                    return 'Invalid email format';
                }
                return null;
            }
        }
    });

    const passwordForm = useForm({
        mode: 'uncontrolled',
        initialValues: {
            oldpassword: '',
            newpassword: '',
            repassword: ''
        },
        validate: {
            oldpassword: (value) => {
                if (!value || value.length === 0) {
                    return 'Current password is required';
                }
                return null;
            },
            newpassword: (value) => {
                if (!value || value.length === 0) {
                    return 'New password is required';
                }

                return null;
            },
            repassword: (value, values) => {
                if (!value || value.length === 0) {
                    return 'Please confirm your password';
                }
                if (value !== values.newpassword) {
                    return 'Passwords do not match';
                }
                return null;
            }
        }

    });

    const handleSubmitPassword = React.useCallback(async (values) => {
        try {
            setIsSubmitting(true)
            await api.custom("patch", "/me/password", { body: values })
            onClose()
        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsSubmitting(false)

        }
    }, [ErrorMessage, api, onClose])

    const handleSubmitProfile = React.useCallback(async (values) => {
        try {
            setIsSubmitting(true)
            await api.put("me", values)
            location.reload()
        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsSubmitting(false)

        }
    }, [ErrorMessage, api])

    return {
        profileForm,
        passwordForm,
        activeTab,
        isSubmitting,
        handleSubmitPassword,
        handleSubmitProfile,
        changeTab: (tab) => setActiveTab(tab),
    }
}

export default useModalUpdateProfile