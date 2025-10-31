//@ts-check


import { Loader } from "@mantine/core";
import { useUser } from "../../context/useUser";
import DashboardHeader from "../../layouts/DashboardLayout/Header";
import { Navigate } from "react-router-dom";
import DashboardSidebar from "../../layouts/DashboardLayout/Sidebar";


const DashboardPage = () => {

    const { user, isLoading } = useUser();

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen">
            <div className="text-center">
                <Loader />
            </div>
        </div>
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return (
        <>
            <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-4">Dashboard Overview</h1>
                <p className="text-gray-600">Welcome to your dashboard!</p>
            </div>
        </>
    );
};

export default DashboardPage;
