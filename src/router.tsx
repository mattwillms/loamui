import { createBrowserRouter } from 'react-router'
import { LoginPage } from '@/pages/LoginPage'
import { AppLayout } from '@/layouts/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { GardensPage } from '@/pages/GardensPage'
import { GardenDetailPage } from '@/pages/GardenDetailPage'
import { BedDetailPage } from '@/pages/BedDetailPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ErrorPage } from '@/pages/ErrorPage'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'gardens',
        element: <GardensPage />,
      },
      {
        path: 'gardens/:id',
        element: <GardenDetailPage />,
      },
      {
        path: 'beds/:id',
        element: <BedDetailPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
