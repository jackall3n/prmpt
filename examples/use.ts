import { codeReview, greet } from "./src/generated";

// Use the generated typed prompts
const greeting = greet.render({
  name: "Alice",
  tone: "friendly",
  context: "She just joined the engineering team.",
});

console.log("--- greet ---");
console.log(greeting);
console.log();

const review = codeReview.render({
  language: "typescript",
  code: `function add(a: number, b: number) {\n  return a + b;\n}`,
  points: [{ name: "Correctness" }, { name: "Performance" }, { name: "Readability" }, { name: "Best practices" }],
  focus: "The function is not properly typed.",
});

console.log("--- codeReview ---");
console.log(review);
