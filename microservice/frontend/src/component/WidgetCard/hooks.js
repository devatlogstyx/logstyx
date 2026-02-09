import { useCallback, useEffect, useState } from "react";
import useAPI from "../../hooks/useAPI";

//@ts-check
export default function useWidgetCard({
    slug,
    widget,
}) {


    const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const api = useAPI(`/v1/reports`)
    const fetchData = useCallback(async () => {

        setLoading(true);
        setError(null);
        const ctrl = new AbortController();
        api.custom("get", `/${slug}/widgets/${widget.id}/data`, {})
            .then(setData)
            .catch(e => setError(e?.message || 'Error loading data'))
            .finally(() => setLoading(false));
        return () => ctrl.abort();
    }, [slug, widget?.id, api])

    useEffect(() => {
        fetchData();
    }, [widget.id, fetchData]);

    return {
        fetchData,
        loading,
        error,
        data,
        COLORS,

    }
}