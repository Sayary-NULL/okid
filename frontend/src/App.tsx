import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/AppLayout'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import RegistryPage from '@/pages/RegistryPage'
import MediaDetailPage from '@/pages/MediaDetailPage'
import MediaCreatePage from '@/pages/MediaCreatePage'
import MediaEditPage from '@/pages/MediaEditPage'
import MediaSearchPage from '@/pages/MediaSearchPage'
import CollectionsPage from '@/pages/CollectionsPage'
import CollectionDetailPage from '@/pages/CollectionDetailPage'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<RegistryPage />} />
              <Route path="/media/new" element={<MediaCreatePage />} />
              <Route path="/media/search" element={<MediaSearchPage />} />
              <Route path="/media/:id" element={<MediaDetailPage />} />
              <Route path="/media/:id/edit" element={<MediaEditPage />} />
              <Route path="/collections" element={<CollectionsPage />} />
              <Route path="/collections/:id" element={<CollectionDetailPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App