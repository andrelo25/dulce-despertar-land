---
name: markitdown
description: >
  Converts any file (PDF, DOCX, PPTX, XLSX, HTML, images, audio) to Markdown
  using the markitdown CLI tool. Use when the user types /markitdown or asks
  to convert a file to Markdown.
---

# Skill: markitdown

Convert any file to Markdown using the `markitdown` CLI tool.

## Trigger
User types `/markitdown` or asks to convert a file to Markdown.

## Behavior

1. Extract the file path from the user's message (absolute or relative).
2. Derive the output path: same directory, same filename, extension replaced with `.md`.
3. Run via Bash:
   ```
   markitdown "<input_path>" -o "<output_path>"
   ```
4. Confirm success and show the output path.

## Rules
- Output file goes in the **same directory** as the input, always.
- Never ask for confirmation — just run it.
- If `markitdown` is not found, tell the user to run `pip install markitdown`.
- If the file doesn't exist, say so clearly.
- Supported formats include: PDF, DOCX, PPTX, XLSX, HTML, images, audio, and more.
