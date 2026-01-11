//@ts-check
import {
    IoAlertCircle,
    IoWarning,
    IoTimeOutline,
    IoEyeOutline,
    IoSettingsOutline,
    IoKeyOutline,
    IoTrendingUpOutline,
    IoAdd
} from "react-icons/io5";
import { Link } from 'react-router-dom';
import useProjectViews from "./hooks";
import { numify } from "numify";
import { sumInt } from "../../../utils/function";
import { Loader } from "@mantine/core";
import EmptyProjectViews from "../EmptyProjectViews";
import PrimaryButton from "../../../component/button/PrimaryButton";
import CreateProject from "../CreateProject";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import SecondaryButton from "../../../component/button/SecondaryButton";
import { GoGear } from "react-icons/go"
const ProjectViews = () => {

    const { projects, isLoading, refetchData } = useProjectViews()

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen">
            <div className="text-center">
                <Loader />
            </div>
        </div>
    }

    if (projects?.length < 1) {
        return <EmptyProjectViews />
    }

    return (
        <>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Projects</p>
                            <p className="text-2xl font-bold text-gray-800">{projects.length}</p>
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
                                {numify(sumInt(projects?.map((p) => p.totalLogs)))}
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
                                {numify(sumInt(projects?.map((p) => p.errorCount)))}
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
                                {numify(sumInt(projects?.map((p) => p.criticalCount)))}
                            </p>
                        </div>
                        <div className="bg-red-100 p-3 rounded-lg">
                            <IoAlertCircle size={24} className="text-red-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                    <div
                        key={project.id}
                        className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow"
                    >
                        {/* Project Header */}
                        <div className="p-4 border-b border-gray-200">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 ${project.color} rounded-lg flex items-center justify-center text-white font-bold`}>
                                        {project.title.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-800 line-clamp-1">{project.title}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span
                                                className={`w-2 h-2 rounded-full ${project.status === "active" ? "bg-green-500" : "bg-gray-400"
                                                    }`}
                                            ></span>
                                            <span className="text-xs text-gray-500 capitalize">{project.status}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="p-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                                <IoTimeOutline size={16} />
                                <span>Last log: {project.lastLog}</span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="text-center p-2 bg-gray-50 rounded">
                                    <p className="text-xs text-gray-600">Logs</p>
                                    <p className="text-sm font-semibold text-gray-800">{numify(project.totalLogs)}</p>
                                </div>
                                <div className="text-center p-2 bg-orange-50 rounded">
                                    <p className="text-xs text-orange-600">Errors</p>
                                    <p className="text-sm font-semibold text-orange-600">{numify(project.errorCount)}</p>
                                </div>
                                <div className="text-center p-2 bg-red-50 rounded">
                                    <p className="text-xs text-red-600">Critical</p>
                                    <p className="text-sm font-semibold text-red-600">{numify(project.criticalCount)}</p>
                                </div>
                            </div>

                            {/* Mini Activity Chart */}
                            <div className="flex items-end gap-1 h-[180px] mb-4">
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart
                                        data={project.activity.map((val, idx) => ({ val }))}
                                        margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                                    >
                                        <Bar dataKey="val" fill="#228be6" />
                                    </BarChart>
                                </ResponsiveContainer>

                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 justify-end items-center">
                                <Link
                                    to={`/dashboard/projects/${project.slug}?tab=logs`}
                                    className="flex w-full"
                                >
                                    <PrimaryButton leftSection={<IoEyeOutline size={16} />} className="w-full px-3 py-2 text-sm">
                                        View Logs
                                    </PrimaryButton>
                                </Link>
                                <Link
                                    to={`/dashboard/projects/${project.slug}?tab=overview`}
                                >
                                    <SecondaryButton className="px-3 py-2 text-sm">
                                        <GoGear size={16} />
                                    </SecondaryButton>
                                </Link>
                            </div>
                        </div>

                        {/* Alert Banner for Critical Issues */}
                        {project.criticalCount > 0 && (
                            <div className="px-4 pb-4">
                                <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-center gap-2">
                                    <IoAlertCircle size={16} className="text-red-600" />
                                    <span className="text-xs text-red-600 font-medium">
                                        {project.criticalCount} critical issue{project.criticalCount > 1 ? "s" : ""} detected
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Create New Project Button */}
            <div className="fixed bottom-8 right-8">
                <CreateProject
                    onUpdate={refetchData}
                />
            </div>

        </>
    )
}

export default ProjectViews