//@ts-check

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useErrorMessage } from "../../hooks/useMessage";
import { deleteBucket, findBucketById } from "../../api/bucket";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";

const useDashboardBucketDetail = () => {

    const [bucket, setBucket] = useState(null)
    const [isLoading, setIsLoading] = useState(false)

    const { id } = useParams()
    const ErrorMessage = useErrorMessage()
    const controller = useMemo(() => new AbortController(), []);
    const { openConfirmDialog, ConfirmDialogComponent } = useConfirmDialog();
    const navigate = useNavigate()

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
                    await deleteBucket(controller.signal, bucket?.id)
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