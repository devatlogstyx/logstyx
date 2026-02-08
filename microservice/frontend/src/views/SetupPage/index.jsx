//@ts-check
"use client"
import { TextInput, PasswordInput } from '@mantine/core';
import { FiUser, FiMail, FiLock, FiUsers, FiCheck, FiArrowRight, FiArrowLeft } from 'react-icons/fi';
import useUserSetupPage from './hooks';
import PrimaryButton from '../../component/button/PrimaryButton';
import SecondaryButton from '../../component/button/SecondaryButton';

const UserSetupPage = () => {

    const {
        handleLogin,
        handleNext,
        step,
        setStep,
        form,
        isSubmitting,
        handleSubmit
    } = useUserSetupPage()

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                {/* Progress indicator */}
                <div className="mb-8">
                    <div className="flex items-center justify-center space-x-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${step >= i
                                    ? 'bg-black text-white'
                                    : 'bg-white text-gray-400'
                                    }`}>
                                    {step > i ? <FiCheck /> : i}
                                </div>
                                {i < 3 && (
                                    <div className={`w-16 h-1 mx-2 transition-all ${step > i ? 'bg-black' : 'bg-gray-300'
                                        }`} />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2 px-4">
                        <span className={`text-sm ${step >= 1 ? 'text-black font-medium' : 'text-gray-400'}`}>
                            Setup
                        </span>
                        <span className={`text-sm ${step >= 2 ? 'text-black font-medium' : 'text-gray-400'}`}>
                            Review
                        </span>
                        <span className={`text-sm ${step >= 3 ? 'text-black font-medium' : 'text-gray-400'}`}>
                            Complete
                        </span>
                    </div>
                </div>

                {/* Main card */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {/* Step 1: Form */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="text-center mb-8">
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                    User Setup
                                </h1>
                                <p className="text-gray-600">
                                    Create your user account to get started
                                </p>
                            </div>

                            <TextInput
                                label="Full Name"
                                placeholder="John Doe"
                                leftSection={<FiUser className="text-gray-400" />}
                                classNames={{
                                    input: 'h-12 border-gray-300 focus:border-indigo-500',
                                    label: 'text-sm font-medium text-gray-700 mb-2'
                                }}
                                {...form.getInputProps('fullname')}
                            />

                            <TextInput
                                label="Email Address"
                                type="email"
                                placeholder="admin@example.com"
                                leftSection={<FiMail className="text-gray-400" />}
                                classNames={{
                                    input: 'h-12 border-gray-300 focus:border-indigo-500',
                                    label: 'text-sm font-medium text-gray-700 mb-2'
                                }}
                                {...form.getInputProps('email')}
                            />

                            <PasswordInput
                                label="Password"
                                placeholder="••••••••"
                                leftSection={<FiLock className="text-gray-400" />}
                                classNames={{
                                    input: 'h-12 border-gray-300 focus:border-indigo-500',
                                    label: 'text-sm font-medium text-gray-700 mb-2'
                                }}
                                {...form.getInputProps('password')}
                            />

                            <PasswordInput
                                label="Confirm Password"
                                placeholder="••••••••"
                                leftSection={<FiLock className="text-gray-400" />}
                                classNames={{
                                    input: 'h-12 border-gray-300 focus:border-indigo-500',
                                    label: 'text-sm font-medium text-gray-700 mb-2'
                                }}
                                {...form.getInputProps('repassword')}
                            />

                            <div className='flex justify-end'>
                                <PrimaryButton
                                    onClick={handleNext}
                                    className="w-full bg-black hover:bg-indigo-700 h-12 text-base font-medium mt-8"
                                    rightSection={<FiArrowRight />}
                                >
                                    Continue
                                </PrimaryButton>
                            </div>

                        </div>
                    )}

                    {/* Step 2: Review */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="text-center mb-8">
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                    Review Details
                                </h1>
                                <p className="text-gray-600">
                                    Please confirm your information before proceeding
                                </p>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                                <div className="flex items-start space-x-3">
                                    <FiUser className="text-black mt-1" />
                                    <div>
                                        <p className="text-sm text-gray-600">Full Name</p>
                                        <p className="font-medium text-gray-900">{form.values.fullname}</p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-3">
                                    <FiMail className="text-black mt-1" />
                                    <div>
                                        <p className="text-sm text-gray-600">Email Address</p>
                                        <p className="font-medium text-gray-900">{form.values.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-3">
                                    <FiLock className="text-black mt-1" />
                                    <div>
                                        <p className="text-sm text-gray-600">Password</p>
                                        <p className="font-medium text-gray-900">••••••••</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-4 mt-8">
                                <SecondaryButton
                                    onClick={() => setStep(1)}
                                    variant="default"
                                    className="flex-1 h-12 text-base font-medium text-gray-700"
                                    leftSection={<FiArrowLeft />}
                                >
                                    Back
                                </SecondaryButton>
                                <PrimaryButton
                                    onClick={handleSubmit}
                                    loading={isSubmitting}
                                    className="flex-1 h-12 text-base font-medium"
                                    rightSection={<FiCheck />}
                                >
                                    Confirm & Create
                                </PrimaryButton>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Complete */}
                    {step === 3 && (
                        <div className="text-center space-y-6 py-8">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                <FiCheck className="text-green-600 text-4xl" />
                            </div>

                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                    Setup Complete!
                                </h1>
                                <p className="text-gray-600 text-lg">
                                    Your admin account has been successfully created
                                </p>
                            </div>

                            <div className="bg-indigo-50 rounded-lg p-6 text-left">
                                <h3 className="font-semibold text-indigo-900 mb-3">What&lsquo;s Next?</h3>
                                <ul className="space-y-2 text-indigo-700">
                                    <li className="flex items-start">
                                        <span className="mr-2">•</span>
                                        <span>Access your dashboard</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="mr-2">•</span>
                                        <span>Configure your application settings</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="mr-2">•</span>
                                        <span>Start managing your logs</span>
                                    </li>
                                </ul>
                            </div>

                            <div className='flex justify-end'>
                                <PrimaryButton
                                    onClick={handleLogin}
                                    className="w-full bg-black hover:bg-indigo-700 h-12 text-base font-medium mt-8"
                                    rightSection={<FiArrowRight />}
                                >
                                    Login to Dashboard
                                </PrimaryButton>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default UserSetupPage;