//@ts-check

import { Modal } from "@mantine/core"
import SecondaryButton from "../../../component/button/SecondaryButton"

const ModalLogDetail = ({
    opened,
    log,
    onClose
}) => {

    return (
        <>
            <Modal
                opened={opened}
                onClose={onClose}
                title="Log Detail"
                centered
                overlayProps={{ opacity: 0.55, blur: 3 }}
            >
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="font-semibold text-sm text-gray-700">Level</label>
                        <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm">
                            <span className={`font-semibold ${log?.level === 'ERROR' ? 'text-red-600' : 'text-gray-700'}`}>
                                {log?.level}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="font-semibold text-sm text-gray-700">Count</label>
                        <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm">
                            {log?.count}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="font-semibold text-sm text-gray-700">Device</label>
                        <pre className="bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto text-xs whitespace-pre-wrap">
                            <code>{JSON.stringify(log?.device, null, 2)}</code>
                        </pre>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="font-semibold text-sm text-gray-700">Last Seen</label>
                        <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm">
                            {new Date(log?.updatedAt).toLocaleString()}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="font-semibold text-sm text-gray-700">Context</label>
                        <pre className="bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto text-xs whitespace-pre-wrap">
                            <code>{JSON.stringify(log?.context, null, 2)}</code>
                        </pre>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="font-semibold text-sm text-gray-700">Data</label>
                        <pre className="bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto text-xs max-h-96 overflow-y-auto whitespace-pre-wrap">
                            <code>{JSON.stringify(log?.data, null, 2)?.replace(/\\n/g, '\n\t')}</code>
                        </pre>
                    </div>

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

export default ModalLogDetail