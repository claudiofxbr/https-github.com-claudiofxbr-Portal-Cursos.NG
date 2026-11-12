/* Main App Component - Handles routing (using react-router-dom), query client and other providers - use this file to add all routes */
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { PortalProvider } from '@/context/PortalContext'
import Index from './pages/Index'
import ResetPassword from './pages/ResetPassword'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'

const App = () => (
  <BrowserRouter>
    <TooltipProvider>
      <PortalProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            {/*
              SPEC-INIT-001 Decisão 2 do Usuário:
              "O /reset-password fica como exceção documentada"
              Esta rota permanece acessível pré-autenticação para que o usuário possa redefinir sua
              senha com o token recebido por e-mail, sem exigir sessão ou portão prévio.
            */}
            <Route path="/reset-password" element={<ResetPassword />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </PortalProvider>
    </TooltipProvider>
  </BrowserRouter>
)

export default App
