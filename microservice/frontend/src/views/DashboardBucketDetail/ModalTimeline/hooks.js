//@ts-check

import React from "react";
import { useErrorMessage } from "../../../hooks/useMessage";
import useAPI from "../../../hooks/useAPI";

const useModalTimeline = ({
    bucketId,
    logKey
}) => {

    
    const ErrorMessage = useErrorMessage()
    const [line, setLine] = React.useState([])

    const api = useAPI(`/v1/buckets`)

    const fetchData = React.useCallback(async () => {
        try {
            if (!bucketId || !logKey) {
                return null
            }

            let l = await api.custom("get", `/${bucketId}/logs/${logKey}/timeline`, {})
            setLine(l)

        } catch (e) {
            ErrorMessage(e)
        }
    }, [ErrorMessage, api, bucketId, logKey])

    React.useEffect(() => {
        fetchData()
    }, [fetchData])

    const chartData = React.useMemo(() => {
        // Create a map of existing data with full datetime as key
        const dataMap = new Map()
        line.forEach(item => {
            const date = new Date(item.datetime)
            // Round to the hour
            date.setMinutes(0, 0, 0)
            const key = date.getTime()
            dataMap.set(key, (dataMap.get(key) || 0) + item.count)
        })

        // Generate last 24 hours
        const now = new Date()
        const allHours = []

        for (let i = 23; i >= 0; i--) {
            const hourDate = new Date(now)
            hourDate.setHours(now.getHours() - i, 0, 0, 0)
            const key = hourDate.getTime()

            allHours.push({
                datetime: hourDate.toISOString(),
                time: hourDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
                count: dataMap.get(key) || 0
            })
        }

        return allHours
    }, [line])

    return {
        line,
        chartData
    }
}

export default useModalTimeline
