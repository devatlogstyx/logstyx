//@ts-check

import { useCallback,  useEffect,  useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useErrorMessage } from "../../hooks/useMessage";
import { findBucketById } from "../../api/bucket";

const useDashboardBucketDetail = () => {

    const [bucket, setBucket] = useState(null)
    const [isLoading, setIsLoading] = useState(false)

    const { id } = useParams()
    const ErrorMessage = useErrorMessage()
    const controller = useMemo(() => new AbortController(), []);

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true)
            const r = await findBucketById(controller.signal, id)
            setBucket(r)
        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsLoading(false)
        }
    }, [controller.signal, ErrorMessage, id])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    return {
        bucket,
        isLoading
    }
}

export default useDashboardBucketDetail