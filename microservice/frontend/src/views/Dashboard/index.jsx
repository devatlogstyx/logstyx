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
            {/* Header Section */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Your Projects</h1>
                <p className="text-gray-600">Monitor and manage your logging projects</p>
            </div>

            <ProjectViews />
        </div>
    );
};

export default DashboardPage;