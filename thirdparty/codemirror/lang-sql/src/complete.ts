import {
  Completion,
  CompletionContext,
  CompletionSource,
  completeFromList,
  ifNotIn,
  CompletionResult
} from "@codemirror/autocomplete"
import {EditorState, Text} from "@codemirror/state"
import {syntaxTree} from "@codemirror/language"
import {SyntaxNode} from "@lezer/common"
import {Type, Keyword} from "./sql.grammar.terms"
import {EditorView} from "@codemirror/view";
import lodash from "lodash";
import {CompleterResult} from "readline";

function tokenBefore(tree: SyntaxNode) {
  let cursor = tree.cursor().moveTo(tree.from, -1)
  while (/Comment/.test(cursor.name)) cursor.moveTo(cursor.from, -1)
  return cursor.node
}

function idName(doc: Text, from: SyntaxNode, to?: SyntaxNode): string {
  if(to == null){
    to = from
  }
  let text = doc.sliceString(from.from, to.to)
  let quoted = /^([`'"])(.*)\1$/.exec(text)
  return quoted ? quoted[2] : text
}

function plainID(node: SyntaxNode | null) {
  return node && (node.name == "Identifier" || node.name == "QuotedIdentifier")
}

function pathFor(doc: Text, id: SyntaxNode) {
  if (id.name == "CompositeIdentifier") {
    let path = []
    for (let ch = id.firstChild; ch; ch = ch.nextSibling)
      if (plainID(ch)) path.push(idName(doc, ch))
    return path
  }
  return [idName(doc, id)]
}

function parentsFor(doc: Text, node: SyntaxNode | null) {
  for (let path = [];;) {
    if (!node || node.name != ".") return path
    let name = tokenBefore(node)
    if (!plainID(name)) return path
    path.unshift(idName(doc, name))
    node = tokenBefore(name)
  }
}

function sourceContext(state: EditorState, startPos: number) {
  let pos = syntaxTree(state).resolveInner(startPos, -1)
  const {aliases,tables} = getAliasesAndTables(state.doc, pos)
  if (pos.name == "Identifier" || pos.name == "QuotedIdentifier" || pos.name == "Keyword") {
    return {from: pos.from,
            quoted: pos.name == "QuotedIdentifier" ? state.doc.sliceString(pos.from, pos.from + 1) : null,
            parents: parentsFor(state.doc, tokenBefore(pos)),
            aliases,
            tables
    }
  } if (pos.name == ".") {
    return {from: startPos, quoted: null, parents: parentsFor(state.doc, pos), aliases, tables}
  } else {
    return {from: startPos, quoted: null, parents: [], empty: true, aliases, tables}
  }
}

const EndFrom = new Set("where group having order union intersect except all distinct limit offset fetch for".split(" "))

function getAliasesAndTables(doc: Text, at: SyntaxNode) {
  let statement
  for (let parent: SyntaxNode | null = at; !statement; parent = parent.parent) {
    if (!parent) return {aliases:null,tables:[]}
    if (parent.name == "Statement") statement = parent
  }
  let aliases = null
  let tables = []
  for (let scan = statement.firstChild, sawFrom = false, prevID: SyntaxNode | null = null; scan; scan = scan.nextSibling) {
    let kw = scan.name == "Keyword" ? doc.sliceString(scan.from, scan.to).toLowerCase() : null
    let alias = null
    if (!sawFrom) {
      sawFrom = kw == "from"
    } else if (kw == "as" && prevID && plainID(scan.nextSibling)) {
      alias = idName(doc, scan.nextSibling!)
    } else if (kw && EndFrom.has(kw)) {
      break
    } else if (prevID && plainID(scan)) {
      alias = idName(doc, scan)
    }else{
      if(scan.name === "QuotedIdentifier" || scan.name === "Identifier" || scan.name === "CompositeIdentifier"){
        if(scan.prevSibling?.name==="Keyword"){
          const prevName = idName(doc, scan.prevSibling).toLowerCase()
          if(prevName === "from" || prevName === "join"){
            tables.push(idName(doc, scan))
          }
        }else{
          tables.push(idName(doc, scan))
        }
      }
    }
    if (alias) {
      if (!aliases) {
        aliases = Object.create(null)
      }
      aliases[alias] = pathFor(doc, prevID!)
    }
    prevID = /Identifier$/.test(scan.name) ? scan : null
  }
  return {aliases,tables}
}

function maybeQuoteCompletions(quote: string | null, completions: readonly Completion[]) {
  if (!quote) return completions
  return completions.map(c => ({...c, label: quote + c.label + quote, apply: undefined}))
}

const Span = /^\w*$/, QuotedSpan = /^[`'"]?\w*[`'"]?$/

class CompletionLevel {
  list: readonly Completion[] = []
  children: {[name: string]: CompletionLevel} | undefined = undefined

  child(name: string) {
    let children = this.children || (this.children = Object.create(null))
    return children[name] || (children[name] = new CompletionLevel)
  }

  childCompletions(type: string) {
    return this.children ? Object.keys(this.children).filter(x => x).map(name => ({label: name, type} as Completion)) : []
  }
}

export const completeFromSchema = lodash.throttle((schema: {[table: string]: readonly (string | Completion)[]},
                                            tables?: readonly Completion[],
                                            defaultTableName?: string, defaultSchemaName?: string): CompletionSource =>{
  let top = new CompletionLevel
  let defaultSchema = top.child(defaultSchemaName || "")
  for (let table in schema) {
    let dot = table.indexOf(".")
    let schemaCompletions = dot > -1 ? top.child(table.slice(0, dot)) : defaultSchema
    let tableCompletions = schemaCompletions.child(dot > -1 ? table.slice(dot + 1) : table)
    tableCompletions.list = schema[table].map(val => typeof val == "string" ? {label: val, type: "property"} : val)
  }
  defaultSchema.list = (tables || defaultSchema.childCompletions("type"))
      .concat(defaultTableName ? defaultSchema.child(defaultTableName).list : [])
  for (let sName in top.children) {
    let schema = top.child(sName)
    if (!schema.list.length) schema.list = schema.childCompletions("type")
  }
  top.list = defaultSchema.list.concat(top.childCompletions("type"))

  return (context: CompletionContext) => {
    let {parents, from, quoted, empty, aliases, tables} = sourceContext(context.state, context.pos)
    if (empty && !context.explicit) return null
    if (aliases && parents.length == 1) parents = aliases[parents[0]] || parents
    let level = top
    for (let name of parents) {
      while (!level.children || !level.children[name]) {
        if (level == top) level = defaultSchema
        else if (level == defaultSchema && defaultTableName) level = level.child(defaultTableName)
        else return null
      }
      level = level.child(name)
    }
    let quoteAfter = quoted && context.state.sliceDoc(context.pos, context.pos + 1) == quoted
    let options = level.list
    if (level == top && aliases)
      options = options.concat(Object.keys(aliases).map(name => ({label: name, type: "constant",boost: 2.5})))

    if(tables.length > 0){
      const inputPos = from - 1
      //如果当前输入的字符是点，说明前面有别名，不需要关联提示表字段
      if(inputPos > 0 && context.state.doc.sliceString(inputPos,from) !== "."){
        const fieldMap = new Map()
        for (const table of tables) {
          const fields = schema[table]
          if(fields){
            for (let field of fields) {
              if(field instanceof Object){
                const name = field.label
                const lastField = fieldMap.get(name)
                if(lastField){
                  //多个同名字段，添加省略号表示有多个(例如一段sql中引用了两张表都存在id字段，id字段注释和类型为[xxx,...])
                  if(!lastField.info.endsWith(',...]')){
                    lastField.info = "["+(lastField.info.length===0?'(N/A)':lastField.info)+",...]"
                    lastField.detail = "["+(lastField.detail.length===0?'(N/A)':lastField.detail)+",...]"
                  }
                }else{
                  //对象克隆，防止修改影响其他提示
                  field = {...field}
                  field.info = table+" "+field.info
                  //高优先级
                  field.boost = 2
                  fieldMap.set(name,field)
                }
              }
            }
          }
          options = Array.from(fieldMap.values()).concat(options)
        }
      }
    }
    // console.log("from",from)
    // console.log("aliases",aliases)
    // console.log("tables",tables)
    return {
      from,
      to: quoteAfter ? context.pos + 1 : undefined,
      options: maybeQuoteCompletions(quoted, options),
      validFor: quoted ? QuotedSpan : Span
    }
  }
},250)

function functionApply (view: EditorView, completion: Completion, from: number, to: number){
  const name = completion.label + completion.detail
  const start = name.lastIndexOf("(")

  view.dispatch({
    changes: {from: from,to:to, insert: name},
    selection: {
      anchor: from + (name.length-1),
      head: from + start + 1
    }
  })
}

export function  completeKeywords(keywords: {type:string,name:string}[], upperCase: boolean) {
    return ifNotIn(["QuotedIdentifier", "SpecialVar", "String", "LineComment", "BlockComment", "."],
        (context: CompletionContext):CompletionResult => {
        let {parents, from, quoted, empty, aliases, tables} = sourceContext(context.state, context.pos)
        if (empty && !context.explicit) return null
        const currentInput = context.state.sliceDoc(context.pos-1, context.pos)
        let quoteAfter = quoted && context.state.sliceDoc(context.pos, context.pos + 1) == quoted
        let completions = keywords.map((keyword, idx) => {
          //如果选择转换大小，或者当前输入字符为大写，则自动转换为大写
          const name = ((upperCase || /[A-Z]/.test(currentInput)) ? keyword.name.toUpperCase() : keyword.name)
          if (keyword.type === "function") {
            const start = name.lastIndexOf("(")
            return ({
              label: name.substring(0, start),
              detail: name.substring(start).replaceAll("-", " "),
              type: keyword.type,
              boost: 1 - (idx / keywords.length),
              apply: functionApply
            })
          } else {
            return ({
              label: name.replaceAll("-", ""),
              type: keyword.type,
              boost: 1 - (idx / keywords.length),
              apply: name.replaceAll("-", " ")
            })
          }
        })
        return {
          from: from,
          to: quoteAfter ? context.pos + 1 : undefined,
          options: completions,
        }
      }
    )
}

