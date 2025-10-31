//@ts-check
import React from "react"
import { useErrorMessage } from "../../hooks/useMessage"
import { userLogin } from "../../api/user"
import { useNavigate } from "react-router-dom"
import { EMAIL_PASSWORD_LOGIN_TYPE } from "../../utils/constant"
import { useUser } from "../../context/useUser"
const useLogin = () => {
    const ErrorMessage = useErrorMessage()
    const navigate = useNavigate()
    const { refetchUser } = useUser()  // Add this

    const controller = React.useMemo(() => new AbortController(), []);

    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const handleLogin = React.useCallback(async (payload) => {
        try {
            setIsSubmitting(true)
            payload.type = EMAIL_PASSWORD_LOGIN_TYPE
            await userLogin(payload, controller.signal)
            await refetchUser()

            navigate(`/dashboard`)
        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsSubmitting(false)
        }
    }, [ErrorMessage, navigate, controller, refetchUser])

    return {
        handleLogin,
        isSubmitting
    }
}

export default useLogin