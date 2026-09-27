import { useParams, useNavigate } from 'react-router-dom'
import { MediaEditForm } from '@/components/MediaEditForm'

export default function MediaEditPage() {
  const { id } = useParams<{ id: string }>()
  const mediaId = Number(id)
  const navigate = useNavigate()

  return (
    <div className="max-w-2xl mx-auto">
      <MediaEditForm mediaId={mediaId} onDone={() => navigate(`/media/${mediaId}`)} />
    </div>
  )
}
