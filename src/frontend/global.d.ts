declare module "*.png" {
  const value: { src: string; height: number; width: number; blurDataURL?: string }
  export default value
}

declare module "*.jpg" {
  const value: { src: string; height: number; width: number; blurDataURL?: string }
  export default value
}

declare module "*.jpeg" {
  const value: { src: string; height: number; width: number; blurDataURL?: string }
  export default value
}

declare module "*.svg" {
  const value: React.FunctionComponent<React.SVGAttributes<SVGElement>>
  export default value
}
