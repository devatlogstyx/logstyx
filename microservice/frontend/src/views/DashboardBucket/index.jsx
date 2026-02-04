//@ts-check

import { Container, Loader, Text, Title } from "@mantine/core";
import { useUser } from "../../context/useUser";
import { Navigate } from "react-router-dom";
import BucketViews from "./BucketViews";

const DashboardBucket = () => {
    const { user, isLoading } = useUser();

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-center">
                    <Loader />
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return (
        <Container className="py-8 flex flex-col gap-2" >
            <div>
                <Title className="text-3xl font-bold">Buckets</Title>
                <Text className="text-gray-600">Manage logs</Text>
            </div>
            <BucketViews />
            

        </Container>
    );
};

export default DashboardBucket;