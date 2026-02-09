//@ts-check
import React from "react"
import { useErrorMessage } from "../../hooks/useMessage"
import { useNavigate } from "react-router-dom"
import { EMAIL_PASSWORD_LOGIN_TYPE } from "../../utils/constant"
import { useUser } from "../../context/useUser"
import useAPI from "../../hooks/useAPI"
const useLogin = () => {
    const ErrorMessage = useErrorMessage()
    const navigate = useNavigate()
    const { refetchUser } = useUser()  // Add this

    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const api = useAPI(`/v1/users`)

    const handleLogin = React.useCallback(async (body) => {
        try {
            setIsSubmitting(true)
            body.type = EMAIL_PASSWORD_LOGIN_TYPE
            await api.custom("post", `/login`, { body })
            await refetchUser()

            navigate(`/dashboard`)
        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsSubmitting(false)
        }
    }, [ErrorMessage, navigate, api, refetchUser])

    return {
        handleLogin,
        isSubmitting
    }
}

export default useLogin