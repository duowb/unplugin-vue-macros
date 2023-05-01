import { DEFINE_PROP } from '@vue-macros/common'
import { type TSType } from '@babel/types'
import { type Impl, stringifyArray } from './utils'

export const johnsonEdition: Impl = ({ s, offset, resolveTSType }) => {
  interface Prop {
    name: string
    value?: string
    required?: string
    rest?: string
    typeParameter?: TSType
  }

  const props: Prop[] = []

  return {
    walkCall(node, parent) {
      const [value, required, rest] = node.arguments

      if (
        parent.type !== 'VariableDeclarator' ||
        parent.id.type !== 'Identifier'
      )
        throw new Error(
          `A variable must be used to receive the return value of ${DEFINE_PROP} (johnsonEdition)`
        )

      const propName = parent.id.name

      props.push({
        name: propName,
        value: value ? s.sliceNode(value, { offset }) : undefined,
        required: required ? s.sliceNode(required, { offset }) : undefined,
        rest: rest ? s.sliceNode(rest, { offset }) : undefined,
        typeParameter: node.typeParameters?.params[0],
      })

      return propName
    },

    async genRuntimeProps() {
      if (props.length === 0) return

      const isAllWithoutOptions = props.every(
        ({ typeParameter, value, required, rest }) =>
          !typeParameter && !value && !required && !rest
      )

      if (isAllWithoutOptions) {
        return stringifyArray(props.map(({ name }) => name))
      }

      let propsString = '{\n'

      for (const { name, value, required, rest, typeParameter } of props) {
        let def: string

        const type = typeParameter && (await resolveTSType(typeParameter))
        if (rest && !value && !required && !type) {
          def = rest
        } else {
          const pairs: string[] = []
          if (type) pairs.push(`type: ${type}`)
          if (value) pairs.push(`default: ${value}`)
          if (required) pairs.push(`required: ${required}`)
          if (rest) pairs.push(`...${rest}`)
          def = `{ ${pairs.join(', ')} }`
        }
        propsString += `  ${JSON.stringify(name)}: ${def},\n`
      }
      propsString += '}'

      return propsString
    },
  }
}
