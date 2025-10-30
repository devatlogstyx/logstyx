//@ts-check


import { Loader } from "@mantine/core"
import useDashboard from "./hooks";

const DashboardPage = () => {

    useDashboard()

    return (
        <>
            <div className="flex justify-center items-center h-screen">
                <div className="text-center">
                    Dashboard
                </div>
            </div>
        </>
    );
};

export default DashboardPage;
