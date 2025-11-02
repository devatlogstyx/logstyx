//@ts-check
import React from "react"
import { useErrorMessage } from "../../hooks/useMessage"
import { useNavigate, useParams } from "react-router-dom"
import { validateUserInvitation } from "../../api/user.invitation"
const useInvitation = () => {
    const ErrorMessage = useErrorMessage()
    const navigate = useNavigate()
    const { id } = useParams()

    const controller = React.useMemo(() => new AbortController(), []);

    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const handleValidateInvitaiton = React.useCallback(async (payload) => {
        try {

            await validateUserInvitation(controller.signal, id, payload)
            navigate(`/dashboard`)
        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsSubmitting(false)
        }
    }, [ErrorMessage, navigate, controller, id])

    return {
        handleValidateInvitaiton,
        isSubmitting
    }
}

export default useInvitation