//@ts-check
import {
    IoAlertCircle,
    IoWarning,
    IoTimeOutline,
    IoEyeOutline,
    IoTrendingUpOutline,
    IoBriefcaseOutline,
} from "react-icons/io5";
import { Link } from 'react-router-dom';
import useProjectViews from "./hooks";
import { numify } from "numify";
import { sumInt } from "../../../utils/function";
import { Badge, Loader, Menu } from "@mantine/core";
import EmptyProjectViews from "../EmptyProjectViews";
import PrimaryButton from "../../../component/button/PrimaryButton";
import CreateProject from "../CreateProject";
import SecondaryButton from "../../../component/button/SecondaryButton";
import { GoGear } from "react-icons/go"
import { TbBucket } from "react-icons/tb";
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

            <OverviewSection projects={projects} />

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project, i) => (
                    <ProjectCard project={project} key={i} />
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

const ProjectCard = ({ project }) => {
    return (
        <>
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
                        <div className="text-center p-2 bg-violet-50 rounded">
                            <p className="text-xs text-violet-600">Buckets</p>
                            <p className="text-sm font-semibold text-violet-600">{numify(project.buckets?.length)}</p>
                        </div>
                        <div className="text-center p-2 bg-blue-50 rounded">
                            <p className="text-xs text-blue-600">Logs</p>
                            <p className="text-sm font-semibold text-blue-600">{numify(project.totalLogs)}</p>
                        </div>
                        <div className="text-center p-2 bg-amber-50 rounded">
                            <p className="text-xs text-amber-600">Errors</p>
                            <p className="text-sm font-semibold text-amber-600">{numify(project.errorCount)}</p>
                        </div>

                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 justify-end items-center">
                        <Menu shadow="md" width="target" position="bottom-start">
                            <Menu.Target>
                                <PrimaryButton leftSection={<IoEyeOutline size={16} />} className="w-full px-3 py-2 text-sm">
                                    View Logs
                                </PrimaryButton>
                            </Menu.Target>

                            <Menu.Dropdown>
                                {project?.buckets?.length > 0 ? (
                                    project.buckets.map((n, i) => (
                                        <Menu.Item
                                            key={n.id || i}
                                            component={Link}
                                            to={`/dashboard/buckets/${n.id}`}
                                            className="text-sm hover:bg-gray-50"
                                        >
                                            {n?.title}
                                        </Menu.Item>
                                    ))
                                ) : (
                                    <Menu.Item disabled>
                                        No buckets available
                                    </Menu.Item>
                                )}
                            </Menu.Dropdown>
                        </Menu>

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
        </>
    )
}

const OverviewSection = ({ projects }) => {

    const uniqueBuckets = new Set(
        projects.flatMap(project => project.buckets.map(b => b.id))
    );

    return (
        <>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Projects</p>
                            <p className="text-2xl font-bold text-gray-800">{projects.length}</p>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-lg">
                            <IoBriefcaseOutline size={24} className="text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Bucket</p>
                            <p className="text-2xl font-bold text-gray-800">
                                {numify(uniqueBuckets?.size)}
                            </p>
                        </div>
                        <div className="bg-violet-100 p-3 rounded-lg">
                            <TbBucket size={24} className="text-violet-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg p-4 border rounded-lg border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Logs</p>
                            <p className="text-2xl font-bold text-gray-800">
                                {numify(sumInt(projects?.map((p) => p.totalLogs)))}
                            </p>
                        </div>
                        <div className="bg-amber-100 p-3 rounded-lg">
                            <IoTimeOutline size={24} className="text-amber-600" />
                        </div>
                    </div>
                </div>

            </div>
        </>
    )
}
export default ProjectViews