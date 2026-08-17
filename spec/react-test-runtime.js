// @ts-check

import {registerHooks} from "node:module"
import {JSDOM} from "jsdom"

registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier === "react-native" ? "react-native-web" : specifier, context)
  }
})

const dom = new JSDOM("<!doctype html><html><body></body></html>", {url: "http://127.0.0.1/"})

class ResizeObserver {
  /** @returns {void} */
  disconnect() {}

  /** @returns {void} */
  observe() {}

  /** @returns {void} */
  unobserve() {}
}

Object.defineProperty(dom.window, "ResizeObserver", {configurable: true, value: ResizeObserver})

for (const [name, value] of Object.entries({
  CSSStyleSheet: dom.window.CSSStyleSheet,
  CustomEvent: dom.window.CustomEvent,
  document: dom.window.document,
  Element: dom.window.Element,
  Event: dom.window.Event,
  HTMLElement: dom.window.HTMLElement,
  HTMLStyleElement: dom.window.HTMLStyleElement,
  MutationObserver: dom.window.MutationObserver,
  Node: dom.window.Node,
  navigator: dom.window.navigator,
  ResizeObserver,
  ShadowRoot: dom.window.ShadowRoot,
  window: dom.window
})) {
  Object.defineProperty(globalThis, name, {configurable: true, value, writable: true})
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true
