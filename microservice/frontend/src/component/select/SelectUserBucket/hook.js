//@ts-check

import React from "react"
import { useErrorMessage } from "../../../hooks/useMessage"
import { listMyBucket } from "../../../api/bucket";

const useSelectBucket = () => {

    const controller = React.useMemo(() => new AbortController(), []);
    const [projects, setProjects] = React.useState([])
    const [isLoading, setIsLoading] = React.useState(false)

    const ErrorMessage = useErrorMessage()

    const fetchData = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const d = await listMyBucket(controller.signal)
            setProjects(d)

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
        projects,
        isLoading
    }
}

export default useSelectBucket