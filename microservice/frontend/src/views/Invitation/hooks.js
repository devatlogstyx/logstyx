//@ts-check
import React from "react"
import { useErrorMessage, useSuccessMessage } from "../../hooks/useMessage"
import { useNavigate, useParams } from "react-router-dom"
import useAPI from "../../hooks/useAPI"
const useInvitation = () => {
    const ErrorMessage = useErrorMessage()
    const SuccessMessage = useSuccessMessage()

    const navigate = useNavigate()
    const { id } = useParams()

    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const api = useAPI(`/v1/user-invitations`)

    const handleValidateInvitaiton = React.useCallback(async (body) => {
        try {

            await api.custom("post", `/${id}/validate`, { body })
            SuccessMessage(`Account successfully created, you now can login`)
            navigate("/login")
        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsSubmitting(false)
        }
    }, [ErrorMessage, navigate, SuccessMessage, api, id])

    return {
        handleValidateInvitaiton,
        isSubmitting
    }
}

export default useInvitation