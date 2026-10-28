//@ts-check

import React from "react"
import { Alert, Button, Center, Code, CopyButton, Group, Image, Loader, PinInput, SimpleGrid, Stack, Text } from "@mantine/core"
import { useErrorMessage } from "../../hooks/useMessage"
import { parseError } from "../../utils/function"

/**
 * Recovery codes, shown once right after they are made. Each one signs in once instead of an app code.
 * @param {{ codes: string[], onDone: () => void, doneLabel?: string }} props
 */
export const RecoveryCodes = ({ codes, onDone, doneLabel = "I saved them" }) => {
    const text = codes.join("\n")
    const download = () => {
        const url = URL.createObjectURL(new Blob([`Logstyx recovery codes\n\n${text}\n`], { type: "text/plain" }))
        const a = Object.assign(document.createElement("a"), { href: url, download: "logstyx-recovery-codes.txt" })
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <Stack>
            <Alert color="yellow">
                Save these recovery codes somewhere safe, such as a password manager. Each one signs you in once if you lose your phone.
                They are not shown again.
            </Alert>
            <SimpleGrid cols={2} spacing="xs">
                {codes.map((n) => <Code key={n} className="text-center text-sm">{n}</Code>)}
            </SimpleGrid>
            <Group grow>
                <CopyButton value={text}>
                    {({ copied, copy }) => <Button variant="default" onClick={copy}>{copied ? "Copied" : "Copy"}</Button>}
                </CopyButton>
                <Button variant="default" onClick={download}>Download</Button>
            </Group>
            <Button onClick={onDone}>{doneLabel}</Button>
        </Stack>
    )
}

/**
 * Turn on two-factor authentication: scan the QR code, confirm one code, then save the recovery codes.
 * @param {{
 *   start: () => Promise<{ qrCode: string, secret: string }>,
 *   enable: (code: string) => Promise<{ recoveryCodes: string[] }>,
 *   onDone: () => void,
 * }} props
 */
const MfaSetup = ({ start, enable, onDone }) => {
    const ErrorMessage = useErrorMessage()
    const [code, setCode] = React.useState("")
    const [setup, setSetup] = React.useState(null)
    const [setupError, setSetupError] = React.useState(null)
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [recoveryCodes, setRecoveryCodes] = React.useState(null)

    // a new secret on every open; it only becomes active once a code confirms it
    const startRef = React.useRef(start)
    React.useEffect(() => {
        let cancelled = false
        startRef.current()
            .then((data) => !cancelled && setSetup(data))
            .catch((e) => !cancelled && setSetupError(e))
        return () => {
            cancelled = true
        }
    }, [])

    const confirm = React.useCallback(async (value) => {
        try {
            setIsSubmitting(true)
            const data = await enable(value)
            setRecoveryCodes(data?.recoveryCodes ?? [])
        } catch (e) {
            setCode("")
            ErrorMessage(e)
        } finally {
            setIsSubmitting(false)
        }
    }, [enable, ErrorMessage])

    if (recoveryCodes) {
        return <RecoveryCodes codes={recoveryCodes} onDone={onDone} />
    }

    if (setupError) {
        return <Alert color="red">{parseError(setupError)?.message ?? "Could not start the setup. Try again."}</Alert>
    }

    if (!setup) {
        return <Center className="p-6"><Loader /></Center>
    }

    return (
        <Stack>
            <Text size="sm">
                1. Scan this QR code with an authenticator app such as Google Authenticator, Microsoft Authenticator or 1Password.
            </Text>
            <Center><Image src={setup.qrCode} alt="QR code for your authenticator app" w={180} h={180} /></Center>
            <Text size="xs" c="dimmed" className="text-center">
                Cannot scan it? Enter this key in the app: <Code>{setup.secret}</Code>
            </Text>
            <Text size="sm">2. Enter the 6 digit code the app shows.</Text>
            <Center>
                <PinInput
                    length={6}
                    type="number"
                    oneTimeCode
                    value={code}
                    onChange={setCode}
                    onComplete={confirm}
                    disabled={isSubmitting}
                />
            </Center>
            <Button onClick={() => confirm(code)} loading={isSubmitting} disabled={code.length !== 6}>Turn on</Button>
        </Stack>
    )
}

export default MfaSetup
