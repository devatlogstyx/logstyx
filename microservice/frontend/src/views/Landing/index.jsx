//@ts-check

import useLanding from "./hooks";
import { Loader } from "@mantine/core"

const LandingPage = () => {

    useLanding()

    return (
        <>
            <div className="flex justify-center items-center h-screen">
                <div className="text-center">
                    <Loader />
                </div>
            </div>
        </>
    );
};

export default LandingPage;
