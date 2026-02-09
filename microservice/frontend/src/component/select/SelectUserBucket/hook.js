//@ts-check

import React from "react"
import { useErrorMessage } from "../../../hooks/useMessage"

import useAPI from "../../../hooks/useAPI";

const useSelectBucket = () => {

    
    const [projects, setProjects] = React.useState([])
    const [isLoading, setIsLoading] = React.useState(false)

    const ErrorMessage = useErrorMessage()

    const api = useAPI("/v1/users/me/buckets")

    const fetchData = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const d = await api.list()
            setProjects(d)

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
        projects,
        isLoading
    }
}

export default useSelectBucket