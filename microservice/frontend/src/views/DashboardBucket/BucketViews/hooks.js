//@ts-check

import React from "react";
import { useErrorMessage } from "../../../hooks/useMessage";
import { getUserBucketStats } from "../../../api/user";
import { generateColor } from "../../../utils/function";

const useBucketViews = () => {

    const [buckets, setBuckets] = React.useState([])
    const [isLoading, setIsLoading] = React.useState(true)

    const ErrorMessage = useErrorMessage()

    const controller = React.useMemo(() => new AbortController(), []);

    const fetchData = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const r = await getUserBucketStats(controller.signal)
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
    }, [ErrorMessage, controller])


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