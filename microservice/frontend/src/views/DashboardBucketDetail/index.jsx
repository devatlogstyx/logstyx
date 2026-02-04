//@ts-check

import { Container, Loader, Title } from "@mantine/core"
import useDashboardBucketDetail from "./hooks"
import UpdateBucket from "./UpdateBucket"
import LogView from "./LogView"
import DangerButton from "../../component/button/DangerButton"
import { FiTrash } from "react-icons/fi"


const DashboardBucketDetail = () => {

    const {
        bucket,
        isLoading,
        refetchData,
        handleDelete,
        ConfirmDialogComponent
    } = useDashboardBucketDetail()

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen">
            <div className="text-center">
                <Loader />
            </div>
        </div>
    }

    return (
        <>
            <Container className="py-8">
                {/* Header */}
                <div className="space-y-4 mb-8">

                    {
                        bucket &&
                        <>
                            <div className="flex flex-col gap-2">
                                <div className="flex-1">
                                    <Title className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                        {bucket?.title}
                                    </Title>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Manage and track your bucket activities
                                    </p>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <UpdateBucket bucket={bucket} onUpdate={refetchData} />
                                    <DangerButton leftSection={<FiTrash />} onClick={handleDelete}>Delete</DangerButton>
                                </div>
                                <LogView
                                    bucket={bucket}
                                />
                            </div>
                        </>
                    }

                </div>
            </Container>
            <ConfirmDialogComponent />
        </>
    )
}

export default DashboardBucketDetail