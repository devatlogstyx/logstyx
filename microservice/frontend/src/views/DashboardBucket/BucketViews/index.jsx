//@ts-check
import {
    IoAlertCircle,
    IoWarning,
    IoTimeOutline,
    IoEyeOutline,
    IoTrendingUpOutline,
} from "react-icons/io5";
import { Link } from 'react-router-dom';
import useBucketViews from "./hooks";
import { numify } from "numify";
import { sumInt } from "../../../utils/function";
import { Loader } from "@mantine/core";
import PrimaryButton from "../../../component/button/PrimaryButton";
import { Bar, BarChart, ResponsiveContainer } from "recharts";

const BucketViews = () => {

    const { buckets, isLoading, refetchData } = useBucketViews()

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen">
            <div className="text-center">
                <Loader />
            </div>
        </div>
    }


    return (
        <>

            <OverviewSection buckets={buckets} />

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {buckets.map((bucket, i) => (
                    <BucketCard bucket={bucket} key={i} />
                ))}
            </div>

        </>
    )
}

const BucketCard = ({ bucket }) => {
    return (
        <>
            <div
                key={bucket.id}
                className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow"
            >
                {/* Project Header */}
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 ${bucket.color} rounded-lg flex items-center justify-center text-white font-bold`}>
                                {bucket.title.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-800 line-clamp-1">{bucket.title}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span
                                        className={`w-2 h-2 rounded-full ${bucket.status === "active" ? "bg-green-500" : "bg-gray-400"
                                            }`}
                                    ></span>
                                    <span className="text-xs text-gray-500 capitalize">{bucket.status}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <IoTimeOutline size={16} />
                        <span>Last log: {bucket.lastLog}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="text-center p-2 bg-gray-50 rounded">
                            <p className="text-xs text-gray-600">Logs</p>
                            <p className="text-sm font-semibold text-gray-800">{numify(bucket.totalLogs)}</p>
                        </div>
                        <div className="text-center p-2 bg-orange-50 rounded">
                            <p className="text-xs text-orange-600">Errors</p>
                            <p className="text-sm font-semibold text-orange-600">{numify(bucket.errorCount)}</p>
                        </div>
                        <div className="text-center p-2 bg-red-50 rounded">
                            <p className="text-xs text-red-600">Critical</p>
                            <p className="text-sm font-semibold text-red-600">{numify(bucket.criticalCount)}</p>
                        </div>
                    </div>

                    <div className="flex items-end gap-1 h-[180px] mb-4">
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart
                                data={bucket.activity.map((val, idx) => ({ val }))}
                                margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                            >
                                <Bar dataKey="val" fill="#228be6" />
                            </BarChart>
                        </ResponsiveContainer>

                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 justify-end items-center">
                        <Link to={`/dashboard/buckets/${bucket.id}`} className="w-full">
                            <PrimaryButton  leftSection={<IoEyeOutline size={16} />} className="w-full px-3 py-2 text-sm">
                                View Logs
                            </PrimaryButton>
                        </Link>

                    </div>
                </div>

                {/* Alert Banner for Critical Issues */}
                {bucket.criticalCount > 0 && (
                    <div className="px-4 pb-4">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-center gap-2">
                            <IoAlertCircle size={16} className="text-red-600" />
                            <span className="text-xs text-red-600 font-medium">
                                {bucket.criticalCount} critical issue{bucket.criticalCount > 1 ? "s" : ""} detected
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}

const OverviewSection = ({ buckets }) => {
    return (
        <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Buckets</p>
                            <p className="text-2xl font-bold text-gray-800">{buckets.length}</p>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-lg">
                            <IoTrendingUpOutline size={24} className="text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Logs Today</p>
                            <p className="text-2xl font-bold text-gray-800">
                                {numify(sumInt(buckets?.map((p) => p.totalLogs)))}
                            </p>
                        </div>
                        <div className="bg-green-100 p-3 rounded-lg">
                            <IoTimeOutline size={24} className="text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Errors</p>
                            <p className="text-2xl font-bold text-orange-600">
                                {numify(sumInt(buckets?.map((p) => p.errorCount)))}
                            </p>
                        </div>
                        <div className="bg-orange-100 p-3 rounded-lg">
                            <IoWarning size={24} className="text-orange-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Critical Issues</p>
                            <p className="text-2xl font-bold text-red-600">
                                {numify(sumInt(buckets?.map((p) => p.criticalCount)))}
                            </p>
                        </div>
                        <div className="bg-red-100 p-3 rounded-lg">
                            <IoAlertCircle size={24} className="text-red-600" />
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
export default BucketViews