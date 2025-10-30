//@ts-check


import { Loader } from "@mantine/core"
import useLogin from "./hooks";
import LoginForm from "./LoginForm";

const LoginPage = () => {

    const {
        isLoading,
        isSubmitting,
        handleLogin
    } = useLogin()

    return (
        <>
            <div className="flex justify-center items-center h-screen">
                {
                    isLoading ?
                        <Loader /> :
                        <LoginForm
                            isSubmitting={isSubmitting}
                            onSubmit={handleLogin}
                        />
                }
            </div>
        </>
    );
};

export default LoginPage;
