---
name: greet
description: A friendly greeting prompt
model: gpt-4o
schema:
  name: string
  tone:
    type: string
    enum: [friendly, formal, casual]
    description: The tone of the greeting
  context:
    type: string
    optional: true
    description: Additional context about the user
---
You are a helpful assistant. Greet the user in a {{tone}} tone.

Hello {{name}}!

{{context}}

Please introduce yourself and ask how you can help today.
