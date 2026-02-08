//@ts-check
"use client"


import { useForm } from "@mantine/form";
import React from "react";
import { useErrorMessage } from "../../hooks/useMessage";
import { setupUser } from "../../api/user";

const useUserSetupPage = () => {

    const [step, setStep] = React.useState(1);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const controller = React.useMemo(() => new AbortController(), []);

    const ErrorMessage = useErrorMessage()

    const form = useForm({
        initialValues: {
            fullname: '',
            email: '',
            password: '',
            repassword: ''
        },
        validate: {
            fullname: (value) => (!value.trim() ? 'Name is required' : null),
            email: (value) => {
                if (!value.trim()) return 'Email is required';
                if (!/\S+@\S+\.\S+/.test(value)) return 'Email is invalid';
                return null;
            },
            password: (value) => {
                if (!value) return 'Password is required';
                if (value.length < 8) return 'Password must be at least 8 characters';
                return null;
            },
            repassword: (value, values) => {
                if (!value) return 'Please confirm your password';
                if (value !== values.password) return 'Passwords do not match';
                return null;
            }
        }
    });

    const handleNext = () => {
        const validation = form.validate();
        if (!validation.hasErrors) {
            setStep(2);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await setupUser(controller.signal, form?.values);
            setStep(3)
        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsSubmitting(false);
        }

    };

    const handleLogin = () => {
        window.location.href = '/login';
    };

    return {
        handleLogin,
        handleSubmit,
        handleNext,
        step,
        setStep,
        form,
        isSubmitting,
    }

}

export default useUserSetupPage