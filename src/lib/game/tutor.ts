import { outputsMatch, runPython, type PyError, type RunResult } from "./python";

export type TutorFeedback = {
  status: "success" | "error" | "wrong";
  title: string;
  what: string;
  why: string;
  fix: string;
  example?: string;
  got?: string;
  expected?: string;
  line?: number;
};

const HABITS: { re: RegExp; title: string; what: string; why: string; fix: string; example: string }[] = [
  {
    re: /\bconsole\.log\b/,
    title: "That's JavaScript",
    what: "You used console.log — that's JavaScript, not Python.",
    why: "Python talks to the screen with the print() function.",
    fix: "Replace console.log with print.",
    example: "print(\"Hello\")",
  },
  {
    re: /\bSystem\.out\.print/,
    title: "That's Java",
    what: "System.out.println is Java.",
    why: "Python uses print().",
    fix: "Write print(\"...\") instead.",
    example: "print(\"Hello\")",
  },
  {
    re: /\b(let|const|var)\s+[A-Za-z_]/,
    title: "That's JavaScript",
    what: "let / const / var are JavaScript keywords.",
    why: "In Python you just write the name, then =, then the value.",
    fix: "Drop let/const/var. Use: name = value",
    example: "score = 10",
  },
  {
    re: /\bfunction\s+[A-Za-z_]/,
    title: "That's JavaScript",
    what: "function is how JavaScript defines functions.",
    why: "Python uses def, a colon, then an indented body.",
    fix: "Write: def name(args):",
    example: "def greet(name):\n    return \"Hi \" + name",
  },
  {
    re: /^\s*print\s+["'].+["']\s*$/m,
    title: "Python 3 needs parentheses",
    what: "You wrote a Python 2 print statement.",
    why: "In Python 3, print is a function, so it needs parentheses.",
    fix: "Wrap the text in print(...)",
    example: "print(\"Hello, Jarvis\")",
  },
  {
    re: /\b(if|for|while|elif|else|def|function)\b[^\n]*\{/,
    title: "Python does not use { } for blocks",
    what: "Curly braces after if/for/while look like JavaScript or Java.",
    why: "Python groups code with indentation (spaces) after a colon. { } are only for dictionaries, like {\"name\": \"Ada\"}.",
    fix: "Use a colon and indent the next line with 4 spaces.",
    example: "if score >= 70:\n    print(\"PASS\")",
  },
];

export function preScanHabits(source: string): TutorFeedback | null {
  for (const h of HABITS) {
    if (h.re.test(source)) {
      return {
        status: "error",
        title: h.title,
        what: h.what,
        why: h.why,
        fix: h.fix,
        example: h.example,
      };
    }
  }
  return null;
}

export function analyzeRun(source: string, expected: string): { result: RunResult; feedback: TutorFeedback } {
  const habit = preScanHabits(source);
  const result = runPython(source);
  if (habit && !result.ok) {
    return { result, feedback: { ...habit, line: result.error?.line } };
  }
  if (!result.ok && result.error) {
    return { result, feedback: fromError(source, result.error) };
  }
  if (outputsMatch(result.stdout, expected)) {
    return {
      result,
      feedback: {
        status: "success",
        title: "Correct",
        what: "Your program produced the expected output.",
        why: "Python ran each line from top to bottom and print() showed the result.",
        fix: "On to the next task.",
      },
    };
  }
  return { result, feedback: fromMismatch(source, result.stdout, expected) };
}

function fromError(source: string, error: PyError): TutorFeedback {
  const extra = extraHints(source, error);
  return {
    status: "error",
    title: error.kind,
    what: error.message,
    why: extra.why || error.hint,
    fix: extra.fix || error.fix,
    example: extra.example,
    line: error.line,
  };
}

function extraHints(source: string, error: PyError): { why?: string; fix?: string; example?: string } {
  const line = source.split("\n")[error.line - 1] ?? "";
  if (error.kind === "NameError") {
    const m = error.message.match(/'([^']+)'/);
    const name = m?.[1];
    if (name && new RegExp(`print\\(\\s*${name}\\s*\\)`).test(source) && !source.includes(`${name} =`) && !source.includes(`"${name}"`) && !source.includes(`'${name}'`)) {
      return {
        why: `Python thinks ${name} is a variable, because it has no quotes. Variables must be created with = first. Text you want to show as-is is a string and needs quotes.`,
        fix: `If you meant to show the word ${name}, wrap it in quotes. If you meant a variable, assign it first.`,
        example: `print("${name}")\n# or\n${name} = "Ada"\nprint(${name})`,
      };
    }
  }
  if (error.kind === "SyntaxError" && /if |for |while |def |else/.test(line) && !line.includes(":")) {
    return {
      why: "This kind of line starts a block. Python needs a colon at the end so it knows the next indented lines belong to it.",
      fix: "Add : at the end of the line.",
      example: line.trimEnd() + ":",
    };
  }
  if (error.kind === "TypeError" && /concatenate|str.*int|int.*str/.test(error.message + error.hint)) {
    return {
      why: "Python will not silently mix text and numbers with +.",
      fix: "Wrap the number in str(...) so it becomes text.",
      example: "print(\"Score: \" + str(10))",
    };
  }
  if (error.kind === "IndentationError") {
    return {
      why: "Spaces at the start of a line are part of the language, not decoration.",
      fix: "Use exactly 4 spaces per level. Keep lines in the same block lined up.",
      example: "if True:\n    print(\"indented\")",
    };
  }
  return {};
}

function fromMismatch(source: string, got: string, expected: string): TutorFeedback {
  const g = stripEnd(got);
  const e = stripEnd(expected);
  const gq = g.replace(/^['"]|['"]$/g, "");
  const eq = e.replace(/^['"]|['"]$/g, "");

  if (g === `"${e}"` || g === `'${e}'`) {
    return {
      status: "wrong",
      title: "Extra quotes",
      what: "Your program printed quote marks around the text.",
      why: "print already shows the string. If you write extra quotes inside the string, they become part of the output.",
      fix: "Print the text without extra quote characters inside.",
      example: `print("${e}")`,
      got: g,
      expected: e,
    };
  }
  if (g.toLowerCase() === e.toLowerCase() && g !== e) {
    return {
      status: "wrong",
      title: "Capital letters matter",
      what: "The letters are right but the capitalization is not.",
      why: "Python treats Hello and hello as different text.",
      fix: "Match the expected text exactly, including capitals.",
      got: g,
      expected: e,
    };
  }
  if (gq === e || g === eq) {
    return {
      status: "wrong",
      title: "Almost — check quotes",
      what: "The words are close, but the quotes in the output do not match.",
      why: "Only characters inside print(...) that are part of the string appear. The wrapping quotes of the code do not print — unless you added extra ones.",
      fix: "Copy the expected text exactly inside one pair of quotes.",
      got: g,
      expected: e,
    };
  }
  if (g.replace(/\s+/g, "") === e.replace(/\s+/g, "")) {
    return {
      status: "wrong",
      title: "Spacing does not match",
      what: "The words are right, the spaces are not.",
      why: "Python prints exactly the spaces you give it. Extra or missing spaces count as wrong.",
      fix: "Match spaces and line breaks exactly.",
      got: g,
      expected: e,
    };
  }
  if (!g) {
    return {
      status: "wrong",
      title: "Nothing was printed",
      what: "The program ran, but print() never showed the required text.",
      why: "Assignments like name = \"Ada\" store a value. They do not show it. print() is what writes to the screen.",
      fix: "Call print(...) with the value you want to show.",
      example: source.includes("=") ? "After you assign, add: print(your_variable)" : `print("${e.split("\n")[0]}")`,
      got: g,
      expected: e,
    };
  }
  const gl = g.split("\n");
  const el = e.split("\n");
  if (gl.length !== el.length) {
    return {
      status: "wrong",
      title: gl.length > el.length ? "Extra lines" : "Missing lines",
      what: `Python printed ${gl.length} line(s). The mission expected ${el.length}.`,
      why: "Each print() usually adds one line. A loop prints once per item.",
      fix: gl.length > el.length ? "Remove extra print() calls." : "Add the missing print() so every required line appears.",
      got: g,
      expected: e,
    };
  }
  return {
    status: "wrong",
    title: "Output does not match",
    what: "The program ran, but it printed something different from the mission.",
    why: "Read the task again. print() shows exactly what you pass it — numbers calculate, quotes stay as text.",
    fix: "Compare your output with the expected output line by line, then adjust the print() or the calculation.",
    got: g,
    expected: e,
  };
}

function stripEnd(s: string) {
  return s.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").replace(/\n+$/, "");
}

export function formatOutput(s: string) {
  if (!s) return "(empty)";
  return s.replace(/\n+$/, "");
}
