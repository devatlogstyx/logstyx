//@ts-check

import { useCallback, useState } from "react";
import useAPI from "../../../hooks/useAPI";

const useExportLog = ({ bucketId }) => {

    const [opened, setOpened] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const api = useAPI(`/v1/buckets`)
    const fetchPage = useCallback(async (page) => {
        const response = await api.custom("get", `/${bucketId}/logs/timeline`, { params: { limit: 50, page } });
        return response;
    }, [api, bucketId])

    const exportLogs = async () => {
        setOpened(true);
        setIsExporting(true);
        setError(null);
        setSuccess(false);
        setProgress(0);

        try {
            const BATCH_SIZE = 10;
            const firstPage = await fetchPage(1);
            let allLogs = [...firstPage.results];
            const total = firstPage.totalPages;
            setTotalPages(total);
            setProgress(1);

            for (let i = 2; i <= total; i += BATCH_SIZE) {
                const batch = [];
                for (let j = i; j < i + BATCH_SIZE && j <= total; j++) {
                    batch.push(fetchPage(j));
                }

                const results = await Promise.all(batch);
                results.forEach(res => allLogs.push(...res.results));

                // Update progress based on completed pages
                const currentLastPage = Math.min(i + BATCH_SIZE - 1, total);
                setProgress(currentLastPage);
            }

            const jsonl = allLogs.map(log => JSON.stringify(log)).join('\n');
            const blob = new Blob([jsonl], { type: 'application/x-ndjson' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `logstyx-${bucketId}-${new Date().toISOString().split('T')[0]}.jsonl`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            setSuccess(true);
        } catch (err) {
            setError(err.message || 'Failed to export logs');
        } finally {
            setIsExporting(false);
        }
    };

    return {
        totalPages,
        progress,
        exportLogs,
        opened,
        isExporting,
        setOpened,
        success,
        error
    }
}

export default useExportLog