//@ts-check

import React from "react"
import { useErrorMessage } from "../../../hooks/useMessage"
import useAPI from "../../../hooks/useAPI";

const useSelectWebhook = () => {

    
    const [webhooks, setWebhooks] = React.useState([])
    const [isLoading, setIsLoading] = React.useState(false)

    const api = useAPI("/v1/webhooks")

    const ErrorMessage = useErrorMessage()

    const fetchData = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const d = await api.listAll()
            setWebhooks(d)

        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsLoading(false)
        }
    }, [ErrorMessage, api])

    
    React.useEffect(() => {
        fetchData()
    }, [fetchData])

    return {
        webhooks,
        isLoading
    }
}

export default useSelectWebhook