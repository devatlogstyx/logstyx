//@ts-check

import { Modal, Tabs, Text, TextInput } from "@mantine/core"
import useModalUpdateProfile from "./hook"
import { IoKey, IoPerson } from "react-icons/io5"
import SecondaryButton from "../../../component/button/SecondaryButton"
import PrimaryButton from "../../../component/button/PrimaryButton"

const ModalUpdateProfile = ({
    opened,
    onClose,
}) => {

    const {
        passwordForm,
        profileForm,
        activeTab,
        handleSubmitPassword,
        handleSubmitProfile,
        isSubmitting,
        changeTab
    } = useModalUpdateProfile({
        onClose
    })

    return (
        <>
            <Modal
                opened={opened}
                onClose={onClose}
                title={< Text className="font-bold text-lg" > Update Profile </Text >}
                centered
                classNames={{
                    content: 'rounded-lg',
                    header: 'border-b border-gray-200 pb-4',
                    body: 'pt-4'
                }}
            >
                <Tabs value={activeTab} onChange={changeTab} className="py-8">
                    <Tabs.List>
                        <Tabs.Tab value="profile" leftSection={<IoPerson className="w-3.5 h-3.5" />}>
                            Profile
                        </Tabs.Tab>
                        <Tabs.Tab value="passwords" leftSection={<IoKey className="w-3.5 h-3.5" />}>
                            Password
                        </Tabs.Tab>
                    </Tabs.List>
                    <Tabs.Panel value="profile" className="pt-8">
                        <FormProfile
                            form={profileForm}
                            closeModal={onClose}
                            handleSubmit={handleSubmitProfile}
                            isSubmitting={isSubmitting}
                        />
                    </Tabs.Panel>
                    <Tabs.Panel value="passwords" className="pt-8">
                        <FormPassword
                            form={passwordForm}
                            closeModal={onClose}
                            handleSubmit={handleSubmitPassword}
                            isSubmitting={isSubmitting}
                        />
                    </Tabs.Panel>
                </Tabs>
            </Modal >
        </>
    )
}

const FormProfile = ({
    form,
    closeModal,
    handleSubmit,
    isSubmitting
}) => {
    return (
        <>
            <form className="flex flex-col gap-4" onSubmit={form.onSubmit(handleSubmit)}>
                <TextInput label="Fullname" {...form.getInputProps('fullname')} />
                <TextInput label="Email" {...form.getInputProps('email')} />
                <div className="flex justify-end gap-2 mt-4">
                    <SecondaryButton onClick={closeModal} >
                        Cancel
                    </SecondaryButton>
                    <PrimaryButton type="submit" disabled={isSubmitting}>Save Changes</PrimaryButton>
                </div>
            </form>
        </>
    )
}

const FormPassword = ({
    form,
    closeModal,
    handleSubmit,
    isSubmitting
}) => {
    return (
        <>
            <form className="flex flex-col gap-4" onSubmit={form.onSubmit(handleSubmit)}>
                <TextInput label="Current Password" type="password" {...form.getInputProps('oldpassword')} />
                <TextInput label="New Password" type="password" {...form.getInputProps('newpassword')} />
                <TextInput label="Repeat New Password" type="password" {...form.getInputProps('repassword')} />
                <div className="flex justify-end gap-2 mt-4">
                    <SecondaryButton onClick={closeModal} >
                        Cancel
                    </SecondaryButton>
                    <PrimaryButton type="submit" disabled={isSubmitting}>Save Changes</PrimaryButton>
                </div>
            </form>
        </>
    )
}

export default ModalUpdateProfile