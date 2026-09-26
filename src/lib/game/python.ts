/**
 * Teaching-oriented Python 3 subset interpreter.
 * No eval, no imports, bounded loops — safe to run student code in the browser.
 */

export type PyErrorKind =
  | "SyntaxError"
  | "IndentationError"
  | "NameError"
  | "TypeError"
  | "IndexError"
  | "KeyError"
  | "ValueError"
  | "RuntimeError";

export type PyError = {
  kind: PyErrorKind;
  message: string;
  line: number;
  hint: string;
  fix: string;
};

export type RunResult = {
  ok: boolean;
  stdout: string;
  error?: PyError;
};

type Tok = {
  type: string;
  value: string;
  line: number;
  col: number;
};

const KEYWORDS = new Set([
  "if",
  "elif",
  "else",
  "for",
  "while",
  "def",
  "return",
  "in",
  "not",
  "and",
  "or",
  "True",
  "False",
  "None",
  "pass",
  "break",
  "continue",
  "is",
]);

function err(kind: PyErrorKind, message: string, line: number, hint: string, fix: string): PyError {
  return { kind, message, line, hint, fix };
}

function tokenize(source: string): Tok[] {
  const src = source.replace(/\r\n/g, "\n").replace(/\t/g, "    ");
  const tokens: Tok[] = [];
  const indents = [0];
  const lines = src.split("\n");

  for (let li = 0; li < lines.length; li++) {
    const lineNo = li + 1;
    const raw = lines[li];
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;

    const indent = raw.match(/^ */)?.[0].length ?? 0;
    if (indent > indents[indents.length - 1]) {
      indents.push(indent);
      tokens.push({ type: "INDENT", value: "", line: lineNo, col: 1 });
    } else {
      while (indent < indents[indents.length - 1]) {
        indents.pop();
        tokens.push({ type: "DEDENT", value: "", line: lineNo, col: 1 });
      }
      if (indent !== indents[indents.length - 1]) {
        throw err(
          "IndentationError",
          "Indentation does not match any outer level.",
          lineNo,
          "Python uses spaces at the start of a line to group code. Keep the same number of spaces for lines in the same block.",
          "Use 4 spaces for each indent level. Do not mix random spacing.",
        );
      }
    }

    let i = indent;
    const line = raw;
    while (i < line.length) {
      const ch = line[i];
      if (ch === " ") {
        i++;
        continue;
      }
      if (ch === "#") break;

      if (ch === '"' || ch === "'") {
        const quote = ch;
        let j = i + 1;
        let val = "";
        while (j < line.length) {
          if (line[j] === "\\") {
            const n = line[j + 1];
            if (n === "n") val += "\n";
            else if (n === "t") val += "\t";
            else if (n === quote || n === "\\") val += n;
            else val += n ?? "";
            j += 2;
            continue;
          }
          if (line[j] === quote) break;
          val += line[j];
          j++;
        }
        if (j >= line.length || line[j] !== quote) {
          throw err(
            "SyntaxError",
            "String is missing a closing quote.",
            lineNo,
            "Every string must start and end with the same quote mark.",
            `Close the string: ${quote}your text${quote}`,
          );
        }
        tokens.push({ type: "STRING", value: val, line: lineNo, col: i + 1 });
        i = j + 1;
        continue;
      }

      if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(line[i + 1] ?? ""))) {
        const m = line.slice(i).match(/^[0-9]+(\.[0-9]+)?/);
        if (!m) {
          throw err("SyntaxError", "Invalid number.", lineNo, "Numbers look like 10 or 3.14.", "Write a number such as 42.");
        }
        tokens.push({ type: "NUMBER", value: m[0], line: lineNo, col: i + 1 });
        i += m[0].length;
        continue;
      }

      if (/[A-Za-z_]/.test(ch)) {
        const m = line.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
        const name = m![0];
        tokens.push({ type: KEYWORDS.has(name) ? name : "NAME", value: name, line: lineNo, col: i + 1 });
        i += name.length;
        continue;
      }

      const two = line.slice(i, i + 2);
      const ops2 = ["==", "!=", "<=", ">=", "+=", "-=", "*=", "/=", "//", "**"];
      if (ops2.includes(two)) {
        tokens.push({ type: two, value: two, line: lineNo, col: i + 1 });
        i += 2;
        continue;
      }

      const one = ch;
      if ("+-*/%=<>()[]{},:.".includes(one)) {
        tokens.push({ type: one, value: one, line: lineNo, col: i + 1 });
        i += 1;
        continue;
      }

      if (one === ";") {
        tokens.push({ type: "NEWLINE", value: "", line: lineNo, col: i + 1 });
        i += 1;
        continue;
      }

      throw err(
        "SyntaxError",
        `Unexpected character '${ch}'.`,
        lineNo,
        "Python does not use that symbol here.",
        "Remove it, or check you didn't paste JavaScript / Java code.",
      );
    }
    tokens.push({ type: "NEWLINE", value: "", line: lineNo, col: line.length + 1 });
  }

  while (indents.length > 1) {
    indents.pop();
    tokens.push({ type: "DEDENT", value: "", line: lines.length, col: 1 });
  }
  tokens.push({ type: "EOF", value: "", line: lines.length, col: 1 });
  return tokens;
}

type Expr =
  | { k: "num"; n: number; line: number }
  | { k: "str"; s: string; line: number }
  | { k: "name"; id: string; line: number }
  | { k: "const"; v: boolean | null; line: number }
  | { k: "list"; items: Expr[]; line: number }
  | { k: "dict"; keys: Expr[]; vals: Expr[]; line: number }
  | { k: "unary"; op: string; x: Expr; line: number }
  | { k: "bin"; op: string; a: Expr; b: Expr; line: number }
  | { k: "call"; fn: Expr; args: Expr[]; line: number }
  | { k: "index"; target: Expr; index: Expr; line: number }
  | { k: "slice"; target: Expr; start: Expr | null; end: Expr | null; step: Expr | null; line: number }
  | { k: "attr"; target: Expr; name: string; line: number }
  | { k: "compare"; ops: string[]; items: Expr[]; line: number }
  | { k: "ternary"; cond: Expr; then: Expr; else: Expr; line: number };

type Stmt =
  | { k: "expr"; e: Expr; line: number }
  | { k: "assign"; name: string; e: Expr; op: string; line: number }
  | { k: "unpack"; names: string[]; e: Expr; line: number }
  | { k: "setitem"; target: Expr; index: Expr; e: Expr; line: number }
  | { k: "if"; branches: { cond: Expr | null; body: Stmt[] }[]; line: number }
  | { k: "for"; names: string[]; iter: Expr; body: Stmt[]; line: number }
  | { k: "while"; cond: Expr; body: Stmt[]; line: number }
  | { k: "def"; name: string; params: string[]; body: Stmt[]; line: number }
  | { k: "return"; e: Expr | null; line: number }
  | { k: "pass"; line: number }
  | { k: "break"; line: number }
  | { k: "continue"; line: number };

class Parser {
  i = 0;
  toks: Tok[];
  constructor(toks: Tok[]) {
    this.toks = toks;
  }
  peek(): Tok {
    return this.toks[this.i];
  }
  at(type: string) {
    return this.peek().type === type;
  }
  eat(type?: string): Tok {
    const t = this.peek();
    if (type && t.type !== type) {
      throw err(
        "SyntaxError",
        `Expected ${humanTok(type)}, found ${humanTok(t.type)}.`,
        t.line,
        hintForExpected(type, t),
        fixForExpected(type, t),
      );
    }
    this.i++;
    return t;
  }
  skipNewlines() {
    while (this.at("NEWLINE")) this.i++;
  }

  parse(): Stmt[] {
    const body: Stmt[] = [];
    this.skipNewlines();
    while (!this.at("EOF") && !this.at("DEDENT")) {
      body.push(this.stmt());
      this.skipNewlines();
    }
    return body;
  }

  stmt(): Stmt {
    const t = this.peek();
    if (t.type === "if") return this.ifStmt();
    if (t.type === "for") return this.forStmt();
    if (t.type === "while") return this.whileStmt();
    if (t.type === "def") return this.defStmt();
    if (t.type === "return") {
      this.eat("return");
      if (this.at("NEWLINE") || this.at("DEDENT") || this.at("EOF")) {
        this.eat("NEWLINE");
        return { k: "return", e: null, line: t.line };
      }
      const e = this.expr();
      this.endline();
      return { k: "return", e, line: t.line };
    }
    if (t.type === "pass") {
      this.eat("pass");
      this.endline();
      return { k: "pass", line: t.line };
    }
    if (t.type === "break") {
      this.eat("break");
      this.endline();
      return { k: "break", line: t.line };
    }
    if (t.type === "continue") {
      this.eat("continue");
      this.endline();
      return { k: "continue", line: t.line };
    }
    if (t.type === "NAME" && (this.toks[this.i + 1]?.type === "=" || isAug(this.toks[this.i + 1]?.type))) {
      const name = this.eat("NAME").value;
      const op = this.eat().type;
      const e = this.expr();
      this.endline();
      return { k: "assign", name, e, op, line: t.line };
    }
    if (t.type === "NAME" && this.toks[this.i + 1]?.type === ",") {
      const names = [this.eat("NAME").value];
      while (this.at(",")) {
        this.eat(",");
        names.push(this.eat("NAME").value);
      }
      this.eat("=");
      const first = this.expr();
      let e: Expr = first;
      if (this.at(",")) {
        const items = [first];
        while (this.at(",")) {
          this.eat(",");
          if (this.at("NEWLINE") || this.at("EOF") || this.at("DEDENT")) break;
          items.push(this.expr());
        }
        e = { k: "list", items, line: t.line };
      }
      this.endline();
      return { k: "unpack", names, e, line: t.line };
    }
    const e = this.expr();
    if (this.at("=") && e.k === "index") {
      this.eat("=");
      const val = this.expr();
      this.endline();
      return { k: "setitem", target: e.target, index: e.index, e: val, line: t.line };
    }
    this.endline();
    return { k: "expr", e, line: t.line };
  }

  endline() {
    if (this.at("NEWLINE") || this.at("EOF") || this.at("DEDENT")) {
      if (this.at("NEWLINE")) this.eat("NEWLINE");
      return;
    }
    throw err(
      "SyntaxError",
      "This line has extra code Python does not understand.",
      this.peek().line,
      "Each statement should be on its own line (or use a colon to start a block).",
      "Check for a missing colon, missing quote, or leftover character.",
    );
  }

  suite(): Stmt[] {
    if (!this.at("NEWLINE")) {
      return [this.stmt()];
    }
    this.eat("NEWLINE");
    this.skipNewlines();
    if (!this.at("INDENT")) {
      throw err(
        "IndentationError",
        "Expected an indented block.",
        this.peek().line,
        "After a colon (:) the next line must be indented with spaces.",
        "Press space four times before the next line, like:\n    print(\"hello\")",
      );
    }
    this.eat("INDENT");
    const body: Stmt[] = [];
    this.skipNewlines();
    while (!this.at("DEDENT") && !this.at("EOF")) {
      body.push(this.stmt());
      this.skipNewlines();
    }
    if (this.at("DEDENT")) this.eat("DEDENT");
    if (body.length === 0) {
      throw err(
        "SyntaxError",
        "A block cannot be empty.",
        this.peek().line,
        "Every if / for / def needs at least one line inside it.",
        "Put a statement inside, or write pass.",
      );
    }
    return body;
  }

  ifStmt(): Stmt {
    const line = this.peek().line;
    this.eat("if");
    const cond = this.expr();
    this.eat(":");
    const body = this.suite();
    const branches: { cond: Expr | null; body: Stmt[] }[] = [{ cond, body }];
    while (this.at("elif")) {
      this.eat("elif");
      const c = this.expr();
      this.eat(":");
      branches.push({ cond: c, body: this.suite() });
    }
    if (this.at("else")) {
      this.eat("else");
      this.eat(":");
      branches.push({ cond: null, body: this.suite() });
    }
    return { k: "if", branches, line };
  }

  forStmt(): Stmt {
    const line = this.peek().line;
    this.eat("for");
    const names = [this.eat("NAME").value];
    while (this.at(",")) {
      this.eat(",");
      names.push(this.eat("NAME").value);
    }
    this.eat("in");
    const iter = this.expr();
    this.eat(":");
    return { k: "for", names, iter, body: this.suite(), line };
  }

  whileStmt(): Stmt {
    const line = this.peek().line;
    this.eat("while");
    const cond = this.expr();
    this.eat(":");
    return { k: "while", cond, body: this.suite(), line };
  }

  defStmt(): Stmt {
    const line = this.peek().line;
    this.eat("def");
    const name = this.eat("NAME").value;
    this.eat("(");
    const params: string[] = [];
    if (!this.at(")")) {
      params.push(this.eat("NAME").value);
      while (this.at(",")) {
        this.eat(",");
        params.push(this.eat("NAME").value);
      }
    }
    this.eat(")");
    this.eat(":");
    return { k: "def", name, params, body: this.suite(), line };
  }

  expr(): Expr {
    const a = this.or();
    if (this.at("if")) {
      const line = this.peek().line;
      this.eat("if");
      const cond = this.or();
      this.eat("else");
      const b = this.expr();
      return { k: "ternary", cond, then: a, else: b, line };
    }
    return a;
  }
  or(): Expr {
    let a = this.and();
    while (this.at("or")) {
      const op = this.eat("or");
      a = { k: "bin", op: "or", a, b: this.and(), line: op.line };
    }
    return a;
  }
  and(): Expr {
    let a = this.not();
    while (this.at("and")) {
      const op = this.eat("and");
      a = { k: "bin", op: "and", a, b: this.not(), line: op.line };
    }
    return a;
  }
  not(): Expr {
    if (this.at("not")) {
      const op = this.eat("not");
      return { k: "unary", op: "not", x: this.not(), line: op.line };
    }
    return this.comparison();
  }
  comparison(): Expr {
    const first = this.arith();
    const ops: string[] = [];
    const items: Expr[] = [first];
    while (
      ["==", "!=", "<", ">", "<=", ">=", "in", "is"].includes(this.peek().type) ||
      (this.at("not") && this.toks[this.i + 1]?.type === "in")
    ) {
      if (this.at("is")) {
        this.eat("is");
        if (this.at("not")) {
          this.eat("not");
          ops.push("is not");
        } else {
          ops.push("is");
        }
      } else if (this.at("not")) {
        this.eat("not");
        this.eat("in");
        ops.push("not in");
      } else {
        ops.push(this.eat().type);
      }
      items.push(this.arith());
    }
    if (ops.length === 0) return first;
    return { k: "compare", ops, items, line: first.line };
  }
  arith(): Expr {
    let a = this.term();
    while (this.at("+") || this.at("-")) {
      const op = this.eat();
      a = { k: "bin", op: op.type, a, b: this.term(), line: op.line };
    }
    return a;
  }
  term(): Expr {
    let a = this.power();
    while (this.at("*") || this.at("/") || this.at("//") || this.at("%")) {
      const op = this.eat();
      a = { k: "bin", op: op.type, a, b: this.power(), line: op.line };
    }
    return a;
  }
  power(): Expr {
    const a = this.unary();
    if (this.at("**")) {
      const op = this.eat("**");
      return { k: "bin", op: "**", a, b: this.power(), line: op.line };
    }
    return a;
  }
  unary(): Expr {
    if (this.at("+") || this.at("-")) {
      const op = this.eat();
      return { k: "unary", op: op.type, x: this.unary(), line: op.line };
    }
    return this.trailer();
  }
  trailer(): Expr {
    let a = this.atom();
    while (true) {
      if (this.at("(")) {
        const line = this.peek().line;
        this.eat("(");
        const args: Expr[] = [];
        if (!this.at(")")) {
          args.push(this.expr());
          while (this.at(",")) {
            this.eat(",");
            if (this.at(")")) break;
            args.push(this.expr());
          }
        }
        this.eat(")");
        a = { k: "call", fn: a, args, line };
      } else if (this.at("[")) {
        const line = this.peek().line;
        this.eat("[");
        if (this.at(":")) {
          this.eat(":");
          let end: Expr | null = null;
          let step: Expr | null = null;
          if (!this.at("]") && !this.at(":")) end = this.expr();
          if (this.at(":")) {
            this.eat(":");
            if (!this.at("]")) step = this.expr();
          }
          this.eat("]");
          a = { k: "slice", target: a, start: null, end, step, line };
        } else {
          const first = this.expr();
          if (this.at(":")) {
            this.eat(":");
            let end: Expr | null = null;
            let step: Expr | null = null;
            if (!this.at("]") && !this.at(":")) end = this.expr();
            if (this.at(":")) {
              this.eat(":");
              if (!this.at("]")) step = this.expr();
            }
            this.eat("]");
            a = { k: "slice", target: a, start: first, end, step, line };
          } else {
            this.eat("]");
            a = { k: "index", target: a, index: first, line };
          }
        }
      } else if (this.at(".")) {
        const line = this.peek().line;
        this.eat(".");
        const name = this.eat("NAME").value;
        a = { k: "attr", target: a, name, line };
      } else break;
    }
    return a;
  }
  atom(): Expr {
    const t = this.peek();
    if (t.type === "NUMBER") {
      this.eat();
      return { k: "num", n: Number(t.value), line: t.line };
    }
    if (t.type === "STRING") {
      this.eat();
      return { k: "str", s: t.value, line: t.line };
    }
    if (t.type === "True" || t.type === "False") {
      this.eat();
      return { k: "const", v: t.type === "True", line: t.line };
    }
    if (t.type === "None") {
      this.eat();
      return { k: "const", v: null, line: t.line };
    }
    if (t.type === "NAME") {
      this.eat();
      return { k: "name", id: t.value, line: t.line };
    }
    if (t.type === "(") {
      this.eat("(");
      const e = this.expr();
      this.eat(")");
      return e;
    }
    if (t.type === "[") {
      this.eat("[");
      const items: Expr[] = [];
      if (!this.at("]")) {
        items.push(this.expr());
        while (this.at(",")) {
          this.eat(",");
          if (this.at("]")) break;
          items.push(this.expr());
        }
      }
      this.eat("]");
      return { k: "list", items, line: t.line };
    }
    if (t.type === "{") {
      this.eat("{");
      const keys: Expr[] = [];
      const vals: Expr[] = [];
      if (!this.at("}")) {
        keys.push(this.expr());
        this.eat(":");
        vals.push(this.expr());
        while (this.at(",")) {
          this.eat(",");
          if (this.at("}")) break;
          keys.push(this.expr());
          this.eat(":");
          vals.push(this.expr());
        }
      }
      this.eat("}");
      return { k: "dict", keys, vals, line: t.line };
    }
    throw err(
      "SyntaxError",
      `Python did not expect ${humanTok(t.type)} here.`,
      t.line,
      "Check for a missing quote, missing parenthesis, or a word Python does not know.",
      "Look at the example in the briefing and match its shape.",
    );
  }
}

function isAug(t?: string) {
  return t === "+=" || t === "-=" || t === "*=" || t === "/=";
}

function humanTok(t: string) {
  const map: Record<string, string> = {
    NEWLINE: "end of line",
    INDENT: "indent",
    DEDENT: "dedent",
    EOF: "end of file",
    NAME: "a name",
    STRING: "a string",
    NUMBER: "a number",
    ":": "a colon ':'",
    "(": "'('",
    ")": "')'",
    "{": "'{'",
    "}": "'}'",
  };
  return map[t] ?? `'${t}'`;
}

function hintForExpected(expected: string, got: Tok): string {
  if (expected === ":") {
    return "if, for, while, def, and else lines must end with a colon (:). Dictionaries also use a colon between key and value.";
  }
  if (expected === ")") return "Every '(' needs a matching ')'.";
  if (expected === "]") return "Every '[' needs a matching ']'.";
  if (expected === "}") return "Every '{' needs a matching '}'.";
  if (expected === "NAME") return "Python expected a variable name here.";
  if (got.type === "EOF") return "The line looks unfinished.";
  return `Python expected ${humanTok(expected)}.`;
}

function fixForExpected(expected: string, got: Tok): string {
  if (expected === ":") {
    return "Add a colon at the end, for example:\nif score >= 70:";
  }
  if (expected === ")") return "Add the missing ')'.";
  if (expected === "NAME") return "Use a name like score or items — no quotes, no spaces.";
  return `Add ${humanTok(expected)}. Found ${humanTok(got.type)} instead.`;
}

type PyVal =
  | { t: "num"; v: number }
  | { t: "str"; v: string }
  | { t: "bool"; v: boolean }
  | { t: "none" }
  | { t: "list"; v: PyVal[] }
  | { t: "dict"; keys: PyVal[]; vals: PyVal[] }
  | { t: "fn"; name: string; params: string[]; body: Stmt[]; env: Env };

class Env {
  map = new Map<string, PyVal>();
  parent: Env | null;
  constructor(parent: Env | null = null) {
    this.parent = parent;
  }
  get(name: string): PyVal | undefined {
    if (this.map.has(name)) return this.map.get(name);
    return this.parent?.get(name);
  }
  set(name: string, v: PyVal) {
    this.map.set(name, v);
  }
  hasLocal(name: string) {
    return this.map.has(name);
  }
}

const MAX_STEPS = 8000;

class Interpreter {
  stdout: string[] = [];
  steps = 0;
  env: Env;
  constructor(env: Env) {
    this.env = env;
  }

  tick(line: number) {
    this.steps++;
    if (this.steps > MAX_STEPS) {
      throw err(
        "RuntimeError",
        "This program ran too long (possible infinite loop).",
        line,
        "A while loop needs a condition that eventually becomes False.",
        "Make sure the loop variable changes, for example: i += 1",
      );
    }
  }

  run(body: Stmt[]) {
    for (const s of body) {
      const r = this.exec(s);
      if (typeof r === "object") {
        throw err("RuntimeError", "return used outside a function.", s.line, "return belongs in a function.", "Wrap the code in def, or remove return.");
      }
      if (r === "break" || r === "continue") {
        throw err("RuntimeError", `'${r}' used outside a loop.`, s.line, "break/continue belong in loops.", "Move it inside a for or while block.");
      }
    }
  }

  exec(s: Stmt): "ok" | "break" | "continue" | { ret: PyVal } {
    this.tick(s.line);
    switch (s.k) {
      case "pass":
        return "ok";
      case "break":
        return "break";
      case "continue":
        return "continue";
      case "return":
        return { ret: s.e ? this.eval(s.e) : { t: "none" } };
      case "expr":
        this.eval(s.e);
        return "ok";
      case "assign": {
        const val = this.eval(s.e);
        if (s.op === "=") {
          this.env.set(s.name, val);
        } else {
          const cur = this.lookup(s.name, s.line);
          this.env.set(s.name, this.applyBin(s.op[0], cur, val, s.line));
        }
        return "ok";
      }
      case "unpack": {
        this.unpack(s.names, this.eval(s.e), s.line);
        return "ok";
      }
      case "setitem": {
        const target = this.eval(s.target);
        const index = this.eval(s.index);
        const val = this.eval(s.e);
        this.writeIndex(target, index, val, s.line);
        return "ok";
      }
      case "if": {
        for (const b of s.branches) {
          if (b.cond === null || isTruthy(this.eval(b.cond))) {
            return this.execBlock(b.body);
          }
        }
        return "ok";
      }
      case "for": {
        const iter = this.asList(this.eval(s.iter), s.line);
        for (const item of iter) {
          this.unpack(s.names, item, s.line);
          const r = this.execBlock(s.body);
          if (r === "break") break;
          if (r === "continue") continue;
          if (typeof r === "object") return r;
        }
        return "ok";
      }
      case "while": {
        while (isTruthy(this.eval(s.cond))) {
          const r = this.execBlock(s.body);
          if (r === "break") break;
          if (r === "continue") continue;
          if (typeof r === "object") return r;
        }
        return "ok";
      }
      case "def": {
        this.env.set(s.name, { t: "fn", name: s.name, params: s.params, body: s.body, env: this.env });
        return "ok";
      }
    }
  }

  unpack(names: string[], item: PyVal, line: number) {
    if (names.length === 1) {
      this.env.set(names[0], item);
      return;
    }
    const row = this.asList(item, line);
    if (row.length !== names.length) {
      throw err(
        "ValueError",
        `not enough values to unpack (expected ${names.length}, got ${row.length})`,
        line,
        "The number of names on the left of in must match each item.",
        "Example: for k, v in pairs:",
      );
    }
    names.forEach((n, i) => this.env.set(n, row[i]));
  }

  execBlock(body: Stmt[]): "ok" | "break" | "continue" | { ret: PyVal } {
    for (const s of body) {
      const r = this.exec(s);
      if (r !== "ok") return r;
    }
    return "ok";
  }

  lookup(name: string, line: number): PyVal {
    const v = this.env.get(name);
    if (v !== undefined) return v;
    const names: string[] = [];
    let e: Env | null = this.env;
    while (e) {
      for (const k of e.map.keys()) names.push(k);
      e = e.parent;
    }
    const hint = suggest(name, names);
    throw err(
      "NameError",
      `name '${name}' is not defined`,
      line,
      hint
        ? `Python does not know '${name}'. Did you mean '${hint}'? Names must be created before you use them.`
        : `Python does not know '${name}'. You must assign it first, for example: ${name} = 10`,
      hint ? `Replace '${name}' with '${hint}', or assign ${name} before using it.` : `Add a line above: ${name} = ...`,
    );
  }

  eval(e: Expr): PyVal {
    this.tick(e.line);
    switch (e.k) {
      case "num":
        return { t: "num", v: e.n };
      case "str":
        return { t: "str", v: e.s };
      case "const":
        if (e.v === null) return { t: "none" };
        return { t: "bool", v: e.v };
      case "name":
        return this.lookup(e.id, e.line);
      case "list":
        return { t: "list", v: e.items.map((x) => this.eval(x)) };
      case "dict": {
        const keys: PyVal[] = [];
        const vals: PyVal[] = [];
        for (let i = 0; i < e.keys.length; i++) {
          const key = this.eval(e.keys[i]);
          assertHashable(key, e.line);
          const val = this.eval(e.vals[i]);
          const existing = dictIndex(keys, key);
          if (existing >= 0) vals[existing] = val;
          else {
            keys.push(key);
            vals.push(val);
          }
        }
        return { t: "dict", keys, vals };
      }
      case "unary": {
        const x = this.eval(e.x);
        if (e.op === "not") return { t: "bool", v: !isTruthy(x) };
        if (e.op === "+") return asNum(x, e.line), x;
        if (e.op === "-") return { t: "num", v: -asNum(x, e.line) };
        throw err("SyntaxError", "Unknown unary operator.", e.line, "", "");
      }
      case "bin": {
        if (e.op === "and") {
          const a = this.eval(e.a);
          return isTruthy(a) ? this.eval(e.b) : a;
        }
        if (e.op === "or") {
          const a = this.eval(e.a);
          return isTruthy(a) ? a : this.eval(e.b);
        }
        return this.applyBin(e.op, this.eval(e.a), this.eval(e.b), e.line);
      }
      case "compare": {
        for (let i = 0; i < e.ops.length; i++) {
          if (!this.cmp(e.ops[i], this.eval(e.items[i]), this.eval(e.items[i + 1]), e.line)) {
            return { t: "bool", v: false };
          }
        }
        return { t: "bool", v: true };
      }
      case "ternary":
        return isTruthy(this.eval(e.cond)) ? this.eval(e.then) : this.eval(e.else);
      case "index": {
        const t = this.eval(e.target);
        const i = this.eval(e.index);
        return this.readIndex(t, i, e.line);
      }
      case "slice": {
        const t = this.eval(e.target);
        const start = e.start ? this.eval(e.start) : null;
        const end = e.end ? this.eval(e.end) : null;
        const step = e.step ? this.eval(e.step) : { t: "num" as const, v: 1 };
        return this.readSlice(t, start, end, step, e.line);
      }
      case "attr":
        throw err(
          "TypeError",
          `'${e.name}' is a method — call it with parentheses.`,
          e.line,
          "Methods do nothing until you add (). print(text.upper) shows the method; print(text.upper()) runs it.",
          `Write ${e.name}() with parentheses.`,
        );
      case "call":
        return this.call(e);
    }
  }

  readIndex(t: PyVal, i: PyVal, line: number): PyVal {
    if (t.t === "list") {
      const idx = asInt(i, line);
      const n = idx < 0 ? t.v.length + idx : idx;
      if (n < 0 || n >= t.v.length) {
        throw err("IndexError", "list index out of range", line, "List indexes start at 0. The last item is len(list) - 1.", "Use a smaller index, or check len(your_list) first.");
      }
      return t.v[n];
    }
    if (t.t === "str") {
      const idx = asInt(i, line);
      const n = idx < 0 ? t.v.length + idx : idx;
      if (n < 0 || n >= t.v.length) {
        throw err("IndexError", "string index out of range", line, "String indexes start at 0.", "Use a smaller index.");
      }
      return { t: "str", v: t.v[n] };
    }
    if (t.t === "dict") {
      const idx = dictIndex(t.keys, i);
      if (idx < 0) {
        throw err("KeyError", `key ${reprVal(i)} is not in this dictionary`, line, "Dictionary keys must match exactly, including capitals.", "Check the key, or use .get(key) which returns None if missing.");
      }
      return t.vals[idx];
    }
    throw err("TypeError", "This value cannot be indexed with [].", line, "[] is for lists, strings, and dictionaries.", "Index a list, for example items[0], or a dict like user[\"name\"].");
  }

  writeIndex(t: PyVal, i: PyVal, val: PyVal, line: number) {
    if (t.t === "list") {
      const idx = asInt(i, line);
      const n = idx < 0 ? t.v.length + idx : idx;
      if (n < 0 || n >= t.v.length) {
        throw err("IndexError", "list assignment index out of range", line, "You can only replace an index that already exists.", "Use append() to add a new item.");
      }
      t.v[n] = val;
      return;
    }
    if (t.t === "dict") {
      assertHashable(i, line);
      const idx = dictIndex(t.keys, i);
      if (idx >= 0) t.vals[idx] = val;
      else {
        t.keys.push(i);
        t.vals.push(val);
      }
      return;
    }
    if (t.t === "str") {
      throw err("TypeError", "strings cannot be changed in place", line, "Strings are immutable. Build a new string instead.", "Use replace() or concatenate with +.");
    }
    throw err("TypeError", "This value does not support item assignment.", line, "Only lists and dictionaries can use name[key] = value.", "");
  }

  readSlice(t: PyVal, start: PyVal | null, end: PyVal | null, stepV: PyVal, line: number): PyVal {
    const step = asInt(stepV, line);
    if (step === 0) throw err("ValueError", "slice step cannot be zero", line, "A slice step of 0 never moves.", "Use 1, 2, or -1.");
    const len = t.t === "list" ? t.v.length : t.t === "str" ? t.v.length : -1;
    if (len < 0) throw err("TypeError", "This value cannot be sliced.", line, "Slicing with : works on lists and strings.", "Example: items[1:3]");
    const s = start ? asInt(start, line) : null;
    const e = end ? asInt(end, line) : null;
    const idx = sliceIndices(len, s, e, step);
    if (t.t === "str") {
      let out = "";
      for (const i of idx) out += t.v[i];
      return { t: "str", v: out };
    }
    if (t.t !== "list") {
      throw err("TypeError", "This value cannot be sliced.", line, "Slicing with : works on lists and strings.", "Example: items[1:3]");
    }
    return { t: "list", v: idx.map((i) => t.v[i]) };
  }

  call(e: Extract<Expr, { k: "call" }>): PyVal {
    if (e.fn.k === "attr") {
      const obj = this.eval(e.fn.target);
      const args = e.args.map((a) => this.eval(a));
      return this.method(obj, e.fn.name, args, e.line);
    }
    if (e.fn.k === "name") {
      const builtin = this.builtin(e.fn.id, e.args, e.line);
      if (builtin !== undefined) return builtin;
    }
    const fn = this.eval(e.fn);
    if (fn.t !== "fn") {
      throw err("TypeError", "This value is not a function, so you cannot call it with ().", e.line, "Only functions (and tools like print, len) can be called.", "Check the name you are calling.");
    }
    if (e.args.length !== fn.params.length) {
      throw err(
        "TypeError",
        `${fn.name}() takes ${fn.params.length} argument(s) but ${e.args.length} were given`,
        e.line,
        "The number of values inside the parentheses must match the function parameters.",
        `Call it like ${fn.name}(${fn.params.join(", ")})`,
      );
    }
    const local = new Env(fn.env);
    e.args.forEach((a, i) => local.set(fn.params[i], this.eval(a)));
    const inner = new Interpreter(local);
    inner.stdout = this.stdout;
    inner.steps = this.steps;
    const r = inner.execBlock(fn.body);
    this.steps = inner.steps;
    if (typeof r === "object") return r.ret;
    return { t: "none" };
  }

  method(obj: PyVal, name: string, args: PyVal[], line: number): PyVal {
    if (obj.t === "str") return strMethod(obj.v, name, args, line);
    if (obj.t === "list") return listMethod(obj, name, args, line);
    if (obj.t === "dict") return dictMethod(obj, name, args, line);
    throw err(
      "TypeError",
      `'${typeName(obj)}' has no method ${name}()`,
      line,
      "Methods belong to a type. Strings have upper/lower/strip. Lists have append/pop.",
      "Check the type of the value before the dot.",
    );
  }

  builtin(name: string, args: Expr[], line: number): PyVal | undefined {
    const evalArgs = () => args.map((a) => this.eval(a));
    switch (name) {
      case "print": {
        const vals = evalArgs();
        this.stdout.push(vals.map(strVal).join(" "));
        return { t: "none" };
      }
      case "len": {
        const [a] = need(evalArgs(), 1, "len", line);
        if (a.t === "list") return { t: "num", v: a.v.length };
        if (a.t === "str") return { t: "num", v: a.v.length };
        if (a.t === "dict") return { t: "num", v: a.keys.length };
        throw err("TypeError", "len() only works on lists, strings, and dictionaries.", line, "len tells you how many items / characters / keys.", "Use len on a list, string, or dict.");
      }
      case "str": {
        const [a] = need(evalArgs(), 1, "str", line);
        return { t: "str", v: strVal(a) };
      }
      case "int": {
        const [a] = need(evalArgs(), 1, "int", line);
        if (a.t === "num") return { t: "num", v: Math.trunc(a.v) };
        if (a.t === "bool") return { t: "num", v: a.v ? 1 : 0 };
        if (a.t === "str") {
          const n = Number(a.v.trim());
          if (!Number.isFinite(n)) {
            throw err("ValueError", `invalid literal for int(): '${a.v}'`, line, "int() needs digits like \"42\".", "Pass a numeric string or a number.");
          }
          return { t: "num", v: Math.trunc(n) };
        }
        throw err("TypeError", "int() cannot convert this value.", line, "Use int on a number or a numeric string.", "Example: int(\"7\")");
      }
      case "range": {
        const a = evalArgs();
        let start = 0,
          stop = 0,
          step = 1;
        if (a.length === 1) stop = asInt(a[0], line);
        else if (a.length === 2) {
          start = asInt(a[0], line);
          stop = asInt(a[1], line);
        } else if (a.length === 3) {
          start = asInt(a[0], line);
          stop = asInt(a[1], line);
          step = asInt(a[2], line);
          if (step === 0) throw err("ValueError", "range() step cannot be zero.", line, "Step must be a non-zero integer.", "Use 1 or -1.");
        } else {
          throw err("TypeError", "range() expected 1 to 3 arguments.", line, "range(stop) or range(start, stop).", "Example: range(3) → 0, 1, 2");
        }
        const out: PyVal[] = [];
        if (step > 0) for (let i = start; i < stop; i += step) out.push({ t: "num", v: i });
        else for (let i = start; i > stop; i += step) out.push({ t: "num", v: i });
        return { t: "list", v: out };
      }
      case "sum": {
        const [a] = need(evalArgs(), 1, "sum", line);
        if (a.t !== "list") throw err("TypeError", "sum() needs a list of numbers.", line, "Add numbers in a list.", "Example: sum([1, 2, 3])");
        let n = 0;
        for (const x of a.v) n += asNum(x, line);
        return { t: "num", v: n };
      }
      case "min":
      case "max": {
        const a = evalArgs();
        const nums = a.length === 1 && a[0].t === "list" ? a[0].v : a;
        if (nums.length === 0) throw err("ValueError", `${name}() of empty sequence`, line, "Give at least one number.", "");
        const vals = nums.map((x) => asNum(x, line));
        return { t: "num", v: name === "min" ? Math.min(...vals) : Math.max(...vals) };
      }
      case "abs": {
        const [a] = need(evalArgs(), 1, "abs", line);
        return { t: "num", v: Math.abs(asNum(a, line)) };
      }
      case "type": {
        const [a] = need(evalArgs(), 1, "type", line);
        const n =
          a.t === "num"
            ? Number.isInteger(a.v)
              ? "int"
              : "float"
            : a.t === "str"
              ? "str"
              : a.t === "bool"
                ? "bool"
                : a.t === "list"
                  ? "list"
                  : a.t === "dict"
                    ? "dict"
                    : a.t === "fn"
                      ? "function"
                      : "NoneType";
        return { t: "str", v: n };
      }
      case "sorted": {
        const [a] = need(evalArgs(), 1, "sorted", line);
        const items = a.t === "list" ? [...a.v] : a.t === "str" ? [...a.v].map((c) => ({ t: "str" as const, v: c })) : a.t === "dict" ? [...a.keys] : null;
        if (!items) throw err("TypeError", "sorted() needs a list, string, or dict.", line, "sorted returns a new list in order.", "Example: sorted([3, 1, 2])");
        items.sort(cmpVals);
        return { t: "list", v: items };
      }
      case "list": {
        const a = evalArgs();
        if (a.length === 0) return { t: "list", v: [] };
        const [x] = need(a, 1, "list", line);
        return { t: "list", v: [...this.asList(x, line)] };
      }
      case "enumerate": {
        const [a] = need(evalArgs(), 1, "enumerate", line);
        const items = this.asList(a, line);
        return {
          t: "list",
          v: items.map((item, i) => ({ t: "list", v: [{ t: "num", v: i }, item] }) as PyVal),
        };
      }
      case "zip": {
        const seqs = evalArgs();
        if (seqs.length < 2) {
          throw err("TypeError", "zip() expected at least 2 arguments.", line, "zip walks two lists in lockstep.", "zip(names, scores)");
        }
        const lists = seqs.map((x) => this.asList(x, line));
        const n = Math.min(...lists.map((l) => l.length));
        const out: PyVal[] = [];
        for (let i = 0; i < n; i++) {
          out.push({ t: "list", v: lists.map((l) => l[i]) });
        }
        return { t: "list", v: out };
      }
      case "any": {
        const [a] = need(evalArgs(), 1, "any", line);
        return { t: "bool", v: this.asList(a, line).some(isTruthy) };
      }
      case "all": {
        const [a] = need(evalArgs(), 1, "all", line);
        return { t: "bool", v: this.asList(a, line).every(isTruthy) };
      }
      case "round": {
        const a = evalArgs();
        if (a.length === 1) return { t: "num", v: Math.round(asNum(a[0], line)) };
        if (a.length === 2) {
          const d = asInt(a[1], line);
          const f = 10 ** d;
          return { t: "num", v: Math.round(asNum(a[0], line) * f) / f };
        }
        throw err("TypeError", "round() expected 1 or 2 arguments.", line, "round(n) or round(n, digits).", "round(3.7)");
      }
      case "float": {
        const [a] = need(evalArgs(), 1, "float", line);
        if (a.t === "num") return { t: "num", v: a.v };
        if (a.t === "bool") return { t: "num", v: a.v ? 1 : 0 };
        if (a.t === "str") {
          const n = Number(a.v.trim());
          if (!Number.isFinite(n)) {
            throw err("ValueError", `could not convert string to float: '${a.v}'`, line, "float() needs a numeric string.", "Example: float(\"3.5\")");
          }
          return { t: "num", v: n };
        }
        throw err("TypeError", "float() cannot convert this value.", line, "Use float on a number or numeric string.", "float(\"2.5\")");
      }
      case "bool": {
        const [a] = need(evalArgs(), 1, "bool", line);
        return { t: "bool", v: isTruthy(a) };
      }
      case "reversed": {
        const [a] = need(evalArgs(), 1, "reversed", line);
        return { t: "list", v: [...this.asList(a, line)].reverse() };
      }
      case "ord": {
        const [a] = need(evalArgs(), 1, "ord", line);
        if (a.t !== "str" || a.v.length !== 1) {
          throw err("TypeError", "ord() expected a string of length 1.", line, "ord turns one character into its number.", "ord(\"A\")");
        }
        return { t: "num", v: a.v.charCodeAt(0) };
      }
      case "chr": {
        const [a] = need(evalArgs(), 1, "chr", line);
        const n = asInt(a, line);
        if (n < 0 || n > 0x10ffff) {
          throw err("ValueError", "chr() arg not in range.", line, "chr maps a number to a character.", "chr(65) is A");
        }
        return { t: "str", v: String.fromCodePoint(n) };
      }
      default:
        return undefined;
    }
  }

  asList(v: PyVal, line: number): PyVal[] {
    if (v.t === "list") return v.v;
    if (v.t === "str") return [...v.v].map((c) => ({ t: "str", v: c }) as PyVal);
    if (v.t === "dict") return v.keys;
    throw err("TypeError", "This value is not iterable.", line, "for x in ... needs a list, a string, a dict, or range(...).", "Use range(3) or a list like [1, 2, 3].");
  }

  applyBin(op: string, a: PyVal, b: PyVal, line: number): PyVal {
    if (op === "+") {
      if (a.t === "str" && b.t === "str") return { t: "str", v: a.v + b.v };
      if (a.t === "list" && b.t === "list") return { t: "list", v: [...a.v, ...b.v] };
      if (isNumeric(a) && isNumeric(b)) return { t: "num", v: num(a) + num(b) };
      throw err(
        "TypeError",
        `cannot concatenate ${typeName(a)} and ${typeName(b)}`,
        line,
        "Use + with two numbers, two strings, or two lists — not mixed.",
        a.t === "str" || b.t === "str" ? "Convert the number with str(n), for example: \"Score: \" + str(10)" : "Make both sides numbers, or both strings.",
      );
    }
    if (op === "*") {
      if (a.t === "str" && isNumeric(b)) return { t: "str", v: a.v.repeat(Math.max(0, Math.trunc(num(b)))) };
      if (b.t === "str" && isNumeric(a)) return { t: "str", v: b.v.repeat(Math.max(0, Math.trunc(num(a)))) };
      if (a.t === "list" && isNumeric(b)) return repeatList(a.v, Math.trunc(num(b)));
      if (b.t === "list" && isNumeric(a)) return repeatList(b.v, Math.trunc(num(a)));
      if (isNumeric(a) && isNumeric(b)) return { t: "num", v: num(a) * num(b) };
      throw err("TypeError", "Cannot multiply these values.", line, "* is for numbers, a string times a number, or a list times a number.", "Example: 3 * 4  or  \"ha\" * 3  or  [0] * 3");
    }
    if (["-", "/", "//", "%", "**"].includes(op)) {
      const x = asNum(a, line);
      const y = asNum(b, line);
      if ((op === "/" || op === "//" || op === "%") && y === 0) {
        throw err("RuntimeError", "division by zero", line, "You cannot divide by 0.", "Change the number on the right of / so it is not 0.");
      }
      if (op === "-") return { t: "num", v: x - y };
      if (op === "/") return { t: "num", v: x / y };
      if (op === "//") return { t: "num", v: Math.floor(x / y) };
      if (op === "%") return { t: "num", v: x % y };
      if (op === "**") return { t: "num", v: x ** y };
    }
    throw err("TypeError", `Cannot use '${op}' on these values.`, line, "Check both sides of the operator.", "Use numbers with math operators.");
  }

  cmp(op: string, a: PyVal, b: PyVal, line: number): boolean {
    if (op === "in" || op === "not in") {
      let found = false;
      if (b.t === "list") found = b.v.some((x) => eq(a, x));
      else if (b.t === "str" && a.t === "str") found = b.v.includes(a.v);
      else if (b.t === "dict") found = dictIndex(b.keys, a) >= 0;
      else throw err("TypeError", "'in' needs a list, string, or dictionary on the right.", line, "Example: \"a\" in \"cat\"  or  2 in [1, 2, 3]  or  \"name\" in user", "");
      return op === "in" ? found : !found;
    }
    if (op === "is" || op === "is not") {
      const same = identical(a, b);
      return op === "is" ? same : !same;
    }
    if (op === "==") return eq(a, b);
    if (op === "!=") return !eq(a, b);
    if (isNumeric(a) && isNumeric(b)) {
      const x = num(a),
        y = num(b);
      if (op === "<") return x < y;
      if (op === ">") return x > y;
      if (op === "<=") return x <= y;
      if (op === ">=") return x >= y;
    }
    if (a.t === "str" && b.t === "str") {
      if (op === "<") return a.v < b.v;
      if (op === ">") return a.v > b.v;
      if (op === "<=") return a.v <= b.v;
      if (op === ">=") return a.v >= b.v;
    }
    throw err("TypeError", `Cannot compare ${typeName(a)} and ${typeName(b)} with ${op}.`, line, "Compare the same kinds of values, like two numbers.", "Use == to check equality of any two values.");
  }
}

function strMethod(s: string, name: string, args: PyVal[], line: number): PyVal {
  switch (name) {
    case "upper":
      need(args, 0, "upper", line);
      return { t: "str", v: s.toUpperCase() };
    case "lower":
      need(args, 0, "lower", line);
      return { t: "str", v: s.toLowerCase() };
    case "strip":
      need(args, 0, "strip", line);
      return { t: "str", v: s.trim() };
    case "lstrip":
      need(args, 0, "lstrip", line);
      return { t: "str", v: s.replace(/^\s+/, "") };
    case "rstrip":
      need(args, 0, "rstrip", line);
      return { t: "str", v: s.replace(/\s+$/, "") };
    case "capitalize":
      need(args, 0, "capitalize", line);
      return { t: "str", v: s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : "" };
    case "title":
      need(args, 0, "title", line);
      return { t: "str", v: s.toLowerCase().replace(/(^|[^A-Za-z])([A-Za-z])/g, (_, a, b) => a + b.toUpperCase()) };
    case "split": {
      if (args.length === 0) return { t: "list", v: s.trim() ? s.trim().split(/\s+/).map((p) => ({ t: "str" as const, v: p })) : [] };
      const [sep] = need(args, 1, "split", line);
      if (sep.t !== "str") throw err("TypeError", "split() separator must be a string.", line, "", "Example: text.split(\",\")");
      return { t: "list", v: s.split(sep.v).map((p) => ({ t: "str" as const, v: p })) };
    }
    case "join": {
      const [seq] = need(args, 1, "join", line);
      if (seq.t !== "list") throw err("TypeError", "join() needs a list of strings.", line, "The separator is the string before the dot.", "Example: \"-\".join([\"a\", \"b\"])");
      const parts = seq.v.map((x) => {
        if (x.t !== "str") throw err("TypeError", "join() list items must be strings.", line, "Convert numbers with str() first.", "\"-\".join([str(1), str(2)])");
        return x.v;
      });
      return { t: "str", v: parts.join(s) };
    }
    case "replace": {
      if (args.length !== 2) throw err("TypeError", "replace() expected 2 arguments.", line, "old text, then new text.", "text.replace(\"a\", \"b\")");
      if (args[0].t !== "str" || args[1].t !== "str") throw err("TypeError", "replace() needs two strings.", line, "", "");
      return { t: "str", v: s.split(args[0].v).join(args[1].v) };
    }
    case "find": {
      const [sub] = need(args, 1, "find", line);
      if (sub.t !== "str") throw err("TypeError", "find() needs a string.", line, "", "");
      return { t: "num", v: s.indexOf(sub.v) };
    }
    case "count": {
      const [sub] = need(args, 1, "count", line);
      if (sub.t !== "str") throw err("TypeError", "count() needs a string.", line, "", "");
      if (!sub.v) return { t: "num", v: s.length + 1 };
      let n = 0;
      let i = 0;
      while (true) {
        const j = s.indexOf(sub.v, i);
        if (j < 0) break;
        n++;
        i = j + sub.v.length;
      }
      return { t: "num", v: n };
    }
    case "startswith": {
      const [sub] = need(args, 1, "startswith", line);
      if (sub.t !== "str") throw err("TypeError", "startswith() needs a string.", line, "", "");
      return { t: "bool", v: s.startsWith(sub.v) };
    }
    case "endswith": {
      const [sub] = need(args, 1, "endswith", line);
      if (sub.t !== "str") throw err("TypeError", "endswith() needs a string.", line, "", "");
      return { t: "bool", v: s.endsWith(sub.v) };
    }
    case "isdigit":
      need(args, 0, "isdigit", line);
      return { t: "bool", v: s.length > 0 && /^[0-9]+$/.test(s) };
    case "isalpha":
      need(args, 0, "isalpha", line);
      return { t: "bool", v: s.length > 0 && /^[A-Za-z]+$/.test(s) };
    case "islower":
      need(args, 0, "islower", line);
      return { t: "bool", v: s.length > 0 && s === s.toLowerCase() && /[A-Za-z]/.test(s) };
    case "isupper":
      need(args, 0, "isupper", line);
      return { t: "bool", v: s.length > 0 && s === s.toUpperCase() && /[A-Za-z]/.test(s) };
    case "isspace":
      need(args, 0, "isspace", line);
      return { t: "bool", v: s.length > 0 && /^\s+$/.test(s) };
    default:
      throw err(
        "TypeError",
        `str has no method ${name}()`,
        line,
        "Common string methods: upper, lower, strip, split, join, replace, find, startswith.",
        `Check the spelling of ${name}.`,
      );
  }
}

function listMethod(obj: Extract<PyVal, { t: "list" }>, name: string, args: PyVal[], line: number): PyVal {
  switch (name) {
    case "append": {
      const [x] = need(args, 1, "append", line);
      obj.v.push(x);
      return { t: "none" };
    }
    case "pop": {
      if (obj.v.length === 0) throw err("IndexError", "pop from empty list", line, "The list has no items left.", "Check len(list) first.");
      if (args.length === 0) return obj.v.pop()!;
      const [i] = need(args, 1, "pop", line);
      const idx = asInt(i, line);
      const n = idx < 0 ? obj.v.length + idx : idx;
      if (n < 0 || n >= obj.v.length) throw err("IndexError", "pop index out of range", line, "", "");
      return obj.v.splice(n, 1)[0];
    }
    case "insert": {
      const [i, x] = args.length === 2 ? args : need(args, 2, "insert", line);
      if (args.length !== 2) throw err("TypeError", "insert() expected 2 arguments.", line, "index, then value.", "items.insert(0, \"Ada\")");
      let n = asInt(i, line);
      if (n < 0) n = 0;
      if (n > obj.v.length) n = obj.v.length;
      obj.v.splice(n, 0, x);
      return { t: "none" };
    }
    case "remove": {
      const [x] = need(args, 1, "remove", line);
      const idx = obj.v.findIndex((v) => eq(v, x));
      if (idx < 0) throw err("ValueError", "list.remove(x): x not in list", line, "remove deletes the first matching item.", "Check the value exists first.");
      obj.v.splice(idx, 1);
      return { t: "none" };
    }
    case "extend": {
      const [seq] = need(args, 1, "extend", line);
      if (seq.t !== "list") throw err("TypeError", "extend() needs a list.", line, "", "items.extend([1, 2])");
      obj.v.push(...seq.v);
      return { t: "none" };
    }
    case "clear":
      need(args, 0, "clear", line);
      obj.v.length = 0;
      return { t: "none" };
    case "copy":
      need(args, 0, "copy", line);
      return { t: "list", v: [...obj.v] };
    case "reverse":
      need(args, 0, "reverse", line);
      obj.v.reverse();
      return { t: "none" };
    case "sort":
      need(args, 0, "sort", line);
      obj.v.sort(cmpVals);
      return { t: "none" };
    case "count": {
      const [x] = need(args, 1, "count", line);
      return { t: "num", v: obj.v.filter((v) => eq(v, x)).length };
    }
    case "index": {
      const [x] = need(args, 1, "index", line);
      const idx = obj.v.findIndex((v) => eq(v, x));
      if (idx < 0) throw err("ValueError", `${reprVal(x)} is not in list`, line, "index finds the first position.", "Check the value, or use `x in items` first.");
      return { t: "num", v: idx };
    }
    default:
      throw err(
        "TypeError",
        `list has no method ${name}()`,
        line,
        "Common list methods: append, pop, insert, remove, sort, reverse.",
        `Check the spelling of ${name}.`,
      );
  }
}

function dictMethod(obj: Extract<PyVal, { t: "dict" }>, name: string, args: PyVal[], line: number): PyVal {
  switch (name) {
    case "get": {
      if (args.length < 1 || args.length > 2) throw err("TypeError", "get() expected 1 or 2 arguments.", line, "key, and optional default.", "user.get(\"name\")");
      const idx = dictIndex(obj.keys, args[0]);
      if (idx >= 0) return obj.vals[idx];
      return args[1] ?? { t: "none" };
    }
    case "keys":
      need(args, 0, "keys", line);
      return { t: "list", v: [...obj.keys] };
    case "values":
      need(args, 0, "values", line);
      return { t: "list", v: [...obj.vals] };
    case "items":
      need(args, 0, "items", line);
      return { t: "list", v: obj.keys.map((k, i) => ({ t: "list", v: [k, obj.vals[i]] }) as PyVal) };
    case "pop": {
      const [key] = need(args, 1, "pop", line);
      const idx = dictIndex(obj.keys, key);
      if (idx < 0) throw err("KeyError", `key ${reprVal(key)} is not in this dictionary`, line, "", "");
      const val = obj.vals[idx];
      obj.keys.splice(idx, 1);
      obj.vals.splice(idx, 1);
      return val;
    }
    case "clear":
      need(args, 0, "clear", line);
      obj.keys.length = 0;
      obj.vals.length = 0;
      return { t: "none" };
    case "update": {
      const [other] = need(args, 1, "update", line);
      if (other.t !== "dict") {
        throw err("TypeError", "update() needs a dictionary.", line, "Merge another dict into this one.", "user.update({\"role\": \"lead\"})");
      }
      for (let i = 0; i < other.keys.length; i++) {
        const idx = dictIndex(obj.keys, other.keys[i]);
        if (idx >= 0) obj.vals[idx] = other.vals[i];
        else {
          obj.keys.push(other.keys[i]);
          obj.vals.push(other.vals[i]);
        }
      }
      return { t: "none" };
    }
    case "setdefault": {
      if (args.length < 1 || args.length > 2) {
        throw err("TypeError", "setdefault() expected 1 or 2 arguments.", line, "key, and optional default.", "freq.setdefault(ch, 0)");
      }
      const key = args[0];
      const def = args[1] ?? { t: "none" as const };
      const idx = dictIndex(obj.keys, key);
      if (idx >= 0) return obj.vals[idx];
      assertHashable(key, line);
      obj.keys.push(key);
      obj.vals.push(def);
      return def;
    }
    default:
      throw err(
        "TypeError",
        `dict has no method ${name}()`,
        line,
        "Common dict methods: get, keys, values, items.",
        `Check the spelling of ${name}.`,
      );
  }
}

function need(args: PyVal[], n: number, name: string, line: number): PyVal[] {
  if (args.length !== n) {
    throw err("TypeError", `${name}() expected ${n} argument(s).`, line, "Check the parentheses.", `Example: ${name}(...)`);
  }
  return args;
}

function isNumeric(v: PyVal) {
  return v.t === "num" || v.t === "bool";
}
function repeatList(items: PyVal[], times: number): PyVal {
  const n = Math.max(0, times);
  const out: PyVal[] = [];
  for (let i = 0; i < n; i++) out.push(...items);
  return { t: "list", v: out };
}
function identical(a: PyVal, b: PyVal): boolean {
  if (a.t === "none" && b.t === "none") return true;
  if (a.t === "bool" && b.t === "bool") return a.v === b.v;
  if (a.t === "num" && b.t === "num") return a.v === b.v;
  if (a.t === "str" && b.t === "str") return a.v === b.v;
  return a === b;
}
function num(v: PyVal) {
  if (v.t === "num") return v.v;
  if (v.t === "bool") return v.v ? 1 : 0;
  return 0;
}
function asNum(v: PyVal, line: number) {
  if (!isNumeric(v)) {
    throw err("TypeError", `${typeName(v)} is not a number.`, line, "Math operators need numbers.", "Remove quotes if you meant a number: 10 not \"10\".");
  }
  return num(v);
}
function asInt(v: PyVal, line: number) {
  return Math.trunc(asNum(v, line));
}
function isTruthy(v: PyVal) {
  if (v.t === "none") return false;
  if (v.t === "bool") return v.v;
  if (v.t === "num") return v.v !== 0;
  if (v.t === "str") return v.v.length > 0;
  if (v.t === "list") return v.v.length > 0;
  if (v.t === "dict") return v.keys.length > 0;
  return true;
}
function eq(a: PyVal, b: PyVal): boolean {
  if (a.t !== b.t) {
    if (isNumeric(a) && isNumeric(b)) return num(a) === num(b);
    return false;
  }
  if (a.t === "none") return true;
  if (a.t === "num" && b.t === "num") return a.v === b.v;
  if (a.t === "str" && b.t === "str") return a.v === b.v;
  if (a.t === "bool" && b.t === "bool") return a.v === b.v;
  if (a.t === "list" && b.t === "list") return a.v.length === b.v.length && a.v.every((x, i) => eq(x, b.v[i]));
  if (a.t === "dict" && b.t === "dict") {
    if (a.keys.length !== b.keys.length) return false;
    return a.keys.every((k, i) => {
      const j = dictIndex(b.keys, k);
      return j >= 0 && eq(a.vals[i], b.vals[j]);
    });
  }
  return false;
}
function typeName(v: PyVal) {
  if (v.t === "num") return Number.isInteger(v.v) ? "int" : "float";
  if (v.t === "str") return "str";
  if (v.t === "bool") return "bool";
  if (v.t === "list") return "list";
  if (v.t === "dict") return "dict";
  if (v.t === "fn") return "function";
  return "NoneType";
}
function strVal(v: PyVal): string {
  if (v.t === "none") return "None";
  if (v.t === "bool") return v.v ? "True" : "False";
  if (v.t === "num") return Number.isInteger(v.v) ? String(v.v) : String(v.v);
  if (v.t === "str") return v.v;
  if (v.t === "fn") return `<function ${v.name}>`;
  if (v.t === "dict") {
    if (v.keys.length === 0) return "{}";
    const inner = v.keys.map((k, i) => `${reprVal(k)}: ${reprVal(v.vals[i])}`).join(", ");
    return "{" + inner + "}";
  }
  return "[" + v.v.map(reprVal).join(", ") + "]";
}
function reprVal(v: PyVal): string {
  if (v.t === "str") return "'" + v.v.replace(/'/g, "\\'") + "'";
  return strVal(v);
}

function dictIndex(keys: PyVal[], key: PyVal) {
  return keys.findIndex((k) => eq(k, key));
}

function assertHashable(key: PyVal, line: number) {
  if (key.t === "list" || key.t === "dict" || key.t === "fn") {
    throw err("TypeError", "unhashable type: '" + typeName(key) + "'", line, "Dictionary keys must be simple values — strings, numbers, or True/False.", "Use a string key, for example user[\"name\"].");
  }
}

function sliceIndices(length: number, start: number | null, stop: number | null, step: number): number[] {
  let s: number;
  let e: number;
  if (step > 0) {
    s = start === null ? 0 : start;
    e = stop === null ? length : stop;
    if (s < 0) s += length;
    if (e < 0) e += length;
    if (s < 0) s = 0;
    if (e < 0) e = 0;
    if (s > length) s = length;
    if (e > length) e = length;
  } else {
    s = start === null ? length - 1 : start;
    e = stop === null ? -1 : stop;
    if (start !== null) {
      if (s < 0) s += length;
      if (s < 0) s = -1;
      if (s >= length) s = length - 1;
    }
    if (stop !== null) {
      if (e < 0) e += length;
      if (e < -1) e = -1;
      if (e >= length) e = length;
    }
  }
  const out: number[] = [];
  if (step > 0) {
    for (let i = s; i < e; i += step) out.push(i);
  } else {
    for (let i = s; i > e; i += step) out.push(i);
  }
  return out;
}

function cmpVals(a: PyVal, b: PyVal): number {
  if (isNumeric(a) && isNumeric(b)) return num(a) - num(b);
  if (a.t === "str" && b.t === "str") return a.v < b.v ? -1 : a.v > b.v ? 1 : 0;
  return typeName(a).localeCompare(typeName(b));
}

function suggest(name: string, names: string[]): string | null {
  let best: string | null = null;
  let bestD = 3;
  for (const n of names) {
    const d = levenshtein(name, n);
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best;
}

function levenshtein(a: string, b: string) {
  const m: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    m[i] = [i];
    for (let j = 1; j <= b.length; j++) {
      if (i === 0) m[0][j] = j;
      else {
        m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
  }
  return m[a.length][b.length];
}

const BUILTIN_NAMES = ["print", "len", "str", "int", "range", "sum", "min", "max", "abs", "type", "sorted", "list", "enumerate"];

function builtinsEnv(): Env {
  const e = new Env(null);
  for (const n of BUILTIN_NAMES) {
    e.set(n, { t: "fn", name: n, params: [], body: [], env: e });
  }
  return e;
}

export function runPython(source: string): RunResult {
  try {
    if (typeof source !== "string") {
      return {
        ok: false,
        stdout: "",
        error: err("RuntimeError", "No code provided.", 1, "Type some Python in the editor.", "Start with print(\"Hello\")"),
      };
    }
    const trimmed = source.trim();
    if (!trimmed) {
      return {
        ok: false,
        stdout: "",
        error: err("SyntaxError", "Your editor is empty.", 1, "Python needs at least one instruction.", "Type: print(\"Hello, Jarvis\")"),
      };
    }
    const toks = tokenize(source);
    const ast = new Parser(toks).parse();
    const env = new Env(builtinsEnv());
    const interp = new Interpreter(env);
    interp.run(ast);
    const stdout = interp.stdout.join("\n") + (interp.stdout.length ? "\n" : "");
    return { ok: true, stdout };
  } catch (e) {
    if (e && typeof e === "object" && "kind" in e) {
      return { ok: false, stdout: "", error: e as PyError };
    }
    return {
      ok: false,
      stdout: "",
      error: err("RuntimeError", e instanceof Error ? e.message : "Unknown error", 1, "Something unexpected happened.", "Try simplifying your code."),
    };
  }
}

export function normalizeOutput(s: string) {
  return s.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").replace(/\n+$/, "");
}

export function outputsMatch(got: string, expected: string) {
  return normalizeOutput(got) === normalizeOutput(expected);
}
