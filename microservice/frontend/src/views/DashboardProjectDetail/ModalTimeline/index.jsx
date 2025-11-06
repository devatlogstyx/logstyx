import { Modal } from "@mantine/core"
import { BarChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar } from 'recharts'
import SecondaryButton from "../../../component/button/SecondaryButton"
import useModalTimeline from "./hooks"

const ModalTimeline = ({
    opened,
    projectId,
    logKey,
    onClose
}) => {

    const {
        chartData
    } = useModalTimeline({
        projectId,
        logKey
    })

    return (
        <>
            <Modal
                opened={opened}
                onClose={onClose}
                title="Log Timeline"
                centered
                overlayProps={{ opacity: 0.55, blur: 3 }}
                size="xl"
            >
                <div className="flex flex-col gap-4">

                    {chartData.length > 0 ? (
                        <div style={{ width: '100%', height: '400px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={chartData}
                                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="time"
                                        tick={{ fontSize: 12 }}
                                        interval={2}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        tick={{ fontSize: 12 }}
                                    />
                                    <Tooltip
                                        formatter={(value) => [value, 'Events']}
                                        labelFormatter={(label) => `Time: ${label}`}
                                    />
                                    <Bar
                                        type="monotone"
                                        dataKey="count"
                                        fill="#228be6"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 py-8">
                            No data available
                        </div>
                    )}

                    <div className="flex justify-end space-x-2 pt-2">
                        <SecondaryButton onClick={onClose}>
                            Close
                        </SecondaryButton>
                    </div>
                </div>
            </Modal>
        </>
    )
}

export default ModalTimeline