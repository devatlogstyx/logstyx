//@ts-check


import { Loader } from "@mantine/core";
import { useUser } from "../../context/useUser";
import DashboardHeader from "./Header";
import { Navigate } from "react-router-dom";


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
            <div className="w-full h-screen flex flex-col">
                <DashboardHeader />
            </div>
        </>
    );
};

export default DashboardPage;
