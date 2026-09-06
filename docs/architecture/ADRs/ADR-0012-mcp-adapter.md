# ADR-0012 — MCP كـAdapter

- **الحالة:** Accepted
- **التاريخ:** 2026-09-06

## السياق
MCP مواصفة خارجية؛ جعلها "القلب" يقيّد المشروع بها.

## القرار
```text
Internal Tool Contract ↔ MCP Adapter ↔ External MCP Server
```
MCP = integration protocol وليس architecture foundation.

## النتائج
- إيجابي: الاستفادة من منظومة MCP دون قفل معماري.
- قيد: الـAdapter مسؤول عن ترجمة العقود (schema/permissions) بين الطرفين.
