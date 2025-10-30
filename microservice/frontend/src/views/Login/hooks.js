//@ts-check
import React from "react"
import { useErrorMessage } from "../../hooks/useMessage"
import { getCurrentUser, userLogin } from "../../api/user"
import { useNavigate } from "react-router-dom"
import { EMAIL_PASSWORD_LOGIN_TYPE } from "../../utils/constant"
const useLogin = () => {
    const ErrorMessage = useErrorMessage()
    const navigate = useNavigate()
    const controller = React.useMemo(() => new AbortController(), []);


    const [isLoading, setIsLoading] = React.useState(true)
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const fetchUser = React.useCallback(async (/** @type {any} */ signal) => {
        try {
            setIsLoading(true)
            const user = await getCurrentUser(signal)
            if (user) {
                navigate(`/dashboard`)
            }
        } catch (e) {

            ErrorMessage(e)
        } finally {
            setIsLoading(false)
        }
    }, [ErrorMessage, navigate])

    React.useEffect(() => {


        fetchUser(controller.signal)
        return () => {
            controller.abort();
        };

    }, [fetchUser, controller])

    const handleLogin = React.useCallback(async (payload) => {
        try {
            setIsSubmitting(true)
            payload.type = EMAIL_PASSWORD_LOGIN_TYPE
            await userLogin(payload, controller.signal)
            navigate(`/dashboard`)
        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsSubmitting(false)
        }
    }, [ErrorMessage, navigate, controller])

    return {
        isLoading,
        handleLogin,
        isSubmitting
    }
}

export default useLogin