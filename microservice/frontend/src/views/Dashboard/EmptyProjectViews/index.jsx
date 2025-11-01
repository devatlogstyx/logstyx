//@ts-check

import { IoRocketOutline, IoCodeSlashOutline, IoShieldCheckmarkOutline, IoTrendingUpOutline } from "react-icons/io5";

const EmptyProjectViews = () => {
    return (
        <div className="flex items-center justify-center min-h-[600px]">
            <div className="text-center max-w-2xl px-6">
                {/* Icon */}
                <div className="mb-6 flex justify-center">
                    <div className="w-24 h-24 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 rounded-full flex items-center justify-center">
                        <IoRocketOutline size={48} className="text-white" />
                    </div>
                </div>

                {/* Heading */}
                <h2 className="text-3xl font-bold text-gray-800 mb-3">
                    No Projects Yet
                </h2>

                {/* Description */}
                <p className="text-gray-600 text-lg mb-8">
                    Create your first project to start collecting and monitoring logs from your applications.
                </p>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3">
                            <IoCodeSlashOutline size={24} className="text-blue-600" />
                        </div>
                        <h3 className="font-semibold text-gray-800 mb-1">Easy Integration</h3>
                        <p className="text-sm text-gray-600">Simple API to integrate with any platform</p>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3">
                            <IoTrendingUpOutline size={24} className="text-green-600" />
                        </div>
                        <h3 className="font-semibold text-gray-800 mb-1">Real-time Monitoring</h3>
                        <p className="text-sm text-gray-600">Track errors and logs as they happen</p>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3">
                            <IoShieldCheckmarkOutline size={24} className="text-purple-600" />
                        </div>
                        <h3 className="font-semibold text-gray-800 mb-1">Secure & Reliable</h3>
                        <p className="text-sm text-gray-600">Your data is safe and always available</p>
                    </div>
                </div>

                {/* CTA Button */}
                <button className="bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:shadow-xl transition-all inline-flex items-center gap-3">
                    <span className="text-2xl">+</span>
                    Create Your First Project
                </button>

                {/* Optional: Documentation Link */}
                <p className="text-sm text-gray-500 mt-6">
                    Need help getting started?{' '}
                    <a href="/documentation" className="text-blue-600 hover:text-blue-700 font-medium">
                        View Documentation
                    </a>
                </p>
            </div>
        </div>
    );
};

export default EmptyProjectViews;