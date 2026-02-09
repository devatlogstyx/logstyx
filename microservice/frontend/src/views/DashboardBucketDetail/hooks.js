//@ts-check

import { useCallback, useEffect,  useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useErrorMessage } from "../../hooks/useMessage";

import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import useAPI from "../../hooks/useAPI";

const useDashboardBucketDetail = () => {

    const [bucket, setBucket] = useState(null)
    const [isLoading, setIsLoading] = useState(false)

    const { id } = useParams()
    const ErrorMessage = useErrorMessage()
    
    const { openConfirmDialog, ConfirmDialogComponent } = useConfirmDialog();
    const navigate = useNavigate()

    const api = useAPI("/v1/buckets")

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true)
            const r = await api.get(id)
            setBucket(r)
        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsLoading(false)
        }
    }, [api, ErrorMessage, id])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleDelete = () => {
        openConfirmDialog({
            title: 'Remove Bucket',
            message: 'Are you sure you want to remove this Bucket? This action cannot be undone.',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            onConfirm: async () => {
                if (!bucket) {
                    return null
                }
                try {
                    await api.delete(bucket?.id)
                    navigate(`/dashboard/buckets`)
                } catch (err) {
                    ErrorMessage(err)
                }
            },
            onCancel: () => console.log('Delete cancelled'),
        })

    }

    return {
        bucket,
        isLoading,
        refetchData: fetchData,
        handleDelete,
        ConfirmDialogComponent
    }
}

export default useDashboardBucketDetail