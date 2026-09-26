import assert from "node:assert/strict";
import { test } from "node:test";
import { outputsMatch, runPython } from "./python.ts";

test("print string", () => {
  const r = runPython('print("Hello, Jarvis")');
  assert.equal(r.ok, true);
  assert.equal(r.stdout, "Hello, Jarvis\n");
});

test("variables", () => {
  const r = runPython('city = "London"\nprint(city)');
  assert.equal(r.ok, true);
  assert.equal(r.stdout, "London\n");
});

test("math", () => {
  const r = runPython("base = 40\nbonus = 15\nprint(base + bonus)");
  assert.equal(r.ok, true);
  assert.equal(r.stdout, "55\n");
});

test("if else", () => {
  const r = runPython('score = 82\nif score >= 70:\n    print("PASS")\nelse:\n    print("RETRY")');
  assert.equal(r.ok, true);
  assert.equal(r.stdout, "PASS\n");
});

test("comparison False", () => {
  const r = runPython("print(9 < 4)");
  assert.equal(r.ok, true);
  assert.equal(r.stdout, "False\n");
});

test("guest access branch", () => {
  const r = runPython('role = "guest"\nif role == "admin":\n    print("OPEN")\nelse:\n    print("LOCKED")');
  assert.equal(r.ok, true);
  assert.equal(r.stdout, "LOCKED\n");
});

test("list print python repr", () => {
  const r = runPython('team = ["Ada", "Lin", "Kai"]\nprint(team)');
  assert.equal(r.ok, true);
  assert.equal(r.stdout, "['Ada', 'Lin', 'Kai']\n");
});

test("for loop", () => {
  const r = runPython('tasks = ["plan", "code", "test"]\nfor t in tasks:\n    print(t)');
  assert.equal(r.ok, true);
  assert.equal(r.stdout, "plan\ncode\ntest\n");
});

test("len", () => {
  const r = runPython('rooms = ["ops", "lab", "brief", "vault"]\nprint(len(rooms))');
  assert.equal(r.ok, true);
  assert.equal(r.stdout, "4\n");
});

test("function return", () => {
  const r = runPython('def greet(name):\n    return "Ready, " + name\nprint(greet("Elite"))');
  assert.equal(r.ok, true);
  assert.equal(r.stdout, "Ready, Elite\n");
});

test("filter loop", () => {
  const r = runPython("scores = [55, 90, 70, 41, 88]\nfor s in scores:\n    if s >= 70:\n        print(s)");
  assert.equal(r.ok, true);
  assert.equal(r.stdout, "90\n70\n88\n");
});

test("total function", () => {
  const r = runPython("def total(nums):\n    s = 0\n    for n in nums:\n        s += n\n    return s\nprint(total([10, 20, 30]))");
  assert.equal(r.ok, true);
  assert.equal(r.stdout, "60\n");
});

test("NameError is pedagogical", () => {
  const r = runPython("print(Hello)");
  assert.equal(r.ok, false);
  assert.equal(r.error?.kind, "NameError");
  assert.ok(r.error?.hint);
});

test("missing colon", () => {
  const r = runPython("if True\n    print(1)");
  assert.equal(r.ok, false);
  assert.ok(r.error?.kind === "SyntaxError" || r.error?.kind === "IndentationError");
});

test("outputsMatch trims", () => {
  assert.equal(outputsMatch("Hello\n", "Hello"), true);
});

test("empty editor", () => {
  const r = runPython("   ");
  assert.equal(r.ok, false);
});

test("string methods", () => {
  const r = runPython('print("jarvis".upper())\nprint("  Ada  ".strip())\nprint("Hi".lower())');
  assert.equal(r.ok, true, r.error?.message);
  assert.equal(r.stdout, "JARVIS\nAda\nhi\n");
});

test("string concat and str()", () => {
  const r = runPython('first = "Ada"\nlast = "Lovelace"\nprint(first + " " + last)\nn = 7\nprint("Desk " + str(n))');
  assert.equal(r.ok, true, r.error?.message);
  assert.equal(r.stdout, "Ada Lovelace\nDesk 7\n");
});

test("string index and slice", () => {
  const r = runPython('word = "Python"\nprint(word[0])\nprint(word[-1])\nprint(word[0:3])\nprint(len("career"))');
  assert.equal(r.ok, true, r.error?.message);
  assert.equal(r.stdout, "P\nn\nPyt\n6\n");
});

test("booleans and elif", () => {
  const r = runPython(
    'print(True and False)\nage = 20\nprint(age >= 18 and age < 65)\nscore = 91\nif score >= 90:\n    print("A")\nelif score >= 70:\n    print("B")\nelse:\n    print("C")',
  );
  assert.equal(r.ok, true, r.error?.message);
  assert.equal(r.stdout, "False\nTrue\nA\n");
});

test("while loop", () => {
  const r = runPython("i = 1\nwhile i <= 3:\n    print(i)\n    i += 1");
  assert.equal(r.ok, true, r.error?.message);
  assert.equal(r.stdout, "1\n2\n3\n");
});

test("range", () => {
  const r = runPython("for i in range(4):\n    print(i)\nfor i in range(2, 6):\n    print(i)");
  assert.equal(r.ok, true, r.error?.message);
  assert.equal(r.stdout, "0\n1\n2\n3\n2\n3\n4\n5\n");
});

test("nested loops", () => {
  const r = runPython("for x in [1, 2]:\n    for y in [3, 4]:\n        print(x * y)");
  assert.equal(r.ok, true, r.error?.message);
  assert.equal(r.stdout, "3\n4\n6\n8\n");
});

test("list index assign append slice", () => {
  const r = runPython(
    'nums = [10, 20, 30]\nprint(nums[1])\nnums[0] = 99\nprint(nums)\nteam = ["Ada"]\nteam.append("Lin")\nprint(team)\nletters = ["a", "b", "c", "d"]\nprint(letters[1:3])',
  );
  assert.equal(r.ok, true, r.error?.message);
  assert.equal(r.stdout, "20\n[99, 20, 30]\n['Ada', 'Lin']\n['b', 'c']\n");
});

test("break continue", () => {
  const r = runPython(
    "for n in [1, 2, 9, 4]:\n    if n == 9:\n        break\n    print(n)\nfor n in [1, 2, 3, 4]:\n    if n % 2 == 0:\n        continue\n    print(n)",
  );
  assert.equal(r.ok, true, r.error?.message);
  assert.equal(r.stdout, "1\n2\n1\n3\n");
});

test("dict get set loop", () => {
  const r = runPython(
    'user = {"name": "Ada", "role": "lead"}\nprint(user["name"])\nuser["role"] = "architect"\nprint(user["role"])\nprint(user.get("art"))\nscores = {"math": 90, "code": 80}\nprint(len(scores))\nfor k in scores:\n    print(k)',
  );
  assert.equal(r.ok, true, r.error?.message);
  assert.equal(r.stdout, "Ada\narchitect\nNone\n2\nmath\ncode\n");
});

test("join split sorted enumerate", () => {
  const r = runPython(
    'parts = ["plan", "code", "ship"]\nprint("-".join(parts))\nprint("a,b,c".split(","))\nprint(sorted([5, 1, 4]))\nfor i, x in enumerate(["a", "b"]):\n    print(i)\n    print(x)',
  );
  assert.equal(r.ok, true, r.error?.message);
  assert.equal(r.stdout, "plan-code-ship\n['a', 'b', 'c']\n[1, 4, 5]\n0\na\n1\nb\n");
});

test("method missing parens is pedagogical", () => {
  const r = runPython('print("hi".upper)');
  assert.equal(r.ok, false);
  assert.equal(r.error?.kind, "TypeError");
  assert.ok(r.error?.message.includes("parentheses"));
});

test("zip any all round bool", () => {
  const r = runPython(
    'print(list(zip(["a", "b"], [1, 2])))\nprint(any([0, 1]))\nprint(all([1, 0]))\nprint(round(3.7))\nprint(bool(""))\nprint(bool([0]))',
  );
  assert.equal(r.ok, true, r.error?.message);
  assert.equal(r.stdout, "[['a', 1], ['b', 2]]\nTrue\nFalse\n4\nFalse\nTrue\n");
});

test("is None ternary swap reversed list-repeat", () => {
  const r = runPython(
    'x = None\nprint(x is None)\nprint("even" if 8 % 2 == 0 else "odd")\na = 1\nb = 2\na, b = b, a\nprint(a)\nprint(b)\nprint([0] * 3)\nfor n in reversed([1, 2, 3]):\n    print(n)',
  );
  assert.equal(r.ok, true, r.error?.message);
  assert.equal(r.stdout, "True\neven\n2\n1\n[0, 0, 0]\n3\n2\n1\n");
});

test("ord chr dict update setdefault", () => {
  const r = runPython(
    'print(ord("A"))\nprint(chr(66))\nuser = {"name": "Ada"}\nuser.update({"role": "lead"})\nprint(user["role"])\nfreq = {}\nfreq.setdefault("a", 0)\nfreq["a"] = freq["a"] + 1\nprint(freq["a"])',
  );
  assert.equal(r.ok, true, r.error?.message);
  assert.equal(r.stdout, "65\nB\nlead\n1\n");
});
