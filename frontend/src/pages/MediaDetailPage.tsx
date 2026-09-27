import { useParams, useNavigate } from 'react-router-dom'
import { MediaDetail } from '@/components/MediaDetail'

export default function MediaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const mediaId = Number(id)
  const navigate = useNavigate()

  return (
    <div className="max-w-4xl mx-auto">
      <MediaDetail mediaId={mediaId} onClose={() => navigate('/')} />
    </div>
  )
}
