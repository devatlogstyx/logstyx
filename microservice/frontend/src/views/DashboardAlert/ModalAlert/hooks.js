import React, { useState } from "react";
import { useErrorMessage } from "../../../hooks/useMessage";
import { extractMustacheVars } from "../../../utils/function";
import useAPI from "../../../hooks/useAPI";

export default function useModalAlert({
    form,
    onClose
}) {

    const [step, setStep] = useState(0);
    const [mustacheVars, setMustacheVars] = useState([]);

    const api = useAPI("/v1/webhooks")
    const ErrorMessage = useErrorMessage()

    const handleCloseModal = () => {
        setStep(0)
        onClose()
    }

    const setupMustacheVar = React.useCallback(async () => {
        if (!form.values.webhook) {
            setMustacheVars([])
            return null
        }

        try {
            const webhook = await api.get(form.values.webhook)
            const headerVars = extractMustacheVars(JSON.stringify(webhook.connection.headers));
            const bodyVars = extractMustacheVars(JSON.stringify(webhook.connection.body_template));
            const allVars = [...new Set([...headerVars, ...bodyVars])];
            setMustacheVars(allVars);
        } catch (e) {
            ErrorMessage(e)
        }
    }, [api, ErrorMessage, form.values.webhook])

    React.useEffect(() => {
        setupMustacheVar()
    }, [setupMustacheVar])



    return {
        step,
        setStep,
        mustacheVars,
        handleCloseModal
    }
}