//@ts-check

import { Loader } from "@mantine/core";
import { useUser } from "../../context/useUser";
import useInvitation from "./hooks";
import FormInvitation from "./FormInvitation";
import { Navigate } from "react-router-dom";

const InvitationPage = () => {

    const { user, isLoading } = useUser();

    const {
        isSubmitting,
        handleValidateInvitaiton
    } = useInvitation()

    if (!user) {
        return (
            <>
                <div className="flex justify-center items-center h-screen px-4">
                    {
                        isLoading ?
                            <Loader /> :
                            <FormInvitation
                                isSubmitting={isSubmitting}
                                onSubmit={handleValidateInvitaiton}
                            />
                    }
                </div>
            </>
        );
    }

    return <Navigate to="/dashboard" replace />;
}

export default InvitationPage