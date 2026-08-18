declare module "prop-types-exact" {
  import type {ValidationMap} from "prop-types"

  export default function propTypesExact<Props>(propTypes: ValidationMap<Props>): ValidationMap<Props>
}
