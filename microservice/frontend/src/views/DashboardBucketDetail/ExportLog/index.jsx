//@ts-check
import { Button, Progress, Text, Stack, Group, Modal } from '@mantine/core';
import { IoAlertCircle, IoCheckmark, IoDownload } from 'react-icons/io5';
import useExportLog from './hooks';

const ExportLogs = ({ bucketId }) => {

    const {
        totalPages,
        progress,
        exportLogs,
        opened,
        isExporting,
        setOpened,
        success,
        error
    } = useExportLog({ bucketId })

    // Calculate percentage for the progress bar
    const progressPercentage = totalPages > 0 ? (progress / totalPages) * 100 : 0;

    return (
        <>
            <Button
                leftIcon={<IoDownload size={16} />}
                onClick={exportLogs}
            >
                Export Logs
            </Button>

            <Modal
                opened={opened}
                onClose={() => !isExporting && setOpened(false)}
                title="Exporting Logs"
                closeOnClickOutside={false}
                closeOnEscape={false}
                withCloseButton={!isExporting}
                centered
            >
                <Stack spacing="md">
                    {!success && !error && (
                        <Text size="sm">
                            Please wait while we prepare your export. This may take a moment for large datasets.
                        </Text>
                    )}

                    {isExporting && (
                        <Stack spacing="xs">
                            <Group position="apart">
                                <Text size="xs" weight={500}>Processing...</Text>
                                <Text size="xs" color="dimmed">
                                    Page {progress} of {totalPages}
                                </Text>
                            </Group>
                            <Progress
                                value={progressPercentage}
                                size="xl"
                                radius="xl"
                                striped
                                animate
                            />
                        </Stack>
                    )}

                    {error && (
                        <Group spacing="xs" sx={(theme) => ({ color: theme.colors.red[6] })}>
                            <IoAlertCircle size={20} />
                            <Text size="sm">{error}</Text>
                        </Group>
                    )}

                    {success && (
                        <Stack align="center" spacing="xs">
                            <IoCheckmark size={40} color="green" />
                            <Text weight={500}>Export Complete!</Text>
                            <Text size="sm" color="dimmed">Your download should have started automatically.</Text>
                            <Button variant="light" color="gray" fullWidth onClick={() => setOpened(false)} mt="md">
                                Close
                            </Button>
                        </Stack>
                    )}

                    {error && (
                        <Button variant="outline" color="red" fullWidth onClick={() => setOpened(false)}>
                            Close and Retry
                        </Button>
                    )}
                </Stack>
            </Modal>
        </>
    );
};

export default ExportLogs;