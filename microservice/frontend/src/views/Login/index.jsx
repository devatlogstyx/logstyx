//@ts-check


import { Loader } from "@mantine/core"
import useLogin from "./hooks";

const LoginPage = () => {

    useLogin()
    
    return (
        <>
            <div className="flex justify-center items-center h-screen">
                <div className="text-center">
                    Login
                </div>
            </div>
        </>
    );
};

export default LoginPage;
