//@ts-check

import { Loader } from "@mantine/core";
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
        <div>
            <ProjectViews />
        </div>
    );
};

export default DashboardPage;