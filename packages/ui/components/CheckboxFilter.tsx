import {Component} from 'lucide-react'
import {useState} from 'react'
import {Button} from '../shadcn/Button'
import {Checkbox} from '../shadcn/Checkbox'
import {Popover, PopoverContent, PopoverTrigger} from '../shadcn/Popover'
import {parseCategory} from '../utils'

export function CheckboxFilter({
  options,
  onApply,
}: {
  options: string[]
  onApply: (selected: string[]) => void
}) {
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>(
    options.reduce(
      (acc, option) => {
        acc[option] = false
        return acc
      },
      {} as Record<string, boolean>,
    ),
  )

  // Handle checkbox change
  const handleCheckboxChange = (id: string) => {
    setCheckedState((prevState) => ({
      ...prevState,
      [id]: !prevState[id],
    }))
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary">
          <Component className="h-4 w-4" style={{color: '#8A5DF6'}} />{' '}
          <span className="ml-2">Category</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 bg-white">
        <div className="flex flex-col gap-2">
          {options.map((option) => (
            <div
              key={option}
              className="flex w-full cursor-pointer items-center justify-start space-x-2"
              // onClick={() => handleCheckboxChange(option)}
            >
              <Checkbox
                id={option}
                checked={checkedState[option]}
                onCheckedChange={() => handleCheckboxChange(option)}
                className={`rounded-sm border border-gray-300 transition-colors duration-200 ${
                  checkedState[option]
                    ? 'border-transparent bg-[#8A7DFF]'
                    : 'hover:bg-[#F6F6F6]'
                }`}>
                {/* Custom checkmark */}
                <span
                  className={`block h-4 w-4 rounded-sm ${
                    checkedState[option]
                      ? 'bg-button text-button-foreground'
                      : 'bg-transparent'
                  }`}>
                  {checkedState[option] && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-white"
                      viewBox="0 0 20 20"
                      fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M6.293 9.293a1 1 0 011.414 0L10 11.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </span>
              </Checkbox>
              <label
                htmlFor={option}
                className="cursor-pointer text-sm font-semibold">
                {' '}
                {parseCategory(option)}
              </label>
            </div>
          ))}
          {/* Added a visible divider here */}
          <div className="my-2 w-full border-t border-[#E6E6E6]" />
          <div className="col-span-3 flex justify-end gap-2">
            <Button
              onClick={() => {
                setCheckedState(
                  options.reduce(
                    (acc, option) => {
                      acc[option] = false
                      return acc
                    },
                    {} as Record<string, boolean>,
                  ),
                )
                onApply([])
              }}
              size="sm"
              variant="secondary">
              Clear
            </Button>
            <Button
              onClick={() =>
                onApply(
                  Object.keys(checkedState).filter((key) => checkedState[key]),
                )
              }
              size="sm">
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
