//@ts-check


import { Loader } from "@mantine/core"
import useLogin from "./hooks";
import LoginForm from "./LoginForm";
import { useUser } from "../../context/useUser";
import { Navigate } from 'react-router-dom';

const LoginPage = () => {

    const { user, isLoading } = useUser();

    const {
        isSubmitting,
        handleLogin
    } = useLogin()

    if (!user) {
        return (
            <>
                <div className="flex justify-center items-center h-screen px-4">
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
    }

    return <Navigate to="/dashboard" replace />;

};

export default LoginPage;
