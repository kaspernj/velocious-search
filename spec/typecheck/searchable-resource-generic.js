// @ts-check

import SearchableResource from "../../src/searchable-resource.js"
import VelociousDatabaseRecord from "velocious/build/src/database/record/index.js"

export class ConsumerRecord extends VelociousDatabaseRecord {
  /** @returns {string} - Consumer-specific value unavailable on the framework base record. */
  consumerValue() {
    return "consumer"
  }
}

/**
 * Consumer resource base preserving its concrete model type.
 * @template {typeof import("velocious/build/src/database/record/index.js").default} [TModelClass=typeof import("velocious/build/src/database/record/index.js").default]
 * @augments {SearchableResource<TModelClass>}
 */
export default class ConsumerSearchableResource extends SearchableResource {}

/**
 * Proves authorized queries preserve the consumer record instance type.
 * @param {ConsumerSearchableResource<typeof ConsumerRecord>} resource - Typed consumer resource.
 * @returns {Promise<string | null>} - Consumer-specific value when a record exists.
 */
export async function readConsumerValue(resource) {
  const record = await resource.authorizedQuery("index").findBy({id: "consumer-id"})

  return record ? record.consumerValue() : null
}
