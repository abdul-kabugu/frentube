import { cx } from '@/utils/className'
import { generatePolymorphicComponent } from '@/utils/generator/polymorphic'
import { PolymorphicProps, PolymorphicTypes } from '@/utils/types'

export type ContainerProps<Type extends PolymorphicTypes> =
  PolymorphicProps<Type>

const Container = generatePolymorphicComponent(
  cx('relative mx-auto w-full max-w-screen-md px-2')
)
export default Container
