//@ts-check

import React from "react"
import { useErrorMessage } from "../../../hooks/useMessage"
import { listAllWebhook } from "../../../api/webhooks";

const useSelectWebhook = () => {

    const controller = React.useMemo(() => new AbortController(), []);
    const [webhooks, setWebhooks] = React.useState([])
    const [isLoading, setIsLoading] = React.useState(false)

    const ErrorMessage = useErrorMessage()

    const fetchData = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const d = await listAllWebhook(controller.signal)
            setWebhooks(d)

        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsLoading(false)
        }
    }, [ErrorMessage, controller])

    
    React.useEffect(() => {
        fetchData()
    }, [fetchData])

    return {
        webhooks,
        isLoading
    }
}

export default useSelectWebhook