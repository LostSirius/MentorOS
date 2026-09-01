import { ChatbotUIContext } from "@/context/context"
import { IconAdjustmentsHorizontal } from "@tabler/icons-react"
import { FC, useContext, useState } from "react"
import { Button } from "../ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTrigger
} from "../ui/dialog"
import { Label } from "../ui/label"
import { Slider } from "../ui/slider"

interface ChatRetrievalSettingsProps {}

export const ChatRetrievalSettings: FC<ChatRetrievalSettingsProps> = ({}) => {
  const { sourceCount, setSourceCount } = useContext(ChatbotUIContext)

  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button type="button" className="inline-flex">
          <IconAdjustmentsHorizontal
            className="cursor-pointer pt-[4px] hover:opacity-50"
            size={24}
          />
        </button>
      </DialogTrigger>

      <DialogContent>
        <div className="space-y-3">
          <Label className="flex items-center space-x-1">
            <div>Source Count:</div>

            <div>{sourceCount}</div>
          </Label>

          <Slider
            value={[sourceCount]}
            onValueChange={values => {
              setSourceCount(values[0])
            }}
            min={1}
            max={10}
            step={1}
          />
        </div>

        <DialogFooter>
          <Button size="sm" onClick={() => setIsOpen(false)}>
            Save & Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
