//@ts-check

import { Container, Loader, Text, Title } from "@mantine/core";
import { useUser } from "../../context/useUser";
import { Navigate } from "react-router-dom";
import ProjectViews from "./ProjectViews";

const DashboardPage = () => {
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
        <Container className="py-8" >
            <div>
                <Title order={1} className="mb-2">Projects</Title>
            </div>
            <ProjectViews />
        </Container>
    );
};

export default DashboardPage;