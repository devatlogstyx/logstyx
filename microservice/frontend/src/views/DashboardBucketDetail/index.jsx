//@ts-check

import { Container, Loader, Title } from "@mantine/core"
import useDashboardBucketDetail from "./hooks"
import UpdateBucket from "./UpdateBucket"
import LogView from "./LogView"


const DashboardBucketDetail = () => {

    const {
        bucket,
        isLoading
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
                    <div className="flex justify-between items-start">
                        <div>
                            <Title className="text-3xl font-bold">{bucket?.title}</Title>
                            <div className="flex gap-2 mt-2">
                            </div>
                        </div>
                        <UpdateBucket />
                    </div>
                    {
                        bucket &&
                        <LogView
                            bucket={bucket}
                        />
                    }

                </div>
            </Container>
        </>
    )
}

export default DashboardBucketDetail