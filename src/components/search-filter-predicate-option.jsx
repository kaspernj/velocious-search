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
 * @typedef {object} SearchFilterPredicateOptionProps
 * @property {string} label - Human-readable predicate label.
 * @property {(predicate: import("../filter-contract.js").SearchPredicate) => void} onSelect - Selection callback.
 * @property {import("../filter-contract.js").SearchPredicate} predicate - Predicate represented by this option.
 * @property {boolean} selected - Whether this predicate is currently selected.
 * @property {string} testID - Stable selector base.
 */

/** @typedef {Record<never, never>} SearchFilterPredicateOptionState */

/** @type {NamedExoticComponent<SearchFilterPredicateOptionProps>} */
const SearchFilterPredicateOption = memo(shapeComponent(/** @augments {ShapeComponent<SearchFilterPredicateOptionProps, SearchFilterPredicateOptionState>} */ class SearchFilterPredicateOption extends ShapeComponent {
  static propTypes = propTypesExact({
    label: PropTypes.string.isRequired,
    onSelect: PropTypes.func.isRequired,
    predicate: PropTypes.string.isRequired,
    selected: PropTypes.bool.isRequired,
    testID: PropTypes.string.isRequired
  })

  /** @type {SearchFilterPredicateOptionState} */
  state = {}

  /** @returns {ReactNode} - Predicate option. */
  render() {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={this.tt.onPress}
        style={styles[`predicateOption-${this.p.selected}`] ||= {
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
          style={styles[`predicateOptionLabel-${this.p.selected}`] ||= {
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

  /** @returns {void} - Selects this predicate. */
  onPress = () => {
    this.p.onSelect(this.p.predicate)
  }
}))

export default SearchFilterPredicateOption
