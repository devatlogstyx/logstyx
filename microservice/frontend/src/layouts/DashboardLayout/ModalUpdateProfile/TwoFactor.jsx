//@ts-check

import React from "react"
import { Alert, Badge, Group, Stack, Text, TextInput } from "@mantine/core"
import { useUser } from "../../../context/useUser"
import { useErrorMessage, useSuccessMessage } from "../../../hooks/useMessage"
import useAPI from "../../../hooks/useAPI"
import MfaSetup, { RecoveryCodes } from "../../../component/MfaSetup"
import PrimaryButton from "../../../component/button/PrimaryButton"
import SecondaryButton from "../../../component/button/SecondaryButton"
import DangerButton from "../../../component/button/DangerButton"

/**
 * Turn two-factor authentication on or off, or get new recovery codes.
 */
const TwoFactor = () => {
    const { user, refetchUser } = useUser()
    const ErrorMessage = useErrorMessage()
    const SuccessMessage = useSuccessMessage()
    const api = useAPI("/v1/users")

    // null | "setup" | "disable" | "recovery"
    const [mode, setMode] = React.useState(null)
    const [code, setCode] = React.useState("")
    const [recoveryCodes, setRecoveryCodes] = React.useState(null)
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const reset = () => {
        setMode(null)
        setCode("")
        setRecoveryCodes(null)
    }

    const submitCode = React.useCallback(async () => {
        try {
            setIsSubmitting(true)
            if (mode === "disable") {
                await api.custom("post", "/me/2fa/disable", { body: { code } })
                SuccessMessage("Two-factor authentication is off")
                reset()
                await refetchUser()
            } else {
                const data = await api.custom("post", "/me/2fa/recovery-codes", { body: { code } })
                setRecoveryCodes(data?.recoveryCodes ?? [])
            }
        } catch (e) {
            setCode("")
            ErrorMessage(e)
        } finally {
            setIsSubmitting(false)
        }
    }, [api, code, mode, ErrorMessage, SuccessMessage, refetchUser])

    if (recoveryCodes) {
        return <RecoveryCodes codes={recoveryCodes} onDone={reset} doneLabel="Done" />
    }

    if (mode === "setup") {
        return (
            <Stack>
                <MfaSetup
                    start={() => api.custom("post", "/me/2fa/setup")}
                    enable={(value) => api.custom("post", "/me/2fa/enable", { body: { code: value } })}
                    onDone={async () => {
                        reset()
                        await refetchUser()
                    }}
                />
                <SecondaryButton onClick={reset}>Cancel</SecondaryButton>
            </Stack>
        )
    }

    if (mode === "disable" || mode === "recovery") {
        return (
            <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); submitCode() }}>
                <Text size="sm">
                    {mode === "disable" ? "Enter a code from your authenticator app, or a recovery code, to turn two-factor authentication off." :
                        "Enter a code from your authenticator app, or a recovery code. Your old recovery codes stop working."}
                </Text>
                <TextInput label="Code" placeholder="123456" autoComplete="one-time-code" autoFocus value={code} onChange={(e) => setCode(e.currentTarget.value)} />
                <div className="flex justify-end gap-2">
                    <SecondaryButton onClick={reset}>Cancel</SecondaryButton>
                    {
                        mode === "disable" ?
                            <DangerButton type="submit" disabled={isSubmitting || !code.trim()}>Turn off</DangerButton> :
                            <PrimaryButton type="submit" disabled={isSubmitting || !code.trim()}>New recovery codes</PrimaryButton>
                    }
                </div>
            </form>
        )
    }

    return (
        <Stack>
            <Group>
                <Text className="font-semibold">Authenticator app</Text>
                {user?.mfaEnabled ? <Badge color="green">On</Badge> : <Badge color="gray">Off</Badge>}
            </Group>
            <Text size="sm" c="dimmed">
                After your password, sign in with a 6 digit code from an authenticator app on your phone.
            </Text>
            {
                user?.mfaRequired && !user?.mfaEnabled &&
                <Alert color="yellow">This installation requires two-factor authentication. Turn it on now.</Alert>
            }
            <div className="flex justify-end gap-2">
                {
                    user?.mfaEnabled ?
                        <>
                            <SecondaryButton onClick={() => setMode("recovery")}>New recovery codes</SecondaryButton>
                            {!user?.mfaRequired && <DangerButton onClick={() => setMode("disable")}>Turn off</DangerButton>}
                        </> :
                        <PrimaryButton onClick={() => setMode("setup")}>Turn on</PrimaryButton>
                }
            </div>
        </Stack>
    )
}

export default TwoFactor
