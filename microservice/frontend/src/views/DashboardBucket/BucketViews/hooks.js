//@ts-check

import React from "react";
import { useErrorMessage } from "../../../hooks/useMessage";
import { generateColor } from "../../../utils/function";
import useAPI from "../../../hooks/useAPI";

const useBucketViews = () => {

    const [buckets, setBuckets] = React.useState([])
    const [isLoading, setIsLoading] = React.useState(true)

    const ErrorMessage = useErrorMessage()
    const api = useAPI("/v1/users/me/bucket-stats")

    const fetchData = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const r = await api.list()
            setBuckets(r?.map((n) => {
                return {
                    ...n,
                    color: generateColor(n?.title)
                }
            }))

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
        isLoading,
        buckets,
        refetchData: fetchData
    }

}

export default useBucketViews