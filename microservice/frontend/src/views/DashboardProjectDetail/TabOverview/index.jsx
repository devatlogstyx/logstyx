//@ts-check

import { ActionIcon, Badge, Code, CopyButton, Grid, Tooltip } from "@mantine/core"
import { FiCopy } from "react-icons/fi"
import moment from "moment-timezone"

const TabOverview = ({
    project
}) => {
    return (
        <div className="space-y-4">
            <div className="p-6 rounded-md border shadow-sm bg-white">
                <h3 className="text-xl font-semibold mb-4">
                    Project Details
                </h3>
                <Grid>
                    <Grid.Col span={6}>
                        <div className="text-sm text-gray-500">
                            Project ID
                        </div>
                        <div className="font-medium">{project.slug}</div>
                    </Grid.Col>
                    <Grid.Col span={6}>
                        <div className="text-sm text-gray-500">
                            Created At
                        </div>
                        <div className="font-medium">{moment(project.createdAt).format("MMM, Do YYYY")}</div>
                    </Grid.Col>
                    <Grid.Col span={6}>
                        <div className="text-sm text-gray-500">
                            Last Updated
                        </div>
                        <div className="font-medium">{moment(project.updatedAt).format("MMM, Do YYYY")}</div>
                    </Grid.Col>
                    <Grid.Col span={12}>
                        <div className="text-sm text-gray-500 mb-1">
                            API Secret
                        </div>
                        <div className="flex gap-2">
                            <Code className="flex-1">{project.secret}</Code>
                            <CopyButton value={project.secret}>
                                {({ copied, copy }) => (
                                    <Tooltip label={copied ? 'Copied' : 'Copy'}>
                                        <ActionIcon color={copied ? 'teal' : 'gray'} onClick={copy}>
                                            <FiCopy className="w-4 h-4" />
                                        </ActionIcon>
                                    </Tooltip>
                                )}
                            </CopyButton>
                        </div>
                    </Grid.Col>
                </Grid>
            </div>

            <div className="p-6 rounded-md border shadow-sm bg-white">
                <h3 className="text-xl font-semibold mb-4">
                    Configuration
                </h3>
                <div className="space-y-4">
                    <div>
                        <div className="text-sm text-gray-500 mb-1">
                            Indexed Fields
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {project.settings.indexes.map((index, i) => (
                                <Badge key={i} variant="light">
                                    {index}
                                </Badge>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-500 mb-1">
                            Allowed Origins
                        </div>
                        <div className="space-y-1">
                            {project.settings.allowedOrigin.map((origin, i) => (
                                <Code key={i} className="block">{origin}</Code>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TabOverview