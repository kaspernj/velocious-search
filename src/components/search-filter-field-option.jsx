// @ts-check

/** @import {NamedExoticComponent, ReactNode} from "react" */

import {memo} from "react"
import PropTypes from "prop-types"
import propTypesExact from "prop-types-exact"
import Pressable from "react-native-propforge/pressable"
import {createStyleCache} from "react-native-propforge/style-cache"
import Text from "react-native-propforge/text"
import {shapeComponent, ShapeComponent} from "set-state-compare/build/shape-component.js"

const styles = createStyleCache()

/**
 * @typedef {object} SearchFilterFieldOptionProps
 * @property {import("../search-catalog.js").SearchCatalogField} field - Catalog field represented by this option.
 * @property {string} label - Translated catalog field label.
 * @property {(field: import("../search-catalog.js").SearchCatalogField) => void} onSelect - Selection callback.
 * @property {boolean} selected - Whether this field is currently selected.
 * @property {string} testID - Stable selector base.
 */

/** @typedef {Record<never, never>} SearchFilterFieldOptionState */

/** @type {NamedExoticComponent<SearchFilterFieldOptionProps>} */
const SearchFilterFieldOption = memo(shapeComponent(/** @augments {ShapeComponent<SearchFilterFieldOptionProps, SearchFilterFieldOptionState>} */ class SearchFilterFieldOption extends ShapeComponent {
  static propTypes = propTypesExact({
    field: PropTypes.object.isRequired,
    label: PropTypes.string.isRequired,
    onSelect: PropTypes.func.isRequired,
    selected: PropTypes.bool.isRequired,
    testID: PropTypes.string.isRequired
  })

  /** @type {SearchFilterFieldOptionState} */
  state = {}

  /** @returns {ReactNode} - Field option. */
  render() {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={this.tt.onPress}
        style={styles[`fieldOption-${this.p.selected}`] ||= {
          backgroundColor: this.p.selected ? "#dbeafe" : "#ffffff",
          borderColor: this.p.selected ? "#2563eb" : "#d1d5db",
          borderRadius: 8,
          borderWidth: 1,
          paddingHorizontal: 10,
          paddingVertical: 8
        }}
        testID={this.p.testID}
      >
        <Text
          style={styles[`fieldOptionLabel-${this.p.selected}`] ||= {
            color: this.p.selected ? "#1d4ed8" : "#111827",
            fontSize: 14
          }}
          testID={`${this.p.testID}/label`}
        >
          {this.p.label}
        </Text>
      </Pressable>
    )
  }

  /** @returns {void} - Selects this field. */
  onPress = () => {
    this.p.onSelect(this.p.field)
  }
}))

export default SearchFilterFieldOption
