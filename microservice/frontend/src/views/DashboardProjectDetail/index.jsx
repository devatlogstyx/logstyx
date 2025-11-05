import {
  Container,
  Title,
  Grid,
  Badge,
  Tabs,
  Table,
  Button,
  TextInput,
  Select,
  ActionIcon,
  Code,
  CopyButton,
  Tooltip,
  Avatar,
  Menu,
  Modal,
  NumberInput,
  MultiSelect,
  Loader,
} from '@mantine/core';

import {
  FiSettings,
  FiUsers,
  FiActivity,
  FiCopy,
  FiEdit,
  FiTrash2,
  FiMoreVertical,
  FiPlus,
  FiInfo,
} from 'react-icons/fi';
import { numify } from "numify";
import { sumInt } from '../../utils/function';
import { IoAlert, IoAlertCircle, IoTrendingDownOutline, IoWarning } from 'react-icons/io5';
import useDashboardProjectDetail from './hooks';
import TabOverview from './TabOverview';
import TabLogs from './TabLogs';
import TabUser from './TabUser';

const DashboardProjectDetail = () => {

  const {
    project,
    isLoading,
    activeTab,
    logs,
    users,
    refetchData,
    changeActiveTab
  } = useDashboardProjectDetail()

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">
      <div className="text-center">
        <Loader />
      </div>
    </div>
  }

  return (
    <Container className="max-w-7xl py-8">
      {/* Header */}
      <div className="space-y-4 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <Title className="text-3xl font-bold">{project.title}</Title>
            <div className="flex gap-2 mt-2">
              <Code>{project.slug}</Code>
              <Badge variant="light">Active</Badge>
            </div>
          </div>
          <Button leftSection={<FiSettings />} >
            Settings
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Logs</p>
                <p className="text-2xl font-bold text-gray-800">{logs.length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <IoTrendingDownOutline size={24} className="text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Warnings</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {numify(sumInt(logs?.filter((n) => n?.level === "warning")?.map((p) => p.count)))}
                </p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <IoWarning size={24} className="text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Errors</p>
                <p className="text-2xl font-bold text-orange-600">
                  {numify(sumInt(logs?.filter((n) => n?.level === "error")?.map((p) => p.count)))}
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <IoAlert size={24} className="text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical</p>
                <p className="text-2xl font-bold text-red-600">
                  {numify(sumInt(logs?.filter((n) => n?.level === "critical")?.map((p) => p.count)))}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <IoAlertCircle size={24} className="text-red-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={changeActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="overview" icon={<FiInfo className="w-3.5 h-3.5" />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="logs" icon={<FiActivity className="w-3.5 h-3.5" />}>
            Logs
          </Tabs.Tab>
          <Tabs.Tab value="users" icon={<FiUsers className="w-3.5 h-3.5" />}>
            Users
          </Tabs.Tab>
        </Tabs.List>

        {/* Overview Tab */}
        <Tabs.Panel value="overview" className="pt-8">
          <TabOverview
            project={project}
          />
        </Tabs.Panel>

        {/* Logs Tab */}
        <Tabs.Panel value="logs" className="pt-8">
          <TabLogs
            logs={logs}
          />
        </Tabs.Panel>

        {/* Users Tab */}
        <Tabs.Panel value="users" className="pt-8">
          <TabUser
            projectId={project?.id}
            users={users}
            onUpdate={refetchData}
          />
        </Tabs.Panel>
      </Tabs>

      {/* Settings Modal */}
      <Modal
        opened={false}

        title="Project Settings"
        className="min-w-xl"
      >
        <div className="space-y-4">
          <TextInput label="Project Title" defaultValue={project.title} />
          <TextInput label="Slug" defaultValue={project.slug} disabled />
          <MultiSelect
            label="Indexed Fields"
            data={['userId', 'sessionId', 'errorCode', 'timestamp', 'endpoint']}
            defaultValue={project.settings.indexes}
            placeholder="Select fields to index"
          />
          <MultiSelect
            label="Allowed Origins"
            data={project.settings.allowedOrigin}
            defaultValue={project.settings.allowedOrigin}
            placeholder="Add allowed origins"
            searchable
            creatable
            getCreateLabel={(query) => `+ Add ${query}`}
          />
          <NumberInput
            label="Retention Days"
            defaultValue={project.settings.retentionDays}
            min={1}
            max={365}
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="subtle" >
              Cancel
            </Button>
            <Button>Save Changes</Button>
          </div>
        </div>
      </Modal>
    </Container>
  );
};

export default DashboardProjectDetail;