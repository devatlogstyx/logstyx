//@ts-check

import React from "react"
import { Anchor, Center, PinInput, Text, TextInput, Title } from "@mantine/core"
import PrimaryButton from "../../../component/button/PrimaryButton"
import MfaSetup from "../../../component/MfaSetup"
import { PROJECT_TITLE } from "../../../utils/constant"

const Card = ({ title, description, children, onCancel }) => (
    <div className="w-screen flex flex-col items-center gap-4">
        <Title>{PROJECT_TITLE} Dashboard</Title>
        <div className="w-full max-w-[480px] border border-black rounded-xl p-6 flex flex-col gap-4">
            <div>
                <Text className="font-bold text-lg">{title}</Text>
                {description && <Text size="sm" c="dimmed">{description}</Text>}
            </div>
            {children}
            <div className="flex justify-center">
                <Anchor component="button" type="button" size="xs" c="dimmed" onClick={onCancel}>Back to sign in</Anchor>
            </div>
        </div>
    </div>
)

/**
 * Step two when 2FA is on: a code from the authenticator app, or one of the recovery codes.
 */
export const MfaCodeStep = ({ onVerify, onCancel, isSubmitting }) => {
    const [useRecovery, setUseRecovery] = React.useState(false)
    const [code, setCode] = React.useState("")

    const verify = (value) => onVerify(value).catch(() => setCode(""))

    return (
        <Card
            title="Two-factor authentication"
            description={useRecovery ? "Enter one of your recovery codes. Each code works once." : "Enter the 6 digit code from your authenticator app."}
            onCancel={onCancel}
        >
            <form onSubmit={(e) => { e.preventDefault(); verify(code) }} className="flex flex-col gap-4">
                {
                    useRecovery ?
                        <TextInput placeholder="xxxxx-xxxxx" autoComplete="off" autoFocus value={code} onChange={(e) => setCode(e.currentTarget.value)} /> :
                        <Center>
                            <PinInput
                                length={6}
                                type="number"
                                oneTimeCode
                                autoFocus
                                value={code}
                                onChange={setCode}
                                onComplete={verify}
                                disabled={isSubmitting}
                            />
                        </Center>
                }
                <PrimaryButton type="submit" disabled={isSubmitting || !code.trim()}>Verify</PrimaryButton>
                <div className="flex justify-center">
                    <Anchor component="button" type="button" size="xs" onClick={() => { setUseRecovery(!useRecovery); setCode("") }}>
                        {useRecovery ? "Use the authenticator app" : "Lost your phone? Use a recovery code"}
                    </Anchor>
                </div>
            </form>
        </Card>
    )
}

/**
 * The installation requires 2FA and this user has not set it up yet: set it up before the first session.
 */
export const MfaForcedSetup = ({ start, enable, onDone, onCancel }) => (
    <Card
        title="Set up two-factor authentication"
        description="This installation requires two-factor authentication. Set it up to continue."
        onCancel={onCancel}
    >
        <MfaSetup start={start} enable={enable} onDone={onDone} />
    </Card>
)
