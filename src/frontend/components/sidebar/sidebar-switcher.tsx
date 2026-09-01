import { ChatbotUIContext } from "@/context/context"
import { ContentType } from "@/types"
import { IconFile, IconMessage } from "@tabler/icons-react"
import { FC, useContext, useEffect, useMemo, useState } from "react"
import { TabsList } from "../ui/tabs"
import { WithTooltip } from "../ui/with-tooltip"
import { ProfileSettings } from "../utility/profile-settings"
import { SidebarSwitchItem } from "./sidebar-switch-item"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from "@dnd-kit/sortable"

export const SIDEBAR_ICON_SIZE = 28

const SIDEBAR_ORDER_KEY = "sidebarItemOrder"

const SIDEBAR_ITEMS: { contentType: ContentType; icon: React.ReactNode }[] = [
  { contentType: "chats", icon: <IconMessage size={SIDEBAR_ICON_SIZE} /> },
  { contentType: "files", icon: <IconFile size={SIDEBAR_ICON_SIZE} /> }
]

interface SidebarSwitcherProps {
  onContentTypeChange: (contentType: ContentType) => void
}

export const SidebarSwitcher: FC<SidebarSwitcherProps> = ({
  onContentTypeChange
}) => {
  const { chats, files } = useContext(ChatbotUIContext)

  const countMap = useMemo(
    () => ({
      chats: chats.length,
      files: files.length,
      presets: 0,
      prompts: 0,
      collections: 0,
      assistants: 0,
      tools: 0,
      models: 0
    }),
    [chats, files]
  )

  const [items, setItems] = useState(SIDEBAR_ITEMS)

  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_ORDER_KEY)
    if (!saved) return
    try {
      const order: ContentType[] = JSON.parse(saved)
      const ordered = order
        .map(type => SIDEBAR_ITEMS.find(item => item.contentType === type))
        .filter((item): item is (typeof SIDEBAR_ITEMS)[0] => !!item)
      const missing = SIDEBAR_ITEMS.filter(
        item => !ordered.some(o => o.contentType === item.contentType)
      )
      setItems([...ordered, ...missing])
    } catch {
      // ignore invalid saved order
    }
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setItems(items => {
        const oldIndex = items.findIndex(
          item => item.contentType === active.id
        )
        const newIndex = items.findIndex(item => item.contentType === over.id)
        const newItems = arrayMove(items, oldIndex, newIndex)
        localStorage.setItem(
          SIDEBAR_ORDER_KEY,
          JSON.stringify(newItems.map(i => i.contentType))
        )
        return newItems
      })
    }
  }

  return (
    <div className="flex flex-col justify-between border-r-2 pb-5">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map(i => i.contentType)}
          strategy={verticalListSortingStrategy}
        >
          <TabsList className="bg-background grid h-auto grid-rows-2 gap-1 py-2">
            {items.map(item => (
              <SidebarSwitchItem
                key={item.contentType}
                icon={item.icon}
                contentType={item.contentType}
                count={countMap[item.contentType]}
                onContentTypeChange={onContentTypeChange}
              />
            ))}
          </TabsList>
        </SortableContext>
      </DndContext>

      <div className="flex flex-col items-center space-y-4">
        {/* TODO */}
        {/* <WithTooltip display={<div>Import</div>} trigger={<Import />} /> */}

        {/* TODO */}
        {/* <Alerts /> */}

        <WithTooltip
          display={<div>Profile Settings</div>}
          trigger={<ProfileSettings />}
        />
      </div>
    </div>
  )
}
