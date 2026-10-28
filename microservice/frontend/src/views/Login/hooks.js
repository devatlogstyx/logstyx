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
    // after a correct password: { mfaToken, mfaRequired } (ask for a code) or { mfaToken, mfaSetupRequired }
    const [mfa, setMfa] = React.useState(null)
    const api = useAPI(`/v1/users`)

    const signedIn = React.useCallback(async () => {
        await refetchUser()
        navigate(`/dashboard`)
    }, [navigate, refetchUser])

    const handleLogin = React.useCallback(async (body) => {
        try {
            setIsSubmitting(true)
            body.type = EMAIL_PASSWORD_LOGIN_TYPE
            const data = await api.custom("post", `/login`, { body })
            if (data?.mfaToken) {
                setMfa(data)
                return
            }
            await signedIn()
        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsSubmitting(false)
        }
    }, [ErrorMessage, api, signedIn])

    const handleVerifyCode = React.useCallback(async (code) => {
        try {
            setIsSubmitting(true)
            await api.custom("post", `/login/2fa`, { body: { mfaToken: mfa?.mfaToken, code } })
            await signedIn()
        } catch (e) {
            ErrorMessage(e)
            throw e
        } finally {
            setIsSubmitting(false)
        }
    }, [ErrorMessage, api, mfa, signedIn])

    const startForcedSetup = React.useCallback(
        () => api.custom("post", `/login/2fa/setup`, { body: { mfaToken: mfa?.mfaToken } }),
        [api, mfa]
    )

    // signs in too; the session starts once the code is confirmed, the recovery codes are shown before leaving
    const enableForcedSetup = React.useCallback(
        (code) => api.custom("post", `/login/2fa/enable`, { body: { mfaToken: mfa?.mfaToken, code } }),
        [api, mfa]
    )

    return {
        handleLogin,
        handleVerifyCode,
        startForcedSetup,
        enableForcedSetup,
        signedIn,
        mfa,
        cancelMfa: () => setMfa(null),
        isSubmitting
    }
}

export default useLogin
