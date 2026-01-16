//@ts-check

import React from "react";
import { paginateAlerts } from "../../api/alert";
import { useErrorMessage } from "../../hooks/useMessage";

const useDashboardAlert = () => {

    const [webhooks, setWebhooks] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    const ErrorMessage = useErrorMessage()

    const fetchWebhooks = React.useCallback(async () => {
        try {
            setLoading(true);
            const data = await paginateAlerts();
            setWebhooks(data?.results || []);
        } catch (err) {
            ErrorMessage(err);
        } finally {
            setLoading(false);
        }
    }, [ErrorMessage])

    React.useEffect(() => {
        fetchWebhooks();
    }, [fetchWebhooks]);

    return {

    }
}

export default useDashboardAlert