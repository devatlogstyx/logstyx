import { useCallback, useEffect, useState } from "react";
import { getWidgetData } from "../../api/report";

//@ts-check
export default function useWidgetCard({
    slug,
    widget,
}) {


    const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        const ctrl = new AbortController();
        getWidgetData(ctrl.signal, slug, widget.id)
            .then(setData)
            .catch(e => setError(e?.message || 'Error loading data'))
            .finally(() => setLoading(false));
        return () => ctrl.abort();
    }, [slug, widget?.id])

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