import * as React from "react"
import { View } from "@tarojs/components"
import Taro from "@tarojs/taro"
import { type ITouchEvent } from "@tarojs/components"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof View>,
  Omit<React.ComponentPropsWithoutRef<typeof View>, "value" | "onChange"> & {
    value?: number[]
    defaultValue?: number[]
    min?: number
    max?: number
    step?: number
    onValueChange?: (value: number[]) => void
    disabled?: boolean
    orientation?: "horizontal" | "vertical"
    trackClassName?: string
    rangeClassName?: string
    thumbClassName?: string
  }
>(({ className, trackClassName, rangeClassName, thumbClassName, value: valueProp, defaultValue, min = 0, max = 100, step = 1, onValueChange, disabled, orientation = "horizontal", ...props }, ref) => {
  const [localValue, setLocalValue] = React.useState<number[]>(
    valueProp || defaultValue || [min]
  )
  const [isDragging, setIsDragging] = React.useState(false)
  const [rect, setRect] = React.useState<{ left: number; top: number; width: number; height: number } | null>(null)
  const rectRef = React.useRef<{ left: number; top: number; width: number; height: number } | null>(null)
  const idRef = React.useRef(`slider-${Math.random().toString(36).substr(2, 9)}`)
  const rootRef = React.useRef<React.ElementRef<typeof View>>(null)

  const value = valueProp !== undefined ? valueProp : localValue
  const currentValue = value[0] ?? min

  React.useEffect(() => {
    rectRef.current = rect
  }, [rect])

  React.useEffect(() => {
    // Delay measurement to ensure the component is mounted and layout is ready
    const timer = setTimeout(() => {
      const query = Taro.createSelectorQuery()
      query
        .select(`#${idRef.current}`)
        .boundingClientRect((res) => {
        const measuredRect = Array.isArray(res) ? res[0] : res
        if (measuredRect) {
          setRect({ left: measuredRect.left, top: measuredRect.top, width: measuredRect.width, height: measuredRect.height })
          rectRef.current = { left: measuredRect.left, top: measuredRect.top, width: measuredRect.width, height: measuredRect.height }
        }
      })
        .exec()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // H5 端（含 Portal 弹层内）优先通过 DOM ref 实时测量，规避 createSelectorQuery 查不到 Portal 节点的问题
  const getDomRect = (): { left: number; top: number; width: number; height: number } | null => {
    try {
      const el = rootRef.current as unknown as { getBoundingClientRect?: () => DOMRect } | null
      if (el && typeof el.getBoundingClientRect === "function") {
        const domRect = el.getBoundingClientRect()
        if (domRect && domRect.width > 0) {
          return { left: domRect.left, top: domRect.top, width: domRect.width, height: domRect.height }
        }
      }
    } catch {
      // ignore
    }
    return null
  }

  const resolveRect = () => getDomRect() || rectRef.current

  const updateValue = (clientX: number, clientY: number, passedRect?: { left: number; top: number; width: number; height: number } | null) => {
    const currentRect = passedRect || resolveRect()
    if (!currentRect || disabled) return

    let percentage = 0
    if (orientation === "horizontal") {
      const { left, width } = currentRect
      percentage = Math.min(Math.max((clientX - left) / width, 0), 1)
    } else {
      const { top, height } = currentRect
      percentage = Math.min(Math.max(1 - (clientY - top) / height, 0), 1)
    }

    const rawValue = min + percentage * (max - min)
    const steppedValue = Math.round((rawValue - min) / step) * step + min
    const newValue = Math.min(Math.max(steppedValue, min), max)

    if (newValue !== currentValue) {
      const nextValue = [newValue]
      if (valueProp === undefined) {
        setLocalValue(nextValue)
      }
      onValueChange?.(nextValue)
    }
  }

  const touchPos = (e: ITouchEvent) => {
    const touch = e.touches[0] || e.changedTouches[0]
    if (!touch) return null
    return { x: touch.clientX ?? touch.pageX, y: touch.clientY ?? touch.pageY }
  }

  const handleTouchStart = (e: ITouchEvent) => {
    if (disabled) return
    setIsDragging(true)
    const pos = touchPos(e)
    if (pos) {
      updateValue(pos.x, pos.y, resolveRect())
    }
  }

  const handleTouchMove = (e: ITouchEvent) => {
    if (disabled) return
    const pos = touchPos(e)
    if (pos) {
      updateValue(pos.x, pos.y, resolveRect())
    }
  }

  const handleTouchEnd = (e: ITouchEvent) => {
    if (disabled) return
    setIsDragging(false)
    const pos = touchPos(e)
    if (pos) {
      updateValue(pos.x, pos.y, resolveRect())
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return
    setIsDragging(true)
    updateValue(e.clientX ?? e.pageX, e.clientY ?? e.pageY, resolveRect())

    const onMouseMove = (moveEvent: MouseEvent) => {
      updateValue(moveEvent.clientX ?? moveEvent.pageX, moveEvent.clientY ?? moveEvent.pageY)
    }

    const onMouseUp = (upEvent: MouseEvent) => {
      setIsDragging(false)
      updateValue(upEvent.clientX ?? upEvent.pageX, upEvent.clientY ?? upEvent.pageY)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    if (typeof document !== 'undefined') {
        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
    }
  }

  const percentage = ((currentValue - min) / (max - min)) * 100

  return (
    <View
      ref={(el: React.ElementRef<typeof View>) => {
        rootRef.current = el
        if (typeof ref === 'function') {
          ref(el)
        } else if (ref) {
          ;(ref as React.MutableRefObject<React.ElementRef<typeof View> | null>).current = el
        }
      }}
      id={idRef.current}
      className={cn(
        "relative flex touch-none select-none items-center",
        orientation === "horizontal" ? "w-full py-4" : "h-full flex-col px-4",
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      // @ts-ignore
      onMouseDown={handleMouseDown}
      {...props}
    >
      <View
        className={cn(
          "relative grow overflow-hidden rounded-full bg-secondary",
          orientation === "horizontal" ? "h-1 w-full" : "w-1 h-full",
          trackClassName
        )}
      >
        <View
          className={cn("absolute bg-primary", orientation === "horizontal" ? "h-full" : "w-full bottom-0", rangeClassName)}
          style={orientation === "horizontal" ? { width: `${percentage}%` } : { height: `${percentage}%` }}
        />
      </View>
      <View
        className={cn(
            "absolute block h-3 w-3 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors disabled:pointer-events-none disabled:opacity-50",
            isDragging && "ring-4 ring-primary ring-opacity-30",
            disabled && "opacity-50",
            thumbClassName
        )}
        style={
          orientation === "horizontal"
          ? { left: `${percentage}%`, transform: 'translateX(-50%)' }
          : { bottom: `${percentage}%`, transform: 'translateY(50%)' }
        }
      />
    </View>
  )
})
Slider.displayName = "Slider"

export { Slider }
