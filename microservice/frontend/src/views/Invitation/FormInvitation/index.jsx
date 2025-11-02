//@ts-check

import { Button, TextInput } from "@mantine/core"
import useFormInvitation from "./hooks"
import PrimaryButton from "../../../component/button/PrimaryButton"

const FormInvitation = ({
    onSubmit,
    isSubmitting
}) => {

    const {
        form
    } = useFormInvitation()

    return (
        <>
            <div className="w-screen flex justify-center">
                <div className="w-full max-w-[480px] min-h-[200px] border border-black rounded-xl p-6">
                    <form onSubmit={form.onSubmit(onSubmit)} className="flex flex-col gap-4">
                        <TextInput
                            withAsterisk
                            label="Fullname"
                            placeholder="Your Name"
                            key={form.key('fullname')}
                            {...form.getInputProps('fullname')}
                        />
                        <TextInput
                            withAsterisk
                            label="Email"
                            placeholder="your@email.com"
                            key={form.key('email')}
                            {...form.getInputProps('email')}
                        />

                        <TextInput
                            withAsterisk
                            label="Password"
                            placeholder="*******"
                            type={`password`}
                            key={form.key('password')}
                            {...form.getInputProps('password')}
                        />

                        <div className="flex justify-end">
                            <PrimaryButton
                                type="submit"
                                disabled={isSubmitting}

                            >Submit</PrimaryButton>
                        </div>
                    </form>
                </div>
            </div>
        </>
    )
}

export default FormInvitation