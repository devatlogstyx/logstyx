//@ts-check

import { Button, TextInput } from "@mantine/core"
import useLoginForm from "./hooks"

const LoginForm = ({
    onSubmit,
    isSubmitting
}) => {

    const {
        form
    } = useLoginForm()

    return (
        <>
            <div className="w-screen flex justify-center">
                <div className="w-full max-w-[480px] min-h-[200px] border border-black rounded-xl p-6">
                    <form onSubmit={form.onSubmit(onSubmit)} className="flex flex-col gap-4">
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
                            <Button
                                type="submit"
                                disabled={isSubmitting}

                            >Submit</Button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    )
}

export default LoginForm