//@ts-check


import { Loader } from "@mantine/core"
import useLogin from "./hooks";
import LoginForm from "./LoginForm";
import { useUser } from "../../context/useUser";
import { Navigate } from 'react-router-dom';
import { MfaCodeStep, MfaForcedSetup } from "./MfaStep";

const LoginPage = () => {

    const { user, isLoading } = useUser();

    const {
        isSubmitting,
        handleLogin,
        handleVerifyCode,
        startForcedSetup,
        enableForcedSetup,
        signedIn,
        mfa,
        cancelMfa
    } = useLogin()

    const renderStep = () => {
        if (mfa?.mfaRequired) {
            return <MfaCodeStep onVerify={handleVerifyCode} onCancel={cancelMfa} isSubmitting={isSubmitting} />
        }
        if (mfa?.mfaSetupRequired) {
            return <MfaForcedSetup start={startForcedSetup} enable={enableForcedSetup} onDone={signedIn} onCancel={cancelMfa} />
        }
        return (
            <LoginForm
                isSubmitting={isSubmitting}
                onSubmit={handleLogin}
            />
        )
    }

    if (!user) {
        return (
            <>
                <div className="flex justify-center items-center h-screen px-4">
                    {
                        isLoading && !mfa ?
                            <Loader /> :
                            renderStep()
                    }
                </div>
            </>
        );
    }

    return <Navigate to="/dashboard" replace />;

};

export default LoginPage;
