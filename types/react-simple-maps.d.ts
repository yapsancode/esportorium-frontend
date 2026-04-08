declare module 'react-simple-maps' {
  import { ComponentType, ReactNode } from 'react'

  interface ComposableMapProps {
    projection?: string
    projectionConfig?: Record<string, unknown>
    width?: number
    height?: number
    className?: string
    children?: ReactNode
  }

  interface GeographiesChildrenProps {
    geographies: GeographyType[]
  }

  interface GeographiesProps {
    geography: string | Record<string, unknown>
    children: (props: GeographiesChildrenProps) => ReactNode
  }

  interface GeographyType {
    rsmKey: string
    properties: Record<string, unknown>
    type: string
    geometry: Record<string, unknown>
  }

  interface GeographyProps {
    geography: GeographyType
    fill?: string
    stroke?: string
    strokeWidth?: number
    className?: string
    style?: {
      default?: React.CSSProperties
      hover?: React.CSSProperties
      pressed?: React.CSSProperties
    }
    onMouseEnter?: (event: React.MouseEvent) => void
    onMouseLeave?: (event: React.MouseEvent) => void
    onClick?: (event: React.MouseEvent) => void
  }

  export const ComposableMap: ComponentType<ComposableMapProps>
  export const Geographies: ComponentType<GeographiesProps>
  export const Geography: ComponentType<GeographyProps>
  export const ZoomableGroup: ComponentType<{
    center?: [number, number]
    zoom?: number
    children?: ReactNode
  }>
}
