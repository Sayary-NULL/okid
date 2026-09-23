import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/api/endpoints'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await authApi.register({ username, password })
      const { data } = await authApi.login({ username, password })
      setAuth(data.access, data.refresh)
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Ошибка регистрации')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-80">
        <CardHeader>
          <CardTitle>Регистрация</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Input placeholder="Имя пользователя" value={username} onChange={(e) => setUsername(e.target.value)} />
            <Input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit">Зарегистрироваться</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}