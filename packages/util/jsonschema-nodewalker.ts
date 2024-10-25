/**
 * Adapted from https://github.com/ralusek/jsonschema-nodewalker
 * This module has very few stars and is not maintained and written in js
 * but it gets the job done... so we use it for now
 */

interface Node {
  title?: string
  description?: string
  const?: unknown
  type?: string
  anyOf?: Node[]
  oneOf?: Node[]
  allOf?: Node[]

  items?: Node
  required?: string[]
  properties?: Record<string, Node>
}

interface Meta {
  path?: Array<string | undefined>
  name?: string

  isArrayItem?: boolean
  lineage?: Node[]
  childArrayItem?: Node
  childObjectProperties?: Record<string, Node>
  isRequired?: boolean
}

type OnNode = (node: Node, meta: Meta) => Node | void

export function jsonSchemaWalkNodes(
  node: unknown,
  onNode: OnNode,
  meta?: Meta,
) {
  try {
    return _walkNodes(node as Node, onNode, meta, {isRoot: true})
  } catch (err) {
    console.error('Error walking schema', JSON.stringify(node, null, 2))
    throw err
  }
}

function _walkNodes(
  node: Node,
  onNode: OnNode,
  meta: Meta = {},
  {isRoot}: {isRoot?: boolean} = {},
) {
  const {lineage = [], path = []} = meta

  const childMeta: Meta = {
    lineage: [...lineage, node],
    path: isRoot ? path : [...path, meta.name],
  }
  if (!node) {
    console.error('Missing node', {node, meta, isRoot})
  }
  if (node.type === 'array') {
    childMeta.isArrayItem = true
    meta.childArrayItem =
      _walkNodes(node.items ?? {}, onNode, childMeta) ?? undefined
  } else if (node.type === 'object') {
    const required = new Set(node.required || [])

    const childProps: Record<string, Node | undefined> =
      (meta.childObjectProperties = {})
    for (const prop in node.properties) {
      childMeta.name = prop
      childMeta.isRequired = required.has(prop)
      childProps[prop] =
        _walkNodes(node.properties[prop]!, onNode, childMeta) ?? undefined
    }
  } else if (node.anyOf) {
    for (const anyOf of node.anyOf) {
      _walkNodes(anyOf, onNode, childMeta)
    }
  } else if (node.oneOf) {
    for (const oneOf of node.oneOf) {
      _walkNodes(oneOf, onNode, childMeta)
    }
  } else if (node.allOf) {
    for (const allOf of node.allOf) {
      _walkNodes(allOf, onNode, childMeta)
    }
  }

  return onNode(node, meta)
}
