import {Plus} from 'lucide-react'
import {useState} from 'react'
import {Card, CardContent} from '../shadcn'

export function IntegrationCard({
  logo,
  name,
  onClick,
}: {
  logo: string
  name: string
  onClick: () => void
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Card
      className="relative h-[120px] w-[120px] cursor-pointer rounded-lg border border-gray-300 bg-white p-0 transition-colors duration-300 ease-in-out hover:border-[#8A7DFF] hover:bg-[#F8F7FF]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}>
      <CardContent
        className="flex h-full flex-col items-center justify-center pt-6"
        onClick={onClick}>
        {isHovered ? (
          <div className="flex h-full flex-col items-center justify-center">
            <Plus color="#8A7DFF" size={24} />
            <span className="mt-2 font-sans text-[14px] font-semibold text-[#8A7DFF]">
              Add
            </span>{' '}
            {/* Set to 14px and semibold */}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center">
            <img
              src={logo}
              alt={`${name} logo`}
              className="h-8 w-8"
              style={{marginBottom: '10px'}}
            />{' '}
            <p className="m-0 mb-2 text-center font-sans text-sm font-semibold">
              {name}
            </p>{' '}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
