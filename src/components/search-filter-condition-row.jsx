// @ts-check

/** @import {NamedExoticComponent, ReactNode} from "react" */

import {memo, useEffect} from "react"
import PropTypes from "prop-types"
import propTypesExact from "prop-types-exact"
import Pressable from "react-native-propforge/pressable"
import {createStyleCache} from "react-native-propforge/style-cache"
import {Platform} from "react-native"
import Text from "react-native-propforge/text"
import TextInput from "react-native-propforge/text-input"
import View from "react-native-propforge/view"
import {shapeComponent, ShapeComponent} from "set-state-compare/build/shape-component.js"

import {SEARCH_PREDICATES} from "../filter-contract.js"
import SearchFilterFieldOption from "./search-filter-field-option.js"
import SearchFilterPredicateOption from "./search-filter-predicate-option.js"

const styles = createStyleCache()

/** @type {Record<import("../filter-contract.js").SearchPredicate, string>} */
const predicateLabels = {
  cont: "contains",
  end: "ends with",
  eq: "equals",
  gt: "greater than",
  gteq: "greater than or equal",
  in: "is one of",
  lt: "less than",
  lteq: "less than or equal",
  not_eq: "does not equal",
  not_in: "is not one of",
  null: "is null",
  start: "starts with"
}

/**
 * @typedef {object} SearchFilterConditionRowProps
 * @property {import("./search-filter.jsx").SearchFilterDraftCondition} condition - Editable condition.
 * @property {import("../search-catalog.js").SearchCatalogField[]} fields - Searchable field catalog.
 * @property {number} index - Condition position.
 * @property {(change: import("./search-filter.jsx").SearchFilterDraftConditionChange) => void} onChange - Draft change callback.
 * @property {(index: number) => void} onRemove - Remove callback.
 * @property {string} testID - Stable selector base.
 * @property {(message: string) => string} translate - Consumer translation callback.
 */

/**
 * @typedef {object} SearchFilterConditionRowState
 * @property {boolean} fieldOptionsOpen - Whether field choices are visible.
 * @property {boolean} predicateOptionsOpen - Whether predicate choices are visible.
 */

/** @type {NamedExoticComponent<SearchFilterConditionRowProps>} */
const SearchFilterConditionRow = memo(shapeComponent(/** @augments {ShapeComponent<SearchFilterConditionRowProps, SearchFilterConditionRowState>} */ class SearchFilterConditionRow extends ShapeComponent {
  static propTypes = propTypesExact({
    condition: PropTypes.object.isRequired,
    fields: PropTypes.arrayOf(PropTypes.object.isRequired).isRequired,
    index: PropTypes.number.isRequired,
    onChange: PropTypes.func.isRequired,
    onRemove: PropTypes.func.isRequired,
    testID: PropTypes.string.isRequired,
    translate: PropTypes.func.isRequired
  })

  /** @type {SearchFilterConditionRowState} */
  state = {
    fieldOptionsOpen: false,
    predicateOptionsOpen: false
  }

  /** @type {import("react-native").TextInput | {value: string} | null} */
  valueInput = null

  /** @type {string} */
  valueText = this.props.condition.valueText

  /** @returns {void} - Synchronizes externally replaced filter values. */
  setup() {
    useEffect(() => {
      if (this.valueText === this.p.condition.valueText) return

      this.valueText = this.p.condition.valueText

      if (!this.valueInput) return

      if (Platform.OS === "web") {
        /** @type {{value: string}} */ (this.valueInput).value = this.valueText
      } else {
        /** @type {import("react-native").TextInput} */ (this.valueInput).setNativeProps({text: this.valueText})
      }
    }, [this.p.condition.valueText])
  }

  /** @returns {ReactNode} - Editable condition row. */
  render() {
    /** @type {import("./search-filter.jsx").SearchFilterDraftCondition} */
    const condition = this.p.condition
    /** @type {import("../search-catalog.js").SearchCatalogField[]} */
    const fields = this.p.fields
    const {testID, translate} = this.p
    const selectedField = fields.find((field) => (
      field.attribute === condition.attribute &&
      field.path.length === condition.path.length &&
      field.path.every((relationshipName, index) => relationshipName === condition.path[index])
    ))

    if (!selectedField) {
      throw new Error(`Search filter condition field is not available: ${[...condition.path, condition.attribute].join(".")}`)
    }

    return (
      <View
        style={styles.conditionRow ||= {
          backgroundColor: "#f8fafc",
          borderColor: "#dbe3ec",
          borderRadius: 12,
          borderWidth: 1,
          gap: 10,
          padding: 12
        }}
        testID={testID}
      >
        <View
          style={styles.controls ||= {
            alignItems: "flex-start",
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8
          }}
          testID={`${testID}/controls`}
        >
          <Pressable
            accessibilityRole="button"
            onPress={this.tt.onFieldPress}
            style={styles.fieldButton ||= {
              backgroundColor: "#ffffff",
              borderColor: "#94a3b8",
              borderRadius: 8,
              borderWidth: 1,
              minWidth: 170,
              paddingHorizontal: 10,
              paddingVertical: 9
            }}
            testID={`${testID}/field`}
          >
            <Text
              style={styles.fieldButtonLabel ||= {color: "#0f172a", fontSize: 14, fontWeight: "600"}}
              testID={`${testID}/field/label`}
            >
              {translate(selectedField.label)}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={this.tt.onPredicatePress}
            style={styles.predicateButton ||= {
              backgroundColor: "#ffffff",
              borderColor: "#94a3b8",
              borderRadius: 8,
              borderWidth: 1,
              minWidth: 150,
              paddingHorizontal: 10,
              paddingVertical: 9
            }}
            testID={`${testID}/predicate`}
          >
            <Text
              style={styles.predicateButtonLabel ||= {color: "#0f172a", fontSize: 14}}
              testID={`${testID}/predicate/label`}
            >
              {translate(predicateLabels[condition.predicate])}
            </Text>
          </Pressable>
          {condition.predicate === "null" ?
            <Pressable
              accessibilityRole="button"
              onPress={this.tt.onNullValuePress}
              style={styles.nullValueButton ||= {
                backgroundColor: "#ffffff",
                borderColor: "#94a3b8",
                borderRadius: 8,
                borderWidth: 1,
                paddingHorizontal: 10,
                paddingVertical: 9
              }}
              testID={`${testID}/nullValue`}
            >
              <Text
                style={styles.nullValueButtonLabel ||= {color: "#0f172a", fontSize: 14}}
                testID={`${testID}/nullValue/label`}
              >
                {condition.valueText === "true" ? translate("Yes") : translate("No")}
              </Text>
            </Pressable>
            :
            <TextInput
              defaultValue={condition.valueText}
              multiline={condition.predicate === "in" || condition.predicate === "not_in"}
              onChangeText={this.tt.onValueChangeText}
              placeholder={condition.predicate === "in" || condition.predicate === "not_in" ? translate("One value per line") : translate("Value")}
              style={styles.valueInput ||= {
                backgroundColor: "#ffffff",
                borderColor: "#94a3b8",
                borderRadius: 8,
                borderWidth: 1,
                color: "#0f172a",
                flexGrow: 1,
                minWidth: 180,
                paddingHorizontal: 10,
                paddingVertical: 8
              }}
              ref={this.tt.onValueInputRef}
              testID={`${testID}/value`}
            />
          }
          <Pressable
            accessibilityRole="button"
            onPress={this.tt.onRemovePress}
            style={styles.removeButton ||= {
              backgroundColor: "#fff1f2",
              borderColor: "#fecdd3",
              borderRadius: 8,
              borderWidth: 1,
              paddingHorizontal: 10,
              paddingVertical: 9
            }}
            testID={`${testID}/remove`}
          >
            <Text
              style={styles.removeButtonLabel ||= {color: "#be123c", fontSize: 14, fontWeight: "600"}}
              testID={`${testID}/remove/label`}
            >
              {translate("Remove")}
            </Text>
          </Pressable>
        </View>
        {this.s.fieldOptionsOpen &&
          <View
            style={styles.fieldOptions ||= {gap: 6}}
            testID={`${testID}/fieldOptions`}
          >
            {fields.map((field, index) =>
              <SearchFilterFieldOption
                field={field}
                key={`${field.path.join(".")}:${field.attribute}`}
                label={translate(field.label)}
                onSelect={this.tt.onFieldSelect}
                selected={field === selectedField}
                testID={`${testID}/fieldOption/${index}`}
              />
            )}
          </View>
        }
        {this.s.predicateOptionsOpen &&
          <View
            style={styles.predicateOptions ||= {
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 6
            }}
            testID={`${testID}/predicateOptions`}
          >
            {SEARCH_PREDICATES.map((predicate) =>
              <SearchFilterPredicateOption
                key={predicate}
                label={translate(predicateLabels[predicate])}
                onSelect={this.tt.onPredicateSelect}
                predicate={predicate}
                selected={predicate === condition.predicate}
                testID={`${testID}/predicateOption/${predicate}`}
              />
            )}
          </View>
        }
      </View>
    )
  }

  /** @returns {void} - Toggles field options. */
  onFieldPress = () => {
    this.s.fieldOptionsOpen = !this.s.fieldOptionsOpen
    this.s.predicateOptionsOpen = false
  }

  /**
   * @param {import("../search-catalog.js").SearchCatalogField} field - Selected catalog field.
   * @returns {void}
   */
  onFieldSelect = (field) => {
    this.s.fieldOptionsOpen = false
    this.p.onChange({
      condition: {...this.p.condition, attribute: field.attribute, path: [...field.path]},
      index: this.p.index
    })
  }

  /** @returns {void} - Toggles predicate options. */
  onPredicatePress = () => {
    this.s.fieldOptionsOpen = false
    this.s.predicateOptionsOpen = !this.s.predicateOptionsOpen
  }

  /**
   * @param {import("../filter-contract.js").SearchPredicate} predicate - Selected predicate.
   * @returns {void}
   */
  onPredicateSelect = (predicate) => {
    if (predicate === this.p.condition.predicate) {
      this.s.predicateOptionsOpen = false
      return
    }

    let valueText = this.p.condition.valueText
    const currentIsList = this.p.condition.predicate === "in" || this.p.condition.predicate === "not_in"
    const selectedIsList = predicate === "in" || predicate === "not_in"
    const currentIsScalar = this.p.condition.predicate !== "null" && !currentIsList
    const selectedIsScalar = predicate !== "null" && !selectedIsList

    if (predicate === "null" && valueText !== "true" && valueText !== "false") valueText = "true"
    if (this.p.condition.predicate === "null" && predicate !== "null") valueText = ""

    this.s.predicateOptionsOpen = false

    if ((currentIsList && selectedIsList) || (currentIsScalar && selectedIsScalar)) {
      this.p.onChange({
        condition: {...this.p.condition, predicate},
        index: this.p.index
      })
      return
    }

    this.p.onChange({
      condition: {
        attribute: this.p.condition.attribute,
        path: [...this.p.condition.path],
        predicate,
        valueEdited: true,
        valueText
      },
      index: this.p.index
    })
  }

  /** @returns {void} - Toggles the null predicate's boolean value. */
  onNullValuePress = () => {
    this.p.onChange({
      condition: {
        attribute: this.p.condition.attribute,
        path: [...this.p.condition.path],
        predicate: this.p.condition.predicate,
        valueEdited: true,
        valueText: this.p.condition.valueText === "true" ? "false" : "true"
      },
      index: this.p.index
    })
  }

  /**
   * @param {string} valueText - New scalar or list editor value.
   * @returns {void}
   */
  onValueChangeText = (valueText) => {
    this.valueText = valueText
    this.p.onChange({
      condition: {
        attribute: this.p.condition.attribute,
        path: [...this.p.condition.path],
        predicate: this.p.condition.predicate,
        valueEdited: true,
        valueText
      },
      index: this.p.index
    })
  }

  /** @param {import("react-native").TextInput | {value: string} | null} valueInput - Current native or web input. */
  onValueInputRef = (valueInput) => {
    this.valueInput = valueInput
  }

  /** @returns {void} - Removes this condition. */
  onRemovePress = () => {
    this.p.onRemove(this.p.index)
  }
}))

export default SearchFilterConditionRow
