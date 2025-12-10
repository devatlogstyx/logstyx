//@ts-check

import useInvitation from "./hooks";
import FormInvitation from "./FormInvitation";

const InvitationPage = () => {

    const {
        isSubmitting,
        handleValidateInvitaiton
    } = useInvitation()

    return (
        <>
            <div className="flex justify-center items-center h-screen px-4">
                <FormInvitation
                    isSubmitting={isSubmitting}
                    onSubmit={handleValidateInvitaiton}
                />
            </div>
        </>
    );
}

export default InvitationPage