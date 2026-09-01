import { ContentType } from "@/types"
import { FC } from "react"
import { TabsTrigger } from "../ui/tabs"
import { WithTooltip } from "../ui/with-tooltip"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { IconGripVertical } from "@tabler/icons-react"

interface SidebarSwitchItemProps {
  contentType: ContentType
  icon: React.ReactNode
  count?: number
  onContentTypeChange: (contentType: ContentType) => void
}

export const SidebarSwitchItem: FC<SidebarSwitchItemProps> = ({
  contentType,
  icon,
  count = 0,
  onContentTypeChange
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: contentType })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : "auto"
  }

  const displayName = contentType[0].toUpperCase() + contentType.substring(1)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative flex items-center justify-center"
    >
      {/* Drag handle — visible on hover, positioned to the left */}
      <div
        className="absolute left-0 flex h-8 w-4 cursor-grab items-center justify-center rounded opacity-0 transition-opacity active:cursor-grabbing group-hover:opacity-40"
        {...attributes}
        {...listeners}
        title="Drag to reorder"
      >
        <IconGripVertical size={14} className="text-white" />
      </div>

      <WithTooltip
        display={<div>{displayName}</div>}
        delayDuration={200}
        trigger={
          <TabsTrigger
            className="relative cursor-pointer transition-all hover:bg-white/[0.05] hover:opacity-80 data-[state=active]:cursor-default data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:shadow-none"
            value={contentType}
            onClick={() => onContentTypeChange(contentType)}
          >
            <div className="relative">
              {icon}

              {/* Count badge */}
              {count > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-violet-500 px-1 text-[9px] font-bold leading-none text-white shadow-sm">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </div>
          </TabsTrigger>
        }
      />
    </div>
  )
}
