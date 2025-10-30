import "@mantine/core/styles.css";
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import 'mantine-contextmenu/styles.layer.css';
import "./main.css"

import { MantineProvider } from '@mantine/core';
import { createRoot } from 'react-dom/client'
import Router from './routes'
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";
import { ContextMenuProvider } from "mantine-contextmenu";

createRoot(document.getElementById('root')).render(
  <MantineProvider
    defaultColorScheme="light"
  >
    <Notifications />
    <ModalsProvider>
      <ContextMenuProvider>
        <Router />
      </ContextMenuProvider>
    </ModalsProvider>
  </MantineProvider>,
)
